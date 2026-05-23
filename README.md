# DoEmart

A centralized business directory and e-commerce platform connecting consumers directly with small-scale local retailers.

## Architecture

| Layer      | Technology           |
|-----------|----------------------|
| Frontend  | HTML5, Vanilla CSS, Vanilla JS |
| Backend   | Python (Flask)       |
| Database  | MySQL                |
| Auth      | JWT (flask-jwt-extended) |

## Quick Start

### 1. Database Setup

Make sure MySQL is running, then run:
```bash
mysql -u root -p < backend/db/schema.sql
```
This creates the `doesmart` database and seeds the default admin account.

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` (optional, defaults shown):
```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=doesmart
JWT_SECRET_KEY=doesmart-super-secret-2024
```

Start the server:
```bash
python app.py
```

Flask API will run at **http://localhost:5000**

### 3. Frontend

Open `frontend/index.html` in your browser. You can also serve it with a simple HTTP server:
```bash
cd frontend
python -m http.server 3000
```
Then open **http://localhost:3000**

## Default Admin Account

| Field    | Value                  |
|----------|------------------------|
| Email    | admin@doesmart.com     |
| Password | Admin@123              |
| Role     | Admin                  |

## User Flows

### Admin
1. Log in at `/pages/login.html` with role = Admin
2. Approve/reject customer and shopkeeper registrations
3. Monitor all orders and browse the business directory

### Shopkeeper
1. Register at `/pages/register.html?role=shopkeeper`
2. Wait for admin approval
3. Add products (name, price, quantity, sizes, images, offers)
4. Manage incoming orders and update their status

### Customer
1. Register at `/pages/register.html?role=customer` (ID proof required)
2. Wait for admin approval
3. Browse shops by city/pincode/category
4. Add products to cart and place Spot or Advance orders
5. Track order status and leave reviews

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/customer` | Register as customer |
| POST | `/api/auth/register/shopkeeper` | Register as shopkeeper |
| POST | `/api/auth/login` | Login (all roles) |
| GET  | `/api/auth/me` | Get current user |

### Admin (JWT required, role=admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform statistics |
| GET | `/api/admin/pending-users` | Pending customer registrations |
| PUT | `/api/admin/approve-user/:id` | Approve/reject customer |
| GET | `/api/admin/pending-shops` | Pending shop registrations |
| PUT | `/api/admin/approve-shop/:id` | Approve/reject shop |
| GET | `/api/admin/users` | All customers |
| GET | `/api/admin/shops` | All shops |
| GET | `/api/admin/orders` | All orders |
| GET | `/api/admin/directory` | Business directory |

### Shopkeeper (JWT required, role=shopkeeper)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shop/dashboard` | Dashboard stats |
| GET/POST | `/api/shop/products` | List/add products |
| PUT/DELETE | `/api/shop/products/:id` | Update/delete product |
| GET | `/api/shop/orders` | Incoming orders |
| PUT | `/api/shop/orders/:id` | Update order status |

### Customer (public browse, JWT for orders/reviews)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shops` | Browse shops (with filters) |
| GET | `/api/shops/:id` | Shop detail + products + reviews |
| POST | `/api/orders` | Place order |
| GET | `/api/orders` | My orders |
| POST | `/api/reviews` | Submit review |

## Project Structure

```
new_em/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── helpers.py
│   ├── requirements.txt
│   ├── db/schema.sql
│   ├── routes/
│   │   ├── auth.py
│   │   ├── admin.py
│   │   ├── shopkeeper.py
│   │   └── customer.py
│   └── uploads/
└── frontend/
    ├── index.html
    ├── assets/
    │   ├── css/main.css
    │   └── js/
    │       ├── api.js, auth.js, admin.js
    │       ├── shopkeeper.js, customer.js
    └── pages/
        ├── login.html, register.html
        ├── admin/ (dashboard, users, shops, orders)
        ├── shopkeeper/ (dashboard, products, orders)
        └── customer/ (home, shop, cart, orders)
```
