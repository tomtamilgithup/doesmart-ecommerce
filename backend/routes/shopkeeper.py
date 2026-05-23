"""
Shopkeeper routes — product management, order handling
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import get_db
from helpers import role_required, save_upload, ok, err

shopkeeper_bp = Blueprint("shopkeeper", __name__)
_sk = role_required("shopkeeper")


def _get_sk_id():
    return int(get_jwt_identity())


# ── Dashboard Stats ───────────────────────────────────────────────────────────
@shopkeeper_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@_sk
def dashboard():
    sid = _get_sk_id()
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        def count(sql, params=None):
            cur.execute(sql, params or ()); return cur.fetchone()["c"]

        data = {
            "total_products":   count("SELECT COUNT(*) c FROM products WHERE shopkeeper_id=%s", (sid,)),
            "active_products":  count("SELECT COUNT(*) c FROM products WHERE shopkeeper_id=%s AND is_available=1", (sid,)),
            "total_orders":     count("SELECT COUNT(*) c FROM orders   WHERE shopkeeper_id=%s", (sid,)),
            "pending_orders":   count("SELECT COUNT(*) c FROM orders   WHERE shopkeeper_id=%s AND status='pending'", (sid,)),
            "confirmed_orders": count("SELECT COUNT(*) c FROM orders   WHERE shopkeeper_id=%s AND status='confirmed'", (sid,)),
            "delivered_orders": count("SELECT COUNT(*) c FROM orders   WHERE shopkeeper_id=%s AND status='delivered'", (sid,)),
        }
        # Revenue
        cur.execute("""SELECT COALESCE(SUM(total_amount),0) AS rev
                       FROM orders WHERE shopkeeper_id=%s AND status='delivered'""", (sid,))
        data["total_revenue"] = float(cur.fetchone()["rev"])

        # Recent 5 orders
        cur.execute("""SELECT o.id, o.status, o.total_amount, o.order_type, o.created_at,
                              u.name AS customer_name
                       FROM orders o JOIN users u ON o.user_id=u.id
                       WHERE o.shopkeeper_id=%s
                       ORDER BY o.created_at DESC LIMIT 5""", (sid,))
        data["recent_orders"] = cur.fetchall()
        return ok(data)
    finally:
        cur.close(); conn.close()


# ── Products CRUD ─────────────────────────────────────────────────────────────
@shopkeeper_bp.route("/products", methods=["GET"])
@jwt_required()
@_sk
def list_products():
    sid = _get_sk_id()
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT * FROM products WHERE shopkeeper_id=%s
                       ORDER BY created_at DESC""", (sid,))
        return ok(cur.fetchall())
    finally:
        cur.close(); conn.close()


@shopkeeper_bp.route("/products", methods=["POST"])
@jwt_required()
@_sk
def add_product():
    sid  = _get_sk_id()
    data = request.form
    if not data.get("name") or not data.get("price"):
        return err("Product name and price are required")

    image = save_upload("image")
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO products
              (shopkeeper_id, name, description, category, price, mrp,
               quantity, sizes_available, offer_label, offer_percent, image)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            sid,
            data["name"],
            data.get("description",""),
            data.get("category","General"),
            float(data["price"]),
            float(data["mrp"]) if data.get("mrp") else None,
            int(data.get("quantity", 0)),
            data.get("sizes_available",""),
            data.get("offer_label",""),
            float(data.get("offer_percent", 0)),
            image
        ))
        conn.commit()
        return ok({"id": cur.lastrowid}, "Product added", 201)
    finally:
        cur.close(); conn.close()


@shopkeeper_bp.route("/products/<int:pid>", methods=["PUT"])
@jwt_required()
@_sk
def update_product(pid):
    sid  = _get_sk_id()
    data = request.form
    image = save_upload("image")

    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT id FROM products WHERE id=%s AND shopkeeper_id=%s", (pid, sid))
        if not cur.fetchone():
            return err("Product not found or access denied", 404)

        fields, vals = [], []
        mapping = {
            "name":"name","description":"description","category":"category",
            "price":"price","mrp":"mrp","quantity":"quantity",
            "sizes_available":"sizes_available","offer_label":"offer_label",
            "offer_percent":"offer_percent","is_available":"is_available"
        }
        for key, col in mapping.items():
            if key in data:
                fields.append(f"{col}=%s")
                vals.append(data[key])
        if image:
            fields.append("image=%s"); vals.append(image)

        if not fields:
            return err("No fields to update")

        vals += [pid, sid]
        cur.execute(f"UPDATE products SET {', '.join(fields)} WHERE id=%s AND shopkeeper_id=%s", vals)
        conn.commit()
        return ok(message="Product updated")
    finally:
        cur.close(); conn.close()


@shopkeeper_bp.route("/products/<int:pid>", methods=["DELETE"])
@jwt_required()
@_sk
def delete_product(pid):
    sid = _get_sk_id()
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM products WHERE id=%s AND shopkeeper_id=%s", (pid, sid))
        conn.commit()
        if cur.rowcount == 0:
            return err("Product not found", 404)
        return ok(message="Product deleted")
    finally:
        cur.close(); conn.close()


# ── Orders ────────────────────────────────────────────────────────────────────
@shopkeeper_bp.route("/orders", methods=["GET"])
@jwt_required()
@_sk
def shop_orders():
    sid = _get_sk_id()
    conn = get_db()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT o.id, o.order_type, o.status, o.total_amount,
                   o.payment_method, o.delivery_address, o.notes, o.created_at,
                   u.name AS customer_name, u.phone AS customer_phone
            FROM orders o JOIN users u ON o.user_id=u.id
            WHERE o.shopkeeper_id=%s
            ORDER BY o.created_at DESC
        """, (sid,))
        orders = cur.fetchall()

        for order in orders:
            cur.execute("""SELECT oi.product_name, oi.price, oi.quantity, oi.size
                           FROM order_items oi WHERE oi.order_id=%s""", (order["id"],))
            order["items"] = cur.fetchall()

        return ok(orders)
    finally:
        cur.close(); conn.close()


@shopkeeper_bp.route("/orders/<int:oid>", methods=["PUT"])
@jwt_required()
@_sk
def update_order_status(oid):
    sid  = _get_sk_id()
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    valid  = ("confirmed","processing","out_for_delivery","delivered","cancelled")
    if status not in valid:
        return err(f"Invalid status. Must be one of: {', '.join(valid)}")

    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""UPDATE orders SET status=%s
                       WHERE id=%s AND shopkeeper_id=%s""", (status, oid, sid))
        conn.commit()
        if cur.rowcount == 0:
            return err("Order not found", 404)
        return ok(message=f"Order marked as {status}")
    finally:
        cur.close(); conn.close()
