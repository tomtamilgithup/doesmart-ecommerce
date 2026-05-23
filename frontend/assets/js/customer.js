/**
 * DoEmart — Customer JS
 * Handles shop browsing, shop detail, cart, orders, and reviews.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CART (localStorage)
// ─────────────────────────────────────────────────────────────────────────────
const Cart = {
  get: ()        => JSON.parse(localStorage.getItem("dm_cart") || "[]"),
  set: (items)   => { localStorage.setItem("dm_cart", JSON.stringify(items)); updateCartBadge(); },
  clear: ()      => { localStorage.removeItem("dm_cart"); updateCartBadge(); },
  count: ()      => Cart.get().reduce((sum, i) => sum + i.quantity, 0),

  addItem(product, size = "", shopkeeperId) {
    const items = Cart.get();
    // Prevent mixing shops
    if (items.length > 0 && items[0].shopkeeper_id !== shopkeeperId) {
      Toast.error("Clear your cart first — you can only order from one shop at a time.");
      return false;
    }
    const existing = items.find(i => i.product_id === product.id && i.size === size);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({
        product_id:     product.id,
        product_name:   product.name,
        price:          parseFloat(product.price),
        quantity:       1,
        size,
        image:          product.image || null,
        shopkeeper_id:  shopkeeperId,
        shopkeeper_name: product._shopName || "",
      });
    }
    Cart.set(items);
    return true;
  },

  removeItem(productId, size) {
    const items = Cart.get().filter(i => !(i.product_id === productId && i.size === size));
    Cart.set(items);
  },

  updateQty(productId, size, delta) {
    const items = Cart.get();
    const item  = items.find(i => i.product_id === productId && i.size === size);
    if (!item) return;
    item.quantity = Math.max(1, item.quantity + delta);
    Cart.set(items);
  },

  total: () => Cart.get().reduce((sum, i) => sum + i.price * i.quantity, 0),
};

function updateCartBadge() {
  const count = Cart.count();
  const badge = document.getElementById("cartCount");
  const fab   = document.getElementById("cartFab");
  if (badge) badge.textContent = count;
  if (fab)   fab.style.display = count > 0 ? "flex" : "none";
}


// ─────────────────────────────────────────────────────────────────────────────
// SHOP BROWSING (home.html)
// ─────────────────────────────────────────────────────────────────────────────
async function searchShops() {
  const grid = document.getElementById("shopsGrid");
  if (!grid) return;
  showLoader(grid, "Finding shops…");

  const params = {
    search:   document.getElementById("searchInput")?.value.trim()    || "",
    city:     document.getElementById("cityInput")?.value.trim()      || "",
    pincode:  document.getElementById("pincodeInput")?.value.trim()   || "",
    category: document.getElementById("categoryFilter")?.value        || "",
  };

  try {
    const res   = await api.customer.shops(params);
    const shops = res.data || [];

    const countEl = document.getElementById("shopCount");
    if (countEl) countEl.textContent = `${shops.length} shop${shops.length !== 1 ? "s" : ""} found`;

    if (!shops.length) {
      showEmpty(grid, "No shops found", "Try adjusting your search or location filters.", "🏪");
      return;
    }

    grid.innerHTML = shops.map(s => {
      const cat = s.shop_category || "General";
      const catEmoji = { Grocery:"🛒", Clothing:"👗", Electronics:"📱", Pharmacy:"💊",
                         Bakery:"🥐", Stationery:"✏️", Hardware:"🔧", Vegetables:"🥦",
                         Dairy:"🥛", "General Store":"🏪" }[cat] || "🏬";
      return `
        <div class="shop-card animate-scale-in" onclick="window.location.href='shop.html?id=${s.id}'">
          <div class="shop-cover">
            ${s.shop_logo
              ? `<img class="shop-logo-img" src="${uploadUrl(s.shop_logo)}" alt="${s.shop_name}" onerror="this.parentElement.innerHTML='${catEmoji}'">`
              : catEmoji}
          </div>
          <div class="shop-body">
            <div class="shop-name">${s.shop_name}</div>
            <div class="shop-rating">
              <div class="stars">${starsHtml(s.avg_rating)}</div>
              <span class="text-sm text-muted">${parseFloat(s.avg_rating||0).toFixed(1)} (${s.review_count} reviews)</span>
            </div>
            <div class="shop-meta">
              <span class="badge badge-indigo">${cat}</span>
            </div>
            ${s.shop_description ? `<p class="text-xs text-muted" style="margin-top:var(--space-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${s.shop_description}</p>` : ""}
            <div class="shop-location" style="margin-top:var(--space-3)">
              📍 ${s.city}${s.pincode ? ` — ${s.pincode}` : ""}
            </div>
          </div>
        </div>`;
    }).join("");

  } catch (e) {
    showEmpty(grid, "Failed to load shops", e.message, "⚠️");
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SHOP DETAIL (shop.html)
// ─────────────────────────────────────────────────────────────────────────────
let currentShopId = null;

async function loadShopDetail(sid) {
  currentShopId = parseInt(sid);
  const hero = document.getElementById("shopHero");
  const productsSection = document.getElementById("productsSection");
  const productsGrid    = document.getElementById("productsGrid");
  const reviewsList     = document.getElementById("reviewsList");

  try {
    const res  = await api.customer.shopDetail(sid);
    const shop = res.data;

    // Hero
    const catEmoji = { Grocery:"🛒", Clothing:"👗", Electronics:"📱", Pharmacy:"💊",
                       Bakery:"🥐", Stationery:"✏️", Hardware:"🔧", Vegetables:"🥦",
                       Dairy:"🥛", "General Store":"🏪" }[shop.shop_category] || "🏬";
    hero.innerHTML = `
      <div class="shop-hero-inner">
        <div class="shop-avatar">
          ${shop.shop_logo ? `<img src="${uploadUrl(shop.shop_logo)}" alt="${shop.shop_name}" onerror="this.parentElement.textContent='${catEmoji}'">` : catEmoji}
        </div>
        <div class="shop-info">
          <h1>${shop.shop_name}</h1>
          ${shop.shop_description ? `<p class="text-secondary">${shop.shop_description}</p>` : ""}
          <div class="shop-chips">
            <span class="badge badge-indigo">${shop.shop_category || "General"}</span>
            <span class="badge badge-muted">📍 ${shop.city}${shop.pincode ? ` ${shop.pincode}` : ""}</span>
            ${shop.phone ? `<span class="badge badge-muted">📞 ${shop.phone}</span>` : ""}
          </div>
        </div>
      </div>`;

    // Products
    const products = shop.products || [];
    if (products.length) {
      productsSection.classList.remove("hidden");
      productsGrid.innerHTML = products.map(p => {
        const sizes = parseSizes(p.sizes_available);
        return `
          <div class="product-card">
            <div class="product-img-box">
              ${p.image ? `<img src="${uploadUrl(p.image)}" alt="${p.name}" onerror="this.parentElement.innerHTML='🛍️'">` : "🛍️"}
            </div>
            <div class="product-body">
              <div class="product-name">${p.name}</div>
              ${p.description ? `<p class="text-xs text-muted" style="margin:4px 0">${p.description}</p>` : ""}
              <div class="flex items-center gap-3 mt-2">
                <span class="product-price">${formatCurrency(p.price)}</span>
                ${p.mrp ? `<span style="font-size:var(--font-size-xs);color:var(--text-muted);text-decoration:line-through">₹${p.mrp}</span>` : ""}
              </div>
              ${p.offer_label ? `<span class="badge badge-amber mt-2">${p.offer_label}</span>` : ""}
              ${sizes.length ? `
                <div class="size-picker" id="sizes_${p.id}">
                  ${sizes.map(s => `<span class="size-btn" data-pid="${p.id}" onclick="selectSize(this,'${s}')">${s}</span>`).join("")}
                </div>` : ""}
              <div class="text-xs text-muted mt-2">Stock: ${p.quantity || 0}</div>
            </div>
            <div class="product-actions">
              <button class="btn btn-primary w-full btn-sm" id="addBtn_${p.id}"
                onclick="addToCart(${JSON.stringify({...p, _shopName: shop.shop_name}).replace(/"/g,'&quot;')}, ${shop.id})">
                🛒 Add to Cart
              </button>
            </div>
          </div>`;
      }).join("");
    }

    // Reviews
    const reviews = shop.reviews || [];
    if (!reviews.length) {
      showEmpty(reviewsList, "No reviews yet", "Be the first to review this shop!", "⭐");
    } else {
      reviewsList.innerHTML = reviews.map(r => `
        <div class="review-item">
          <div class="flex items-center justify-between mb-2">
            <span class="fw-600 text-sm">${r.reviewer}</span>
            <div class="stars" style="font-size:14px">${starsHtml(r.rating)}</div>
          </div>
          ${r.comment ? `<p class="text-sm text-secondary">${r.comment}</p>` : ""}
          <div class="text-xs text-muted mt-2">${formatDate(r.created_at)}</div>
        </div>`).join("");
    }

    // Review form submit
    const reviewForm = document.getElementById("reviewForm");
    if (reviewForm) {
      reviewForm.onsubmit = async (e) => {
        e.preventDefault();
        const rating = parseInt(document.getElementById("ratingVal").value);
        if (!rating) return Toast.error("Please select a rating");
        const btn = document.getElementById("reviewSubmitBtn");
        btn.disabled = true; btn.textContent = "Submitting…";
        try {
          await api.customer.review({ shopkeeper_id: currentShopId, rating, comment: reviewForm.comment.value });
          Toast.success("Review submitted!");
          closeModal("reviewModal");
          loadShopDetail(sid); // Reload
        } catch (err) {
          Toast.error(err.message);
        } finally { btn.disabled = false; btn.textContent = "Submit Review"; }
      };
    }

  } catch (e) {
    if (hero) hero.innerHTML = `<p class="text-muted">${e.message}</p>`;
  }
}

function parseSizes(sizesAvailable) {
  if (!sizesAvailable) return [];
  try {
    return JSON.parse(sizesAvailable);
  } catch (e) {
    return sizesAvailable.split(",").map(s => s.trim()).filter(Boolean);
  }
}

// Track selected sizes
const selectedSizes = {};
function selectSize(el, size) {
  const pid = el.dataset.pid;
  selectedSizes[pid] = size;
  document.querySelectorAll(`[data-pid="${pid}"]`).forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
}

function addToCart(product, shopId) {
  const sizes = parseSizes(product.sizes_available);
  const size  = sizes.length ? (selectedSizes[product.id] || "") : "";

  if (sizes.length && !selectedSizes[product.id]) {
    Toast.info("Please select a size first");
    return;
  }

  const added = Cart.addItem(product, size, shopId);
  if (added) {
    Toast.success(`${product.name} added to cart!`);
    updateCartBadge();
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// CART PAGE (cart.html)
// ─────────────────────────────────────────────────────────────────────────────
function renderCart() {
  const container = document.getElementById("cartContent");
  if (!container) return;

  const items = Cart.get();
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Browse local shops and add products to your cart.</p>
        <a href="home.html" class="btn btn-primary mt-4">Browse Shops</a>
      </div>`;
    return;
  }

  const shopName = items[0]?.shopkeeper_name || "Shop";

  container.innerHTML = `
    <div class="cart-layout">
      <div>
        <div class="card mb-4">
          <div class="flex items-center gap-3 mb-4">
            <div style="font-size:24px">🏪</div>
            <div>
              <div class="fw-600">Ordering from: ${shopName}</div>
              <div class="text-xs text-muted">All items are from the same shop</div>
            </div>
            <button class="btn btn-rose btn-sm" style="margin-left:auto" onclick="clearCart()">Clear Cart</button>
          </div>
          ${items.map(item => `
            <div class="cart-item">
              <div class="cart-item-img">
                ${item.image ? `<img src="${uploadUrl(item.image)}" onerror="this.parentElement.textContent='🛍️'">` : "🛍️"}
              </div>
              <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                ${item.size ? `<div class="text-xs text-muted">Size: ${item.size}</div>` : ""}
                <div class="cart-item-price">${formatCurrency(item.price)}</div>
              </div>
              <div class="qty-control">
                <button class="qty-btn" onclick="changeQty(${item.product_id},'${item.size}',-1)">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="changeQty(${item.product_id},'${item.size}',1)">+</button>
              </div>
              <div class="fw-600 text-indigo" style="min-width:80px;text-align:right">${formatCurrency(item.price * item.quantity)}</div>
              <button class="btn btn-rose btn-sm" onclick="removeItem(${item.product_id},'${item.size}')">✕</button>
            </div>`).join("")}
        </div>
      </div>

      <div class="order-summary">
        <h3 style="font-size:var(--font-size-lg);font-weight:700;margin-bottom:var(--space-5)">Order Summary</h3>
        <div class="summary-row"><span class="text-muted">Subtotal</span><span>${formatCurrency(Cart.total())}</span></div>
        <div class="summary-row"><span class="text-muted">Delivery</span><span class="text-emerald">FREE</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatCurrency(Cart.total())}</span></div>
        <div class="divider" style="margin:var(--space-4) 0"></div>
        <div class="text-xs text-muted mb-4">Payment method: <span class="fw-600 text-primary">Cash on Delivery</span></div>
        <button class="btn btn-primary w-full btn-lg" onclick="openModal('placeOrderModal')">Place Order →</button>
        <a href="home.html" class="btn btn-ghost w-full mt-3">Continue Shopping</a>
      </div>
    </div>`;

  // Bind place order form
  const form = document.getElementById("placeOrderForm");
  if (form) {
    form.onsubmit = placeOrder;
  }
}

function changeQty(pid, size, delta) {
  Cart.updateQty(pid, size, delta);
  renderCart();
}

function removeItem(pid, size) {
  Cart.removeItem(pid, size);
  renderCart();
}

function clearCart() {
  if (!confirm("Clear all items from your cart?")) return;
  Cart.clear();
  renderCart();
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true; btn.textContent = "Placing order…";

  const items = Cart.get();
  if (!items.length) return Toast.error("Cart is empty");

  const body = {
    shopkeeper_id:    items[0].shopkeeper_id,
    items:            items.map(i => ({ product_id: i.product_id, quantity: i.quantity, size: i.size })),
    order_type:       document.getElementById("orderType").value,
    delivery_address: document.getElementById("deliveryAddress").value,
    notes:            document.getElementById("orderNotes").value,
  };

  try {
    const res = await api.customer.placeOrder(body);
    Toast.success(`Order #${res.data.order_id} placed! Total: ${formatCurrency(res.data.total)}`);
    Cart.clear();
    closeModal("placeOrderModal");
    setTimeout(() => window.location.href = "orders.html", 1200);
  } catch (err) {
    Toast.error(err.message);
    btn.disabled = false; btn.textContent = "Place Order";
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// MY ORDERS PAGE (orders.html)
// ─────────────────────────────────────────────────────────────────────────────
async function loadMyOrders() {
  const container = document.getElementById("ordersContainer");
  if (!container) return;
  showLoader(container, "Loading your orders…");

  try {
    const res    = await api.customer.myOrders();
    const orders = res.data || [];

    if (!orders.length) {
      showEmpty(container, "No orders yet", "Start shopping to place your first order!", "📦");
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="order-card animate-slide-up">
        <div class="order-header">
          <div>
            <span class="fw-600 text-indigo">Order #${o.id}</span>
            <span class="text-muted text-xs" style="margin-left:var(--space-3)">${formatDate(o.created_at)}</span>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${statusBadge(o.order_type)}
            ${statusBadge(o.status)}
          </div>
        </div>
        <div class="flex gap-4 mt-3 flex-wrap">
          <div>
            <div class="text-xs text-muted">Shop</div>
            <div class="fw-600 text-sm">${o.shop_name}</div>
            <div class="text-xs text-muted">📍 ${o.shop_city || ""}</div>
          </div>
          <div>
            <div class="text-xs text-muted">Payment</div>
            <div class="fw-600 text-sm">${o.payment_method}</div>
          </div>
          <div style="margin-left:auto">
            <div class="text-xs text-muted">Total</div>
            <div class="fw-700 text-xl text-indigo">${formatCurrency(o.total_amount)}</div>
          </div>
        </div>
        ${o.items?.length ? `
          <div class="order-items">
            ${o.items.map(i => `
              <div class="order-item-row">
                <span>${i.product_name}${i.size ? ` (${i.size})` : ""} × ${i.quantity}</span>
                <span>${formatCurrency(i.price * i.quantity)}</span>
              </div>`).join("")}
          </div>` : ""}
      </div>`).join("");

  } catch (e) {
    showEmpty(container, "Failed to load orders", e.message, "⚠️");
  }
}
