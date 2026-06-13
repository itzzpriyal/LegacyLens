"""
Analysis Service — orchestrates the full analysis pipeline for a project.

Pipeline:
  1. Walk workspace, collect all .py and .java files
  2. Parse each file → FeatureVector
  3. Detect security findings
  4. Detect circular dependencies (graph-based)
  5. Compute risk scores
  6. Detect technical debt → persist DebtItems
  7. Build dependency edges
  8. Aggregate project-level scores
"""
import os
import hashlib
import shutil
import zipfile
from typing import List, Tuple, Dict, Set
from sqlalchemy.orm import Session
from app.models.models import Project, SourceFile, Dependency, ProjectStatus, RiskLevel
from app.services.parsers import get_parser
from app.services.risk_engine import compute_risk_score, compute_migration_readiness
from app.services.security_engine import scan_file_security, store_security_findings, compute_security_score, compute_file_security_score
from app.services.debt_engine import detect_and_store_debt, compute_debt_score, flag_circular_deps
from app.config import settings
import logging

logger = logging.getLogger(__name__)


# ── Ingestion Helpers ─────────────────────────────────────────────────────────

def extract_zip(zip_path: str, dest_dir: str) -> str:
    """Extract ZIP archive and return the root extracted directory."""
    os.makedirs(dest_dir, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)
    # If there's a single top-level folder, return it
    entries = os.listdir(dest_dir)
    if len(entries) == 1 and os.path.isdir(os.path.join(dest_dir, entries[0])):
        return os.path.join(dest_dir, entries[0])
    return dest_dir


def clone_github_repo(url: str, dest_dir: str) -> str:
    """Clone a GitHub repo and return the workspace path."""
    import git
    os.makedirs(dest_dir, exist_ok=True)
    
    sub_dir = ""
    branch = None
    if "/tree/" in url:
        parts = url.split("/tree/")
        url = parts[0]
        path_parts = parts[1].split("/")
        branch = path_parts[0]
        if len(path_parts) > 1:
            sub_dir = "/".join(path_parts[1:])
            
    if branch:
        git.Repo.clone_from(url, dest_dir, depth=1, branch=branch)
    else:
        git.Repo.clone_from(url, dest_dir, depth=1)
        
    if sub_dir:
        return os.path.join(dest_dir, sub_dir)
    return dest_dir


def collect_source_files(root: str) -> List[str]:
    """Walk directory and collect all .py and .java files."""
    supported = {".py", ".java"}
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip hidden dirs, build output, vendor directories
        dirnames[:] = [
            d for d in dirnames
            if not d.startswith(".") and d not in ("node_modules", "__pycache__", "target", "build", "dist", ".git", "venv", "env")
        ]
        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext in supported:
                found.append(os.path.join(dirpath, fname))
    return found


# ── Duplicate Code Detection ──────────────────────────────────────────────────

def detect_duplicates(file_paths: List[str]) -> Set[str]:
    """
    Heuristic: hash 8-line sliding windows per file.
    Files sharing ≥ 2 identical 8-line blocks with any other file are flagged.
    Returns set of file paths with duplicate code.
    """
    WINDOW = 8
    hash_to_files: Dict[str, List[str]] = {}

    for fp in file_paths:
        try:
            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                lines = [l.strip() for l in f if l.strip() and not l.strip().startswith(("#", "//", "/*", "*"))]
            for i in range(len(lines) - WINDOW + 1):
                block = "\n".join(lines[i:i + WINDOW])
                h = hashlib.md5(block.encode()).hexdigest()
                hash_to_files.setdefault(h, []).append(fp)
        except Exception:
            pass

    duplicated: Dict[str, int] = {}
    for h, fps in hash_to_files.items():
        if len(fps) > 1:
            unique = set(fps)
            for fp in unique:
                duplicated[fp] = duplicated.get(fp, 0) + 1

    return {fp for fp, cnt in duplicated.items() if cnt >= 2}


# ── Circular Dependency Detection ─────────────────────────────────────────────

