from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
from app.database import get_db
from app.models.models import Project, SourceFile
from app.services.roadmap_engine import generate_roadmap
from app.services.ai_service import generate_executive_summary
from app.services.export_service import generate_pdf, generate_docx

router = APIRouter()


@router.get("/{project_id}/export")
def export_report(
    project_id: str,
    format: str = Query(default="pdf", regex="^(pdf|docx)$"),
    api_key: str = Query(default=""),
    db: Session = Depends(get_db),
):
    """Export the executive report as PDF or DOCX."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    if not files:
        raise HTTPException(status_code=400, detail="No files analyzed yet")

    top_risks = sorted(files, key=lambda f: f.risk_score, reverse=True)[:10]
    phases = generate_roadmap(files)
    executive_summary = generate_executive_summary(project, phases, top_risks, api_key)

    if format == "pdf":
        pdf_bytes = generate_pdf(project, files, phases, executive_summary)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{project.name}_legacylens_report.pdf"'},
        )
    else:
        docx_bytes = generate_docx(project, files, phases, executive_summary)
        return StreamingResponse(
            io.BytesIO(docx_bytes),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{project.name}_legacylens_report.docx"'},
        )

@router.get("/{project_id}/export/metadata")
def export_metadata(project_id: str, db: Session = Depends(get_db)):
    """Export metadata for all files as a ZIP archive."""
    import json
    import zipfile
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    if not files:
        raise HTTPException(status_code=400, detail="No files analyzed yet")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zf:
        for f in files:
            meta = {
                "file_id": f.id,
                "root_relative_location_path": f.relative_path,
                "language": f.language,
                "risk_score": f.risk_score,
                "risk_level": f.risk_level.value if f.risk_level else "Low"
            }
            meta_json = json.dumps(meta, indent=2)
            zf.writestr(f"{f.relative_path}.metadata.json", meta_json)
            
    return StreamingResponse(
        io.BytesIO(zip_buffer.getvalue()),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project.name}_metadata.zip"'},
    )
