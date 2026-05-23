from __future__ import annotations
"""
Shared helpers used across route modules.
"""
import os
import bcrypt
from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from werkzeug.utils import secure_filename
from config import Config


# ── Password helpers ──────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── Role-based JWT decorators ─────────────────────────────────────────────────
def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Access denied"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


# ── File upload helper ────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def save_upload(file_field_name: str) -> str | None:
    """Save an uploaded file and return its stored filename, or None."""
    file = request.files.get(file_field_name)
    if not file:
        return None
    filename = file.filename
    if not filename:
        return None
    if not allowed_file(filename):
        return None
    fname = secure_filename(filename)
    file.save(os.path.join(Config.UPLOAD_FOLDER, fname))
    return fname


# ── JSON response helpers ─────────────────────────────────────────────────────
def ok(data=None, message="Success", status=200):
    body = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    return jsonify(body), status

def err(message="Error", status=400):
    return jsonify({"success": False, "error": message}), status
