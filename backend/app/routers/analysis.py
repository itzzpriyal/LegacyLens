from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.models import Project, SourceFile, RiskLevel
from app.schemas import SourceFileOut, FileList, DashboardSummary, RiskDistribution, ProjectOut

router = APIRouter()


@router.get("/{project_id}/files", response_model=FileList)
def get_files(
    project_id: str,
    language: Optional[str] = None,
    risk_level: Optional[str] = None,
    sort_by: str = "risk_score",
    order: str = "desc",
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    q = db.query(SourceFile).filter(SourceFile.project_id == project_id)
    if language:
        q = q.filter(SourceFile.language == language.lower())
    if risk_level:
        try:
            lvl = RiskLevel(risk_level)
            q = q.filter(SourceFile.risk_level == lvl)
        except ValueError:
            pass

    sort_col = getattr(SourceFile, sort_by, SourceFile.risk_score)
    if order == "desc":
        q = q.order_by(sort_col.desc())
    else:
        q = q.order_by(sort_col.asc())

    total = q.count()
    files = q.offset(offset).limit(limit).all()
    return FileList(files=files, total=total)


@router.get("/{project_id}/files/{file_id}", response_model=SourceFileOut)
def get_file(project_id: str, file_id: str, db: Session = Depends(get_db)):
    f = db.query(SourceFile).filter(
        SourceFile.id == file_id,
        SourceFile.project_id == project_id
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return f


@router.get("/{project_id}/dashboard", response_model=DashboardSummary)
def get_dashboard(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()

    distribution = RiskDistribution(
        low=sum(1 for f in files if f.risk_level == RiskLevel.LOW),
        medium=sum(1 for f in files if f.risk_level == RiskLevel.MEDIUM),
        high=sum(1 for f in files if f.risk_level == RiskLevel.HIGH),
        critical=sum(1 for f in files if f.risk_level == RiskLevel.CRITICAL),
    )

    top_risky = sorted(files, key=lambda f: f.risk_score, reverse=True)[:10]
    top_debt = sorted(files, key=lambda f: f.debt_score, reverse=True)[:10]

    return DashboardSummary(
        project=project,
        risk_distribution=distribution,
        top_risky_files=top_risky,
        top_debt_files=top_debt,
    )
