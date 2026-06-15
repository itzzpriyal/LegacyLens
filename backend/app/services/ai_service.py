"""
AI Service — OpenAI integration for human-readable recommendations and report narrative.

IMPORTANT: Raw source code is NEVER sent to the LLM.
Only structured metric summaries (feature vectors, risk factors, debt items) are transmitted.
All hardcoded secrets are automatically redacted before transmission.
"""
from typing import List, Optional, Dict, Any
from app.models.models import SourceFile, Project


def _make_client(api_key: str, provider: str = "openai"):
    try:
        from openai import OpenAI
        base_url = None
        if provider == "groq":
            base_url = "https://api.groq.com/openai/v1"
        elif provider == "mistral":
            base_url = "https://api.mistral.ai/v1"
        elif provider == "together":
            base_url = "https://api.together.xyz/v1"
        elif provider == "anthropic":
            # Just for compatibility if we decide to use a proxy, otherwise OpenAI SDK doesn't natively hit Anthropic.
            pass
        
        return OpenAI(api_key=api_key, base_url=base_url)
    except ImportError:
        raise RuntimeError("openai package not installed")

def _get_default_model(provider: str) -> str:
    if provider == "groq": return "llama3-8b-8192"
    if provider == "mistral": return "mistral-small-latest"
    if provider == "together": return "meta-llama/Llama-3-8b-chat-hf"
    return "gpt-4o-mini"


def _redact_secrets(text: str) -> str:
    """Remove any values that look like secrets before sending to LLM."""
    import re
    text = re.sub(r'(["\'])[A-Za-z0-9_\-\.]{16,}(["\'])', r'\1[REDACTED]\2', text)
    return text


def generate_file_recommendation(
    file: SourceFile,
    api_key: str,
    provider: str = "openai",
    model: str = ""
) -> str:
    """
    Generate a plain-English recommendation for a high/critical risk file.
    Uses ONLY structured metrics — never raw source code.
    """
    # Fallback to server-side API key if client didn't provide one
    from app.config import settings
    effective_key = api_key or settings.OPENAI_API_KEY
    if not effective_key:
        return _rule_based_recommendation(file)

    try:
        client = _make_client(effective_key, provider)
        use_model = model or _get_default_model(provider)
        fv = file.feature_vector or {}
        factors = file.risk_factors or []

        prompt = f"""You are a senior software architect advising on legacy code modernization.

Analyze this file's code metrics and provide 3–5 specific, actionable migration recommendations.
Be concise and practical. Do NOT ask for more information.

File: {file.relative_path}
Language: {file.language}
Lines of Code: {file.loc}
Classes: {file.num_classes}
Functions: {file.num_functions}
Cyclomatic Complexity: {file.cyclomatic_complexity:.1f}
Max Nesting Depth: {file.max_nesting_depth}
Import Count: {file.import_count}
Risk Score: {file.risk_score:.1f}/100 ({file.risk_level.value})
Risk Factors:
{chr(10).join(f'- {f}' for f in factors)}

Technical Debt:
- God Class: {file.has_god_class}
- Long Methods: {file.has_long_methods}
- Hardcoded Secrets: {file.has_hardcoded_secrets}
- Circular Dependency: {file.has_circular_dep}

Provide numbered recommendations targeting these specific issues."""

        prompt = _redact_secrets(prompt)

        response = client.chat.completions.create(
            model=use_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.3,
        )
        return response.choices[0].message.content or _rule_based_recommendation(file)

    except Exception as e:
        return _rule_based_recommendation(file)


def _rule_based_recommendation(file: SourceFile) -> str:
    """Fallback recommendations when no API key is available."""
    recs = []
    if file.has_god_class:
        fv = file.feature_vector or {}
        names = fv.get("god_class_names", [])
        if names:
            recs.append(f"1. Split {names[0]} into smaller domain-focused services using the Single Responsibility Principle.")
        else:
            recs.append("1. Decompose large classes into smaller domain-focused services.")

    if file.has_long_methods:
        fv = file.feature_vector or {}
        names = fv.get("long_method_names", [])
        if names:
            recs.append(f"2. Refactor long method '{names[0]}' — extract reusable helper functions.")
        else:
            recs.append("2. Refactor long methods by extracting reusable helper functions.")

    if file.has_circular_dep:
        recs.append("3. Resolve circular dependency by introducing an abstraction layer (interface/protocol).")

    if file.has_hardcoded_secrets:
        recs.append("4. Move hardcoded credentials to environment variables or a secrets manager (e.g., Vault, AWS Secrets Manager).")

    if file.has_hardcoded_api_keys:
        recs.append("5. Rotate all hardcoded API keys immediately and store them securely outside the codebase.")

    if file.cyclomatic_complexity > 15:
        recs.append(f"6. Reduce cyclomatic complexity (currently {file.cyclomatic_complexity:.1f}) by simplifying conditional logic and using polymorphism.")

    if file.import_count > 20:
        recs.append(f"7. Reduce coupling — {file.import_count} imports suggest this module takes on too many responsibilities.")

    if not recs:
        recs.append("This file has manageable complexity. Focus on adding unit tests before migration.")

    return "\n".join(recs)


