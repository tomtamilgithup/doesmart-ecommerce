"""
Admin routes — approvals, directory, monitoring
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app import get_db
from helpers import role_required, ok, err

admin_bp = Blueprint("admin", __name__)
_admin = role_required("admin")


# ── Dashboard Stats ───────────────────────────────────────────────────────────
@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@_admin
def stats():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        def count(sql): cur.execute(sql); return cur.fetchone()["c"]

        data = {
            "pending_customers":   count("SELECT COUNT(*) c FROM users        WHERE status='pending'"),
            "approved_customers":  count("SELECT COUNT(*) c FROM users        WHERE status='approved'"),
            "pending_shops":       count("SELECT COUNT(*) c FROM shopkeepers  WHERE status='pending'"),
            "approved_shops":      count("SELECT COUNT(*) c FROM shopkeepers  WHERE status='approved'"),
            "total_orders":        count("SELECT COUNT(*) c FROM orders"),
            "orders_pending":      count("SELECT COUNT(*) c FROM orders       WHERE status='pending'"),
            "orders_delivered":    count("SELECT COUNT(*) c FROM orders       WHERE status='delivered'"),
            "total_products":      count("SELECT COUNT(*) c FROM products"),
        }
        return ok(data)
    finally:
        cur.close(); conn.close()


# ── Pending Customers ─────────────────────────────────────────────────────────
@admin_bp.route("/pending-users", methods=["GET"])
@jwt_required()
@_admin
def pending_users():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT id, name, email, phone, city, pincode,
                              id_proof_type, id_proof_number, id_proof_doc,
                              address_proof, status, created_at
                       FROM users WHERE status='pending'
                       ORDER BY created_at DESC""")
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


@admin_bp.route("/approve-user/<int:uid>", methods=["PUT"])
@jwt_required()
@_admin
def approve_user(uid):
    action = request.get_json(silent=True) or {}
    status = action.get("status", "approved")
    if status not in ("approved","rejected"):
        return err("status must be approved or rejected")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE users SET status=%s WHERE id=%s", (status, uid))
        conn.commit()
        return ok(message=f"Customer {status}")
    finally:
        cur.close(); conn.close()


# ── Pending Shopkeepers ───────────────────────────────────────────────────────
@admin_bp.route("/pending-shops", methods=["GET"])
@jwt_required()
@_admin
def pending_shops():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT id, name, email, phone, shop_name, shop_category,
                              city, pincode, gst_number, id_proof_doc,
                              shop_logo, status, created_at
                       FROM shopkeepers WHERE status='pending'
                       ORDER BY created_at DESC""")
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


@admin_bp.route("/approve-shop/<int:sid>", methods=["PUT"])
@jwt_required()
@_admin
def approve_shop(sid):
    action = request.get_json(silent=True) or {}
    status = action.get("status", "approved")
    if status not in ("approved","rejected"):
        return err("status must be approved or rejected")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE shopkeepers SET status=%s WHERE id=%s", (status, sid))
        conn.commit()
        return ok(message=f"Shop {status}")
    finally:
        cur.close(); conn.close()


# ── Business Directory (all approved shops) ───────────────────────────────────
@admin_bp.route("/directory", methods=["GET"])
@jwt_required()
@_admin
def directory():
    city = request.args.get("city","")
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        if city:
            cur.execute("""SELECT id, name, shop_name, shop_category, city,
                                  pincode, phone, email, shop_logo, status, created_at
                           FROM shopkeepers WHERE status='approved' AND city LIKE %s
                           ORDER BY shop_name""", (f"%{city}%",))
        else:
            cur.execute("""SELECT id, name, shop_name, shop_category, city,
                                  pincode, phone, email, shop_logo, status, created_at
                           FROM shopkeepers WHERE status='approved'
                           ORDER BY shop_name""")
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


# ── All Orders (monitor) ──────────────────────────────────────────────────────
@admin_bp.route("/orders", methods=["GET"])
@jwt_required()
@_admin
def all_orders():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT o.id, o.order_type, o.status, o.total_amount,
                   o.payment_method, o.created_at,
                   u.name AS customer_name, u.phone AS customer_phone,
                   s.shop_name, s.city AS shop_city
            FROM orders o
            JOIN users u        ON o.user_id       = u.id
            JOIN shopkeepers s  ON o.shopkeeper_id = s.id
            ORDER BY o.created_at DESC
            LIMIT 500
        """)
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


# ── All Users List ────────────────────────────────────────────────────────────
@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@_admin
def all_users():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT id, name, email, phone, city, pincode, status, created_at
                       FROM users ORDER BY created_at DESC""")
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


# ── All Shops List ────────────────────────────────────────────────────────────
@admin_bp.route("/shops", methods=["GET"])
@jwt_required()
@_admin
def all_shops():
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT id, name, shop_name, shop_category, city,
                              pincode, phone, email, status, created_at
                       FROM shopkeepers ORDER BY created_at DESC""")
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()
