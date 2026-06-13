// ──────────── Project Types ────────────────────────────────────────────────

export type ProjectStatus =
  | "pending" | "ingesting" | "analyzing" | "scoring"
  | "ai_processing" | "complete" | "failed";

export type SourceType = "zip" | "github";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type Language = "python" | "java";

export interface Project {
  id: string;
  name: string;
  source_type: SourceType;
  source_url: string | null;
  status: ProjectStatus;
  total_files: number;
  avg_risk_score: number;
  overall_debt_score: number;
  overall_security_score: number;
  migration_readiness_score: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectList {
  projects: Project[];
  total: number;
}

// ──────────── File Types ───────────────────────────────────────────────────

export interface SourceFile {
  id: string;
  project_id: string;
  relative_path: string;
  language: Language;
  loc: number;
  file_size_bytes: number;
  num_classes: number;
  num_functions: number;
  cyclomatic_complexity: number;
  max_nesting_depth: number;
  import_count: number;
  internal_dep_count: number;
  external_dep_count: number;
  has_duplicate_code: boolean;
  has_circular_dep: boolean;
  has_hardcoded_secrets: boolean;
  has_hardcoded_api_keys: boolean;
  has_god_class: boolean;
  has_long_methods: boolean;
  feature_vector: Record<string, unknown> | null;
  risk_score: number;
  risk_level: RiskLevel;
  risk_factors: string[] | null;
  security_score: number;
  debt_score: number;
  ai_recommendation: string | null;
}

export interface FileList {
  files: SourceFile[];
  total: number;
}

// ──────────── Dashboard Types ──────────────────────────────────────────────

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface DashboardSummary {
  project: Project;
  risk_distribution: RiskDistribution;
  top_risky_files: SourceFile[];
  top_debt_files: SourceFile[];
}

// ──────────── Graph Types ──────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  risk_score: number;
  risk_level: RiskLevel;
  language: Language;
  loc: number;
  num_functions: number;
  num_classes: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  dep_type: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ──────────── Debt Types ───────────────────────────────────────────────────

export type DebtCategory =
  | "god_class" | "long_method" | "circular_dep"
  | "duplicate_code" | "hardcoded_value";

export interface DebtItem {
  id: string;
  file_id: string;
  file_path: string;
  category: DebtCategory;
  description: string;
  severity: string;
}

export interface DebtSummary {
  overall_debt_score: number;
  items: DebtItem[];
  by_category: Record<string, number>;
}

// ──────────── Security Types ───────────────────────────────────────────────

export type FindingType = "hardcoded_secret" | "api_key" | "weak_auth";
export type Severity = "critical" | "high" | "medium" | "low";

export interface SecurityFinding {
  id: string;
  file_id: string;
  file_path: string;
  finding_type: FindingType;
  severity: Severity;
  description: string;
  line_number: number | null;
  snippet: string | null;
}

export interface SecuritySummary {
  overall_security_score: number;
  total_findings: number;
  findings: SecurityFinding[];
  by_type: Record<string, number>;
  by_severity: Record<string, number>;
}

// ──────────── Roadmap Types ────────────────────────────────────────────────

export interface RoadmapPhase {
  phase_number: number;
  name: string;
  description: string;
  files: string[];
  estimated_complexity: "Low" | "Medium" | "High";
}

export interface MigrationRoadmap {
  project_id: string;
  phases: RoadmapPhase[];
  narrative: string | null;
}

// ──────────── AI Types ─────────────────────────────────────────────────────

export interface AIRecommendation {
  file_id: string;
  path: string;
  recommendation: string;
}

export interface AIRecommendationsResponse {
  updated: number;
  recommendations: AIRecommendation[];
}
