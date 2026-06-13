"""
Security Engine — scans source files for security vulnerabilities.

Detects:
  - Hardcoded secrets / passwords
  - Hardcoded API keys
  - Weak/missing authentication patterns
  - SQL injection risks
  - Insecure random usage
  - Debug/logging of sensitive data
"""
import re
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.models import SourceFile, SecurityFinding


# ── Detection Patterns ────────────────────────────────────────────────────────

SECRET_PATTERNS = [
    (r'(?i)(password|passwd|pwd)\s*=\s*["\'][^"\']{4,}["\']', "hardcoded_secret", "critical", "Hardcoded password"),
    (r'(?i)(secret|private_key|secret_key)\s*=\s*["\'][^"\']{8,}["\']', "hardcoded_secret", "critical", "Hardcoded secret"),
    (r'(?i)(db_password|database_url|connection_string)\s*=\s*["\'][^"\']+["\']', "hardcoded_secret", "high", "Hardcoded database credential"),
]

API_KEY_PATTERNS = [
    (r'(?i)(api[_\-]?key|apikey|access[_\-]?key)\s*=\s*["\'][A-Za-z0-9_\-\.]{16,}["\']', "api_key", "critical", "Hardcoded API key"),
    (r'AKIA[0-9A-Z]{16}', "api_key", "critical", "AWS Access Key ID found"),
    (r'(?i)sk-[A-Za-z0-9]{20,}', "api_key", "critical", "OpenAI API key found"),
    (r'(?i)ghp_[A-Za-z0-9]{36,}', "api_key", "critical", "GitHub Personal Access Token found"),
    (r'(?i)xox[baprs]-[A-Za-z0-9\-]+', "api_key", "high", "Slack token found"),
]

WEAK_AUTH_PATTERNS = [
    (r'(?i)(verify\s*=\s*False|ssl_verify\s*=\s*False|check_hostname\s*=\s*False)', "weak_auth", "high", "SSL verification disabled"),
    (r'(?i)MD5\s*\(|md5\s*\(|hashlib\.md5', "weak_auth", "medium", "Weak MD5 hashing used for security"),
    (r'(?i)SHA1\s*\(|sha1\s*\(|hashlib\.sha1', "weak_auth", "low", "Weak SHA-1 hashing used for security"),
    (r'(?i)(allow_all_origins|cors.*\*)', "weak_auth", "medium", "Overly permissive CORS configuration"),
    (r'(?i)(eval\s*\(|exec\s*\()', "weak_auth", "high", "Dynamic code execution (eval/exec) — potential injection risk"),
    (r'(?i)(pickle\.loads|yaml\.load\s*\([^,)]+\))', "weak_auth", "high", "Unsafe deserialization"),
    (r'(?i)(execute\s*\(.*\+|cursor\.execute.*%\s*)', "weak_auth", "high", "Potential SQL injection via string concatenation"),
    (r'(?i)(random\.random|random\.randint|Math\.random)', "weak_auth", "medium", "Insecure random — use secrets module for security"),
    (r'(?i)(print.*password|log.*password|logger.*secret)', "weak_auth", "high", "Sensitive data logged to output"),
]


def scan_file_security(file_path: str, source: str) -> List[Tuple]:
    """
    Returns list of (finding_type, severity, description, line_number, redacted_snippet).
    """
    findings = []
    lines = source.splitlines()

    all_patterns = SECRET_PATTERNS + API_KEY_PATTERNS + WEAK_AUTH_PATTERNS

    for pattern, finding_type, severity, description in all_patterns:
        for i, line in enumerate(lines, 1):
            if re.search(pattern, line):
                # Redact the actual value before storing
                snippet = re.sub(r'(["\'])[^"\']{4,}(["\'])', r'\1[REDACTED]\2', line.strip())
                findings.append((finding_type, severity, description, i, snippet[:200]))

    return findings


def store_security_findings(db: Session, file: SourceFile, findings: List[Tuple]) -> None:
    """Persist security findings to the database."""
    for finding_type, severity, description, line_number, snippet in findings:
        sf = SecurityFinding(
            file_id=file.id,
            finding_type=finding_type,
            severity=severity,
            description=description,
            line_number=line_number,
            snippet=snippet,
        )
        db.add(sf)


def compute_security_score(files: List[SourceFile]) -> float:
    """
    Security score (0–100, higher = more secure) across all files.
    Starts at 100 and deducts points per finding by severity.
    """
    if not files:
        return 100.0

    severity_deductions = {"critical": 15, "high": 8, "medium": 4, "low": 1}
    total_deduction = 0.0

    for f in files:
        for finding in f.security_findings:
            total_deduction += severity_deductions.get(finding.severity, 1)

    score = max(0.0, 100.0 - total_deduction)
    return round(score, 2)


def compute_file_security_score(findings: List[Tuple]) -> float:
    """Security score for a single file."""
    severity_deductions = {"critical": 20, "high": 12, "medium": 6, "low": 2}
    deduction = sum(severity_deductions.get(f[1], 1) for f in findings)
    return round(max(0.0, 100.0 - deduction), 2)
