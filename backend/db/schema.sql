-- DoEmart Database Schema
-- Run: mysql -u root -p < backend/db/schema.sql

CREATE DATABASE IF NOT EXISTS doesmart DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doesmart;

-- ─────────────────────────────────────────────
-- ADMINS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin (password: Admin@123)
INSERT IGNORE INTO admins (name, email, password)
VALUES ('Super Admin', 'admin@doesmart.com',
        '$2b$12$2vWsSpYktGli0DpbAIqAVOg0iXH9xniNGYiamJFK2yDuTHilt3qg.');

-- ─────────────────────────────────────────────
-- USERS (CUSTOMERS)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(15)  NOT NULL,
    password        VARCHAR(255) NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    pincode         VARCHAR(10),
    id_proof_type   ENUM('Aadhaar','PAN','Voter ID','Passport','Driving License') DEFAULT 'Aadhaar',
    id_proof_number VARCHAR(50),
    id_proof_doc    VARCHAR(255),   -- uploaded filename
    address_proof   VARCHAR(255),   -- uploaded filename
    status          ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- SHOPKEEPERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shopkeepers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(15)  NOT NULL,
    password        VARCHAR(255) NOT NULL,
    shop_name       VARCHAR(150) NOT NULL,
    shop_description TEXT,
    shop_category   VARCHAR(100),
    address         TEXT,
    city            VARCHAR(100),
    pincode         VARCHAR(10),
    gst_number      VARCHAR(20),
    id_proof_type   ENUM('Aadhaar','PAN','Voter ID','Passport','Driving License') DEFAULT 'Aadhaar',
    id_proof_number VARCHAR(50),
    id_proof_doc    VARCHAR(255),
    shop_logo       VARCHAR(255),
    status          ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    shopkeeper_id   INT NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),
    price           DECIMAL(10,2) NOT NULL,
    mrp             DECIMAL(10,2),
    quantity        INT DEFAULT 0,
    sizes_available VARCHAR(255),   -- JSON string e.g. ["S","M","L"]
    offer_label     VARCHAR(100),   -- e.g. "10% OFF"
    offer_percent   DECIMAL(5,2) DEFAULT 0,
    image           VARCHAR(255),
    is_available    TINYINT(1) DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shopkeeper_id) REFERENCES shopkeepers(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    shopkeeper_id   INT NOT NULL,
    order_type      ENUM('advance','spot') DEFAULT 'spot',
    delivery_address TEXT,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method  ENUM('COD','Online') DEFAULT 'COD',
    status          ENUM('pending','confirmed','processing','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (shopkeeper_id) REFERENCES shopkeepers(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    order_id    INT NOT NULL,
    product_id  INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,  -- snapshot at order time
    price       DECIMAL(10,2) NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    size        VARCHAR(20),
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ─────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    shopkeeper_id INT NOT NULL,
    order_id      INT,
    rating        TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (shopkeeper_id) REFERENCES shopkeepers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id)      REFERENCES orders(id)      ON DELETE SET NULL
);
