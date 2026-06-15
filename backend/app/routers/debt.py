from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
from app.database import get_db
from app.models.models import Project, SourceFile, DebtItem, User
from app.schemas import DebtSummary, DebtItemOut
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/{project_id}/debt", response_model=DebtSummary)
def get_debt(
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
    file_map = {f.id: f.relative_path for f in files}

    items = (
        db.query(DebtItem)
        .join(SourceFile, DebtItem.file_id == SourceFile.id)
        .filter(SourceFile.project_id == project_id)
        .all()
    )

    by_category = defaultdict(int)
    for item in items:
        by_category[item.category] += 1

    out_items = [
        DebtItemOut(
            id=item.id,
            file_id=item.file_id,
            file_path=file_map.get(item.file_id, ""),
            category=item.category,
            description=item.description,
            severity=item.severity,
        )
        for item in items
    ]

    return DebtSummary(
        overall_debt_score=project.overall_debt_score,
        items=out_items,
        by_category=dict(by_category),
    )
