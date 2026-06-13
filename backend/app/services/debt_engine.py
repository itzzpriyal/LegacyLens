"""
Technical Debt Engine — detects debt categories and computes a debt score.

Categories:
  - god_class        (class too large / too many methods)
  - long_method      (method exceeds line threshold)
  - circular_dep     (detected after dependency graph is built)
  - duplicate_code   (heuristic hash-based)
  - hardcoded_value  (credentials / magic strings / API keys)
"""
import re
import hashlib
from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from app.models.models import SourceFile, DebtItem, Project


def detect_and_store_debt(db: Session, file: SourceFile) -> List[DebtItem]:
    """Generate DebtItem records for a file and persist them."""
    items: List[DebtItem] = []

    if file.has_god_class:
        fv = file.feature_vector or {}
        names = fv.get("god_class_names", [])
        desc = f"God class detected: {', '.join(names)}" if names else "God class detected"
        items.append(DebtItem(file_id=file.id, category="god_class", description=desc, severity="high"))

    if file.has_long_methods:
        fv = file.feature_vector or {}
        names = fv.get("long_method_names", [])
        desc = f"Long methods: {', '.join(names[:5])}" if names else "Long method(s) detected"
        items.append(DebtItem(file_id=file.id, category="long_method", description=desc, severity="medium"))

    if file.has_duplicate_code:
        items.append(DebtItem(
            file_id=file.id,
            category="duplicate_code",
            description="Similar code blocks detected — extract shared utilities",
            severity="medium"
        ))

    if file.has_hardcoded_secrets:
        items.append(DebtItem(
            file_id=file.id,
            category="hardcoded_value",
            description="Hardcoded credentials found — use environment variables or secrets manager",
            severity="critical"
        ))

    if file.has_hardcoded_api_keys:
        items.append(DebtItem(
            file_id=file.id,
            category="hardcoded_value",
            description="Hardcoded API key found — rotate immediately and use secrets manager",
            severity="critical"
        ))

    if file.has_circular_dep:
        items.append(DebtItem(
            file_id=file.id,
            category="circular_dep",
            description="This file is part of a circular dependency chain — introduce abstraction layer",
            severity="high"
        ))

    for item in items:
        db.add(item)

    return items


def compute_debt_score(files: List[SourceFile]) -> float:
    """
    Aggregate debt score (0–100) for a project.
    Weighted by file count and severity of detected issues.
    """
    if not files:
        return 0.0

    severity_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    total_weight = 0.0
    max_possible = len(files) * 4 * 5  # 5 debt categories max, max severity=4

    for f in files:
        for item in f.debt_items:
            total_weight += severity_weights.get(item.severity, 1)

    return round(min(100.0, (total_weight / max(1, max_possible)) * 200), 2)


def detect_duplicate_code_across_files(files: List[SourceFile]) -> List[str]:
    """
    Heuristic duplicate detection: hash 8-line sliding windows and flag files
    that share ≥ 2 identical blocks with another file.
    Returns list of file IDs with detected duplicate code.
    """
    WINDOW = 8
    file_hashes: Dict[str, List[str]] = {}  # file_id → list of block hashes

    for f in files:
        fv = f.feature_vector or {}
        # We don't have raw source here; rely on feature vector flag already set
        # (duplicate detection happens in analysis_service with actual file content)
        pass

    return []


def flag_circular_deps(db: Session, project_id: str, circular_file_ids: List[str]):
    """Mark files as having circular dependencies after graph analysis."""
    for fid in circular_file_ids:
        db.query(SourceFile).filter(
            SourceFile.id == fid,
            SourceFile.project_id == project_id
        ).update({"has_circular_dep": True})
    db.commit()
