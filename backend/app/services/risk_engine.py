"""
Migration Risk Engine — deterministic, formula-based scoring.
No LLM is involved; scores are computed purely from extracted code metrics.

Score Weights:
  Complexity          → 30%
  Dependency Density  → 25%
  Technical Debt      → 25%
  File Size           → 10%
  Security Issues     → 10%

Risk Levels:
   0–30  → Low
  31–60  → Medium
  61–80  → High
  81–100 → Critical
"""
from typing import List, Tuple
from app.models.models import RiskLevel
from app.services.parsers.base import FeatureVector


# ── Normalisation helpers ─────────────────────────────────────────────────────

def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _norm_complexity(fv: FeatureVector) -> float:
    """
    Score 0–100 based on cyclomatic complexity and nesting depth.
    CC ≥ 20 → 100, nesting ≥ 8 → 100.
    """
    cc_score = _clamp((fv.cyclomatic_complexity / 20.0) * 100)
    nest_score = _clamp((fv.max_nesting_depth / 8.0) * 100)
    long_method_penalty = 20.0 if fv.has_long_methods else 0.0
    return _clamp((cc_score * 0.5) + (nest_score * 0.3) + long_method_penalty)


def _norm_dependency(fv: FeatureVector) -> float:
    """
    Score 0–100 based on total import count and internal dependency ratio.
    """
    total_deps = fv.import_count
    dep_score = _clamp((total_deps / 30.0) * 100)  # 30+ imports → 100

    # Circular dependency is a hard penalty
    circular_penalty = 25.0 if fv.has_circular_dep else 0.0  # type: ignore[attr-defined]

    # High internal deps (tight coupling) is risky
    internal_ratio = (fv.internal_dep_count / max(1, total_deps))
    coupling_score = _clamp(internal_ratio * 60)

    return _clamp(dep_score * 0.4 + coupling_score * 0.4 + circular_penalty)


def _norm_debt(fv: FeatureVector) -> float:
    """
    Score 0–100 based on technical debt indicators.
    """
    score = 0.0
    if fv.has_god_class:
        score += 30.0
    if fv.has_long_methods:
        score += 20.0
    if fv.has_duplicate_code:
        score += 20.0
    if fv.has_hardcoded_secrets:
        score += 20.0
    if fv.has_hardcoded_api_keys:
        score += 10.0
    return _clamp(score)


def _norm_size(fv: FeatureVector) -> float:
    """
    Score 0–100 based on LOC. Files ≥ 2000 lines → 100.
    """
    return _clamp((fv.loc / 2000.0) * 100)


def _norm_security(fv: FeatureVector) -> float:
    """
    Score 0–100 based on security red flags (for risk contribution, not the security score).
    """
    score = 0.0
    if fv.has_hardcoded_secrets:
        score += 60.0
    if fv.has_hardcoded_api_keys:
        score += 40.0
    return _clamp(score)


# ── Main scoring function ─────────────────────────────────────────────────────

def compute_risk_score(fv: FeatureVector, has_circular_dep: bool = False) -> Tuple[float, RiskLevel, List[str]]:
    """
    Compute the weighted migration risk score for one file.

    Returns:
        score      (float 0–100)
        risk_level (RiskLevel enum)
        factors    (list of human-readable contributing factors)
    """
    # Attach circular dep info to fv (injected by analysis service after graph is built)
    fv.has_circular_dep = has_circular_dep  # type: ignore[attr-defined]

    c_complexity  = _norm_complexity(fv)
    c_dependency  = _norm_dependency(fv)
    c_debt        = _norm_debt(fv)
    c_size        = _norm_size(fv)
    c_security    = _norm_security(fv)

    score = (
        c_complexity * 0.30 +
        c_dependency * 0.25 +
        c_debt       * 0.25 +
        c_size       * 0.10 +
        c_security   * 0.10
    )
    score = round(_clamp(score), 2)

    # Risk level bucket
    if score <= 30:
        level = RiskLevel.LOW
    elif score <= 60:
        level = RiskLevel.MEDIUM
    elif score <= 80:
        level = RiskLevel.HIGH
    else:
        level = RiskLevel.CRITICAL

    # Contributing factors (human-readable)
    factors = _build_factors(fv, c_complexity, c_dependency, c_debt, c_size, c_security)

    return score, level, factors


def _build_factors(fv, c_complexity, c_dependency, c_debt, c_size, c_security) -> List[str]:
    factors = []

    if c_complexity >= 60:
        factors.append(f"High cyclomatic complexity ({fv.cyclomatic_complexity:.1f})")
    if fv.max_nesting_depth >= 5:
        factors.append(f"Deep nesting (depth {fv.max_nesting_depth})")
    if fv.has_long_methods:
        factors.append(f"Long methods detected ({', '.join(fv.long_method_names[:3])})")
    if fv.has_god_class:
        factors.append(f"God class detected ({', '.join(fv.god_class_names[:2])})")
    if getattr(fv, "has_circular_dep", False):
        factors.append("Circular dependency — introduce abstraction layer")
    if fv.import_count >= 20:
        factors.append(f"Excessive imports ({fv.import_count} dependencies)")
    if fv.internal_dep_count >= 10:
        factors.append(f"High internal coupling ({fv.internal_dep_count} internal deps)")
    if fv.has_duplicate_code:
        factors.append("Duplicate code detected — extract shared utilities")
    if fv.has_hardcoded_secrets:
        factors.append("Hardcoded credentials — move to environment variables")
    if fv.has_hardcoded_api_keys:
        factors.append("Hardcoded API keys — use secrets manager")
    if fv.loc >= 1500:
        factors.append(f"Large file ({fv.loc} lines) — consider splitting")

    if not factors:
        factors.append("No significant issues detected")

    return factors


# ── Project-level aggregation ─────────────────────────────────────────────────

def compute_migration_readiness(avg_risk_score: float, debt_score: float, security_score: float) -> float:
    """
    Overall migration readiness score (0–100, higher = more ready).
    Inverse of the weighted risk + debt combination, boosted by security.
    """
    risk_component = (100 - avg_risk_score) * 0.50
    debt_component = (100 - debt_score) * 0.30
    security_component = security_score * 0.20
    return round(_clamp(risk_component + debt_component + security_component), 2)
