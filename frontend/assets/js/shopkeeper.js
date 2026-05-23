/**
 * DoEmart — Shopkeeper JS
 */

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  const grid = document.getElementById("statsGrid");
  const ordersTable = document.getElementById("recentOrdersTable");

  try {
    const res = await api.shop.dashboard();
    const d   = res.data;

    // Update subtitle
    const sub = document.getElementById("shopSubtitle");
    if (sub) sub.textContent = `Revenue: ${formatCurrency(d.total_revenue)} · ${d.total_products} products listed`;

    if (grid) grid.innerHTML = `
      <div class="stat-card" style="--stat-color:var(--indigo-500);--stat-icon-bg:rgba(99,102,241,0.1)">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${d.total_products}</div>
        <div class="stat-label">Total Products</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--emerald-500);--stat-icon-bg:rgba(16,185,129,0.1)">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${d.active_products}</div>
        <div class="stat-label">Active Products</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--amber-500);--stat-icon-bg:rgba(245,158,11,0.1)">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${d.pending_orders}</div>
        <div class="stat-label">Pending Orders</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--indigo-400);--stat-icon-bg:rgba(99,102,241,0.1)">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${d.confirmed_orders}</div>
        <div class="stat-label">Confirmed</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--emerald-500);--stat-icon-bg:rgba(16,185,129,0.1)">
        <div class="stat-icon">🚚</div>
        <div class="stat-value">${d.delivered_orders}</div>
        <div class="stat-label">Delivered</div>
      </div>
      <div class="stat-card" style="--stat-color:var(--amber-500);--stat-icon-bg:rgba(245,158,11,0.1)">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${formatCurrency(d.total_revenue)}</div>
        <div class="stat-label">Total Revenue</div>
      </div>
    `;

    // Recent orders
    const orders = d.recent_orders || [];
    if (ordersTable) {
      if (!orders.length) { showEmpty(ordersTable, "No orders yet", "Start promoting your shop to get your first order!", "📦"); return; }
      ordersTable.innerHTML = `
        <table>
          <thead><tr><th>Order #</th><th>Customer</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td class="fw-600 text-indigo">#${o.id}</td>
                <td>${o.customer_name}</td>
                <td class="fw-600">${formatCurrency(o.total_amount)}</td>
                <td>${statusBadge(o.order_type)}</td>
                <td>${statusBadge(o.status)}</td>
                <td class="text-xs text-muted">${formatDate(o.created_at)}</td>
              </tr>`).join("")}
          </tbody>
        </table>`;
    }
  } catch (e) {
    if (grid) grid.innerHTML = `<p class="text-muted">Failed to load dashboard.</p>`;
  }
}


// ── Products ──────────────────────────────────────────────────────────────────
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  showLoader(grid, "Loading products…");

  try {
    const res      = await api.shop.listProducts();
    const products = res.data || [];

    if (!products.length) {
      showEmpty(grid, "No products yet", "Add your first product to start selling!", "🛍️");
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card animate-scale-in">
        ${p.image
          ? `<img class="product-img" src="${uploadUrl(p.image)}" alt="${p.name}" onerror="this.style.display='none'">`
          : `<div class="product-img-placeholder">🛍️</div>`}
        <div class="product-body">
          <div class="product-name">${p.name}</div>
          <div class="flex items-center gap-3">
            <span class="product-price">${formatCurrency(p.price)}</span>
            ${p.mrp ? `<span class="product-mrp">₹${p.mrp}</span>` : ""}
          </div>
          <div class="product-meta">
            ${p.offer_label ? `<span class="badge badge-amber">${p.offer_label}</span>` : ""}
            <span class="badge ${p.is_available ? 'badge-emerald' : 'badge-rose'}">${p.is_available ? "In Stock" : "Out of Stock"}</span>
            ${p.quantity ? `<span class="badge badge-muted">Qty: ${p.quantity}</span>` : ""}
          </div>
          ${p.description ? `<p class="text-xs text-muted" style="margin-top:var(--space-2)">${p.description}</p>` : ""}
        </div>
        <div class="product-actions">
          <button class="btn btn-ghost btn-sm" style="flex:1" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️ Edit</button>
          <button class="btn btn-rose btn-sm" onclick="deleteProduct(${p.id}, '${p.name}')">🗑️</button>
        </div>
      </div>
    `).join("");

  } catch (e) {
    showEmpty(grid, "Failed to load", e.message, "⚠️");
  }
}

