"""
One-time migration script: creates admin@legacylens.dev and assigns all
existing projects (those with no user_id) to that account.

Run ONCE from the backend directory:
    python migrate_auth.py

Then delete this file.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.models import User, Project
from app.services.auth_service import hash_password
from sqlalchemy import text

ADMIN_EMAIL = "admin@legacylens.dev"
ADMIN_PASSWORD = "LegacyLens2025!"

def run():
    Base.metadata.create_all(bind=engine)  # creates users table + any new tables

    # SQLite: add user_id column to projects if it doesn't exist
    with engine.connect() as conn:
        cols = [row[1] for row in conn.execute(text("PRAGMA table_info(projects)"))]
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE projects ADD COLUMN user_id VARCHAR REFERENCES users(id)"))
            conn.commit()
            print("[OK] Added user_id column to projects table")
        else:
            print("[i] user_id column already exists")

    db = SessionLocal()
    try:
        # Create or get admin user
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not admin:
            admin = User(email=ADMIN_EMAIL, hashed_password=hash_password(ADMIN_PASSWORD))
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[OK] Created admin user: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        else:
            print(f"[i] Admin user already exists: {ADMIN_EMAIL}")

        # Assign orphan projects
        orphans = db.query(Project).filter(Project.user_id == None).all()
        for p in orphans:
            p.user_id = admin.id
        db.commit()
        print(f"[OK] Assigned {len(orphans)} orphan project(s) to admin account")
    finally:
        db.close()

if __name__ == "__main__":
    run()
