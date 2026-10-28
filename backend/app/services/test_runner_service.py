import os
import sys
import time
import uuid
import subprocess
from pathlib import Path
from app.core.config import settings
from app.core.database import record_test_execution
from app.models.schemas import TestRunResponse
from app.services.repo_service import create_or_get_working_copy


def is_docker_available() -> bool:
    """Check if Docker CLI daemon is available and accessible."""
    try:
        res = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            timeout=3,
            check=False
        )
        return res.returncode == 0
    except Exception:
        return False


def build_docker_run_command(
    container_name: str,
    target_dir: Path,
    test_target: str | None = None,
    image: str | None = None
) -> list[str]:
    """
    Build the hardened Docker execution command following strict isolation rules:
    - --network none (strictly no network access)
    - --memory 512m (RAM limit)
    - --cpus 1.0 (CPU throttle)
    - --pids-limit 64 (prevent fork bombs)
    - --security-opt no-new-privileges (disable privilege escalation)
    - --cap-drop ALL (drop all Linux capabilities)
    - --user 1000:1000 (run as unprivileged user)
    - No docker socket or host system mounts
    """
    docker_image = image or settings.DOCKER_IMAGE

    # Convert Windows path to POSIX style for docker mount
    posix_path = str(target_dir.resolve()).replace("\\", "/")

    cmd = [
        "docker", "run",
        "--name", container_name,
        "--rm",
        "--network", "none",
        "--memory", "512m",
        "--cpus", "1.0",
        "--pids-limit", "64",
        "--security-opt", "no-new-privileges",
        "--cap-drop", "ALL",
        "--user", "1000:1000",
        "-v", f"{posix_path}:/workspace:rw",
        "--workdir", "/workspace",
        "--env", "PYTHONDONTWRITEBYTECODE=1",
        docker_image,
        "python", "-m", "pytest", "-v", "--tb=short"
    ]

    if test_target:
        clean_target = test_target.replace("\\", "/").strip("/")
        cmd.append(clean_target)

    return cmd


