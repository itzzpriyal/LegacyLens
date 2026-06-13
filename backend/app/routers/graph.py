from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Project, SourceFile, Dependency
from app.schemas import DependencyGraph, GraphNode, GraphEdge

router = APIRouter()


@router.get("/{project_id}/graph", response_model=DependencyGraph)
def get_graph(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    files = db.query(SourceFile).filter(SourceFile.project_id == project_id).all()
    deps = db.query(Dependency).filter(Dependency.project_id == project_id).all()

    nodes = [
        GraphNode(
            id=f.id,
            label=f.relative_path.split("/")[-1],
            risk_score=f.risk_score,
            risk_level=f.risk_level.value if f.risk_level else "Low",
            language=f.language,
            loc=f.loc,
            num_functions=f.num_functions,
            num_classes=f.num_classes,
        )
        for f in files
    ]

    edges = [
        GraphEdge(
            id=d.id,
            source=d.source_file_id,
            target=d.target_file_id,
            dep_type=d.dep_type,
        )
        for d in deps
    ]

    return DependencyGraph(nodes=nodes, edges=edges)