def generate_roadmap_narrative(
    project: Project,
    phases: List[Dict[str, Any]],
    api_key: str,
    provider: str = "openai",
    model: str = ""
) -> str:
    """Generate a plain-English executive narrative for the migration roadmap."""
    from app.config import settings
    effective_key = api_key or settings.OPENAI_API_KEY
    if not effective_key:
        return _rule_based_roadmap_narrative(project, phases)

    try:
        client = _make_client(effective_key, provider)
        use_model = model or _get_default_model(provider)
        phases_text = "\n".join(
            f"Phase {p['phase_number']} — {p['name']} ({len(p['files'])} files): {p['description']}"
            for p in phases
        )

        prompt = f"""You are an enterprise migration consultant.

Write a 2–3 paragraph executive summary for this migration roadmap.
Be strategic and professional. Focus on risk reduction, timeline expectations, and team coordination.

Project: {project.name}
Total Files: {project.total_files}
Average Risk Score: {project.avg_risk_score:.1f}/100
Migration Readiness: {project.migration_readiness_score:.1f}/100
Technical Debt Score: {project.overall_debt_score:.1f}/100
Security Score: {project.overall_security_score:.1f}/100

Migration Phases:
{phases_text}

Write the executive summary:"""

        response = client.chat.completions.create(
            model=use_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.4,
        )
        return response.choices[0].message.content or _rule_based_roadmap_narrative(project, phases)

    except Exception:
        return _rule_based_roadmap_narrative(project, phases)


def _rule_based_roadmap_narrative(project: Project, phases: List[Dict]) -> str:
    readiness = project.migration_readiness_score
    if readiness >= 70:
        stance = "well-positioned for migration"
        timeline = "6–9 months"
    elif readiness >= 40:
        stance = "moderately prepared, with key risks requiring attention"
        timeline = "12–18 months"
    else:
        stance = "carrying significant technical debt that must be addressed before migration"
        timeline = "18–24+ months"

    return (
        f"The {project.name} codebase ({project.total_files} files analyzed) is {stance}. "
        f"With an average risk score of {project.avg_risk_score:.1f}/100 and a migration readiness "
        f"score of {readiness:.1f}/100, the recommended migration timeline is approximately {timeline}.\n\n"
        f"The migration plan is structured into {len(phases)} phases, beginning with low-risk utility modules "
        f"to validate the migration pipeline and build team confidence. High-risk and critical modules "
        f"are deferred to later phases to allow time for refactoring, test coverage improvement, and "
        f"dependency resolution. Teams should prioritize resolving circular dependencies and hardcoded "
        f"credentials before beginning any phase migration.\n\n"
        f"It is strongly recommended that each phase be preceded by a freeze on new feature development "
        f"for affected modules, and followed by a comprehensive regression test suite before cutover."
    )


def generate_executive_summary(
    project: Project,
    phases: List[Dict],
    top_risks: List[SourceFile],
    api_key: str,
    provider: str = "openai",
    model: str = ""
) -> str:
    """Generate the executive summary section for the PDF report."""
    from app.config import settings
    effective_key = api_key or settings.OPENAI_API_KEY
    if not effective_key:
        return _rule_based_executive_summary(project, top_risks)

    try:
        client = _make_client(effective_key, provider)
        use_model = model or _get_default_model(provider)
        risk_list = "\n".join(
            f"- {f.relative_path}: {f.risk_score:.1f}/100 ({f.risk_level.value})"
            for f in top_risks[:5]
        )

        prompt = f"""Write a professional executive summary (3 short paragraphs) for a legacy code migration risk report.

Repository: {project.name}
Total Files Analyzed: {project.total_files}
Migration Readiness Score: {project.migration_readiness_score:.1f}/100
Average Risk Score: {project.avg_risk_score:.1f}/100
Technical Debt Score: {project.overall_debt_score:.1f}/100
Security Score: {project.overall_security_score:.1f}/100

Top Risk Files:
{risk_list}

Audience: C-level executives and engineering leadership. Focus on business impact and strategic recommendations."""

        response = client.chat.completions.create(
            model=use_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=700,
            temperature=0.4,
        )
        return response.choices[0].message.content or _rule_based_executive_summary(project, top_risks)

    except Exception:
        return _rule_based_executive_summary(project, top_risks)


def _rule_based_executive_summary(project: Project, top_risks: List[SourceFile]) -> str:
    critical_count = sum(1 for f in top_risks if f.risk_level and f.risk_level.value == "Critical")
    return (
        f"This report presents the results of an automated migration risk analysis for the "
        f"{project.name} repository. A total of {project.total_files} source files were analyzed "
        f"across multiple dimensions: code complexity, technical debt, security posture, and "
        f"dependency structure.\n\n"
        f"The overall Migration Readiness Score is {project.migration_readiness_score:.1f}/100, "
        f"indicating {'strong' if project.migration_readiness_score >= 70 else 'moderate' if project.migration_readiness_score >= 40 else 'limited'} "
        f"readiness. {'No' if critical_count == 0 else str(critical_count)} critical-risk modules were "
        f"identified, each requiring immediate attention before migration can proceed safely.\n\n"
        f"Key areas requiring investment include: reducing cyclomatic complexity in core service classes, "
        f"eliminating hardcoded credentials, resolving circular dependencies, and establishing a "
        f"comprehensive test suite. Following the phased migration roadmap in this report will "
        f"significantly reduce modernization risk and accelerate time-to-value."
    )
