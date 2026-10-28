
from fastapi import APIRouter, HTTPException

from app.models.schemas import SkillDetailResponse, SkillValidateRequest, SkillValidateResponse
from app.services.skill_service import load_repository_debugger_skill, validate_agent_skill

router = APIRouter(prefix="/skills", tags=["Agent Skills"])


@router.get("", response_model=list[SkillDetailResponse])
async def list_agent_skills():
    # Return the official repository-debugger skill
    skill = load_repository_debugger_skill()
    return [skill]


@router.get("/{skill_name}", response_model=SkillDetailResponse)
async def get_agent_skill(skill_name: str):
    if skill_name != "repository-debugger":
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found.")
    return load_repository_debugger_skill()


@router.post("/validate", response_model=SkillValidateResponse)
async def validate_skill_endpoint(req: SkillValidateRequest):
    if not req.skill_content:
        # Default to validating on-disk skill
        skill = load_repository_debugger_skill()
        return validate_agent_skill(skill.raw_content, req.directory_name or "repository-debugger")
    return validate_agent_skill(req.skill_content, req.directory_name)
