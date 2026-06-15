from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Project, SourceFile, User
from app.schemas import MigrationRoadmap, RoadmapPhase
from app.services.roadmap_engine import generate_roadmap
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/{project_id}/roadmap", response_model=MigrationRoadmap)
def get_roadmap(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.user_id and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    phases_data = generate_roadmap(files)

    phases = [
        RoadmapPhase(
            phase_number=p["phase_number"],
            name=p["name"],
            description=p["description"],
            files=p["files"],
            estimated_complexity=p["estimated_complexity"],
        )
        for p in phases_data
    ]

    return MigrationRoadmap(project_id=project_id, phases=phases)
