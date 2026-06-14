# LegacyLens 👁️‍🗨️

**Live Demo:** [https://itzzpriyal-legacy-lens.vercel.app](https://itzzpriyal-legacy-lens.vercel.app)

LegacyLens is an AI-Powered Legacy Code Migration Risk Analyzer. Upload any Java or Python repository and get a complete migration readiness report — including risk scores, dependency graphs, security analysis, and AI recommendations — in minutes.

## Features
- **Risk Scoring:** Deterministic 0–100 score from code metrics.
- **Dependency Graph:** Interactive visualization of all module dependencies.
- **Security Analysis:** Detects hardcoded secrets, API keys, and weak patterns.
- **AI Recommendations:** GPT-powered plain-English remediation advice.
- **Debt Detection:** God classes, long methods, circular dependencies, and duplicate code.

## Architecture
- **Frontend:** React + Vite + TailwindCSS (Deployed on Vercel)
- **Backend:** FastAPI + Python (Deployed on Render)
- **Database:** PostgreSQL (Hosted on Render)
