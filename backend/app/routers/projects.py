import os
import shutil
import uuid
import threading
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Project, ProjectStatus, SourceType, User
from app.schemas import ProjectOut, ProjectList
from app.services.analysis_service import extract_zip, clone_github_repo, run_analysis
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


def _workspace_path(project_id: str) -> str:
    return os.path.join(settings.WORKSPACE_DIR, project_id)


def _run_analysis_bg(project_id: str, workspace_path: str, db_factory):
    """Run analysis in a background thread with its own DB session."""
    db = db_factory()
    try:
        run_analysis(project_id, workspace_path, db)
    finally:
        db.close()


def _check_project_owner(project: Project, user: User):
    if project.user_id and project.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not found")


@router.get("", response_model=ProjectList)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    projects = (
        db.query(Project)
        .filter(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return ProjectList(projects=projects, total=len(projects))


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _check_project_owner(project, current_user)
    return project


@router.post("/upload", response_model=ProjectOut)
async def upload_zip(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(default=""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a ZIP archive for analysis."""
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are supported")

    project_id = str(uuid.uuid4())
    project_name = name or os.path.splitext(file.filename)[0]

    workspace = _workspace_path(project_id)
    os.makedirs(workspace, exist_ok=True)

    zip_path = os.path.join(workspace, "upload.zip")
    content = await file.read()
    with open(zip_path, "wb") as f:
        f.write(content)

    try:
        extracted = extract_zip(zip_path, os.path.join(workspace, "src"))
    except Exception as e:
        shutil.rmtree(workspace, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Failed to extract ZIP: {e}")

    project = Project(
        id=project_id,
        user_id=current_user.id,
        name=project_name,
        source_type=SourceType.ZIP,
        source_url=file.filename,
        workspace_path=extracted,
        status=ProjectStatus.ANALYZING,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    from app.database import SessionLocal
    background_tasks.add_task(_run_analysis_bg, project_id, extracted, SessionLocal)

    return project


@router.post("/github", response_model=ProjectOut)
async def clone_repo(
    background_tasks: BackgroundTasks,
    url: str = Form(...),
    name: str = Form(default=""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Clone a public GitHub repository for analysis."""
    if not url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Only public GitHub URLs are supported")

    project_id = str(uuid.uuid4())
    repo_name = name or url.rstrip("/").split("/")[-1]

    workspace = _workspace_path(project_id)
    os.makedirs(workspace, exist_ok=True)
    src_dir = os.path.join(workspace, "src")

    project = Project(
        id=project_id,
        user_id=current_user.id,
        name=repo_name,
        source_type=SourceType.GITHUB,
        source_url=url,
        workspace_path=src_dir,
        status=ProjectStatus.INGESTING,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    try:
        clone_github_repo(url, src_dir)
    except Exception as e:
        project.status = ProjectStatus.FAILED
        project.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to clone repo: {e}")

    project.status = ProjectStatus.ANALYZING
    db.commit()

    from app.database import SessionLocal
    background_tasks.add_task(_run_analysis_bg, project_id, src_dir, SessionLocal)

    return project


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    _check_project_owner(project, current_user)
    workspace = _workspace_path(project_id)
    shutil.rmtree(workspace, ignore_errors=True)
    db.delete(project)
    db.commit()
    return {"detail": "Project deleted"}
