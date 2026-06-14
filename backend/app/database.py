from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

_url = settings.DATABASE_URL
_is_sqlite = _url.startswith("sqlite")

engine = create_engine(
    _url,
    connect_args={"check_same_thread": False} if _is_sqlite else {"connect_timeout": 10},
    pool_pre_ping=True,
    **({} if _is_sqlite else {"pool_size": 2, "max_overflow": 3, "pool_timeout": 30, "pool_recycle": 300}),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
