-- DoEmart Sample/Seed Data
-- Run: mysql -u root -p < backend/db/sample_data.sql

USE doesmart;

-- ─────────────────────────────────────────────
-- SEED USERS (CUSTOMERS)
-- Passwords are set to 'Admin@123'
-- ─────────────────────────────────────────────
INSERT IGNORE INTO users (id, name, email, phone, password, address, city, pincode, id_proof_type, id_proof_number, id_proof_doc, address_proof, status)
VALUES 
(1, 'Raj Kumar', 'customer1@doesmart.com', '9876543210', 
 '$2b$12$2vWsSpYktGli0DpbAIqAVOg0iXH9xniNGYiamJFK2yDuTHilt3qg.', 
 'Flat 201, Green Meadows, MG Road', 'Pune', '411001', 'Aadhaar', '123456789012', NULL, NULL, 'approved'),
(2, 'Priya Singh', 'customer2@doesmart.com', '9876543211', 
 '$2b$12$2vWsSpYktGli0DpbAIqAVOg0iXH9xniNGYiamJFK2yDuTHilt3qg.', 
 'Sector 4, Pocket B, Dwarka', 'New Delhi', '110075', 'PAN', 'ABCDE1234F', NULL, NULL, 'approved');

-- ─────────────────────────────────────────────
-- SEED SHOPKEEPERS
-- Passwords are set to 'Admin@123'
-- ─────────────────────────────────────────────
INSERT IGNORE INTO shopkeepers (id, name, email, phone, password, shop_name, shop_description, shop_category, address, city, pincode, gst_number, id_proof_type, id_proof_number, id_proof_doc, shop_logo, status)
VALUES 
(1, 'Ramesh Patel', 'shop1@doesmart.com', '9123456780', 
 '$2b$12$2vWsSpYktGli0DpbAIqAVOg0iXH9xniNGYiamJFK2yDuTHilt3qg.', 
 'Patel Provisions', 'Your one-stop shop for fresh daily groceries, grains, and kitchen essentials.', 'Grocery', 
 'Shop 12, Shopping Complex, MG Road', 'Pune', '411001', '27AAAAA1111A1Z1', 'Aadhaar', '987654321098', NULL, NULL, 'approved'),
(2, 'Anjali Sharma', 'shop2@doesmart.com', '9123456781', 
 '$2b$12$2vWsSpYktGli0DpbAIqAVOg0iXH9xniNGYiamJFK2yDuTHilt3qg.', 
 'Anjali Boutique', 'Premium collections of handcrafted ethnic wear, kurtis, and designer sarees.', 'Clothing', 
 'F-45, Fashion Market, Dwarka', 'New Delhi', '110075', '07BBBBB2222B2Z2', 'Driving License', 'DL-1234567890', NULL, NULL, 'approved');

-- ─────────────────────────────────────────────
-- SEED PRODUCTS
-- ─────────────────────────────────────────────
INSERT IGNORE INTO products (id, shopkeeper_id, name, description, category, price, mrp, quantity, sizes_available, offer_label, offer_percent, image, is_available)
VALUES 
(1, 1, 'Basmati Rice 5kg', 'Premium long grain aged basmati rice perfect for biryani and pulao.', 'Grains', 450.00, 500.00, 50, '["5kg"]', '10% OFF', 10.00, NULL, 1),
(2, 1, 'Tirupati Sunflower Oil 1L', 'Healthy and refined sunflower oil for everyday delicious cooking.', 'Oils', 160.00, 180.00, 100, '["1L"]', '11% OFF', 11.11, NULL, 1),
(3, 1, 'Cadbury Dairy Milk Silk', 'Rich, smooth, and creamy classic milk chocolate bar.', 'Chocolates', 80.00, 80.00, 150, '["Regular", "Large"]', NULL, 0.00, NULL, 1),
(4, 2, 'Cotton Kurti', 'Handwoven breathable pure cotton casual wear printed kurti.', 'Kurtis', 699.00, 999.00, 25, '["S", "M", "L", "XL"]', '30% OFF', 30.00, NULL, 1),
(5, 2, 'Designer Saree', 'Gorgeous Banarasi silk saree perfect for weddings and festive occasions.', 'Sarees', 2500.00, 3500.00, 10, '["Free Size"]', '₹1000 OFF', 28.57, NULL, 1);

-- ─────────────────────────────────────────────
-- SEED ORDERS
-- ─────────────────────────────────────────────
INSERT IGNORE INTO orders (id, user_id, shopkeeper_id, order_type, delivery_address, total_amount, payment_method, status, notes)
VALUES 
(1, 1, 1, 'spot', 'Flat 201, Green Meadows, MG Road, Pune - 411001', 610.00, 'COD', 'delivered', 'Please deliver by evening'),
(2, 2, 2, 'advance', 'Sector 4, Pocket B, Dwarka, New Delhi - 110075', 3199.00, 'COD', 'pending', 'Gift wrapping requested');

-- ─────────────────────────────────────────────
-- SEED ORDER ITEMS
-- ─────────────────────────────────────────────
INSERT IGNORE INTO order_items (id, order_id, product_id, product_name, price, quantity, size)
VALUES 
(1, 1, 1, 'Basmati Rice 5kg', 450.00, 1, '5kg'),
(2, 1, 2, 'Tirupati Sunflower Oil 1L', 160.00, 1, '1L'),
(3, 2, 4, 'Cotton Kurti', 699.00, 1, 'M'),
(4, 2, 5, 'Designer Saree', 2500.00, 1, 'Free Size');

-- ─────────────────────────────────────────────
-- SEED REVIEWS
-- ─────────────────────────────────────────────
INSERT IGNORE INTO reviews (id, user_id, shopkeeper_id, order_id, rating, comment)
VALUES 
(1, 1, 1, 1, 5, 'Fresh and high-quality grocery items! Prompt and neat delivery.'),
(2, 2, 2, 2, 4, 'Beautiful cloth material. The fitting is exactly as listed.');
