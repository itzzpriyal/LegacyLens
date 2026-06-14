from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Project, SourceFile, ProjectStatus, RiskLevel
from app.schemas import AIRecommendationRequest
from app.services.ai_service import generate_file_recommendation, generate_roadmap_narrative
from app.services.roadmap_engine import generate_roadmap

router = APIRouter()


@router.post("/{project_id}/recommendations")
def generate_recommendations(
    project_id: str,
    body: AIRecommendationRequest,
    db: Session = Depends(get_db),
):
    """Generate AI recommendations for all high/critical files in a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != ProjectStatus.COMPLETE:
        raise HTTPException(status_code=400, detail="Analysis must complete before generating recommendations")

    high_risk_files = (
        db.query(SourceFile)
        .filter(
            SourceFile.project_id == project_id,
            SourceFile.risk_level.in_([RiskLevel.HIGH, RiskLevel.CRITICAL]),
        )
        .order_by(SourceFile.risk_score.desc())
        .limit(20)
        .all()
    )

    api_key = body.api_key or ""
    updated = []

    for f in high_risk_files:
        rec = generate_file_recommendation(f, api_key=api_key, provider=body.provider)
        f.ai_recommendation = rec
        db.add(f)
        updated.append({"file_id": f.id, "path": f.relative_path, "recommendation": rec})

    project.status = ProjectStatus.AI_PROCESSING
    db.commit()
    project.status = ProjectStatus.COMPLETE
    db.commit()

    return {"updated": len(updated), "recommendations": updated}


@router.post("/{project_id}/roadmap-narrative")
def generate_narrative(
    project_id: str,
    body: AIRecommendationRequest,
    db: Session = Depends(get_db),
):
    """Generate an AI executive narrative for the migration roadmap."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    phases = generate_roadmap(files)
    narrative = generate_roadmap_narrative(project, phases, api_key=body.api_key or "", provider=body.provider)

    return {"narrative": narrative}
