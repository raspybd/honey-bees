(() => {
  const TOKEN_KEY = "alrabaa_customer_token";
  const modal = document.getElementById("auth-modal");
  const form = document.getElementById("auth-form");
  const nameWrap = document.getElementById("auth-name-wrap");
  const errEl = document.getElementById("auth-error");
  const submitBtn = document.getElementById("auth-submit");
  const titleEl = document.getElementById("auth-title");
  if (!modal || !form) return;

  let mode = "login";
  let account = null;
  let pendingAction = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken() && account);
  }

  function getAccount() {
    return account;
  }

  function showError(msg) {
    if (!errEl) return;
    if (!msg) {
      errEl.hidden = true;
      errEl.textContent = "";
      return;
    }
    errEl.hidden = false;
    errEl.textContent = msg;
  }

  function setMode(next) {
    mode = next === "register" ? "register" : "login";
    document.querySelectorAll(".auth-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.authMode === mode);
    });
    if (nameWrap) nameWrap.hidden = mode !== "register";
    const nameInput = document.getElementById("auth-name");
    if (nameInput) nameInput.required = mode === "register";
    if (titleEl) titleEl.textContent = mode === "register" ? "إنشاء حساب" : "تسجيل الدخول";
    if (submitBtn) submitBtn.textContent = mode === "register" ? "إنشاء الحساب" : "دخول";
    const pass = document.getElementById("auth-password");
    if (pass) pass.autocomplete = mode === "register" ? "new-password" : "current-password";
    showError("");
  }

  function renderHeader() {
    const logged = document.getElementById("account-logged");
    const loginBtn = document.getElementById("btn-open-login");
    const nameEl = document.getElementById("account-name");
    if (!logged || !loginBtn) return;
    if (account) {
      loginBtn.hidden = true;
      logged.hidden = false;
      if (nameEl) nameEl.textContent = account.name || account.phone || "";
      document.body.classList.add("is-logged-in");
      fillCheckoutFromAccount();
    } else {
      loginBtn.hidden = false;
      logged.hidden = true;
      document.body.classList.remove("is-logged-in");
    }
  }

  function fillCheckoutFromAccount() {
    if (!account) return;
    const name = document.getElementById("shop-name");
    const phone = document.getElementById("shop-phone");
    if (name && !name.value) name.value = account.name || "";
    if (phone && !phone.value) phone.value = account.phone || "";
  }

  function openLogin(action) {
    pendingAction = typeof action === "function" ? action : null;
    setMode("login");
    modal.hidden = false;
    document.body.classList.add("auth-open");
    document.getElementById("auth-phone")?.focus();
  }

  function closeLogin() {
    modal.hidden = true;
    document.body.classList.remove("auth-open");
    pendingAction = null;
    showError("");
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/store${path}`, {
      ...options,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) throw new Error((data && data.error) || `خطأ (${res.status})`);
    return data;
  }

  async function refreshMe() {
    const token = getToken();
    if (!token) {
      account = null;
      renderHeader();
      return null;
    }
    try {
      const data = await api("/me");
      account = data.account;
      renderHeader();
      return account;
    } catch {
      setToken("");
      account = null;
      renderHeader();
      return null;
    }
  }

  function requireLogin(action) {
    if (isLoggedIn()) {
      if (typeof action === "function") action();
      return true;
    }
    openLogin(action);
    return false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    if (submitBtn) submitBtn.disabled = true;
    try {
      const body = {
        phone: document.getElementById("auth-phone").value,
        password: document.getElementById("auth-password").value,
      };
      if (mode === "register") body.name = document.getElementById("auth-name").value;
      const data = await api(mode === "register" ? "/register" : "/login", { method: "POST", body });
      setToken(data.token);
      account = data.account;
      renderHeader();
      const after = pendingAction;
      closeLogin();
      form.reset();
      if (typeof after === "function") after();
      window.dispatchEvent(new CustomEvent("alrabaa:auth", { detail: { account } }));
    } catch (err) {
      showError(err.message || "تعذر المتابعة");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => setMode(tab.dataset.authMode));
  });
  document.getElementById("btn-open-login")?.addEventListener("click", () => openLogin());
  document.getElementById("btn-logout-account")?.addEventListener("click", async () => {
    try {
      if (getToken()) await api("/logout", { method: "POST", body: {} });
    } catch {
      /* ignore */
    }
    setToken("");
    account = null;
    renderHeader();
    window.dispatchEvent(new CustomEvent("alrabaa:auth", { detail: { account: null } }));
  });
  modal.querySelectorAll("[data-close-auth]").forEach((el) => el.addEventListener("click", closeLogin));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeLogin();
  });

  // Gate shopping actions / shop & packages tabs
  document.addEventListener(
    "click",
    (e) => {
      const gate = e.target.closest(
        '[data-tab="shop"], [data-tab-link="shop"], [data-tab="packages"], [data-tab-link="packages"], [data-add], [data-add-package], #btn-open-cart, #btn-open-cart-shop'
      );
      if (!gate) return;
      if (isLoggedIn()) return;
      e.preventDefault();
      e.stopPropagation();
      const tab = gate.getAttribute("data-tab") || gate.getAttribute("data-tab-link");
      openLogin(() => {
        if (tab === "shop" || tab === "packages") {
          document.querySelector(`.side-tab[data-tab="${tab}"]`)?.click();
        } else if (gate.id === "btn-open-cart" || gate.id === "btn-open-cart-shop") {
          document.getElementById("btn-open-cart")?.click();
        } else {
          gate.click();
        }
      });
    },
    true
  );

  window.AlRabaaAuth = {
    getToken,
    getAccount,
    isLoggedIn,
    requireLogin,
    openLogin,
    refreshMe,
    api,
  };

  refreshMe();
})();
