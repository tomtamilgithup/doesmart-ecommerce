/**
 * DoEmart — Admin JS
 * Handles all admin dashboard, users, shops, and orders pages.
 */

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const grid = document.getElementById("statsGrid");
  if (!grid) return;
  try {
    const res = await api.admin.stats();
    const d   = res.data;
    grid.innerHTML = `
      ${statCard("Pending Customers", d.pending_customers,  "🙋",  "var(--amber-500)",  "rgba(245,158,11,0.1)")}
      ${statCard("Approved Customers",d.approved_customers, "✅",  "var(--emerald-500)","rgba(16,185,129,0.1)")}
      ${statCard("Pending Shops",     d.pending_shops,      "🏪",  "var(--amber-500)",  "rgba(245,158,11,0.1)")}
      ${statCard("Approved Shops",    d.approved_shops,     "🏬",  "var(--indigo-500)", "rgba(99,102,241,0.1)")}
      ${statCard("Total Orders",      d.total_orders,       "📦",  "var(--sky-500)",    "rgba(14,165,233,0.1)")}
      ${statCard("Orders Delivered",  d.orders_delivered,   "🚚",  "var(--emerald-500)","rgba(16,185,129,0.1)")}
      ${statCard("Total Products",    d.total_products,     "🛍️", "var(--indigo-400)", "rgba(99,102,241,0.1)")}
      ${statCard("Pending Orders",    d.orders_pending,     "⏳",  "var(--rose-500)",   "rgba(244,63,94,0.1)")}
    `;
  } catch (e) {
    if (grid) grid.innerHTML = `<p class="text-muted">Failed to load stats.</p>`;
  }
}

function statCard(label, value, icon, color, iconBg) {
  return `
    <div class="stat-card animate-scale-in" style="--stat-color:${color};--stat-icon-bg:${iconBg}">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value ?? 0}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}


// ── Pending Users ─────────────────────────────────────────────────────────────
async function loadPendingUsers() {
  const container = document.getElementById("pendingUsersTable");
  if (!container) return;
  try {
    const res = await api.admin.pendingUsers();
    const users = res.data || [];
    if (!users.length) {
      showEmpty(container, "No pending customers", "All registrations are reviewed.", "🎉");
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Name</th><th>City</th><th>ID Proof</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <div class="fw-600">${u.name}</div>
                <div class="text-xs text-muted">${u.email}</div>
              </td>
              <td>${u.city || "—"} ${u.pincode ? `<span class="text-xs text-muted">${u.pincode}</span>` : ""}</td>
              <td>
                <div class="text-xs">${u.id_proof_type}</div>
                <div class="text-xs text-muted">${u.id_proof_number || "—"}</div>
              </td>
              <td class="text-xs text-muted">${formatDate(u.created_at)}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-emerald btn-sm" onclick="approveUser(${u.id},'approved')">Approve</button>
                  <button class="btn btn-rose btn-sm"    onclick="approveUser(${u.id},'rejected')">Reject</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--space-4)">Failed to load.</p>`;
  }
}

async function approveUser(id, status) {
  try {
    await api.admin.approveUser(id, status);
    Toast.success(`Customer ${status}`);
    loadPendingUsers(); loadStats();
  } catch (e) { Toast.error(e.message); }
}


