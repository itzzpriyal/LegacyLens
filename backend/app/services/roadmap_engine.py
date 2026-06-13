"""
Roadmap Engine — groups files into migration phases.

Strategy:
  Phase 1: Low risk, low dependency count (safest to migrate first)
  Phase 2: Medium risk, low-to-medium deps
  Phase 3: High risk OR high dependency count
  Phase 4: Critical risk OR part of circular dependency
"""
from typing import List, Dict
from app.models.models import SourceFile, RiskLevel


def generate_roadmap(files: List[SourceFile]) -> List[Dict]:
    """
    Returns a list of phase dicts:
    {
        "phase_number": int,
        "name": str,
        "description": str,
        "files": [relative_path, ...],
        "estimated_complexity": "Low" | "Medium" | "High"
    }
    """
    phases: List[Dict] = [
        {
            "phase_number": 1,
            "name": "Foundation & Utilities",
            "description": "Low-risk, low-dependency files with minimal technical debt. Safe to migrate first.",
            "files": [],
            "estimated_complexity": "Low",
        },
        {
            "phase_number": 2,
            "name": "Core Business Logic",
            "description": "Medium-risk files with moderate coupling. Migrate after Phase 1 is stable.",
            "files": [],
            "estimated_complexity": "Medium",
        },
        {
            "phase_number": 3,
            "name": "High-Risk Modules",
            "description": "High-risk or highly coupled modules. Requires thorough refactoring before migration.",
            "files": [],
            "estimated_complexity": "High",
        },
        {
            "phase_number": 4,
            "name": "Critical & Circular Dependencies",
            "description": "Critical-risk files or circular dependency participants. Migrate last after all dependencies are resolved.",
            "files": [],
            "estimated_complexity": "High",
        },
    ]

    for f in files:
        is_critical = f.risk_level == RiskLevel.CRITICAL
        is_high = f.risk_level == RiskLevel.HIGH
        is_circular = f.has_circular_dep
        total_deps = f.import_count

        if is_critical or is_circular:
            phases[3]["files"].append(f.relative_path)
        elif is_high or total_deps >= 15:
            phases[2]["files"].append(f.relative_path)
        elif f.risk_level == RiskLevel.MEDIUM or total_deps >= 8:
            phases[1]["files"].append(f.relative_path)
        else:
            phases[0]["files"].append(f.relative_path)

    # Remove empty phases
    phases = [p for p in phases if p["files"]]

    # Re-number
    for i, p in enumerate(phases, 1):
        p["phase_number"] = i

    return phases