// Add product
const addForm = document.getElementById("addProductForm");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("addProductBtn");
    btn.disabled = true; btn.textContent = "Adding…";
    const fd = new FormData(addForm);
    try {
      await api.shop.addProduct(fd);
      Toast.success("Product added!");
      closeModal("addProductModal");
      addForm.reset();
      document.getElementById("productImageLabel").textContent = "Upload product photo";
      loadProducts();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Add Product";
    }
  });
}

function editProduct(p) {
  document.getElementById("editProductId").value = p.id;
  document.getElementById("editName").value        = p.name;
  document.getElementById("editCategory").value    = p.category || "";
  document.getElementById("editDescription").value = p.description || "";
  document.getElementById("editPrice").value       = p.price;
  document.getElementById("editMrp").value         = p.mrp || "";
  document.getElementById("editQuantity").value    = p.quantity || 0;
  document.getElementById("editAvailable").value   = p.is_available ? "1" : "0";
  document.getElementById("editSizes").value       = p.sizes_available || "";
  document.getElementById("editOfferLabel").value  = p.offer_label || "";
  openModal("editProductModal");
}

const editForm = document.getElementById("editProductForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("editProductBtn");
    btn.disabled = true; btn.textContent = "Saving…";
    const id = document.getElementById("editProductId").value;
    const fd = new FormData(editForm);
    fd.delete("_id");
    try {
      await api.shop.updateProduct(id, fd);
      Toast.success("Product updated!");
      closeModal("editProductModal");
      loadProducts();
    } catch (err) {
      Toast.error(err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Save Changes";
    }
  });
}

async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.shop.deleteProduct(id);
    Toast.success("Product deleted");
    loadProducts();
  } catch (e) { Toast.error(e.message); }
}


// ── Orders ────────────────────────────────────────────────────────────────────
async function loadShopOrders() {
  const container = document.getElementById("shopOrdersTable");
  if (!container) return;
  showLoader(container, "Loading orders…");

  try {
    const res    = await api.shop.orders();
    const orders = res.data || [];

    if (!orders.length) {
      showEmpty(container, "No orders yet", "Orders placed by customers will appear here.", "🛒");
      return;
    }

    const statusOptions = ["confirmed","processing","out_for_delivery","delivered","cancelled"];

    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Order #</th><th>Customer</th><th>Items</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td class="fw-600 text-indigo">#${o.id}</td>
              <td>
                <div class="fw-600">${o.customer_name}</div>
                <div class="text-xs text-muted">${o.customer_phone || ""}</div>
              </td>
              <td class="text-sm">
                ${(o.items || []).map(i => `<div>${i.product_name} ×${i.quantity}${i.size ? ` (${i.size})` : ""}</div>`).join("")}
              </td>
              <td class="fw-600">${formatCurrency(o.total_amount)}</td>
              <td>${statusBadge(o.order_type)}</td>
              <td>${statusBadge(o.status)}</td>
              <td class="text-xs text-muted">${formatDate(o.created_at)}</td>
              <td>
                <select class="form-select" style="font-size:0.75rem;padding:4px 8px;"
                  onchange="updateOrderStatus(${o.id}, this.value)"
                  ${o.status === "delivered" || o.status === "cancelled" ? "disabled" : ""}>
                  <option value="">— Update —</option>
                  ${statusOptions.map(s => `<option value="${s}">${s.replace(/_/g," ")}</option>`).join("")}
                </select>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) {
    showEmpty(container, "Failed to load", e.message, "⚠️");
  }
}

async function updateOrderStatus(id, status) {
  if (!status) return;
  try {
    await api.shop.updateOrder(id, status);
    Toast.success(`Order marked as ${status.replace(/_/g," ")}`);
    loadShopOrders();
  } catch (e) { Toast.error(e.message); }
}
