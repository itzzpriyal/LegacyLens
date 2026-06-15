from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from collections import defaultdict
from app.database import get_db
from app.models.models import Project, SourceFile, SecurityFinding, User
from app.schemas import SecuritySummary, SecurityFindingOut
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/{project_id}/security", response_model=SecuritySummary)
def get_security(
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

    findings = (
        db.query(SecurityFinding)
        .join(SourceFile, SecurityFinding.file_id == SourceFile.id)
        .filter(SourceFile.project_id == project_id)
        .all()
    )

    by_type = defaultdict(int)
    by_severity = defaultdict(int)
    for f in findings:
        by_type[f.finding_type] += 1
        by_severity[f.severity] += 1

    out_findings = [
        SecurityFindingOut(
            id=f.id,
            file_id=f.file_id,
            file_path=file_map.get(f.file_id, ""),
            finding_type=f.finding_type,
            severity=f.severity,
            description=f.description,
            line_number=f.line_number,
            snippet=f.snippet,
        )
        for f in findings
    ]

    return SecuritySummary(
        overall_security_score=project.overall_security_score,
        total_findings=len(findings),
        findings=out_findings,
        by_type=dict(by_type),
        by_severity=dict(by_severity),
    )
