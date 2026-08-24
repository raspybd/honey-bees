(() => {
  const TOKEN_KEY = "alrabaa_customer_token";
  const ACCOUNT_KEY = "alrabaa_customer_account";

  const modal = document.getElementById("auth-modal");
  const form = document.getElementById("auth-form");
  const nameWrap = document.getElementById("auth-name-wrap");
  const errEl = document.getElementById("auth-error");
  const submitBtn = document.getElementById("auth-submit");
  const titleEl = document.getElementById("auth-title");
  const loginBtn = document.getElementById("btn-open-login");
  const loggedBox = document.getElementById("account-logged");
  const nameEl = document.getElementById("account-name");
  const logoutBtn = document.getElementById("btn-logout-account");

  if (!modal || !form) return;

  let mode = "login";
  let account = readCachedAccount();
  let pendingTab = "";
  let ready = false;

  function readCachedAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setSession(token, nextAccount) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (nextAccount) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(nextAccount));
    else localStorage.removeItem(ACCOUNT_KEY);
    account = nextAccount || null;
    renderHeader();
  }

  function clearSession() {
    setSession("", null);
  }

  function isLoggedIn() {
    return Boolean(getToken() && account && account.id);
  }

  function getAccount() {
    return account;
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  function setMode(next) {
    mode = next === "register" ? "register" : "login";
    document.querySelectorAll(".auth-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.authMode === mode);
    });
    if (nameWrap) nameWrap.hidden = mode !== "register";
    const nameInput = document.getElementById("auth-name");
    if (nameInput) {
      nameInput.required = mode === "register";
      if (mode !== "register") nameInput.value = "";
    }
    if (titleEl) titleEl.textContent = mode === "register" ? "إنشاء حساب" : "تسجيل الدخول";
    if (submitBtn) submitBtn.textContent = mode === "register" ? "إنشاء الحساب ودخول" : "دخول";
    const pass = document.getElementById("auth-password");
    if (pass) pass.autocomplete = mode === "register" ? "new-password" : "current-password";
    showError("");
  }

  function fillCheckout() {
    if (!account) return;
    const name = document.getElementById("shop-name");
    const phone = document.getElementById("shop-phone");
    if (name) name.value = account.name || "";
    if (phone) phone.value = account.phone || "";
  }

  function renderHeader() {
    if (!loginBtn || !loggedBox) return;
    if (isLoggedIn()) {
      loginBtn.hidden = true;
      loggedBox.hidden = false;
      if (nameEl) nameEl.textContent = account.name || account.phone || "عميل";
      document.body.classList.add("is-logged-in");
      fillCheckout();
    } else {
      loginBtn.hidden = false;
      loggedBox.hidden = true;
      if (nameEl) nameEl.textContent = "";
      document.body.classList.remove("is-logged-in");
    }
  }

  function openLogin(options = {}) {
    pendingTab = options.tab || "";
    setMode(options.mode || "login");
    showError(options.message || "");
    modal.hidden = false;
    document.body.classList.add("auth-open");
    setTimeout(() => {
      const focusId = mode === "register" ? "auth-name" : "auth-phone";
      document.getElementById(focusId)?.focus();
    }, 50);
  }

  function closeLogin() {
    modal.hidden = true;
    document.body.classList.remove("auth-open");
    pendingTab = "";
    showError("");
    if (submitBtn) submitBtn.disabled = false;
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
      localStorage.removeItem(ACCOUNT_KEY);
      renderHeader();
      ready = true;
      return null;
    }
    // show cached account immediately
    if (account) renderHeader();
    try {
      const data = await api("/me");
      setSession(token, data.account);
      window.dispatchEvent(new CustomEvent("alrabaa:auth", { detail: { account } }));
      ready = true;
      return account;
    } catch {
      clearSession();
      ready = true;
      return null;
    }
  }

  function goPendingTab() {
    const tab = pendingTab;
    pendingTab = "";
    if (!tab) return;
    const btn = document.querySelector(`.side-tab[data-tab="${tab}"]`);
    if (btn) {
      // temporarily mark logged so gate won't block
      history.replaceState(null, "", `#${tab}`);
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }
  }

  function requireLogin(options = {}) {
    if (isLoggedIn()) return true;
    openLogin(options);
    return false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    showError("");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "جاري التحقق...";
    }
    try {
      const phone = String(document.getElementById("auth-phone").value || "").trim();
      const password = String(document.getElementById("auth-password").value || "");
      if (!phone) throw new Error("أدخل رقم الجوال");
      if (password.length < 4) throw new Error("كلمة المرور 4 أحرف على الأقل");
      const body = { phone, password };
      if (mode === "register") {
        body.name = String(document.getElementById("auth-name").value || "").trim();
        if (!body.name) throw new Error("أدخل الاسم");
      }
      const data = await api(mode === "register" ? "/register" : "/login", { method: "POST", body });
      setSession(data.token, data.account);
      form.reset();
      setMode("login");
      const tab = pendingTab;
      closeLogin();
      pendingTab = tab;
      window.dispatchEvent(new CustomEvent("alrabaa:auth", { detail: { account } }));
      goPendingTab();
    } catch (err) {
      showError(err.message || "تعذر المتابعة");
      if (submitBtn) submitBtn.textContent = mode === "register" ? "إنشاء الحساب ودخول" : "دخول";
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      setMode(tab.dataset.authMode);
    });
  });

  loginBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLogin({ mode: "login" });
  });

  logoutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = getToken();
    clearSession();
    window.dispatchEvent(new CustomEvent("alrabaa:auth", { detail: { account: null } }));
    try {
      if (token) {
        await fetch("/api/store/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: "{}",
        });
      }
    } catch {
      /* ignore network */
    }
  });

  modal.querySelectorAll("[data-close-auth]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      closeLogin();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeLogin();
  });

  // Gate shopping: open login instead of blocking forever
  document.addEventListener(
    "click",
    (e) => {
      if (!ready) return;
      if (isLoggedIn()) return;
      if (!modal.hidden) return; // already open
      const gate = e.target.closest(
        '[data-tab="shop"], [data-tab-link="shop"], [data-tab="packages"], [data-tab-link="packages"], [data-add], [data-add-package], #btn-open-cart, #btn-open-cart-shop'
      );
      if (!gate) return;
      // never gate the auth UI itself
      if (gate.closest("#auth-modal") || gate.id === "btn-open-login" || gate.id === "btn-logout-account") return;

      e.preventDefault();
      e.stopPropagation();
      const tab = gate.getAttribute("data-tab") || gate.getAttribute("data-tab-link") || "";
      openLogin({
        tab: tab === "shop" || tab === "packages" ? tab : "shop",
        message: "سجّل الدخول أولاً لإضافة المنتجات والتسوق.",
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

  renderHeader();
  refreshMe();
})();
