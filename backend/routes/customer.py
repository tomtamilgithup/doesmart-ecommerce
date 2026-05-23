"""
Customer routes — shop discovery, ordering, reviews
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import get_db
from helpers import role_required, ok, err

customer_bp = Blueprint("customer", __name__)
_cu = role_required("customer")


def _uid():
    return int(get_jwt_identity())


# ── Browse Shops ──────────────────────────────────────────────────────────────
@customer_bp.route("/shops", methods=["GET"])
def browse_shops():
    city    = request.args.get("city","").strip()
    pincode = request.args.get("pincode","").strip()
    cat     = request.args.get("category","").strip()
    search  = request.args.get("search","").strip()

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        where, params = ["s.status='approved'"], []

        if city:
            where.append("s.city LIKE %s"); params.append(f"%{city}%")
        if pincode:
            where.append("s.pincode=%s"); params.append(pincode)
        if cat:
            where.append("s.shop_category LIKE %s"); params.append(f"%{cat}%")
        if search:
            where.append("(s.shop_name LIKE %s OR s.shop_description LIKE %s)")
            params += [f"%{search}%", f"%{search}%"]

        sql = f"""
            SELECT s.id, s.shop_name, s.shop_description, s.shop_category,
                   s.city, s.pincode, s.phone, s.shop_logo,
                   COALESCE(AVG(r.rating),0) AS avg_rating,
                   COUNT(DISTINCT r.id)      AS review_count
            FROM shopkeepers s
            LEFT JOIN reviews r ON r.shopkeeper_id = s.id
            WHERE {' AND '.join(where)}
            GROUP BY s.id
            ORDER BY avg_rating DESC, s.shop_name
        """
        cur.execute(sql, params)
        return ok(cur.fetchall())
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Shop Detail ───────────────────────────────────────────────────────────────
@customer_bp.route("/shops/<int:sid>", methods=["GET"])
def shop_detail(sid):
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("""SELECT id, shop_name, shop_description, shop_category,
                              city, pincode, phone, shop_logo
                       FROM shopkeepers WHERE id=%s AND status='approved'""", (sid,))
        shop = cur.fetchone()
        if not shop:
            return err("Shop not found", 404)

        cur.execute("""SELECT id, name, description, category, price, mrp,
                              quantity, sizes_available, offer_label, offer_percent, image
                       FROM products WHERE shopkeeper_id=%s AND is_available=1
                       ORDER BY category, name""", (sid,))
        shop["products"] = cur.fetchall()

        cur.execute("""SELECT r.rating, r.comment, r.created_at, u.name AS reviewer
                       FROM reviews r JOIN users u ON r.user_id=u.id
                       WHERE r.shopkeeper_id=%s
                       ORDER BY r.created_at DESC LIMIT 20""", (sid,))
        shop["reviews"] = cur.fetchall()

        return ok(shop)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Place Order ───────────────────────────────────────────────────────────────
@customer_bp.route("/orders", methods=["POST"])
@jwt_required()
@_cu
def place_order():
    uid  = _uid()
    body = request.get_json(silent=True) or {}

    shopkeeper_id    = body.get("shopkeeper_id")
    items            = body.get("items", [])
    order_type       = body.get("order_type", "spot")
    delivery_address = body.get("delivery_address","")
    notes            = body.get("notes","")

    if not shopkeeper_id or not items:
        return err("shopkeeper_id and items are required")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)

        # Validate products & calculate total
        total = 0.0
        enriched = []
        for item in items:
            pid = item.get("product_id")
            qty = int(item.get("quantity", 1))
            size= item.get("size","")
            cur.execute("""SELECT id, name, price, quantity AS stock, is_available
                           FROM products WHERE id=%s AND shopkeeper_id=%s""", (pid, shopkeeper_id))
            prod = cur.fetchone()
            if not prod or not prod["is_available"]:
                return err(f"Product {pid} not available")
            if prod["stock"] < qty:
                return err(f"Insufficient stock for '{prod['name']}'")
            total += float(prod["price"]) * qty
            enriched.append({**prod, "qty": qty, "size": size})

        # Insert order
        cur.execute("""INSERT INTO orders
                         (user_id, shopkeeper_id, order_type, delivery_address,
                          total_amount, payment_method, notes)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (uid, shopkeeper_id, order_type, delivery_address,
                     round(total,2), "COD", notes))
        oid = cur.lastrowid

        # Insert items & decrement stock
        for p in enriched:
            cur.execute("""INSERT INTO order_items
                             (order_id, product_id, product_name, price, quantity, size)
                           VALUES (%s,%s,%s,%s,%s,%s)""",
                        (oid, p["id"], p["name"], p["price"], p["qty"], p["size"]))
            cur.execute("UPDATE products SET quantity=quantity-%s WHERE id=%s",
                        (p["qty"], p["id"]))

        conn.commit()
        return ok({"order_id": oid, "total": round(total,2)},
                  "Order placed successfully!", 201)
    except Exception as e:
        if conn:
            conn.rollback()
        return err(str(e), 500)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── My Orders ─────────────────────────────────────────────────────────────────
@customer_bp.route("/orders", methods=["GET"])
@jwt_required()
@_cu
def my_orders():
    uid = _uid()
    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT o.id, o.order_type, o.status, o.total_amount,
                   o.payment_method, o.created_at,
                   s.shop_name, s.city AS shop_city, s.phone AS shop_phone
            FROM orders o JOIN shopkeepers s ON o.shopkeeper_id=s.id
            WHERE o.user_id=%s
            ORDER BY o.created_at DESC
        """, (uid,))
        orders = cur.fetchall()
        for order in orders:
            cur.execute("""SELECT product_name, price, quantity, size
                           FROM order_items WHERE order_id=%s""", (order["id"],))
            order["items"] = cur.fetchall()
        return ok(orders)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ── Submit Review ─────────────────────────────────────────────────────────────
@customer_bp.route("/reviews", methods=["POST"])
@jwt_required()
@_cu
def submit_review():
    uid  = _uid()
    body = request.get_json(silent=True) or {}

    sid     = body.get("shopkeeper_id")
    rating  = body.get("rating")
    comment = body.get("comment","")
    oid     = body.get("order_id")

    if not sid or not rating:
        return err("shopkeeper_id and rating are required")
    if not (1 <= int(rating) <= 5):
        return err("Rating must be between 1 and 5")

    conn = None
    cur = None
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""INSERT INTO reviews (user_id, shopkeeper_id, order_id, rating, comment)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (uid, sid, oid, int(rating), comment))
        conn.commit()
        return ok(message="Review submitted. Thank you!")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
