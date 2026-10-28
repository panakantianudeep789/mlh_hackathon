import os
from pathlib import Path

from app.models.schemas import SearchResponse, SearchResultItem
from app.services.ast_service import extract_text_symbols, parse_python_ast
from app.services.repo_service import is_ignored, is_safe_path, is_secret_file


def search_repository(repo_dir: Path, query: str, search_type: str = "all", limit: int = 25) -> SearchResponse:
    """
    Search repository by filename, AST symbol, or source line content.
    Returns real matching locations with exact line numbers and context snippets.
    """
    if not query or not query.strip():
        return SearchResponse(query=query, total_results=0, results=[])

    q_lower = query.strip().lower()
    results: list[SearchResultItem] = []

    for root, dirs, files in os.walk(repo_dir):
        rel_root = os.path.relpath(root, repo_dir)
        if rel_root != "." and is_ignored(rel_root):
            dirs[:] = []
            continue

        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(rel_root, d) if rel_root != "." else d)]

        for file in sorted(files):
            rel_file = os.path.join(rel_root, file) if rel_root != "." else file
            if is_ignored(rel_file) or is_secret_file(rel_file):
                continue

            file_path = repo_dir / rel_file
            if not is_safe_path(repo_dir, file_path):
                continue

            # 1. Filename match
            if search_type in ("all", "filename") and q_lower in file.lower():
                results.append(SearchResultItem(
                    file_path=rel_file.replace("\\", "/"),
                    line_number=1,
                    match_type="filename",
                    preview_snippet=f"File: {rel_file}",
                    symbol_name=None
                ))
                if len(results) >= limit:
                    return SearchResponse(query=query, total_results=len(results), results=results)

            # Read file content safely
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            except Exception:
                continue

            # 2. Symbol match
            if search_type in ("all", "symbol"):
                is_py = file_path.suffix.lower() == ".py"
                if is_py:
                    _, symbols, _ = parse_python_ast(content)
                else:
                    _, symbols, _ = extract_text_symbols(content, file)

                for sym in symbols:
                    if q_lower in sym.name.lower():
                        results.append(SearchResultItem(
                            file_path=rel_file.replace("\\", "/"),
                            line_number=sym.start_line,
                            match_type="symbol",
                            preview_snippet=f"{sym.type} {sym.name} (lines {sym.start_line}-{sym.end_line})",
                            symbol_name=sym.name
                        ))
                        if len(results) >= limit:
                            return SearchResponse(query=query, total_results=len(results), results=results)

            # 3. Content line match
            if search_type in ("all", "content"):
                lines = content.splitlines()
                for idx, line in enumerate(lines, start=1):
                    if q_lower in line.lower():
                        # Build context snippet (1 line before, matching line, 1 line after)
                        start_ctx = max(0, idx - 2)
                        end_ctx = min(len(lines), idx + 1)
                        snippet_lines = lines[start_ctx:end_ctx]
                        snippet = "\n".join(snippet_lines).strip()

                        results.append(SearchResultItem(
                            file_path=rel_file.replace("\\", "/"),
                            line_number=idx,
                            match_type="content",
                            preview_snippet=snippet[:250],
                            symbol_name=None
                        ))
                        if len(results) >= limit:
                            return SearchResponse(query=query, total_results=len(results), results=results)

    return SearchResponse(query=query, total_results=len(results), results=results)
