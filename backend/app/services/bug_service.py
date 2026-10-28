import ast
import re
import uuid
from pathlib import Path
from typing import Any

from app.models.schemas import (
    BugAnalyzeRequest,
    BugReportResponse,
    Citation,
    SourceEvidence,
)
from app.services.ast_service import parse_python_ast
from app.services.ollama_service import (
    check_ollama_status,
    query_ollama_chat,
    repair_json_output,
)
from app.services.repo_service import is_safe_path, read_repo_file
from app.services.search_service import search_repository


def extract_keywords_from_issue(description: str, error_msg: str | None = None, stack_trace: str | None = None) -> list[str]:
    combined = f"{description} {error_msg or ''} {stack_trace or ''}"
    words = re.findall(r"[A-Za-z_][A-Za-z0-9_]{2,}", combined)
    stop_words = {"the", "and", "for", "with", "from", "this", "that", "when", "why", "how", "what", "fails", "error", "crash", "crashes"}
    unique_words: list[str] = []
    for w in words:
        if w.lower() not in stop_words and w not in unique_words:
            unique_words.append(w)
    return unique_words[:10]


def validate_citations_against_repo(repo_dir: Path, raw_citations: list[dict[str, Any]]) -> list[Citation]:
    """Verify that cited files and line ranges actually exist in the repository."""
    verified: list[Citation] = []
    for raw in raw_citations:
        file_path_str = raw.get("file_path", "").replace("\\", "/").strip("/")
        start_line = int(raw.get("start_line", 1))
        end_line = int(raw.get("end_line", start_line))

        target = repo_dir / file_path_str
        exists = is_safe_path(repo_dir, target) and target.exists() and target.is_file()

        snippet = ""
        if exists:
            try:
                with open(target, "r", encoding="utf-8", errors="replace") as f:
                    lines = f.readlines()
                    total_lines = len(lines)
                    s_idx = max(0, min(start_line - 1, total_lines - 1))
                    e_idx = max(s_idx + 1, min(end_line, total_lines))
                    snippet = "".join(lines[s_idx:e_idx]).strip()
            except Exception:
                exists = False
                snippet = raw.get("snippet", "")
        else:
            snippet = raw.get("snippet", "[File not found in active repository]")

        verified.append(Citation(
            file_path=file_path_str,
            start_line=start_line,
            end_line=end_line,
            snippet=snippet,
            verified_exists=exists
        ))
    return verified


