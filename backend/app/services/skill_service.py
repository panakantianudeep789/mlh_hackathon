from typing import Any

import yaml

from app.core.config import settings
from app.models.schemas import SkillDetailResponse, SkillValidateResponse


def parse_skill_file(content: str) -> tuple[dict[str, Any], str, str | None]:
    """Extract YAML frontmatter and markdown body from SKILL.md."""
    if not content.startswith("---"):
        return {}, content, "File does not start with YAML frontmatter delimiter '---'"

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content, "Malformed frontmatter: missing closing delimiter '---'"

    frontmatter_raw = parts[1]
    body = parts[2]

    try:
        data = yaml.safe_load(frontmatter_raw)
        if not isinstance(data, dict):
            return {}, body, "Frontmatter must be a valid YAML dictionary."
        return data, body, None
    except Exception as e:
        return {}, body, f"YAML parsing error: {e!s}"


def validate_agent_skill(
    skill_content: str,
    directory_name: str | None = None
) -> SkillValidateResponse:
    """Validate skill against the official Agent Skills specification."""
    errors: list[str] = []
    warnings: list[str] = []

    frontmatter, _, parse_err = parse_skill_file(skill_content)
    if parse_err:
        errors.append(parse_err)
        return SkillValidateResponse(
            is_valid=False,
            skill_name=None,
            directory_matches_name=False,
            required_fields_present=False,
            errors=errors,
            warnings=warnings
        )

    # 1. Required field: name
    name = frontmatter.get("name")
    if not name or not str(name).strip():
        errors.append("Missing required field: 'name' in frontmatter.")

    # 2. Required field: description
    desc = frontmatter.get("description")
    if not desc or not str(desc).strip():
        errors.append("Missing required field: 'description' in frontmatter.")

    # 3. Directory name consistency
    dir_matches = True
    if directory_name and name:
        if directory_name.lower() != str(name).lower():
            errors.append(f"Directory name '{directory_name}' does not match skill name '{name}'.")
            dir_matches = False

    # 4. Recommended tags or version
    if "version" not in frontmatter:
        warnings.append("Recommended field 'version' is omitted.")

    is_valid = len(errors) == 0
    return SkillValidateResponse(
        is_valid=is_valid,
        skill_name=str(name) if name else None,
        directory_matches_name=dir_matches,
        required_fields_present=(bool(name) and bool(desc)),
        errors=errors,
        warnings=warnings
    )


def load_repository_debugger_skill() -> SkillDetailResponse:
    """Load and validate the default repository-debugger skill."""
    skill_dir = settings.SKILLS_DIR / "repository-debugger"
    skill_file = skill_dir / "SKILL.md"

    if not skill_file.exists():
        return SkillDetailResponse(
            name="repository-debugger",
            description="Autonomous repository investigation and verification.",
            directory_name="repository-debugger",
            file_path=str(skill_file),
            raw_content="# Skill file not found",
            frontmatter={},
            is_valid=False,
            validation_errors=["SKILL.md file not found on disk."]
        )

    try:
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()

        frontmatter, body, err = parse_skill_file(content)
        val = validate_agent_skill(content, "repository-debugger")

        return SkillDetailResponse(
            name=frontmatter.get("name", "repository-debugger"),
            description=frontmatter.get("description", ""),
            directory_name="repository-debugger",
            file_path=str(skill_file),
            raw_content=content,
            frontmatter=frontmatter,
            is_valid=val.is_valid,
            validation_errors=val.errors
        )
    except Exception as e:
        return SkillDetailResponse(
            name="repository-debugger",
            description="Error loading skill",
            directory_name="repository-debugger",
            file_path=str(skill_file),
            raw_content="",
            frontmatter={},
            is_valid=False,
            validation_errors=[str(e)]
        )
