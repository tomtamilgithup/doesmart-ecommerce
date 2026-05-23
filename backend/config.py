import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # ── MySQL ──────────────────────────────────
    MYSQL_HOST     = os.getenv("MYSQL_HOST",     "localhost")
    MYSQL_PORT     = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER     = os.getenv("MYSQL_USER",     "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "doesmart")

    # ── JWT ────────────────────────────────────
    JWT_SECRET_KEY        = os.getenv("JWT_SECRET_KEY", "doesmart-super-secret-2024")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 24  # 24 hours in seconds

    # ── Uploads ────────────────────────────────
    UPLOAD_FOLDER  = os.path.join(os.path.dirname(__file__), "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB

    # ── CORS ───────────────────────────────────
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000",
                    "null", "*"]   # allow file:// during local dev