async def analyze_repository_bug(repo_dir: Path, request: BugAnalyzeRequest) -> BugReportResponse:
    """
    Execute the flagship multi-step Bug Detective pipeline:
    1. Problem parsing & search keyword extraction
    2. Real source-code retrieval and call-site localization
    3. Ollama reasoning (when available) with JSON recovery & citation validation
    4. Deterministic AST evidence synthesis when Ollama is offline (clearly separating demo presets from generic AST inspection)
    5. Lifecycle status assignment
    """
    bug_id = f"BUG-{uuid.uuid4().hex[:8].upper()}"

    # STEP 1: Understand problem
    keywords = extract_keywords_from_issue(request.bug_description, request.error_message, request.stack_trace)

    # STEP 2: Retrieve real source evidence
    evidence_items: list[SourceEvidence] = []
    search_queries = list(keywords)
    if request.target_file:
        search_queries.insert(0, Path(request.target_file).stem)

    for q in search_queries[:4]:
        search_res = search_repository(repo_dir, q, limit=5)
        for item in search_res.results:
            if any(e.file_path == item.file_path and abs(e.start_line - item.line_number) < 5 for e in evidence_items):
                continue

            content, _, line_count = read_repo_file(repo_dir, item.file_path)
            lines = content.splitlines()
            s_line = max(1, item.line_number - 2)
            e_line = min(line_count, item.line_number + 3)
            snippet = "\n".join(lines[s_line - 1:e_line])

            evidence_items.append(SourceEvidence(
                file_path=item.file_path,
                start_line=s_line,
                end_line=e_line,
                snippet=snippet,
                relevance_reason=f"Matched search query '{q}' at line {item.line_number}"
            ))
            if len(evidence_items) >= 6:
                break
        if len(evidence_items) >= 6:
            break

    # If target_file was specified, prioritize it
    if request.target_file:
        t_file = request.target_file.replace("\\", "/").strip("/")
        if not any(e.file_path == t_file for e in evidence_items):
            try:
                content, _, line_count = read_repo_file(repo_dir, t_file)
                evidence_items.insert(0, SourceEvidence(
                    file_path=t_file,
                    start_line=1,
                    end_line=min(line_count, 40),
                    snippet="\n".join(content.splitlines()[:40]),
                    relevance_reason="User specified target file"
                ))
            except Exception:
                pass

    # STEP 3: Check Ollama status
    ollama_status = await check_ollama_status()

    # Case A: Live Ollama model is available
    if ollama_status.running and not ollama_status.error:
        evidence_prompt = ""
        for ev in evidence_items:
            evidence_prompt += f"\nFile: {ev.file_path} (Lines {ev.start_line}-{ev.end_line})\n```\n{ev.snippet}\n```\n"

        system_prompt = (
            "You are RepoPilot AI Bug Detective. Analyze the provided repository evidence to diagnose the bug.\n"
            "Return a strictly valid JSON object with the following fields:\n"
            "- title: string\n"
            "- severity: string ('Low', 'Medium', 'High', 'Critical')\n"
            "- explanation: string\n"
            "- root_cause: string\n"
            "- reproduction_conditions: string\n"
            "- affected_file: string (must match an existing evidence file)\n"
            "- line_range: [start_line, end_line]\n"
            "- citations: list of {file_path, start_line, end_line, snippet}\n"
            "- proposed_patch: unified diff string starting with --- and +++\n"
            "- regression_test: Python pytest test code string that reproduces the bug\n"
        )

        user_prompt = (
            f"User Issue: {request.bug_description}\n"
            f"Error Message: {request.error_message or 'None provided'}\n"
            f"Stack Trace: {request.stack_trace or 'None provided'}\n\n"
            f"Repository Evidence:\n{evidence_prompt}\n"
        )

        success, response_text, err = await query_ollama_chat(system_prompt, user_prompt, json_mode=True)
        if success:
            parsed = repair_json_output(response_text)
            if parsed and isinstance(parsed, dict):
                citations = validate_citations_against_repo(repo_dir, parsed.get("citations", []))
                return BugReportResponse(
                    bug_id=bug_id,
                    title=parsed.get("title", "Diagnosed Bug in Repository"),
                    severity=parsed.get("severity", "Medium"),
                    severity_disclaimer="Severity is an automated heuristic estimate, not a verified security classification.",
                    explanation=parsed.get("explanation", ""),
                    root_cause=parsed.get("root_cause", ""),
                    reproduction_conditions=parsed.get("reproduction_conditions", ""),
                    affected_file=parsed.get("affected_file", evidence_items[0].file_path if evidence_items else "unknown"),
                    line_range=parsed.get("line_range", [1, 10]),
                    citations=citations,
                    proposed_patch=parsed.get("proposed_patch", ""),
                    regression_test=parsed.get("regression_test", ""),
                    verification_status="patch_proposed",
                    model_used=ollama_status.model,
                    is_demo_preset=False
                )

    # Case B: Offline or Model Missing - Deterministic inspection
    return generate_evidence_grounded_diagnosis(repo_dir, request, evidence_items, bug_id)


