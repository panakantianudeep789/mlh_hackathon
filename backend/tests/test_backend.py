import asyncio
import io
import stat
import time
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.database import init_db
from app.main import app
from app.models.schemas import BugAnalyzeRequest
from app.services.ast_service import parse_python_ast
from app.services.benchmark_service import export_benchmark_csv, run_evaluation_benchmark
from app.services.bug_service import analyze_repository_bug
from app.services.ollama_service import is_exact_model_match, repair_json_output
from app.services.patch_service import (
    apply_patch_to_working_copy,
    compute_content_hash,
    rollback_single_patch,
    validate_patch,
)
from app.services.repo_service import (
    extract_zip_safely,
    is_safe_path,
    is_secret_file,
    validate_archive_member_path,
)
from app.services.search_service import search_repository
from app.services.skill_service import load_repository_debugger_skill, validate_agent_skill
from app.services.test_runner_service import (
    build_docker_run_command,
    is_docker_available,
    run_pytest_in_sandbox,
)

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def ensure_demo_repo_ready():
    init_db()
    client.post("/api/repositories/load-demo")


# ==============================================================
# 1. HEALTH AND STATUS TESTS
# ==============================================================

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "ollama_connected" in data
    assert "docker_available" in data
    assert "allow_host_execution" in data


def test_model_status_endpoint():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert "model" in data
    assert "available_models" in data


# ==============================================================
# 2. REPOSITORY MANAGEMENT & SECURITY TESTS (PHASE 4)
# ==============================================================