def detect_circular_deps(edges: Dict[str, List[str]]) -> Set[str]:
    """
    Tarjan's SCC algorithm to find files involved in circular dependencies.
    `edges`: dict mapping file_path → list of imported file_paths.
    Returns set of file paths that are in any cycle.
    """
    index_counter = [0]
    stack = []
    lowlinks: Dict[str, int] = {}
    index: Dict[str, int] = {}
    on_stack: Dict[str, bool] = {}
    sccs: List[List[str]] = []

    def strongconnect(v):
        index[v] = index_counter[0]
        lowlinks[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack[v] = True

        for w in edges.get(v, []):
            if w not in index:
                strongconnect(w)
                lowlinks[v] = min(lowlinks[v], lowlinks.get(w, lowlinks[v]))
            elif on_stack.get(w, False):
                lowlinks[v] = min(lowlinks[v], index[w])

        if lowlinks[v] == index[v]:
            scc = []
            while True:
                w = stack.pop()
                on_stack[w] = False
                scc.append(w)
                if w == v:
                    break
            sccs.append(scc)

    for v in list(edges.keys()):
        if v not in index:
            try:
                strongconnect(v)
            except RecursionError:
                pass

    # Files in SCCs of size > 1 are in circular dependencies
    circular = set()
    for scc in sccs:
        if len(scc) > 1:
            circular.update(scc)
    return circular


# ── Main Analysis Pipeline ────────────────────────────────────────────────────

def run_analysis(project_id: str, workspace_path: str, db: Session) -> None:
    """Run the complete analysis pipeline for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    try:
        # Step 1: Collect files
        project.status = ProjectStatus.INGESTING
        db.commit()

        file_paths = collect_source_files(workspace_path)
        logger.info(f"Found {len(file_paths)} source files in {workspace_path}")

        # Step 2: Duplicate detection (needs all files)
        duplicated_files = detect_duplicates(file_paths)

        # Step 3: Parse each file
        project.status = ProjectStatus.ANALYZING
        db.commit()

        path_to_file: Dict[str, SourceFile] = {}
        dep_edges: Dict[str, List[str]] = {}

        for fp in file_paths:
            ext = os.path.splitext(fp)[1].lower()
            parser = get_parser(ext)
            if not parser:
                continue

            fv = parser.parse(fp, workspace_path)
            rel_path = os.path.relpath(fp, workspace_path).replace("\\", "/")

            # Scan security
            try:
                with open(fp, "r", encoding="utf-8", errors="replace") as f:
                    source = f.read()
                security_findings = scan_file_security(fp, source)
            except Exception:
                source = ""
                security_findings = []

            sec_score = compute_file_security_score(security_findings)

            sf = SourceFile(
                project_id=project_id,
                relative_path=rel_path,
                language=fv.language,
                loc=fv.loc,
                file_size_bytes=fv.file_size_bytes,
                num_classes=fv.num_classes,
                num_functions=fv.num_functions,
                cyclomatic_complexity=fv.cyclomatic_complexity,
                max_nesting_depth=fv.max_nesting_depth,
                import_count=fv.import_count,
                internal_dep_count=fv.internal_dep_count,
                external_dep_count=fv.external_dep_count,
                has_duplicate_code=(fp in duplicated_files),
                has_hardcoded_secrets=fv.has_hardcoded_secrets,
                has_hardcoded_api_keys=fv.has_hardcoded_api_keys,
                has_god_class=fv.has_god_class,
                has_long_methods=fv.has_long_methods,
                feature_vector=fv.to_dict(),
                security_score=sec_score,
            )
            db.add(sf)
            db.flush()  # Get sf.id

            store_security_findings(db, sf, security_findings)
            db.commit()
            db.refresh(sf)

            path_to_file[fp] = sf
            dep_edges[fp] = []

            # Build edges (raw import paths → we resolve after all files are loaded)
            for imp in fv.imports:
                dep_edges[fp].append(imp)

        # Step 4: Resolve import paths → file IDs for dependency edges
        # Build reverse map: module/class name → SourceFile
        path_index: Dict[str, SourceFile] = {}
        for fp, sf in path_to_file.items():
            path_index[fp] = sf
            # Index by relative path variants
            rel = sf.relative_path
            path_index[rel] = sf
            # Without extension
            path_index[os.path.splitext(rel)[0]] = sf
            path_index[os.path.splitext(rel)[0].replace("/", ".")] = sf

        # Build actual dependency DB rows
        resolved_edges: Dict[str, List[str]] = {fp: [] for fp in file_paths}

        for fp, sf in path_to_file.items():
            fv_dict = sf.feature_vector or {}
            imports = fv_dict.get("imports", [])
            for imp in imports:
                # Try to resolve to a project file
                target = _resolve_import(imp, fp, path_index, workspace_path)
                if target and target.id != sf.id:
                    dep = Dependency(
                        project_id=project_id,
                        source_file_id=sf.id,
                        target_file_id=target.id,
                        dep_type="import",
                    )
                    db.add(dep)
                    resolved_edges[fp].append(target.relative_path)

        db.commit()

        # Step 5: Detect circular dependencies
        circular_paths = detect_circular_deps({
            sf.relative_path: resolved_edges.get(fp, [])
            for fp, sf in path_to_file.items()
        })
        circular_file_ids = [
            sf.id for fp, sf in path_to_file.items()
            if sf.relative_path in circular_paths
        ]
        if circular_file_ids:
            flag_circular_deps(db, project_id, circular_file_ids)
            # Refresh objects
            for fp, sf in path_to_file.items():
                db.refresh(sf)

        # Step 6: Risk scoring
        project.status = ProjectStatus.SCORING
        db.commit()

        for fp, sf in path_to_file.items():
            fv = _rebuild_fv(sf)
            score, level, factors = compute_risk_score(fv, has_circular_dep=sf.has_circular_dep)
            sf.risk_score = score
            sf.risk_level = level
            sf.risk_factors = factors
            db.add(sf)

        db.commit()

        # Step 7: Technical debt detection
        for fp, sf in path_to_file.items():
            detect_and_store_debt(db, sf)

        db.commit()

        # Step 7.5: Generate metadata files
        import json
        for fp, sf in path_to_file.items():
            try:
                meta_path = fp + ".metadata.json"
                metadata = {
                    "file_id": sf.id,
                    "root_relative_location_path": sf.relative_path,
                    "language": sf.language,
                    "risk_score": sf.risk_score,
                    "risk_level": sf.risk_level.value if sf.risk_level else "Low"
                }
                with open(meta_path, "w", encoding="utf-8") as meta_f:
                    json.dump(metadata, meta_f, indent=2)
            except Exception as e:
                logger.warning(f"Failed to write metadata for {fp}: {e}")

        # Step 8: Aggregate project scores
        all_files = list(path_to_file.values())
        db.refresh(project)

        for sf in all_files:
            db.refresh(sf)

        project.total_files = len(all_files)
        project.avg_risk_score = (
            sum(f.risk_score for f in all_files) / len(all_files)
            if all_files else 0.0
        )
        project.overall_security_score = compute_security_score(all_files)
        project.overall_debt_score = compute_debt_score(all_files)
        project.migration_readiness_score = compute_migration_readiness(
            project.avg_risk_score,
            project.overall_debt_score,
            project.overall_security_score,
        )
        project.status = ProjectStatus.COMPLETE
        db.commit()

    except Exception as e:
        logger.error(f"Analysis failed for project {project_id}: {e}", exc_info=True)
        project.status = ProjectStatus.FAILED
        project.error_message = str(e)
        db.commit()


def _resolve_import(imp: str, current_file: str, path_index: Dict, workspace: str):
    """Try to resolve an import string to a SourceFile in the index."""
    # Try direct key
    if imp in path_index:
        return path_index[imp]
    # Try as dotted path
    dotted = imp.replace(".", "/")
    candidates = [
        dotted + ".py",
        dotted + ".java",
        dotted,
    ]
    for c in candidates:
        if c in path_index:
            return path_index[c]
    return None


def _rebuild_fv(sf: SourceFile):
    """Reconstruct a lightweight FeatureVector from a SourceFile ORM object."""
    from app.services.parsers.base import FeatureVector
    fv = FeatureVector(file_path=sf.relative_path, language=sf.language)
    fv.loc = sf.loc
    fv.file_size_bytes = sf.file_size_bytes
    fv.num_classes = sf.num_classes
    fv.num_functions = sf.num_functions
    fv.cyclomatic_complexity = sf.cyclomatic_complexity
    fv.max_nesting_depth = sf.max_nesting_depth
    fv.import_count = sf.import_count
    fv.internal_dep_count = sf.internal_dep_count
    fv.external_dep_count = sf.external_dep_count
    fv.has_duplicate_code = sf.has_duplicate_code
    fv.has_hardcoded_secrets = sf.has_hardcoded_secrets
    fv.has_hardcoded_api_keys = sf.has_hardcoded_api_keys
    fv.has_god_class = sf.has_god_class
    fv.has_long_methods = sf.has_long_methods
    fv_dict = sf.feature_vector or {}
    fv.long_method_names = fv_dict.get("long_method_names", [])
    fv.god_class_names = fv_dict.get("god_class_names", [])
    fv.imports = fv_dict.get("imports", [])
    return fv
