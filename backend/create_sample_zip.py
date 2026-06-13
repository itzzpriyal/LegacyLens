"""
Script to create a sample legacy repo ZIP for demo purposes.
Run: python backend/create_sample_zip.py
"""
import os
import zipfile
import shutil

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), "sample_repo")
ZIP_PATH = os.path.join(os.path.dirname(__file__), "sample_repo.zip")

def create():
    # Add more sample files
    files_extra = {
        "user_service.py": '''"""User service — medium complexity."""
from database import DatabaseManager

class UserService:
    def __init__(self):
        self.db = DatabaseManager()
    
    def get_user(self, user_id):
        return self.db.query(f"SELECT * FROM users WHERE id = \\'{user_id}\\'")
    
    def create_user(self, email, password_hash, role="user"):
        if not email or "@" not in email:
            return {"error": "Invalid email"}
        existing = self.db.query(f"SELECT * FROM users WHERE email = \\'{email}\\'")
        if existing:
            return {"error": "User already exists"}
        user_id = hash(email)
        self.db.execute(f"INSERT INTO users (id, email, role) VALUES ({user_id}, \\'{email}\\', \\'{role}\\')")
        return {"id": user_id, "email": email}

    def update_role(self, user_id, new_role):
        self.db.execute(f"UPDATE users SET role = \\'{new_role}\\' WHERE id = \\'{user_id}\\'")

    def deactivate(self, user_id):
        self.db.execute(f"UPDATE users SET active = false WHERE id = \\'{user_id}\\'")

    def list_users(self, page=1, page_size=20):
        offset = (page - 1) * page_size
        return self.db.query(f"SELECT * FROM users LIMIT {page_size} OFFSET {offset}")
''',
        "notification.py": '''"""Notification service — low complexity."""
import smtplib

SMTP_PASSWORD = "legacy_smtp_pass_123"

class NotificationService:
    def send_email(self, to, subject, body):
        print(f"[EMAIL] To: {to} | Subject: {subject}")
    
    def send_sms(self, phone, message):
        print(f"[SMS] To: {phone} | {message}")
    
    def send_push(self, device_token, title, body):
        print(f"[PUSH] Token: {device_token[:8]}... | {title}")
''',
        "database.py": '''"""Database manager — low complexity."""
class DatabaseManager:
    def __init__(self, password=None):
        self.connection = None
    
    def query(self, sql):
        print(f"[DB QUERY] {sql[:80]}")
        return []
    
    def execute(self, sql):
        print(f"[DB EXEC] {sql[:80]}")
''',
        "audit.py": '''"""Audit logger — minimal complexity."""
from datetime import datetime

class AuditLogger:
    def log(self, event, user_id, amount=None):
        ts = datetime.utcnow().isoformat()
        print(f"[AUDIT] {ts} | {event} | user={user_id} | amount={amount}")
''',
        "config.py": '''"""Configuration — hardcoded values example."""
# Legacy config — should use environment variables
DATABASE_HOST = "legacy-db.internal"
DATABASE_PORT = 5432
DATABASE_NAME = "legacyapp"
DATABASE_USER = "admin"
DATABASE_PASSWORD = "Sup3rS3cr3tP@ss!"

REDIS_URL = "redis://:redis_password_123@redis.internal:6379/0"
JWT_SECRET = "jwt-secret-key-do-not-share"

API_GATEWAY_KEY = "AKIAIOSFODNN7EXAMPLE"
STRIPE_SECRET_KEY = "sk-live-legacy-stripe-key-abc123"

MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
''',
    }

    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add existing sample files
        for fname in os.listdir(SAMPLE_DIR):
            fpath = os.path.join(SAMPLE_DIR, fname)
            if os.path.isfile(fpath):
                zf.write(fpath, f"legacy_app/{fname}")
        # Add extra files
        for fname, content in files_extra.items():
            zf.writestr(f"legacy_app/{fname}", content)

    print(f"Created sample ZIP: {ZIP_PATH}")

if __name__ == "__main__":
    create()