def test_load_demo_repository():
    response = client.post("/api/repositories/load-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "DEMO-BUGGY-PROJECT"
    assert data["file_count"] > 0
    assert ".py" in data["languages"]


def test_list_repositories():
    response = client.get("/api/repositories")
    assert response.status_code == 200
    repos = response.json()
    assert isinstance(repos, list)
    assert any(r["id"] == "DEMO-BUGGY-PROJECT" for r in repos)


def test_file_tree_and_file_content():
    response = client.get("/api/repositories/DEMO-BUGGY-PROJECT/files")
    assert response.status_code == 200
    files = response.json()
    assert len(files) > 0

    file_resp = client.get("/api/repositories/DEMO-BUGGY-PROJECT/file?path=app/calculator.py")
    assert file_resp.status_code == 200
    file_data = file_resp.json()
    assert "def average(" in file_data["content"]
    assert file_data["is_parsed"] is True
    assert len(file_data["symbols"]) > 0


def test_security_path_traversal_rejection():
    resp = client.get("/api/repositories/DEMO-BUGGY-PROJECT/file?path=../../../../windows/system32/cmd.exe")
    assert resp.status_code in (400, 403, 404)


def test_security_secret_file_exclusion():
    assert is_secret_file(".env") is True
    assert is_secret_file("id_rsa") is True
    assert is_secret_file("credentials.json") is True
    assert is_secret_file("main.py") is False


def test_security_zip_slip_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("../../evil.txt", "malicious payload")
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="(?i)path traversal"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest1")


def test_security_zip_absolute_path_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("/etc/passwd", "root:x:0:0")
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="Absolute archive paths are forbidden"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest2")


def test_security_zip_windows_drive_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("C:evil.py", "print('hacked')")
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="drive or stream specifier"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest3")


def test_security_zip_symlink_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zinfo = zipfile.ZipInfo("symlink_entry")
        zinfo.external_attr = (stat.S_IFLNK | 0o777) << 16
        zf.writestr(zinfo, "/etc/shadow")
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="Symbolic links are not allowed"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest4")


def test_security_zip_bomb_ratio_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    large_zeros = b"\x00" * (10 * 1024 * 1024)
    with zipfile.ZipFile(zip_buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("bomb.txt", large_zeros)
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="per-file limit|suspicious compression ratio"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest5")


def test_security_zip_duplicate_entries_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("module/app.py", "x = 1")
        zf.writestr("module/app.py", "x = 2")
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="Duplicate archive entry"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest6")


def test_legitimate_filenames_with_periods(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("app/my..calculator..v2.py", "def add(a, b): return a + b")
    zip_buffer.seek(0)

    dest = tmp_path / "dest7"
    count, _ = extract_zip_safely(zip_buffer.getvalue(), dest)
    assert count == 1
    assert (dest / "app" / "my..calculator..v2.py").exists()


def test_empty_zip_rejection(tmp_path):
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        pass
    zip_buffer.seek(0)

    with pytest.raises(ValueError, match="Archive is empty"):
        extract_zip_safely(zip_buffer.getvalue(), tmp_path / "dest8")


# ==============================================================
# 3. AST PARSING TESTS
# ==============================================================

def test_ast_python_symbol_extraction():
    code = (
        "def calculate_tax(amount: float) -> float:\n"
        "    '''Compute tax amount.'''\n"
        "    return amount * 0.15\n\n"
        "class AccountManager:\n"
        "    def deposit(self, val: float):\n"
        "        pass\n"
    )
    is_parsed, symbols, err = parse_python_ast(code)
    assert is_parsed is True
    assert err is None
    names = [s.name for s in symbols]
    assert "calculate_tax" in names
    assert "AccountManager" in names
    assert "AccountManager.deposit" in names

    tax_sym = next(s for s in symbols if s.name == "calculate_tax")
    assert tax_sym.start_line == 1
    assert tax_sym.end_line == 3
    assert tax_sym.docstring == "Compute tax amount."


def test_ast_syntax_error_handling():
    broken_code = "def invalid_syntax(:\n    pass"
    is_parsed, symbols, err = parse_python_ast(broken_code)
    assert is_parsed is False
    assert err is not None
    assert "Syntax error" in err


# ==============================================================
# 4. REPOSITORY SEARCH TESTS
# ==============================================================

def test_search_repository():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    res = search_repository(demo_dir, "average", limit=10)
    assert res.total_results > 0
    assert any("calculator.py" in r.file_path for r in res.results)
    match = next(r for r in res.results if "calculator.py" in r.file_path)
    assert match.line_number > 0
    assert len(match.preview_snippet) > 0


# ==============================================================
# 5. AGENT SKILL SPECIFICATION TESTS
# ==============================================================

def test_load_default_agent_skill():
    skill = load_repository_debugger_skill()
    assert skill.name == "repository-debugger"
    assert skill.is_valid is True
    assert len(skill.validation_errors) == 0
    assert "description" in skill.frontmatter


def test_validate_skill_format():
    valid_skill = (
        "---\n"
        "name: test-skill\n"
        "description: A valid test agent skill\n"
        "version: 1.0.0\n"
        "---\n\n"
        "# Test Skill Guide\n"
    )
    res = validate_agent_skill(valid_skill, "test-skill")
    assert res.is_valid is True
    assert res.skill_name == "test-skill"
    assert res.directory_matches_name is True

    mismatch_res = validate_agent_skill(valid_skill, "other-name")
    assert mismatch_res.is_valid is False
    assert any("does not match" in e for e in mismatch_res.errors)

    missing_desc = "---\nname: test-skill\n---\n"
    miss_res = validate_agent_skill(missing_desc, "test-skill")
    assert miss_res.is_valid is False
    assert any("description" in e for e in miss_res.errors)


# ==============================================================
# 6. PATCH VALIDATION, HASHING & ROLLBACK TESTS (PHASE 5)
# ==============================================================

def test_patch_validation_and_diff():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    orig_code = (demo_dir / "app" / "calculator.py").read_text(encoding="utf-8")
    modified_code = orig_code.replace("return sum(numbers) / len(numbers)", "if not numbers: raise ValueError\n    return sum(numbers) / len(numbers)")

    val = validate_patch(demo_dir, "app/calculator.py", modified_code)
    assert val.is_valid is True
    assert val.additions > 0
    assert val.source_hash == compute_content_hash(orig_code)
    assert val.stale_patch is False
    assert "--- a/app/calculator.py" in val.unified_diff


def test_patch_stale_detection():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    orig_code = (demo_dir / "app" / "calculator.py").read_text(encoding="utf-8")
    modified_code = orig_code.replace("return sum(numbers) / len(numbers)", "return 0")

    fake_old_hash = "deadbeef12345678"
    val = validate_patch(demo_dir, "app/calculator.py", modified_code, expected_source_hash=fake_old_hash)
    assert val.is_valid is False
    assert val.stale_patch is True
    assert any("Stale patch detected" in e for e in val.errors)


def test_patch_syntax_validation():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    bad_syntax_code = "def syntax_broken(:\n    return 42"
    val = validate_patch(demo_dir, "app/calculator.py", bad_syntax_code)
    assert val.is_valid is False
    assert any("syntax error" in e.lower() for e in val.errors)


def test_patch_application_and_single_rollback():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    orig_code = (demo_dir / "app" / "calculator.py").read_text(encoding="utf-8")
    valid_patch = orig_code.replace("def average(", "def average_patched(")

    # Apply to working copy
    applied, msg = apply_patch_to_working_copy(
        repo_dir=demo_dir,
        repo_id="DEMO-BUGGY-PROJECT",
        file_path_str="app/calculator.py",
        proposed_code=valid_patch,
        backup_first=True
    )
    assert applied is True

    # Verify working copy has the change
    work_file = settings.RUNS_DIR / "DEMO-BUGGY-PROJECT_work" / "app" / "calculator.py"
    assert "def average_patched(" in work_file.read_text(encoding="utf-8")

    # Original remains untouched
    assert "def average(" in (demo_dir / "app" / "calculator.py").read_text(encoding="utf-8")

    # Single rollback
    rolled_back, roll_msg = rollback_single_patch(
        repo_dir=demo_dir,
        repo_id="DEMO-BUGGY-PROJECT",
        file_path_str="app/calculator.py"
    )
    assert rolled_back is True
    assert "def average(" in work_file.read_text(encoding="utf-8")


# ==============================================================
# 7. OLLAMA INTEGRATION & PROVENANCE TESTS (PHASE 6)
# ==============================================================

def test_exact_model_match():
    assert is_exact_model_match("qwen2.5-coder:7b", "qwen2.5-coder:7b") is True
    assert is_exact_model_match("qwen2.5-coder:7b", "qwen2.5-coder:1.5b") is False
    assert is_exact_model_match("qwen2.5-coder:7b", "qwen2.5-coder:32b") is False
    assert is_exact_model_match("qwen2.5-coder:7b", "llama3:8b") is False


def test_repair_json_output():
    assert repair_json_output('{"title": "Test"}') == {"title": "Test"}

    markdown_json = "```json\n{\n  \"title\": \"Bug\"\n}\n```"
    assert repair_json_output(markdown_json) == {"title": "Bug"}

    conv_json = "Here is the diagnosis:\n{\n  \"title\": \"Syntax Bug\",\n}\nHope this helps!"
    res = repair_json_output(conv_json)
    assert res is not None
    assert res.get("title") == "Syntax Bug"


# ==============================================================
# 8. BUG DETECTIVE LIFECYCLE TESTS (PHASE 7)
# ==============================================================

def test_bug_detective_analysis():
    async def _run():
        demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
        req = BugAnalyzeRequest(
            repository_id="DEMO-BUGGY-PROJECT",
            bug_description="average() raises ZeroDivisionError when passed an empty list []",
            target_file="app/calculator.py"
        )
        report = await analyze_repository_bug(demo_dir, req)
        assert report.bug_id.startswith("BUG-")
        assert report.affected_file == "app/calculator.py"
        assert len(report.citations) > 0
        assert report.verification_status in ("patch_proposed", "evidence_collected")
        assert report.is_demo_preset is True or report.model_used is not None
    asyncio.run(_run())


# ==============================================================
# 9. DOCKER SECURITY & ISOLATION TESTS (PHASE 2)
# ==============================================================

def test_docker_command_security_flags(tmp_path):
    cmd = build_docker_run_command(
        container_name="repopilot-test-container",
        target_dir=tmp_path / "repo",
        test_target="/workspace/tests/test_run.py"
    )
    cmd_str = " ".join(cmd)
    assert "--network none" in cmd_str
    assert "--security-opt no-new-privileges" in cmd_str
    assert "--cap-drop ALL" in cmd_str
    assert "--memory 512m" in cmd_str
    assert "--cpus 1.0" in cmd_str
    assert "--pids-limit 64" in cmd_str
    assert "--user 1000:1000" in cmd_str
    assert "--rm" in cmd_str
    assert "docker.sock" not in cmd_str


def test_test_runner_blocked_when_docker_missing():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    if not is_docker_available():
        res = run_pytest_in_sandbox(
            repo_dir=demo_dir,
            repo_id="DEMO-BUGGY-PROJECT",
            test_code="def test_sample(): assert 1 == 1",
            allow_host_execution=False
        )
        assert res.status == "environment_unavailable"
        assert res.isolation_mode == "unavailable"
        assert res.exit_code == 126
        assert "Docker" in (res.warning or "")


def test_test_runner_opt_in_execution():
    demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
    res = run_pytest_in_sandbox(
        repo_dir=demo_dir,
        repo_id="DEMO-BUGGY-PROJECT",
        test_code="def test_add(): assert 1 + 1 == 2",
        allow_host_execution=True
    )
    assert res.status == "passed"
    assert res.exit_code == 0
    assert res.duration_ms > 0
    assert "passed" in res.stdout


# ==============================================================
# 10. BENCHMARK 14-STEP EVALUATION TESTS (PHASE 3)
# ==============================================================

def test_benchmark_14_step_evaluation():
    async def _run():
        demo_dir = settings.REPOS_DIR / "DEMO-BUGGY-PROJECT"
        summary = await run_evaluation_benchmark(
            repo_dir=demo_dir,
            repo_id="DEMO-BUGGY-PROJECT",
            allow_host_execution=True
        )
        assert summary.run_id.startswith("BENCH-")
        assert summary.total_cases == 10
        assert len(summary.results) == 10

        for case_res in summary.results:
            assert isinstance(case_res.retrieval_success, bool)
            assert isinstance(case_res.location_success, bool)
            assert isinstance(case_res.diagnosis_correctness, bool)
            assert isinstance(case_res.regression_reproduced, bool)
            assert isinstance(case_res.patch_applied, bool)
            assert isinstance(case_res.patch_verified, bool)
            assert isinstance(case_res.existing_tests_passing, bool)
            assert case_res.duration_ms > 0

        csv_text = export_benchmark_csv([r.model_dump() for r in summary.results])
        assert "case_id,title,relevant_file" in csv_text
        assert "CASE-01" in csv_text
    asyncio.run(_run())
