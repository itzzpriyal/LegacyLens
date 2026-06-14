from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.models import ProjectStatus, SourceType, RiskLevel


# ──────────── Project Schemas ────────────

class ProjectCreate(BaseModel):
    name: str
    source_type: SourceType
    source_url: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    source_type: SourceType
    source_url: Optional[str]
    status: ProjectStatus
    total_files: int
    avg_risk_score: float
    overall_debt_score: float
    overall_security_score: float
    migration_readiness_score: float
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectList(BaseModel):
    projects: List[ProjectOut]
    total: int


# ──────────── File Schemas ────────────

class SourceFileOut(BaseModel):
    id: str
    project_id: str
    relative_path: str
    language: str
    loc: int
    file_size_bytes: int
    num_classes: int
    num_functions: int
    cyclomatic_complexity: float
    max_nesting_depth: int
    import_count: int
    internal_dep_count: int
    external_dep_count: int
    has_duplicate_code: bool
    has_circular_dep: bool
    has_hardcoded_secrets: bool
    has_hardcoded_api_keys: bool
    has_god_class: bool
    has_long_methods: bool
    feature_vector: Optional[Dict[str, Any]]
    risk_score: float
    risk_level: RiskLevel
    risk_factors: Optional[List[str]]
    security_score: float
    debt_score: float
    ai_recommendation: Optional[str]

    model_config = {"from_attributes": True}


class FileList(BaseModel):
    files: List[SourceFileOut]
    total: int


# ──────────── Graph Schemas ────────────

class GraphNode(BaseModel):
    id: str
    label: str
    risk_score: float
    risk_level: str
    language: str
    loc: int
    num_functions: int
    num_classes: int


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    dep_type: str


class DependencyGraph(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


# ──────────── Debt Schemas ────────────

class DebtItemOut(BaseModel):
    id: str
    file_id: str
    file_path: str
    category: str
    description: str
    severity: str

    model_config = {"from_attributes": True}


class DebtSummary(BaseModel):
    overall_debt_score: float
    items: List[DebtItemOut]
    by_category: Dict[str, int]


# ──────────── Security Schemas ────────────

class SecurityFindingOut(BaseModel):
    id: str
    file_id: str
    file_path: str
    finding_type: str
    severity: str
    description: str
    line_number: Optional[int]
    snippet: Optional[str]

    model_config = {"from_attributes": True}


class SecuritySummary(BaseModel):
    overall_security_score: float
    total_findings: int
    findings: List[SecurityFindingOut]
    by_type: Dict[str, int]
    by_severity: Dict[str, int]


# ──────────── Roadmap Schemas ────────────

class RoadmapPhase(BaseModel):
    phase_number: int
    name: str
    description: str
    files: List[str]
    estimated_complexity: str


class MigrationRoadmap(BaseModel):
    project_id: str
    phases: List[RoadmapPhase]
    narrative: Optional[str] = None


# ──────────── AI Schemas ────────────

class AIRecommendationRequest(BaseModel):
    project_id: str
    api_key: Optional[str] = None
    provider: str = "openai"


class ReportRequest(BaseModel):
    project_id: str
    format: str = "pdf"  # pdf | docx
    api_key: Optional[str] = None
    provider: str = "openai"


# ──────────── Dashboard Schemas ────────────

class RiskDistribution(BaseModel):
    low: int
    medium: int
    high: int
    critical: int


class DashboardSummary(BaseModel):
    project: ProjectOut
    risk_distribution: RiskDistribution
    top_risky_files: List[SourceFileOut]
    top_debt_files: List[SourceFileOut]
