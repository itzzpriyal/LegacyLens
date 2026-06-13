@echo off
echo Starting LegacyLens Backend...
cd /d "%~dp0backend"
if not exist ".env" (
    copy .env.example .env
    echo Created .env from .env.example - please set your DATABASE_URL
)
python create_sample_zip.py
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