// ── Pending Shops ─────────────────────────────────────────────────────────────
async function loadPendingShops() {
  const container = document.getElementById("pendingShopsTable");
  if (!container) return;
  try {
    const res   = await api.admin.pendingShops();
    const shops = res.data || [];
    if (!shops.length) {
      showEmpty(container, "No pending shops", "All shop registrations are reviewed.", "🎉");
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Shop</th><th>Category</th><th>City</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${shops.map(s => `
            <tr>
              <td>
                <div class="fw-600">${s.shop_name}</div>
                <div class="text-xs text-muted">${s.name} · ${s.phone}</div>
              </td>
              <td><span class="badge badge-indigo">${s.shop_category || "General"}</span></td>
              <td>${s.city || "—"}</td>
              <td class="text-xs text-muted">${formatDate(s.created_at)}</td>
              <td>
                <div class="flex gap-2">
                  <button class="btn btn-emerald btn-sm" onclick="approveShop(${s.id},'approved')">Approve</button>
                  <button class="btn btn-rose btn-sm"    onclick="approveShop(${s.id},'rejected')">Reject</button>
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--space-4)">Failed to load.</p>`;
  }
}

async function approveShop(id, status) {
  try {
    await api.admin.approveShop(id, status);
    Toast.success(`Shop ${status}`);
    loadPendingShops(); loadStats();
  } catch (e) { Toast.error(e.message); }
}


// ── Recent Orders ─────────────────────────────────────────────────────────────
async function loadRecentOrders() {
  const container = document.getElementById("recentOrdersTable") ||
                    document.getElementById("allOrdersTable");
  if (!container) return;
  try {
    const res    = await api.admin.allOrders();
    const orders = (res.data || []).slice(0, 15);
    if (!orders.length) {
      showEmpty(container, "No orders yet", "", "📦");
      return;
    }
    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Order ID</th><th>Customer</th><th>Shop</th><th>Type</th>
          <th>Amount</th><th>Status</th><th>Date</th>
        </tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td class="fw-600 text-indigo">#${o.id}</td>
              <td>
                <div class="fw-600">${o.customer_name}</div>
                <div class="text-xs text-muted">${o.customer_phone || ""}</div>
              </td>
              <td>
                <div>${o.shop_name}</div>
                <div class="text-xs text-muted">${o.shop_city || ""}</div>
              </td>
              <td>${statusBadge(o.order_type)}</td>
              <td class="fw-600">${formatCurrency(o.total_amount)}</td>
              <td>${statusBadge(o.status)}</td>
              <td class="text-xs text-muted">${formatDate(o.created_at)}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) {
    container.innerHTML = `<p class="text-muted" style="padding:var(--space-4)">Failed to load orders.</p>`;
  }
}


// ── All Users (users.html) ────────────────────────────────────────────────────
async function loadAllUsers() {
  const container = document.getElementById("allUsersTable");
  if (!container) return;
  showLoader(container);
  try {
    const res   = await api.admin.allUsers();
    const users = res.data || [];
    if (!users.length) { showEmpty(container, "No users found", "", "👤"); return; }
    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Status</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td class="fw-600">${u.name}</td>
              <td class="text-muted text-sm">${u.email}</td>
              <td class="text-sm">${u.phone}</td>
              <td>${u.city || "—"}</td>
              <td>${statusBadge(u.status)}</td>
              <td class="text-xs text-muted">${formatDate(u.created_at)}</td>
              <td>
                ${u.status === "pending" ? `
                  <div class="flex gap-2">
                    <button class="btn btn-emerald btn-sm" onclick="approveUser(${u.id},'approved')">Approve</button>
                    <button class="btn btn-rose btn-sm"    onclick="approveUser(${u.id},'rejected')">Reject</button>
                  </div>` : `<span class="text-muted text-xs">—</span>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) { showEmpty(container, "Failed to load", e.message, "⚠️"); }
}


// ── All Shops (shops.html) ────────────────────────────────────────────────────
async function loadAllShops() {
  const container = document.getElementById("allShopsTable");
  if (!container) return;
  showLoader(container);
  try {
    const res   = await api.admin.allShops();
    const shops = res.data || [];
    if (!shops.length) { showEmpty(container, "No shops found", "", "🏪"); return; }
    container.innerHTML = `
      <table>
        <thead><tr>
          <th>Shop</th><th>Owner</th><th>Category</th><th>City</th><th>Status</th><th>Joined</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${shops.map(s => `
            <tr>
              <td class="fw-600">${s.shop_name}</td>
              <td>
                <div>${s.name}</div>
                <div class="text-xs text-muted">${s.email}</div>
              </td>
              <td><span class="badge badge-indigo">${s.shop_category || "General"}</span></td>
              <td>${s.city || "—"}</td>
              <td>${statusBadge(s.status)}</td>
              <td class="text-xs text-muted">${formatDate(s.created_at)}</td>
              <td>
                ${s.status === "pending" ? `
                  <div class="flex gap-2">
                    <button class="btn btn-emerald btn-sm" onclick="approveShop(${s.id},'approved')">Approve</button>
                    <button class="btn btn-rose btn-sm"    onclick="approveShop(${s.id},'rejected')">Reject</button>
                  </div>` : `<span class="text-muted text-xs">—</span>`}
              </td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  } catch (e) { showEmpty(container, "Failed to load", e.message, "⚠️"); }
}
