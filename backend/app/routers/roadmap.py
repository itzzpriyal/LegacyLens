from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Project, SourceFile
from app.schemas import MigrationRoadmap
from app.services.roadmap_engine import generate_roadmap

router = APIRouter()


@router.get("/{project_id}/roadmap", response_model=MigrationRoadmap)
def get_roadmap(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    phases_data = generate_roadmap(files)

    phases = []
    from app.schemas import RoadmapPhase
    for p in phases_data:
        phases.append(RoadmapPhase(
            phase_number=p["phase_number"],
            name=p["name"],
            description=p["description"],
            files=p["files"],
            estimated_complexity=p["estimated_complexity"],
        ))

    return MigrationRoadmap(project_id=project_id, phases=phases)
