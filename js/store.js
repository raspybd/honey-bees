const AlRabaaStore = (() => {
  const TOKEN_KEY = "alrabaa_admin_token";

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
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

    if (!res.ok) {
      throw new Error((data && data.error) || `خطأ في الطلب (${res.status})`);
    }
    return data;
  }

  async function login(password) {
    const data = await api("/login", { method: "POST", body: { password } });
    setToken(data.token);
    return data;
  }

  async function logout() {
    try {
      if (getToken()) await api("/logout", { method: "POST", body: {} });
    } catch {
      /* ignore */
    }
    setToken("");
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  function supervisionFee(hiveCount) {
    if (typeof AlRabaaPricing !== "undefined" && AlRabaaPricing.supervisionMonthly) {
      return AlRabaaPricing.supervisionMonthly(hiveCount).total;
    }
    const n = Math.max(0, Math.floor(Number(hiveCount) || 0));
    if (n < 1) return 0;
    if (n <= 5) return 15;
    if (n <= 10) return 20;
    if (n <= 15) return 25;
    if (n <= 20) return 30;
    return 30 + (n - 20);
  }

  return {
    getToken,
    setToken,
    isLoggedIn,
    login,
    logout,
    listCustomers: () => api("/customers"),
    getCustomer: (id) => api(`/customers/${encodeURIComponent(id)}`),
    upsertCustomer: (input) =>
      input.id
        ? api(`/customers/${encodeURIComponent(input.id)}`, { method: "PUT", body: input })
        : api("/customers", { method: "POST", body: input }),
    deleteCustomer: (id) => api(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listInvoices: () => api("/invoices"),
    getInvoice: (id) => api(`/invoices/${encodeURIComponent(id)}`),
    createInvoice: (input) => api("/invoices", { method: "POST", body: input }),
    updateInvoiceStatus: (id, status) =>
      api(`/invoices/${encodeURIComponent(id)}/status`, { method: "PATCH", body: { status } }),
    deleteInvoice: (id) => api(`/invoices/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listSupervisions: () => api("/supervisions"),
    getSupervision: (id) => api(`/supervisions/${encodeURIComponent(id)}`),
    upsertSupervision: (input) =>
      input.id
        ? api(`/supervisions/${encodeURIComponent(input.id)}`, { method: "PUT", body: input })
        : api("/supervisions", { method: "POST", body: input }),
    addSupervisionVisit: (id, visit) =>
      api(`/supervisions/${encodeURIComponent(id)}/visits`, { method: "POST", body: visit }),
    deleteSupervision: (id) => api(`/supervisions/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getCatalog: () => api("/catalog"),
    listProducts: () => api("/products"),
    getProduct: (id) => api(`/products/${encodeURIComponent(id)}`),
    upsertProduct: (input) =>
      input.id
        ? api(`/products/${encodeURIComponent(input.id)}`, { method: "PUT", body: input })
        : api("/products", { method: "POST", body: input }),
    deleteProduct: (id) => api(`/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
    applyStockMovement: (productId, input) =>
      api(`/products/${encodeURIComponent(productId)}/stock`, { method: "POST", body: input }),
    listStockMovements: (limit) => api(`/stock-movements${limit ? `?limit=${limit}` : ""}`),
    lowStockProducts: () => api("/products/low-stock"),
    confirmInvoiceSale: (id) => api(`/invoices/${encodeURIComponent(id)}/confirm`, { method: "POST", body: {} }),
    listPurchases: () => api("/purchases"),
    getPurchase: (id) => api(`/purchases/${encodeURIComponent(id)}`),
    createPurchase: (input) => api("/purchases", { method: "POST", body: input }),
    deletePurchase: (id) => api(`/purchases/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listExpenses: () => api("/expenses"),
    createExpense: (input) => api("/expenses", { method: "POST", body: input }),
    deleteExpense: (id) => api(`/expenses/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getCash: () => api("/cash"),
    createCashEntry: (input) => api("/cash", { method: "POST", body: input }),
    deleteCashEntry: (id) => api(`/cash/${encodeURIComponent(id)}`, { method: "DELETE" }),
    getReports: () => api("/reports"),
    exportBackup: async () => JSON.stringify(await api("/backup"), null, 2),
    importBackup: async (jsonText) => {
      const parsed = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
      return api("/backup/import", { method: "POST", body: parsed });
    },
    supervisionFee,
  };
})();
