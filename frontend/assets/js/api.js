/**
 * DoEmart — API Client
 * Central fetch wrapper with JWT auth, error handling, and toast notifications.
 */

const API_BASE = "http://localhost:5001/api";

// ── Token management ──────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem("dm_token"),
  setToken: (t) => localStorage.setItem("dm_token", t),
  getRole:  () => localStorage.getItem("dm_role"),
  setRole:  (r) => localStorage.setItem("dm_role", r),
  getUser:  () => JSON.parse(localStorage.getItem("dm_user") || "null"),
  setUser:  (u) => localStorage.setItem("dm_user", JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem("dm_token");
    localStorage.removeItem("dm_role");
    localStorage.removeItem("dm_user");
  },
  isLoggedIn: () => !!localStorage.getItem("dm_token"),
  requireAuth: (redirectTo = "../pages/login.html") => {
    if (!localStorage.getItem("dm_token")) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },
  requireRole: (role, redirectTo = "../pages/login.html") => {
    const r = localStorage.getItem("dm_role");
    if (r !== role) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };

  // Auto-attach JWT
  const token = Auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Auto Content-Type for JSON bodies
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  try {
    const resp = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      body,
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      throw new ApiError(data.error || "Request failed", resp.status, data);
    }

    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Network error. Is the server running?", 0);
  }
}

class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.data   = data;
  }
}

// ── API Namespaces ────────────────────────────────────────────────────────────
const api = {
  // Auth
  auth: {
    login:              (body)          => apiFetch("/auth/login",                  { method: "POST", body }),
    registerCustomer:   (formData)      => apiFetch("/auth/register/customer",      { method: "POST", body: formData }),
    registerShopkeeper: (formData)      => apiFetch("/auth/register/shopkeeper",    { method: "POST", body: formData }),
    me:                 ()              => apiFetch("/auth/me"),
  },

  // Admin
  admin: {
    stats:        ()          => apiFetch("/admin/stats"),
    pendingUsers: ()          => apiFetch("/admin/pending-users"),
    approveUser:  (id, status)=> apiFetch(`/admin/approve-user/${id}`,  { method: "PUT", body: { status } }),
    pendingShops: ()          => apiFetch("/admin/pending-shops"),
    approveShop:  (id, status)=> apiFetch(`/admin/approve-shop/${id}`,  { method: "PUT", body: { status } }),
    allUsers:     ()          => apiFetch("/admin/users"),
    allShops:     ()          => apiFetch("/admin/shops"),
    allOrders:    ()          => apiFetch("/admin/orders"),
    directory:    (city="")   => apiFetch(`/admin/directory?city=${encodeURIComponent(city)}`),
  },

  // Shopkeeper
  shop: {
    dashboard:     ()              => apiFetch("/shop/dashboard"),
    listProducts:  ()              => apiFetch("/shop/products"),
    addProduct:    (formData)      => apiFetch("/shop/products",         { method: "POST",   body: formData }),
    updateProduct: (id, formData)  => apiFetch(`/shop/products/${id}`,   { method: "PUT",    body: formData }),
    deleteProduct: (id)            => apiFetch(`/shop/products/${id}`,   { method: "DELETE" }),
    orders:        ()              => apiFetch("/shop/orders"),
    updateOrder:   (id, status)    => apiFetch(`/shop/orders/${id}`,     { method: "PUT", body: { status } }),
  },

  // Customer
  customer: {
    shops:      (params = {}) => apiFetch(`/shops?${new URLSearchParams(params)}`),
    shopDetail: (id)          => apiFetch(`/shops/${id}`),
    placeOrder: (body)        => apiFetch("/orders",                     { method: "POST", body }),
    myOrders:   ()            => apiFetch("/orders"),
    review:     (body)        => apiFetch("/reviews",                    { method: "POST", body }),
  },
};

// ── Toast Notification System ─────────────────────────────────────────────────
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = "info", duration = 3500) {
    const icons = { success: "✓", error: "✕", info: "ℹ" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:16px; color:${type === 'success' ? 'var(--emerald-400)' : type === 'error' ? 'var(--rose-400)' : 'var(--indigo-400)'}">
        ${icons[type] || "ℹ"}
      </span>
      <span>${message}</span>
    `;
    getContainer().appendChild(toast);
    setTimeout(() => { toast.style.animation = "slideInRight 0.3s ease reverse"; setTimeout(() => toast.remove(), 280); }, duration);
  }

  return {
    success: (msg, d) => show(msg, "success", d),
    error:   (msg, d) => show(msg, "error",   d),
    info:    (msg, d) => show(msg, "info",    d),
  };
})();

// ── Utility Helpers ───────────────────────────────────────────────────────────
function formatCurrency(amount) {
  return "₹" + parseFloat(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status) {
  const map = {
    pending:          "badge-amber",
    approved:         "badge-emerald",
    rejected:         "badge-rose",
    confirmed:        "badge-indigo",
    processing:       "badge-indigo",
    out_for_delivery: "badge-amber",
    delivered:        "badge-emerald",
    cancelled:        "badge-rose",
    spot:             "badge-indigo",
    advance:          "badge-amber",
  };
  return `<span class="badge ${map[status] || 'badge-muted'}">${status.replace(/_/g," ")}</span>`;
}

function starsHtml(rating) {
  const r = Math.round(parseFloat(rating || 0));
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < r ? 'filled' : ''}">★</span>`
  ).join("");
}

function uploadUrl(filename) {
  if (!filename) return null;
  return `http://localhost:5001/uploads/${filename}`;
}

function avatarInitials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
}

// ── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function showLoader(container, msg = "Loading...") {
  if (!container) return;
  container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>${msg}</span></div>`;
}

function showEmpty(container, title = "Nothing here yet", desc = "", icon = "📭") {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>`;
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("open");
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("open");
}

// Bind all [data-modal-close] buttons
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal-overlay");
      if (modal) modal.classList.remove("open");
    });
  });

  // Close on overlay click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });
});
