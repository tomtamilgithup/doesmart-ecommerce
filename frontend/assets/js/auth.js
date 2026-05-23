/**
 * DoEmart — Auth JS (login.html & register.html)
 */
document.addEventListener("DOMContentLoaded", () => {

  // ── Prefill role from URL ?role=xxx ───────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const preRole = params.get("role") || "customer";

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    let selectedRole = preRole;

    // Activate correct tab
    document.querySelectorAll(".role-tab").forEach(tab => {
      const r = tab.dataset.role;
      tab.classList.toggle("active", r === selectedRole);
      tab.addEventListener("click", () => {
        selectedRole = r;
        document.querySelectorAll(".role-tab").forEach(t => t.classList.toggle("active", t.dataset.role === r));
        const notice = document.getElementById("adminNotice");
        if (notice) notice.classList.toggle("hidden", r !== "admin");
      });
    });

    // Show admin notice if pre-selected
    const adminNotice = document.getElementById("adminNotice");
    if (adminNotice && selectedRole === "admin") adminNotice.classList.remove("hidden");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("loginBtn");
      btn.disabled = true;
      btn.textContent = "Signing in…";

      try {
        const res = await api.auth.login({
          email:    loginForm.email.value.trim(),
          password: loginForm.password.value,
          role:     selectedRole,
        });

        Auth.setToken(res.data.token);
        Auth.setRole(res.data.role);
        Auth.setUser({ id: res.data.id, name: res.data.name, email: res.data.email });

        Toast.success(`Welcome back, ${res.data.name}!`);

        setTimeout(() => {
          const dest = {
            admin:       "admin/dashboard.html",
            shopkeeper:  "shopkeeper/dashboard.html",
            customer:    "customer/home.html",
          }[res.data.role] || "login.html";
          window.location.href = dest;
        }, 600);

      } catch (err) {
        Toast.error(err.message || "Login failed");
        btn.disabled = false;
        btn.textContent = "Sign In";
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTER PAGE
  // ─────────────────────────────────────────────────────────────────────────
  const customerForm    = document.getElementById("customerForm");
  const shopkeeperForm  = document.getElementById("shopkeeperForm");

  if (customerForm && shopkeeperForm) {
    let currentRole = preRole === "shopkeeper" ? "shopkeeper" : "customer";

    function switchRole(role) {
      currentRole = role;
      customerForm.classList.toggle("hidden",   role !== "customer");
      shopkeeperForm.classList.toggle("hidden", role !== "shopkeeper");
      document.querySelectorAll(".chooser-card").forEach(c => {
        c.classList.toggle("active", c.dataset.role === role);
      });
    }
    switchRole(currentRole);

    document.querySelectorAll(".chooser-card").forEach(card => {
      card.addEventListener("click", () => switchRole(card.dataset.role));
    });

    // File input label update
    document.querySelectorAll('input[type="file"]').forEach(input => {
      input.addEventListener("change", () => {
        const labelId = input.dataset.label;
        if (labelId && input.files[0]) {
          document.getElementById(labelId).textContent = "✓ " + input.files[0].name;
        }
      });
    });

    // ── Customer submit ──────────────────────────────────────────────────
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (customerForm.password.value !== customerForm.confirm.value) {
        return Toast.error("Passwords do not match");
      }
      const btn = document.getElementById("customerSubmitBtn");
      btn.disabled = true; btn.textContent = "Submitting…";

      const fd = new FormData(customerForm);
      fd.delete("confirm");

      try {
        await api.auth.registerCustomer(fd);
        Toast.success("Registration submitted! Awaiting admin approval.");
        setTimeout(() => window.location.href = "login.html", 2000);
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false;
        btn.textContent = "Create Customer Account";
      }
    });

    // ── Shopkeeper submit ────────────────────────────────────────────────
    shopkeeperForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (shopkeeperForm.password.value !== shopkeeperForm.confirm.value) {
        return Toast.error("Passwords do not match");
      }
      const btn = document.getElementById("shopkeeperSubmitBtn");
      btn.disabled = true; btn.textContent = "Submitting…";

      const fd = new FormData(shopkeeperForm);
      fd.delete("confirm");

      try {
        await api.auth.registerShopkeeper(fd);
        Toast.success("Shop registration submitted! Awaiting admin approval.");
        setTimeout(() => window.location.href = "login.html", 2000);
      } catch (err) {
        Toast.error(err.message);
        btn.disabled = false;
        btn.textContent = "Register My Shop";
      }
    });
  }
});
