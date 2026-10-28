import json
import sqlite3
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings


def get_db_connection() -> sqlite3.Connection:
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(settings.DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        file_count INTEGER NOT NULL,
        languages_json TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_sessions (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        bug_title TEXT NOT NULL,
        findings_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(repository_id) REFERENCES repositories(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS test_executions (
        id TEXT PRIMARY KEY,
        repository_id TEXT NOT NULL,
        test_type TEXT NOT NULL,
        exit_code INTEGER NOT NULL,
        status TEXT NOT NULL,
        duration_ms REAL NOT NULL,
        stdout TEXT,
        stderr TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(repository_id) REFERENCES repositories(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS benchmark_runs (
        id TEXT PRIMARY KEY,
        total_cases INTEGER NOT NULL,
        passed_cases INTEGER NOT NULL,
        failed_cases INTEGER NOT NULL,
        results_json TEXT NOT NULL,
        duration_ms REAL NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()


def save_repository_metadata(repo_id: str, name: str, path: str, file_count: int, languages: dict[str, int], status: str = "indexed"):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(UTC).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO repositories (id, name, path, file_count, languages_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (repo_id, name, path, file_count, json.dumps(languages), status, now))
    conn.commit()
    conn.close()


def list_repositories_metadata() -> list[dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM repositories ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "path": row["path"],
            "file_count": row["file_count"],
            "languages": json.loads(row["languages_json"]),
            "status": row["status"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def get_repository_metadata(repo_id: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "path": row["path"],
        "file_count": row["file_count"],
        "languages": json.loads(row["languages_json"]),
        "status": row["status"],
        "created_at": row["created_at"],
    }


def delete_repository_metadata(repo_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
    cursor.execute("DELETE FROM analysis_sessions WHERE repository_id = ?", (repo_id,))
    cursor.execute("DELETE FROM test_executions WHERE repository_id = ?", (repo_id,))
    conn.commit()
    conn.close()


def record_analysis_session(session_id: str, repo_id: str, bug_title: str, findings: dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(UTC).isoformat()
    cursor.execute("""
        INSERT INTO analysis_sessions (id, repository_id, bug_title, findings_json, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, repo_id, bug_title, json.dumps(findings), now))
    conn.commit()
    conn.close()


def get_recent_analysis_sessions(limit: int = 5) -> list[dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analysis_sessions ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "repository_id": row["repository_id"],
            "bug_title": row["bug_title"],
            "findings": json.loads(row["findings_json"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def record_test_execution(
    execution_id: str,
    repo_id: str,
    test_type: str,
    exit_code: int,
    status: str,
    duration_ms: float,
    stdout: str,
    stderr: str
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(UTC).isoformat()
    cursor.execute("""
        INSERT INTO test_executions (id, repository_id, test_type, exit_code, status, duration_ms, stdout, stderr, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (execution_id, repo_id, test_type, exit_code, status, duration_ms, stdout, stderr, now))
    conn.commit()
    conn.close()


def get_recent_test_executions(limit: int = 5) -> list[dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM test_executions ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "repository_id": row["repository_id"],
            "test_type": row["test_type"],
            "exit_code": row["exit_code"],
            "status": row["status"],
            "duration_ms": row["duration_ms"],
            "stdout": row["stdout"],
            "stderr": row["stderr"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def record_benchmark_run(
    run_id: str,
    total: int,
    passed: int,
    failed: int,
    results: list[dict[str, Any]],
    duration_ms: float
):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now(UTC).isoformat()
    cursor.execute("""
        INSERT INTO benchmark_runs (id, total_cases, passed_cases, failed_cases, results_json, duration_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (run_id, total, passed, failed, json.dumps(results), duration_ms, now))
    conn.commit()
    conn.close()


def get_latest_benchmark_run() -> dict[str, Any] | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM benchmark_runs ORDER BY created_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "total_cases": row["total_cases"],
        "passed_cases": row["passed_cases"],
        "failed_cases": row["failed_cases"],
        "results": json.loads(row["results_json"]),
        "duration_ms": row["duration_ms"],
        "created_at": row["created_at"],
    }


# Automatically ensure tables exist on module import
init_db()
