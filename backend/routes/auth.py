"""
Authentication routes — register, login, profile
Roles: admin | shopkeeper | customer
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (create_access_token, jwt_required,
                                get_jwt_identity, get_jwt)
from datetime import timedelta
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import get_db
from helpers import hash_password, check_password, save_upload, ok, err

auth_bp = Blueprint("auth", __name__)


# ── Customer Registration ─────────────────────────────────────────────────────
@auth_bp.route("/register/customer", methods=["POST"])
def register_customer():
    data = request.form
    required = ["name", "email", "phone", "password", "address", "city",
                "pincode", "id_proof_type", "id_proof_number"]
    for f in required:
        if not data.get(f):
            return err(f"Field '{f}' is required")

    id_proof_doc  = save_upload("id_proof_doc")
    address_proof = save_upload("address_proof")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM users WHERE email=%s", (data["email"],))
        if cur.fetchone():
            return err("Email already registered", 409)

        cur.execute("""
            INSERT INTO users
              (name, email, phone, password, address, city, pincode,
               id_proof_type, id_proof_number, id_proof_doc, address_proof)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["name"], data["email"], data["phone"],
            hash_password(data["password"]),
            data["address"], data["city"], data["pincode"],
            data["id_proof_type"], data["id_proof_number"],
            id_proof_doc, address_proof
        ))
        conn.commit()
        return ok(message="Registration submitted. Awaiting admin approval.", status=201)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Shopkeeper Registration ───────────────────────────────────────────────────
@auth_bp.route("/register/shopkeeper", methods=["POST"])
def register_shopkeeper():
    data = request.form
    required = ["name", "email", "phone", "password", "shop_name",
                "address", "city", "pincode"]
    for f in required:
        if not data.get(f):
            return err(f"Field '{f}' is required")

    id_proof_doc = save_upload("id_proof_doc")
    shop_logo    = save_upload("shop_logo")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM shopkeepers WHERE email=%s", (data["email"],))
        if cur.fetchone():
            return err("Email already registered", 409)

        cur.execute("""
            INSERT INTO shopkeepers
              (name, email, phone, password, shop_name, shop_description,
               shop_category, address, city, pincode, gst_number,
               id_proof_type, id_proof_number, id_proof_doc, shop_logo)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            data["name"], data["email"], data["phone"],
            hash_password(data["password"]),
            data["shop_name"], data.get("shop_description",""),
            data.get("shop_category","General"),
            data["address"], data["city"], data["pincode"],
            data.get("gst_number",""),
            data.get("id_proof_type","Aadhaar"),
            data.get("id_proof_number",""),
            id_proof_doc, shop_logo
        ))
        conn.commit()
        return ok(message="Shop registration submitted. Awaiting admin approval.", status=201)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Login (all roles) ─────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    email    = body.get("email","").strip()
    password = body.get("password","")
    role     = body.get("role","customer")   # admin | shopkeeper | customer

    if not email or not password:
        return err("Email and password are required")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        table_map = {"admin":"admins", "shopkeeper":"shopkeepers", "customer":"users"}
        table = table_map.get(role)
        if not table:
            return err("Invalid role")

        cur.execute(f"SELECT * FROM {table} WHERE email=%s", (email,))
        user = cur.fetchone()
        if not user or not check_password(password, user["password"]):
            return err("Invalid email or password", 401)

        # Approval check (not for admins)
        if role != "admin" and user.get("status") != "approved":
            status = user.get("status","pending")
            return err(f"Account is {status}. Please wait for admin approval.", 403)

        additional_claims = {
            "role": role,
            "name": user["name"],
            "email": user["email"],
        }
        if role == "shopkeeper":
            additional_claims["shop_name"] = user["shop_name"]

        token = create_access_token(
            identity=str(user["id"]),
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=24)
        )
        return ok({
            "token": token,
            "role":  role,
            "id":    user["id"],
            "name":  user["name"],
            "email": user["email"],
        })
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Profile ───────────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid   = get_jwt_identity()
    claims = get_jwt()
    role  = claims.get("role")
    role_str = str(role) if role is not None else "customer"
    table_map = {"admin":"admins", "shopkeeper":"shopkeepers", "customer":"users"}
    table = table_map.get(role_str, "users")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute(f"SELECT * FROM {table} WHERE id=%s", (uid,))
        user = cur.fetchone()
        if not user:
            return err("User not found", 404)
        user.pop("password", None)
        user["role"] = role
        return ok(user)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
