import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    PENDING = "pending"
    INGESTING = "ingesting"
    ANALYZING = "analyzing"
    SCORING = "scoring"
    AI_PROCESSING = "ai_processing"
    COMPLETE = "complete"
    FAILED = "failed"


class SourceType(str, enum.Enum):
    ZIP = "zip"
    GITHUB = "github"


class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # nullable for migration
    name = Column(String, nullable=False)
    source_type = Column(SAEnum(SourceType), nullable=False)
    source_url = Column(String, nullable=True)  # GitHub URL or original filename
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.PENDING)
    workspace_path = Column(String, nullable=True)
    total_files = Column(Integer, default=0)
    avg_risk_score = Column(Float, default=0.0)
    overall_debt_score = Column(Float, default=0.0)
    overall_security_score = Column(Float, default=0.0)
    migration_readiness_score = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    files = relationship("SourceFile", back_populates="project", cascade="all, delete-orphan")
    dependencies = relationship("Dependency", back_populates="project", cascade="all, delete-orphan")


class SourceFile(Base):
    __tablename__ = "source_files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    relative_path = Column(String, nullable=False)
    language = Column(String, nullable=False)  # "python" | "java"
    loc = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    num_classes = Column(Integer, default=0)
    num_functions = Column(Integer, default=0)
    cyclomatic_complexity = Column(Float, default=0.0)
    max_nesting_depth = Column(Integer, default=0)
    import_count = Column(Integer, default=0)
    internal_dep_count = Column(Integer, default=0)
    external_dep_count = Column(Integer, default=0)
    has_duplicate_code = Column(Boolean, default=False)
    has_circular_dep = Column(Boolean, default=False)
    has_hardcoded_secrets = Column(Boolean, default=False)
    has_hardcoded_api_keys = Column(Boolean, default=False)
    has_god_class = Column(Boolean, default=False)
    has_long_methods = Column(Boolean, default=False)
    feature_vector = Column(JSON, nullable=True)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.LOW)
    risk_factors = Column(JSON, nullable=True)  # list of strings
    security_score = Column(Float, default=100.0)
    debt_score = Column(Float, default=0.0)
    ai_recommendation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="files")
    source_dependencies = relationship("Dependency", foreign_keys="Dependency.source_file_id", back_populates="source_file", cascade="all, delete-orphan")
    target_dependencies = relationship("Dependency", foreign_keys="Dependency.target_file_id", back_populates="target_file")
    security_findings = relationship("SecurityFinding", back_populates="file", cascade="all, delete-orphan")
    debt_items = relationship("DebtItem", back_populates="file", cascade="all, delete-orphan")


class Dependency(Base):
    __tablename__ = "dependencies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_file_id = Column(String, ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False)
    target_file_id = Column(String, ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False)
    dep_type = Column(String, default="import")  # import | call | reference

    project = relationship("Project", back_populates="dependencies")
    source_file = relationship("SourceFile", foreign_keys=[source_file_id], back_populates="source_dependencies")
    target_file = relationship("SourceFile", foreign_keys=[target_file_id], back_populates="target_dependencies")


class SecurityFinding(Base):
    __tablename__ = "security_findings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False)
    finding_type = Column(String, nullable=False)  # hardcoded_secret | api_key | weak_auth
    severity = Column(String, nullable=False)  # critical | high | medium | low
    description = Column(Text, nullable=False)
    line_number = Column(Integer, nullable=True)
    snippet = Column(Text, nullable=True)  # redacted snippet

    file = relationship("SourceFile", back_populates="security_findings")


class DebtItem(Base):
    __tablename__ = "debt_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(String, ForeignKey("source_files.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)  # god_class | long_method | circular_dep | duplicate_code | hardcoded_value
    description = Column(Text, nullable=False)
    severity = Column(String, default="medium")

    file = relationship("SourceFile", back_populates="debt_items")