def generate_evidence_grounded_diagnosis(
    repo_dir: Path,
    request: BugAnalyzeRequest,
    evidence: list[SourceEvidence],
    bug_id: str
) -> BugReportResponse:
    """
    Deterministic evidence-grounded diagnosis when Ollama is offline.
    Distinguishes predefined demo examples from generic repository AST inspection.
    Never fabricates AI-generated responses.
    """
    desc_lower = f"{request.bug_description} {request.error_message or ''}".lower()
    is_demo_repo = "buggy-python-project" in str(repo_dir).lower() or "demo" in request.repository_id.lower()

    # Predefined Demo Presets (explicitly flagged as is_demo_preset=True)
    if is_demo_repo:
        if "empty" in desc_lower or "zero" in desc_lower or "zerodivisionerror" in desc_lower or "average" in desc_lower:
            target_file = "app/calculator.py"
            return BugReportResponse(
                bug_id=bug_id,
                title="[Preset Demo Example] ZeroDivisionError on Empty List in average()",
                severity="Medium",
                severity_disclaimer="Severity is an automated heuristic estimate, not a verified security classification.",
                explanation=(
                    "Deterministic Preset Demo: The average() function performs `sum(numbers) / len(numbers)` "
                    "without guarding against an empty sequence. When numbers=[], len(numbers) is 0, raising ZeroDivisionError."
                ),
                root_cause="Missing guard condition `if not numbers: raise ValueError(...)` before division.",
                reproduction_conditions="Invoking `average([])` with an empty collection.",
                affected_file=target_file,
                line_range=[17, 18],
                citations=[
                    Citation(
                        file_path=target_file,
                        start_line=17,
                        end_line=18,
                        snippet="    # BUG: No empty list check before division\n    return sum(numbers) / len(numbers)",
                        verified_exists=(repo_dir / target_file).exists()
                    )
                ],
                proposed_patch=(
                    f"--- a/{target_file}\n"
                    f"+++ b/{target_file}\n"
                    "@@ -16,3 +16,5 @@\n"
                    "+    if not numbers:\n"
                    "+        raise ValueError('Cannot calculate average of an empty list')\n"
                    "     return sum(numbers) / len(numbers)\n"
                ),
                regression_test=(
                    "import pytest\n"
                    "from app.calculator import average\n\n"
                    "def test_average_empty_list_regression():\n"
                    "    with pytest.raises(ValueError, match='Cannot calculate average of an empty list'):\n"
                    "        average([])\n"
                ),
                verification_status="patch_proposed",
                model_used=None,
                is_demo_preset=True
            )

        if "discount" in desc_lower or "percent" in desc_lower or "boundary" in desc_lower:
            target_file = "app/calculator.py"
            return BugReportResponse(
                bug_id=bug_id,
                title="[Preset Demo Example] Boundary Validation Defect in calculate_discount()",
                severity="Medium",
                severity_disclaimer="Severity is an automated heuristic estimate, not a verified security classification.",
                explanation=(
                    "Deterministic Preset Demo: calculate_discount allows discount_percent outside [0.0, 100.0] "
                    "or negative price, which results in invalid financial calculations."
                ),
                root_cause="Missing boundary check `if price < 0 or not (0.0 <= discount_percent <= 100.0): raise ValueError(...)`.",
                reproduction_conditions="Invoking `calculate_discount(100.0, 150.0)`.",
                affected_file=target_file,
                line_range=[28, 30],
                citations=[
                    Citation(
                        file_path=target_file,
                        start_line=28,
                        end_line=30,
                        snippet="    # BUG: Missing validation for negative or > 100 discount percentage\n    return price * (1.0 - (discount_percent / 100.0))",
                        verified_exists=(repo_dir / target_file).exists()
                    )
                ],
                proposed_patch=(
                    f"--- a/{target_file}\n"
                    f"+++ b/{target_file}\n"
                    "@@ -28,2 +28,4 @@\n"
                    "+    if price < 0 or not (0.0 <= discount_percent <= 100.0):\n"
                    "+        raise ValueError('Invalid price or discount percentage')\n"
                    "     return price * (1.0 - (discount_percent / 100.0))\n"
                ),
                regression_test=(
                    "import pytest\n"
                    "from app.calculator import calculate_discount\n\n"
                    "def test_calculate_discount_invalid_boundary():\n"
                    "    with pytest.raises(ValueError):\n"
                    "        calculate_discount(100.0, 150.0)\n"
                ),
                verification_status="patch_proposed",
                model_used=None,
                is_demo_preset=True
            )

        if "off-by-one" in desc_lower or "first" in desc_lower or "index" in desc_lower or "skip" in desc_lower:
            target_file = "app/calculator.py"
            return BugReportResponse(
                bug_id=bug_id,
                title="[Preset Demo Example] Off-by-One Loop Starting Index in find_first_positive()",
                severity="Low",
                severity_disclaimer="Severity is an automated heuristic estimate, not a verified security classification.",
                explanation=(
                    "Deterministic Preset Demo: The loop starts at index 1 (`range(1, len(numbers))`), skipping index 0 entirely."
                ),
                root_cause="Loop range `range(1, len(numbers))` skips the first collection element.",
                reproduction_conditions="Calling `find_first_positive([10, -1, 5])` where positive number is at index 0.",
                affected_file=target_file,
                line_range=[44, 47],
                citations=[
                    Citation(
                        file_path=target_file,
                        start_line=44,
                        end_line=47,
                        snippet="    # BUG: Off-by-one loop index starts at 1, skipping index 0\n    for i in range(1, len(numbers)):\n        if numbers[i] > 0:\n            return numbers[i]",
                        verified_exists=(repo_dir / target_file).exists()
                    )
                ],
                proposed_patch=(
                    f"--- a/{target_file}\n"
                    f"+++ b/{target_file}\n"
                    "@@ -44,3 +44,3 @@\n"
                    "-    for i in range(1, len(numbers)):\n"
                    "+    for i in range(0, len(numbers)):\n"
                    "         if numbers[i] > 0:\n"
                ),
                regression_test=(
                    "from app.calculator import find_first_positive\n\n"
                    "def test_find_first_positive_at_index_zero():\n"
                    "    assert find_first_positive([10, -1, 5]) == 10\n"
                ),
                verification_status="patch_proposed",
                model_used=None,
                is_demo_preset=True
            )

    # Generic Real Repository AST Inspection (when not demo preset)
    top_file = evidence[0].file_path if evidence else "unknown"
    s_line = evidence[0].start_line if evidence else 1
    e_line = evidence[0].end_line if evidence else 10
    snippet = evidence[0].snippet if evidence else "# No direct code snippet located"

    # Inspect AST symbols in the candidate file
    ast_findings: list[str] = []
    if top_file != "unknown":
        target = repo_dir / top_file
        if target.exists() and target.suffix == ".py":
            try:
                code_content, _, _ = read_repo_file(repo_dir, top_file)
                _, symbols, _ = parse_python_ast(code_content)
                symbol_names = [s.name for s in symbols]
                if symbol_names:
                    ast_findings.append(f"Parsed {len(symbol_names)} AST symbol(s): {', '.join(symbol_names[:5])}")
            except Exception:
                pass

    return BugReportResponse(
        bug_id=bug_id,
        title=f"AST Evidence Collected for {top_file}",
        severity="Low",
        severity_disclaimer="Severity is an automated heuristic estimate, not a verified security classification.",
        explanation=(
            f"Deterministic AST Inspection: Located relevant source snippets matching query '{request.bug_description}'. "
            f"Ollama AI inference is currently offline; generative root-cause analysis is unavailable. "
            f"{' '.join(ast_findings)}"
        ),
        root_cause=f"Candidate code region located in {top_file} at lines {s_line}-{e_line}.",
        reproduction_conditions=f"Triggered by issue description: {request.bug_description}",
        affected_file=top_file,
        line_range=[s_line, e_line],
        citations=[
            Citation(
                file_path=top_file,
                start_line=s_line,
                end_line=e_line,
                snippet=snippet,
                verified_exists=(repo_dir / top_file).exists()
            )
        ],
        proposed_patch="",
        regression_test="",
        verification_status="evidence_collected",
        model_used=None,
        is_demo_preset=False
    )
