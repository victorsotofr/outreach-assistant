import os
import ssl
from dotenv import load_dotenv
from .encryption import encryption
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from pathlib import Path
from sqlalchemy import create_engine, Column, String, Integer, Boolean, DateTime, ForeignKey, Text, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Load environment variables in order of priority
load_dotenv(PROJECT_ROOT / ".env.production")  # Load production first
load_dotenv(PROJECT_ROOT / ".env.development")  # Then development
load_dotenv(PROJECT_ROOT / ".env")  # Finally, any local overrides

# Database configuration from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Please ensure it is set in your .env file.")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models
class UserConfig(Base):
    __tablename__ = "user_configs"

    email = Column(String(255), primary_key=True)
    google_sheet_url = Column(Text)
    openai_api_key = Column(Text)
    smtp_pass = Column(Text)
    smtp_port = Column(Integer)
    smtp_server = Column(Text)
    smtp_user = Column(Text)
    uiform_api_key = Column(Text)
    watched_file_types = Column(ARRAY(Text))
    uiform_api_endpoint = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class UserTemplate(Base):
    __tablename__ = "user_templates"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), ForeignKey("user_configs.email"))
    name = Column(String(255))
    content = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create all tables
Base.metadata.create_all(bind=engine)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SENSITIVE_FIELDS = {
    "openai_api_key",
    "uiform_api_key",
    "uiform_api_endpoint",
    "smtp_pass",
}

DEFAULT_TEMPLATE = {
    "name": "Example Template",
    "content": """Hello [CIVILITY] [LAST_NAME],

I hope this email finds you well. I am reaching out regarding [COMPANY] and our potential collaboration.

[Your personalized message here]

Best regards,
[Your name]""",
    "is_default": True
}

@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    try:
        # Configure SSL for Render PostgreSQL
        conn = psycopg2.connect(
            DATABASE_URL,
            sslmode='require'  # Required for Render PostgreSQL
        )
        try:
            yield conn
        finally:
            conn.close()
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {str(e)}")
        raise

def init_db():
    """Initialize database tables if they don't exist."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Create user_configs table with all fields
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_configs (
                    email VARCHAR(255) PRIMARY KEY,
                    google_sheet_url TEXT,
                    openai_api_key TEXT,
                    smtp_pass TEXT,
                    smtp_port INTEGER,
                    smtp_server TEXT,
                    smtp_user TEXT,
                    uiform_api_key TEXT,
                    watched_file_types TEXT[],
                    uiform_api_endpoint TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create user_templates table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_templates (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255),
                    name VARCHAR(255),
                    content TEXT,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (email) REFERENCES user_configs(email)
                )
            """)
            
            conn.commit()

def init_default_template():
    """Initialize the default template if it doesn't exist."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM user_templates WHERE is_default = TRUE")
            if cur.fetchone()[0] == 0:
                cur.execute("""
                    INSERT INTO user_templates (name, content, is_default)
                    VALUES (%s, %s, %s)
                """, (DEFAULT_TEMPLATE["name"], DEFAULT_TEMPLATE["content"], True))
                conn.commit()

def encrypt_sensitive_fields(config: dict) -> dict:
    encrypted_config = config.copy()
    for field in SENSITIVE_FIELDS:
        if field in encrypted_config and encrypted_config[field]:
            encrypted_config[field] = encryption.encrypt(encrypted_config[field])
    return encrypted_config

def decrypt_sensitive_fields(config: dict) -> dict:
    decrypted_config = config.copy()
    for field in SENSITIVE_FIELDS:
        if field in decrypted_config and decrypted_config[field]:
            decrypted_config[field] = encryption.decrypt(decrypted_config[field])
    return decrypted_config

def save_user_config(email: str, config: dict):
    encrypted_config = encrypt_sensitive_fields(config)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Convert config dict to list of tuples for upsert
            fields = list(encrypted_config.keys())
            values = [encrypted_config[field] for field in fields]
            placeholders = [f"%s" for _ in fields]
            
            # Build the upsert query
            query = f"""
                INSERT INTO user_configs (email, {', '.join(fields)})
                VALUES (%s, {', '.join(placeholders)})
                ON CONFLICT (email) DO UPDATE SET
                {', '.join(f"{field} = EXCLUDED.{field}" for field in fields)},
                updated_at = CURRENT_TIMESTAMP
            """
            cur.execute(query, [email] + values)
            conn.commit()

def get_user_config(email: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM user_configs WHERE email = %s
            """, (email,))
            config = cur.fetchone()
            if config:
                return decrypt_sensitive_fields(dict(config))
            return {}

def get_user_templates(email: str):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM user_templates 
                WHERE email = %s OR is_default = TRUE
            """, (email,))
            return [dict(row) for row in cur.fetchall()]

def save_template(email: str, template: dict):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                INSERT INTO user_templates (email, name, content, is_default)
                VALUES (%s, %s, %s, %s)
                RETURNING *
            """, (email, template["name"], template["content"], False))
            new_template = cur.fetchone()
            conn.commit()
            return dict(new_template)

def delete_template(email: str, template_name: str):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM user_templates
                WHERE email = %s AND name = %s AND is_default = FALSE
                RETURNING id
            """, (email, template_name))
            deleted = cur.fetchone() is not None
            conn.commit()
            return deleted

def update_template(email: str, template_name: str, updated_template: dict):
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE user_templates
                SET name = %s, content = %s, updated_at = CURRENT_TIMESTAMP
                WHERE email = %s AND name = %s AND is_default = FALSE
                RETURNING *
            """, (updated_template["name"], updated_template["content"], email, template_name))
            updated = cur.fetchone()
            conn.commit()
            return dict(updated) if updated else None

# Initialize database on module import
init_db()