def run_pytest_in_sandbox(
    repo_dir: Path,
    repo_id: str,
    test_code: str | None = None,
    test_file_path: str | None = None,
    timeout_seconds: int | None = 30,
    use_working_copy: bool = True,
    allow_host_execution: bool = False
) -> TestRunResponse:
    """
    Execute pytest inside a secure Docker container sandbox with resource limits,
    no network access, non-root user, and timeout enforcement.

    If Docker is unavailable:
    - Fails safely with status='environment_unavailable' by default.
    - Runs on host ONLY if explicitly opted in via allow_host_execution=True with loud warnings.
    """
    execution_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
    timeout = timeout_seconds or settings.TEST_TIMEOUT_SECONDS
    docker_ok = is_docker_available()

    # Use the isolated working copy so original source code is preserved
    target_dir = create_or_get_working_copy(repo_dir, repo_id) if use_working_copy else repo_dir

    # Write dynamically generated test to a temporary test file if provided
    temp_test_created = False
    run_file_target = test_file_path

    if test_code and test_code.strip():
        tests_dir = target_dir / "tests"
        tests_dir.mkdir(parents=True, exist_ok=True)
        gen_test_path = tests_dir / f"test_repopilot_gen_{execution_id}.py"
        try:
            with open(gen_test_path, "w", encoding="utf-8") as f:
                f.write(test_code)
            temp_test_created = True
            run_file_target = f"tests/{gen_test_path.name}"
        except Exception as e:
            return TestRunResponse(
                execution_id=execution_id,
                repository_id=repo_id,
                status="error",
                exit_code=1,
                stdout="",
                stderr=f"Failed to prepare regression test file: {e!s}",
                duration_ms=0.0,
                isolation_mode="unavailable",
                warning="Failed to write regression test file."
            )

    # CASE A: Docker Container Sandbox (The genuine secure runner)
    if docker_ok:
        container_name = f"repopilot-runner-{execution_id.lower()}"
        cmd = build_docker_run_command(container_name, target_dir, run_file_target)

        start_time = time.perf_counter()
        status = "failed"
        exit_code = 1
        stdout_text = ""
        stderr_text = ""

        try:
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            exit_code = process.returncode
            stdout_text = process.stdout or ""
            stderr_text = process.stderr or ""

            # Check for Docker infrastructure errors (e.g. image not found, docker daemon issue)
            if exit_code in (125, 126, 127):
                status = "infrastructure_error"
                warning = f"Docker infrastructure error: {stderr_text.strip()}"
            elif exit_code == 0:
                status = "passed"
            else:
                status = "failed"

        except subprocess.TimeoutExpired as te:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            status = "timed_out"
            exit_code = 124
            stdout_text = te.stdout or "" if isinstance(te.stdout, str) else ""
            stderr_text = f"Container execution timed out after {timeout} seconds."

            # Ensure timed-out container is forcefully killed and removed
            try:
                subprocess.run(["docker", "rm", "-f", container_name], capture_output=True, timeout=5, check=False)
            except Exception:
                pass

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            status = "infrastructure_error"
            exit_code = 1
            stderr_text = f"Docker container execution failed: {e!s}"

        finally:
            if temp_test_created and gen_test_path.exists():
                try:
                    gen_test_path.unlink()
                except Exception:
                    pass

        record_test_execution(
            execution_id=execution_id,
            repo_id=repo_id,
            test_type="pytest_docker",
            exit_code=exit_code,
            status=status,
            duration_ms=round(duration_ms, 2),
            stdout=stdout_text,
            stderr=stderr_text
        )

        return TestRunResponse(
            execution_id=execution_id,
            repository_id=repo_id,
            status=status,
            exit_code=exit_code,
            stdout=stdout_text,
            stderr=stderr_text,
            duration_ms=round(duration_ms, 2),
            isolation_mode="docker_container",
            container_id=container_name,
            warning=None
        )

    # CASE B: Docker is NOT Available
    # Check if host execution was explicitly permitted
    host_permitted = allow_host_execution or settings.ALLOW_HOST_EXECUTION

    if not host_permitted:
        # Default behavior: Safe by design! Refuse to execute untrusted code on host.
        if temp_test_created and gen_test_path.exists():
            try:
                gen_test_path.unlink()
            except Exception:
                pass

        guidance = (
            "Test execution is disabled because Docker container isolation is unavailable on this host.\n"
            "RepoPilot AI requires Docker to securely run untrusted repository tests with memory limits, "
            "disabled networking, and non-root execution.\n\n"
            "To enable secure verification:\n"
            "1. Install Docker Desktop from https://www.docker.com/\n"
            "2. Start the Docker daemon\n"
            "3. Ensure 'docker info' succeeds in your terminal.\n\n"
            "⚠️ Development Only: If you are testing a trusted local repository, you may explicitly opt into "
            "Restricted Host Execution in Settings or via API parameter 'allow_host_execution=true'."
        )

        record_test_execution(
            execution_id=execution_id,
            repo_id=repo_id,
            test_type="pytest_blocked",
            exit_code=126,
            status="environment_unavailable",
            duration_ms=0.0,
            stdout="",
            stderr=guidance
        )

        return TestRunResponse(
            execution_id=execution_id,
            repository_id=repo_id,
            status="environment_unavailable",
            exit_code=126,
            stdout="",
            stderr=guidance,
            duration_ms=0.0,
            isolation_mode="unavailable",
            warning="Docker container isolation unavailable. Test execution blocked for safety.",
            setup_guidance=guidance
        )

    # CASE C: Explicitly Opted-In Restricted Host Subprocess (Development Only with Loud Warnings)
    python_exe = sys.executable
    cmd = [python_exe, "-m", "pytest", "-v", "--tb=short"]
    if run_file_target:
        cmd.append(run_file_target)

    env = os.environ.copy()
    env["PYTHONPATH"] = str(target_dir)
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    start_time = time.perf_counter()
    status = "failed"
    exit_code = 1
    stdout_text = ""
    stderr_text = ""
    warning = (
        "⚠️ SECURITY WARNING: Test executed on the host system without Docker container isolation! "
        "This mode was explicitly opted into. Do NOT execute untrusted repository code in this mode."
    )

    try:
        process = subprocess.run(
            cmd,
            cwd=str(target_dir),
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False
        )
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        exit_code = process.returncode
        stdout_text = process.stdout or ""
        stderr_text = process.stderr or ""
        status = "passed" if exit_code == 0 else "failed"

    except subprocess.TimeoutExpired as te:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        status = "timed_out"
        exit_code = 124
        stdout_text = te.stdout or "" if isinstance(te.stdout, str) else ""
        stderr_text = f"Execution timed out after {timeout} seconds."

    except Exception as e:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        status = "error"
        exit_code = 1
        stderr_text = f"Host test runner failed: {e!s}"

    finally:
        if temp_test_created and gen_test_path.exists():
            try:
                gen_test_path.unlink()
            except Exception:
                pass

    record_test_execution(
        execution_id=execution_id,
        repo_id=repo_id,
        test_type="pytest_host_opt_in",
        exit_code=exit_code,
        status=status,
        duration_ms=round(duration_ms, 2),
        stdout=stdout_text,
        stderr=stderr_text
    )

    return TestRunResponse(
        execution_id=execution_id,
        repository_id=repo_id,
        status=status,
        exit_code=exit_code,
        stdout=stdout_text,
        stderr=stderr_text,
        duration_ms=round(duration_ms, 2),
        isolation_mode="restricted_host_opt_in",
        warning=warning
    )
