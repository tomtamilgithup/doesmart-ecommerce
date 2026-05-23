"""
DoEmart — Flask Application Entry Point
"""
from __future__ import annotations
import sys
if __name__ == "__main__":
    sys.modules['app'] = sys.modules['__main__']

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
import mysql.connector
from mysql.connector import pooling

# ── connection pool ────────────────────────────────────────────────────────────
db_pool: pooling.MySQLConnectionPool | None = None

def get_db() -> pooling.PooledMySQLConnection:
    """Return a connection from the pool."""
    if db_pool is None:
        raise RuntimeError("Database pool has not been initialized.")
    return db_pool.get_connection()

def create_app():
    global db_pool

    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
         supports_credentials=True)

    # ── JWT ───────────────────────────────────────────────────────────────────
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    JWTManager(app)

    # ── MySQL pool ────────────────────────────────────────────────────────────
    db_pool = pooling.MySQLConnectionPool(
        pool_name="doesmart_pool",
        pool_size=10,
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DATABASE,
        charset="utf8mb4",
        autocommit=False,
    )

    # ── Ensure uploads dir exists ─────────────────────────────────────────────
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

    # ── Blueprints ────────────────────────────────────────────────────────────
    from routes.auth        import auth_bp
    from routes.admin       import admin_bp
    from routes.shopkeeper  import shopkeeper_bp
    from routes.customer    import customer_bp

    app.register_blueprint(auth_bp,       url_prefix="/api/auth")
    app.register_blueprint(admin_bp,      url_prefix="/api/admin")
    app.register_blueprint(shopkeeper_bp, url_prefix="/api/shop")
    app.register_blueprint(customer_bp,   url_prefix="/api")

    # ── Serve uploaded files ──────────────────────────────────────────────────
    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return {"status": "ok", "app": "DoEmart API v1.0"}

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)
