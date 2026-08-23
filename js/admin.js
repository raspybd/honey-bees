(() => {
  const WA = "96599787742";
  const money = (n) => Number(n || 0).toLocaleString("ar-KW", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const statusLabel = {
    issued: "صادرة",
    paid: "مدفوعة",
    cancelled: "ملغاة",
    active: "نشط",
    paused: "موقوف",
    ended: "منتهي",
    new: "جديد",
    confirmed: "مؤكد",
  };

  const toastEl = document.getElementById("toast");
  const loginGate = document.getElementById("login-gate");
  const adminApp = document.getElementById("admin-app");
  let catalogCache = [];

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  async function showTab(name) {
    document.querySelectorAll(".side-tab[data-tab]").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${name}`));
    if (name === "customers") await renderCustomers();
    if (name === "products") await renderProducts();
    if (name === "purchases") await renderPurchases();
    if (name === "expenses") await renderExpenses();
    if (name === "cash") await renderCash();
    if (name === "reports") await renderReports();
    if (name === "orders") await renderOrders();
    if (name === "invoices") await renderInvoices();
    if (name === "create") await prepareInvoiceForm();
    if (name === "supervision") await renderSupervisions();
  }

  document.querySelectorAll(".side-tab[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.goto));
  });

  const customerForm = document.getElementById("customer-form");
  const customersBody = document.getElementById("customers-body");

  function resetCustomerForm() {
    customerForm.reset();
    document.getElementById("customer-id").value = "";
    customerForm.classList.add("hidden");
  }

  document.getElementById("btn-new-customer").addEventListener("click", () => {
    resetCustomerForm();
    customerForm.classList.remove("hidden");
    document.getElementById("customer-name").focus();
  });
  document.getElementById("btn-cancel-customer").addEventListener("click", resetCustomerForm);

  customerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.upsertCustomer({
        id: document.getElementById("customer-id").value || undefined,
        name: document.getElementById("customer-name").value,
        phone: document.getElementById("customer-phone").value,
        area: document.getElementById("customer-area").value,
        notes: document.getElementById("customer-notes").value,
      });
      resetCustomerForm();
      await renderCustomers();
      toast("تم حفظ العميل");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  document.getElementById("customer-search").addEventListener("input", () => renderCustomers());

  async function renderCustomers() {
    const q = (document.getElementById("customer-search").value || "").trim().toLowerCase();
    const all = await AlRabaaStore.listCustomers();
    const rows = all.filter((c) => {
      if (!q) return true;
      return [c.name, c.phone, c.area].join(" ").toLowerCase().includes(q);
    });
    customersBody.innerHTML = rows.length
      ? rows
          .map(
            (c) => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong>${c.notes ? `<div class="muted">${escapeHtml(c.notes)}</div>` : ""}</td>
        <td dir="ltr">${escapeHtml(c.phone || "—")}</td>
        <td>${escapeHtml(c.area || "—")}</td>
        <td class="actions">
          <button type="button" data-edit-customer="${c.id}">تعديل</button>
          <button type="button" data-del-customer="${c.id}" class="danger">حذف</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">لا يوجد عملاء بعد. أضف أول عميل.</td></tr>`;
  }

  customersBody.addEventListener("click", async (e) => {
    const editId = e.target.getAttribute("data-edit-customer");
    const delId = e.target.getAttribute("data-del-customer");
    if (editId) {
      try {
        const c = await AlRabaaStore.getCustomer(editId);
        document.getElementById("customer-id").value = c.id;
        document.getElementById("customer-name").value = c.name || "";
        document.getElementById("customer-phone").value = c.phone || "";
        document.getElementById("customer-area").value = c.area || "";
        document.getElementById("customer-notes").value = c.notes || "";
        customerForm.classList.remove("hidden");
        customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        toast(err.message || "تعذر التحميل");
      }
    }
    if (delId) {
      if (!confirm("حذف هذا العميل؟")) return;
      try {
        await AlRabaaStore.deleteCustomer(delId);
        await renderCustomers();
        toast("تم حذف العميل");
      } catch (err) {
        toast(err.message || "تعذر الحذف");
      }
    }
  });

  const productForm = document.getElementById("product-form");
  const stockForm = document.getElementById("stock-form");
  const productsBody = document.getElementById("products-body");
  const movementsBody = document.getElementById("movements-body");
  const movementTypeLabel = {
    purchase: "دخول",
    sale: "بيع",
    damage: "تلف/خروج",
    adjust: "جرد",
  };

  function resetProductForm() {
    productForm.reset();
    document.getElementById("product-id").value = "";
    document.getElementById("product-track").checked = true;
    document.getElementById("product-published").checked = true;
    document.getElementById("product-qty-wrap").classList.remove("hidden");
    productForm.classList.add("hidden");
  }

  function resetStockForm() {
    stockForm.reset();
    document.getElementById("stock-product-id").value = "";
    stockForm.classList.add("hidden");
  }

  document.getElementById("btn-new-product").addEventListener("click", () => {
    resetStockForm();
    resetProductForm();
    productForm.classList.remove("hidden");
    document.getElementById("product-name").focus();
  });
  document.getElementById("btn-cancel-product").addEventListener("click", resetProductForm);
  document.getElementById("btn-cancel-stock").addEventListener("click", resetStockForm);
  document.getElementById("product-search").addEventListener("input", () => renderProducts());

  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById("product-id").value || undefined;
      const payload = {
        id,
        name: document.getElementById("product-name").value,
        unit: document.getElementById("product-unit").value,
        sellPrice: document.getElementById("product-sell").value,
        costPrice: document.getElementById("product-cost").value,
        minQty: document.getElementById("product-min").value,
        trackStock: document.getElementById("product-track").checked,
        published: document.getElementById("product-published").checked,
        notes: document.getElementById("product-notes").value,
      };
      if (!id) payload.qty = document.getElementById("product-qty").value;
      await AlRabaaStore.upsertProduct(payload);
      resetProductForm();
      await renderProducts();
      toast("تم حفظ الصنف");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  stockForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.applyStockMovement(document.getElementById("stock-product-id").value, {
        type: document.getElementById("stock-type").value,
        qty: document.getElementById("stock-qty").value,
        note: document.getElementById("stock-note").value,
      });
      resetStockForm();
      await renderProducts();
      toast("تم تسجيل حركة المخزون");
    } catch (err) {
      toast(err.message || "تعذر التسجيل");
    }
  });

  async function renderProducts() {
    const q = (document.getElementById("product-search").value || "").trim().toLowerCase();
    const [products, low, movements] = await Promise.all([
      AlRabaaStore.listProducts(),
      AlRabaaStore.lowStockProducts(),
      AlRabaaStore.listStockMovements(30),
    ]);
    const banner = document.getElementById("low-stock-banner");
    if (low.length) {
      banner.classList.remove("hidden");
      banner.textContent = `تنبيه مخزون منخفض: ${low.map((p) => `${p.name} (${money(p.qty)} ${p.unit})`).join(" · ")}`;
    } else {
      banner.classList.add("hidden");
      banner.textContent = "";
    }

    const rows = products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || (p.unit || "").includes(q)
    );
    productsBody.innerHTML = rows.length
      ? rows
          .map((p) => {
            const lowFlag = p.trackStock && Number(p.qty) <= Number(p.minQty);
            return `
      <tr class="${lowFlag ? "row-alert" : ""}">
        <td><strong>${escapeHtml(p.name)}</strong>${p.published ? `<div class="muted">للمتجر</div>` : ""}</td>
        <td>${escapeHtml(p.unit)}</td>
        <td>${p.trackStock ? `${money(p.qty)}` : "—"}</td>
        <td>${money(p.sellPrice)} د.ك</td>
        <td>${money(p.costPrice)} د.ك</td>
        <td>${p.trackStock ? (lowFlag ? `<span class="badge cancelled">منخفض</span>` : `<span class="badge paid">متوفر</span>`) : `<span class="badge">خدمة</span>`}</td>
        <td class="actions">
          ${p.trackStock ? `<button type="button" data-stock="${p.id}" data-name="${escapeHtml(p.name)}">حركة</button>` : ""}
          <button type="button" data-edit-product="${p.id}">تعديل</button>
          <button type="button" data-del-product="${p.id}" class="danger">حذف</button>
        </td>
      </tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="empty">لا توجد أصناف.</td></tr>`;

    movementsBody.innerHTML = movements.length
      ? movements
          .map(
            (m) => `
      <tr>
        <td>${escapeHtml((m.createdAt || "").slice(0, 16).replace("T", " "))}</td>
        <td>${escapeHtml(m.productName)}</td>
        <td>${movementTypeLabel[m.type] || m.type}</td>
        <td dir="ltr">${m.qty > 0 ? "+" : ""}${money(m.qty)}</td>
        <td dir="ltr">${money(m.qtyBefore)} ← ${money(m.qtyAfter)}</td>
        <td>${escapeHtml(m.refLabel || m.refType || "")}</td>
        <td>${escapeHtml(m.note || "")}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="7" class="empty">لا حركات بعد.</td></tr>`;
  }

  productsBody.addEventListener("click", async (e) => {
    const editId = e.target.getAttribute("data-edit-product");
    const delId = e.target.getAttribute("data-del-product");
    const stockId = e.target.getAttribute("data-stock");
    try {
      if (stockId) {
        resetProductForm();
        document.getElementById("stock-product-id").value = stockId;
        document.getElementById("stock-form-title").textContent =
          `حركة مخزون — ${e.target.getAttribute("data-name") || ""}`;
        stockForm.classList.remove("hidden");
        stockForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (editId) {
        resetStockForm();
        const p = await AlRabaaStore.getProduct(editId);
        document.getElementById("product-id").value = p.id;
        document.getElementById("product-name").value = p.name || "";
        document.getElementById("product-unit").value = p.unit || "قطعة";
        document.getElementById("product-sell").value = p.sellPrice ?? "";
        document.getElementById("product-cost").value = p.costPrice ?? 0;
        document.getElementById("product-min").value = p.minQty ?? 0;
        document.getElementById("product-track").checked = p.trackStock !== false;
        document.getElementById("product-published").checked = Boolean(p.published);
        document.getElementById("product-notes").value = p.notes || "";
        document.getElementById("product-qty-wrap").classList.add("hidden");
        productForm.classList.remove("hidden");
        productForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (delId) {
        if (!confirm("حذف هذا الصنف؟")) return;
        await AlRabaaStore.deleteProduct(delId);
        await renderProducts();
        toast("تم حذف الصنف");
      }
    } catch (err) {
      toast(err.message || "تعذر تنفيذ الإجراء");
    }
  });

  const purchaseForm = document.getElementById("purchase-form");
  const purchaseItemsEl = document.getElementById("purchase-items");
  const purchasesBody = document.getElementById("purchases-body");
  let purchaseProductsCache = [];

  function resetPurchaseForm() {
    purchaseForm.reset();
    document.getElementById("purchase-paid").checked = true;
    document.getElementById("purchase-date").value = new Date().toISOString().slice(0, 10);
    purchaseItemsEl.innerHTML = "";
    purchaseForm.classList.add("hidden");
  }

  function addPurchaseItemRow() {
    const options = purchaseProductsCache
      .filter((p) => p.trackStock !== false)
      .map(
        (p) =>
          `<option value="${p.id}" data-cost="${p.costPrice || 0}">${escapeHtml(p.name)} — تكلفة ${money(p.costPrice)} · متاح ${money(p.qty)}</option>`
      )
      .join("");
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <select class="pur-product" required>
        <option value="">اختر صنفًا</option>
        ${options}
      </select>
      <input class="pur-qty" type="number" min="0.001" step="0.001" value="1" required />
      <input class="pur-cost" type="number" min="0" step="0.001" placeholder="تكلفة الوحدة" required />
      <span class="pur-line-total muted">0</span>
      <button type="button" class="danger remove-pur-item">حذف</button>
    `;
    purchaseItemsEl.appendChild(row);
  }

  function updatePurchaseTotal() {
    let total = 0;
    purchaseItemsEl.querySelectorAll(".item-row").forEach((row) => {
      const qty = Number(row.querySelector(".pur-qty").value) || 0;
      const cost = Number(row.querySelector(".pur-cost").value) || 0;
      const line = qty * cost;
      total += line;
      row.querySelector(".pur-line-total").textContent = money(line);
    });
    document.getElementById("purchase-total").textContent = money(total);
  }

  document.getElementById("btn-new-purchase").addEventListener("click", async () => {
    purchaseProductsCache = await AlRabaaStore.listProducts();
    resetPurchaseForm();
    purchaseForm.classList.remove("hidden");
    addPurchaseItemRow();
    updatePurchaseTotal();
  });
  document.getElementById("btn-cancel-purchase").addEventListener("click", resetPurchaseForm);
  document.getElementById("btn-add-purchase-item").addEventListener("click", () => {
    addPurchaseItemRow();
    updatePurchaseTotal();
  });
  purchaseItemsEl.addEventListener("change", (e) => {
    if (e.target.classList.contains("pur-product") && e.target.value) {
      const opt = e.target.selectedOptions[0];
      e.target.closest(".item-row").querySelector(".pur-cost").value = opt.dataset.cost || 0;
      updatePurchaseTotal();
    }
  });
  purchaseItemsEl.addEventListener("input", (e) => {
    if (e.target.classList.contains("pur-qty") || e.target.classList.contains("pur-cost")) updatePurchaseTotal();
  });
  purchaseItemsEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-pur-item")) {
      e.target.closest(".item-row").remove();
      if (!purchaseItemsEl.children.length) addPurchaseItemRow();
      updatePurchaseTotal();
    }
  });

  purchaseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const items = [...purchaseItemsEl.querySelectorAll(".item-row")].map((row) => ({
        productId: row.querySelector(".pur-product").value,
        qty: row.querySelector(".pur-qty").value,
        cost: row.querySelector(".pur-cost").value,
      }));
      await AlRabaaStore.createPurchase({
        supplierName: document.getElementById("purchase-supplier").value,
        date: document.getElementById("purchase-date").value,
        paid: document.getElementById("purchase-paid").checked,
        notes: document.getElementById("purchase-notes").value,
        items,
      });
      resetPurchaseForm();
      await renderPurchases();
      toast("تم حفظ الشراء وتحديث المخزون");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  async function renderPurchases() {
    const rows = await AlRabaaStore.listPurchases();
    purchasesBody.innerHTML = rows.length
      ? rows
          .map(
            (p) => `
      <tr>
        <td><strong>${escapeHtml(p.number)}</strong></td>
        <td>${escapeHtml(p.supplierName)}</td>
        <td>${escapeHtml(p.date)}</td>
        <td>${money(p.total)} د.ك</td>
        <td>${p.paid ? `<span class="badge paid">مدفوع</span>` : `<span class="badge">آجل</span>`}</td>
        <td class="actions">
          <button type="button" data-del-purchase="${p.id}" class="danger">حذف</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">لا مشتريات بعد.</td></tr>`;
  }

  purchasesBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-del-purchase");
    if (!id) return;
    if (!confirm("حذف فاتورة الشراء وعكس الكميات من المخزون؟")) return;
    try {
      await AlRabaaStore.deletePurchase(id);
      await renderPurchases();
      toast("تم حذف الشراء");
    } catch (err) {
      toast(err.message || "تعذر الحذف");
    }
  });

  const expenseForm = document.getElementById("expense-form");
  const expensesBody = document.getElementById("expenses-body");

  function resetExpenseForm() {
    expenseForm.reset();
    document.getElementById("expense-date").value = new Date().toISOString().slice(0, 10);
    expenseForm.classList.add("hidden");
  }

  document.getElementById("btn-new-expense").addEventListener("click", () => {
    resetExpenseForm();
    expenseForm.classList.remove("hidden");
  });
  document.getElementById("btn-cancel-expense").addEventListener("click", resetExpenseForm);

  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.createExpense({
        date: document.getElementById("expense-date").value,
        category: document.getElementById("expense-category").value,
        amount: document.getElementById("expense-amount").value,
        note: document.getElementById("expense-note").value,
      });
      resetExpenseForm();
      await renderExpenses();
      toast("تم حفظ المصروف");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  async function renderExpenses() {
    const rows = await AlRabaaStore.listExpenses();
    expensesBody.innerHTML = rows.length
      ? rows
          .map(
            (x) => `
      <tr>
        <td>${escapeHtml(x.date)}</td>
        <td>${escapeHtml(x.category)}</td>
        <td>${money(x.amount)} د.ك</td>
        <td>${escapeHtml(x.note || "")}</td>
        <td class="actions"><button type="button" data-del-expense="${x.id}" class="danger">حذف</button></td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="5" class="empty">لا مصروفات بعد.</td></tr>`;
  }

  expensesBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-del-expense");
    if (!id) return;
    if (!confirm("حذف هذا المصروف؟")) return;
    try {
      await AlRabaaStore.deleteExpense(id);
      await renderExpenses();
      toast("تم الحذف");
    } catch (err) {
      toast(err.message || "تعذر الحذف");
    }
  });

  const cashForm = document.getElementById("cash-form");
  const cashBody = document.getElementById("cash-body");

  function resetCashForm() {
    cashForm.reset();
    document.getElementById("cash-date").value = new Date().toISOString().slice(0, 10);
    cashForm.classList.add("hidden");
  }

  document.getElementById("btn-new-cash").addEventListener("click", () => {
    resetCashForm();
    cashForm.classList.remove("hidden");
  });
  document.getElementById("btn-cancel-cash").addEventListener("click", resetCashForm);

  cashForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.createCashEntry({
        type: document.getElementById("cash-type").value,
        date: document.getElementById("cash-date").value,
        amount: document.getElementById("cash-amount").value,
        category: document.getElementById("cash-category").value,
        note: document.getElementById("cash-note").value,
      });
      resetCashForm();
      await renderCash();
      toast("تم حفظ حركة الصندوق");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  async function renderCash() {
    const data = await AlRabaaStore.getCash();
    document.getElementById("cash-balance").textContent = `${money(data.balance)} د.ك`;
    cashBody.innerHTML = data.entries.length
      ? data.entries
          .map(
            (c) => `
      <tr>
        <td>${escapeHtml(c.date)}</td>
        <td>${c.type === "in" ? `<span class="badge paid">قبض</span>` : `<span class="badge cancelled">صرف</span>`}</td>
        <td>${escapeHtml(c.category || "")}</td>
        <td>${money(c.amount)} د.ك</td>
        <td>${escapeHtml(c.note || "")}</td>
        <td class="actions">
          ${c.refType === "manual" ? `<button type="button" data-del-cash="${c.id}" class="danger">حذف</button>` : `<span class="muted">${escapeHtml(c.refType)}</span>`}
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">لا حركات صندوق بعد.</td></tr>`;
  }

  cashBody.addEventListener("click", async (e) => {
    const id = e.target.getAttribute("data-del-cash");
    if (!id) return;
    if (!confirm("حذف حركة الصندوق اليدوية؟")) return;
    try {
      await AlRabaaStore.deleteCashEntry(id);
      await renderCash();
      toast("تم الحذف");
    } catch (err) {
      toast(err.message || "تعذر الحذف");
    }
  });

  document.getElementById("btn-refresh-reports").addEventListener("click", () => renderReports());

  async function renderReports() {
    const r = await AlRabaaStore.getReports();
    document.getElementById("reports-grid").innerHTML = `
      <article class="stat-card"><span>المبيعات المؤكدة</span><strong>${money(r.salesTotal)} د.ك</strong></article>
      <article class="stat-card"><span>تكلفة البضاعة المباعة</span><strong>${money(r.cogsTotal)} د.ك</strong></article>
      <article class="stat-card"><span>مجمل الربح</span><strong>${money(r.grossProfit)} د.ك</strong></article>
      <article class="stat-card"><span>المصروفات</span><strong>${money(r.expensesTotal)} د.ك</strong></article>
      <article class="stat-card highlight"><span>صافي ربح تقريبي</span><strong>${money(r.netProfit)} د.ك</strong></article>
      <article class="stat-card"><span>المشتريات</span><strong>${money(r.purchasesTotal)} د.ك</strong></article>
      <article class="stat-card"><span>رصيد الصندوق</span><strong>${money(r.cashBalance)} د.ك</strong></article>
      <article class="stat-card"><span>قيمة المخزون (بالتكلفة)</span><strong>${money(r.stockValue)} د.ك</strong></article>
      <article class="stat-card"><span>فواتير مؤكدة / بانتظار</span><strong>${r.paidInvoicesCount} / ${r.openInvoicesCount}</strong></article>
      <article class="stat-card"><span>طلبات متجر جديدة</span><strong>${r.newOrdersCount || 0}</strong></article>
    `;
    const low = r.lowStock || [];
    document.getElementById("reports-low-body").innerHTML = low.length
      ? low
          .map(
            (p) => `
      <tr class="row-alert">
        <td>${escapeHtml(p.name)}</td>
        <td>${money(p.qty)} ${escapeHtml(p.unit || "")}</td>
        <td>${money(p.minQty)}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="3" class="empty">لا أصناف منخفضة حاليًا.</td></tr>`;
  }

  const ordersBody = document.getElementById("orders-body");
  const cartsBody = document.getElementById("carts-body");
  const cartStatusLabel = {
    active: "في السلة",
    checkout: "يكتب بياناته",
    abandoned: "متروكة",
    ordered: "تحوّلت لطلب",
  };

  async function renderOrders() {
    const [rows, carts] = await Promise.all([AlRabaaStore.listOrders(), AlRabaaStore.listStoreCarts()]);
    const liveCarts = carts.filter((c) => c.status !== "ordered" && (c.items || []).length > 0);
    cartsBody.innerHTML = liveCarts.length
      ? liveCarts
          .map((c) => {
            const items = (c.items || []).map((i) => `${escapeHtml(i.name)} × ${i.qty}`).join("<br>");
            const who = c.customerName || c.phone
              ? `${escapeHtml(c.customerName || "بدون اسم")}<div class="muted" dir="ltr">${escapeHtml(c.phone || "")}</div><div class="muted">${escapeHtml(c.area || "")}</div>`
              : `<span class="muted">زائر لم يترك رقمًا بعد</span>`;
            return `
      <tr>
        <td>${escapeHtml((c.updatedAt || "").slice(0, 16).replace("T", " "))}</td>
        <td>${who}</td>
        <td>${items}</td>
        <td>${money(c.total)} د.ك</td>
        <td><span class="badge ${c.status === "checkout" ? "active" : c.status === "abandoned" ? "paused" : ""}">${cartStatusLabel[c.status] || c.status}</span></td>
        <td>
          <input class="admin-note-input" data-cart-note="${c.id}" value="${escapeHtml(c.adminNote || "")}" placeholder="خصم / متابعة..." />
        </td>
        <td class="actions">
          <button type="button" data-save-cart-note="${c.id}">حفظ ملاحظة</button>
          ${c.phone ? `<button type="button" data-wa-cart="${c.id}">واتساب</button>` : ""}
          <button type="button" data-abandon-cart="${c.id}">تعليم متروكة</button>
          <button type="button" data-del-cart="${c.id}" class="danger">حذف</button>
        </td>
      </tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="empty">لا سلال نشطة الآن.</td></tr>`;

    ordersBody.innerHTML = rows.length
      ? rows
          .map((o) => {
            const items = (o.items || []).map((i) => `${escapeHtml(i.name)} × ${i.qty}`).join("<br>");
            return `
      <tr>
        <td><strong>${escapeHtml(o.number)}</strong><div class="muted">${items}</div></td>
        <td>${escapeHtml(o.customerName)}<div class="muted" dir="ltr">${escapeHtml(o.phone || "")}</div><div class="muted">${escapeHtml(o.area || "")}</div></td>
        <td>${escapeHtml((o.createdAt || "").slice(0, 10))}</td>
        <td>${money(o.total)} د.ك</td>
        <td>
          <span class="badge ${o.status === "confirmed" ? "paid" : o.status === "cancelled" ? "cancelled" : ""}">${statusLabel[o.status] || o.status}</span>
          ${o.stockDeducted ? `<div class="muted">خُصم المخزون</div>` : ""}
        </td>
        <td class="actions">
          ${
            o.status === "new"
              ? `<button type="button" data-confirm-order="${o.id}">تأكيد وخصم المخزون</button>
                 <button type="button" data-cancel-order="${o.id}">إلغاء</button>
                 <button type="button" data-del-order="${o.id}" class="danger">حذف</button>`
              : o.status === "cancelled"
                ? `<button type="button" data-del-order="${o.id}" class="danger">حذف</button>`
                : `${o.invoiceId ? `<a href="invoice.html?id=${encodeURIComponent(o.invoiceId)}" target="_blank">فاتورة ${escapeHtml(o.invoiceNumber || "")}</a>` : `<span class="muted">مؤكد</span>`}`
          }
          <button type="button" data-wa-order="${o.id}">واتساب</button>
        </td>
      </tr>`;
          })
          .join("")
      : `<tr><td colspan="6" class="empty">لا طلبات متجر بعد.</td></tr>`;
  }

  document.getElementById("btn-refresh-orders")?.addEventListener("click", () => renderOrders());

  cartsBody.addEventListener("click", async (e) => {
    const saveId = e.target.getAttribute("data-save-cart-note");
    const waId = e.target.getAttribute("data-wa-cart");
    const abandonId = e.target.getAttribute("data-abandon-cart");
    const delId = e.target.getAttribute("data-del-cart");
    try {
      if (saveId) {
        const input = cartsBody.querySelector(`[data-cart-note="${saveId}"]`);
        await AlRabaaStore.updateStoreCart(saveId, { adminNote: input?.value || "" });
        toast("تم حفظ الملاحظة");
      }
      if (waId) {
        const carts = await AlRabaaStore.listStoreCarts();
        const c = carts.find((x) => x.id === waId);
        if (!c?.phone) return;
        const lines = (c.items || []).map((i) => `• ${i.name} × ${i.qty}`).join("\n");
        const note = c.adminNote ? `\nعرض خاص: ${c.adminNote}` : "";
        const text = `مرحبًا${c.customerName ? ` ${c.customerName}` : ""}\nلاحظنا اهتمامك بمنتجات الرباعية:\n${lines}\nالإجمالي التقريبي: ${money(c.total)} د.ك${note}\nهل نساعدك بإتمام الطلب؟`;
        window.open(`https://wa.me/${normalizePhone(c.phone)}?text=${encodeURIComponent(text)}`, "_blank");
      }
      if (abandonId) {
        await AlRabaaStore.updateStoreCart(abandonId, { status: "abandoned" });
        await renderOrders();
        toast("تم التعليم كمتروكة");
      }
      if (delId) {
        if (!confirm("حذف سجل السلة؟")) return;
        await AlRabaaStore.deleteStoreCart(delId);
        await renderOrders();
        toast("تم الحذف");
      }
    } catch (err) {
      toast(err.message || "تعذر تنفيذ الإجراء");
    }
  });

  ordersBody.addEventListener("click", async (e) => {
    const confirmId = e.target.getAttribute("data-confirm-order");
    const cancelId = e.target.getAttribute("data-cancel-order");
    const delId = e.target.getAttribute("data-del-order");
    const waId = e.target.getAttribute("data-wa-order");
    try {
      if (confirmId) {
        if (!confirm("تأكيد الطلب وخصم المخزون؟")) return;
        await AlRabaaStore.confirmStoreOrder(confirmId);
        await renderOrders();
        toast("تم تأكيد الطلب وخصم المخزون");
      }
      if (cancelId) {
        if (!confirm("إلغاء هذا الطلب؟")) return;
        await AlRabaaStore.cancelStoreOrder(cancelId);
        await renderOrders();
        toast("تم إلغاء الطلب");
      }
      if (delId) {
        if (!confirm("حذف الطلب؟")) return;
        await AlRabaaStore.deleteStoreOrder(delId);
        await renderOrders();
        toast("تم الحذف");
      }
      if (waId) {
        const o = await AlRabaaStore.getOrder(waId);
        const lines = (o.items || []).map((i) => `• ${i.name} × ${i.qty} = ${money(i.total)} د.ك`).join("\n");
        const text = `بخصوص طلب المتجر ${o.number}\n${o.customerName}\n${lines}\nالإجمالي: ${money(o.total)} د.ك`;
        const phone = normalizePhone(o.phone) || WA;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
      }
    } catch (err) {
      toast(err.message || "تعذر تنفيذ الإجراء");
    }
  });

  const invoicesBody = document.getElementById("invoices-body");

  async function renderInvoices() {
    const rows = await AlRabaaStore.listInvoices();
    invoicesBody.innerHTML = rows.length
      ? rows
          .map(
            (inv) => `
      <tr>
        <td><strong>${escapeHtml(inv.number)}</strong></td>
        <td>${escapeHtml(inv.customerName)}<div class="muted" dir="ltr">${escapeHtml(inv.customerPhone || "")}</div></td>
        <td>${escapeHtml(inv.date)}</td>
        <td>${money(inv.total)} د.ك</td>
        <td>
          <span class="badge ${inv.status}">${statusLabel[inv.status] || inv.status}</span>
          ${inv.stockDeducted ? `<div class="muted">خُصم المخزون</div>` : inv.status === "issued" ? `<div class="muted">بانتظار التأكيد</div>` : ""}
        </td>
        <td class="actions">
          <a href="invoice.html?id=${encodeURIComponent(inv.id)}" target="_blank">عرض/طباعة</a>
          ${
            inv.stockDeducted
              ? `<button type="button" data-status="${inv.id}|paid" ${inv.status === "paid" ? "disabled" : ""}>مدفوعة</button>`
              : `<button type="button" data-confirm-inv="${inv.id}">تأكيد وخصم المخزون</button>`
          }
          <button type="button" data-wa-inv="${inv.id}">واتساب</button>
          <button type="button" data-del-inv="${inv.id}" class="danger">حذف</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">لا توجد فواتير بعد.</td></tr>`;
  }

  invoicesBody.addEventListener("click", async (e) => {
    const status = e.target.getAttribute("data-status");
    const confirmInv = e.target.getAttribute("data-confirm-inv");
    const wa = e.target.getAttribute("data-wa-inv");
    const del = e.target.getAttribute("data-del-inv");
    try {
      if (confirmInv) {
        if (!confirm("تأكيد البيع وخصم الكميات من المخزون؟")) return;
        await AlRabaaStore.confirmInvoiceSale(confirmInv);
        await renderInvoices();
        toast("تم التأكيد وخصم المخزون");
      }
      if (status) {
        const [id, st] = status.split("|");
        await AlRabaaStore.updateInvoiceStatus(id, st);
        await renderInvoices();
        toast("تم تحديث الحالة");
      }
      if (wa) {
        const inv = await AlRabaaStore.getInvoice(wa);
        const phone = normalizePhone(inv.customerPhone) || WA;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildInvoiceWhatsApp(inv))}`, "_blank");
      }
      if (del) {
        if (!confirm("حذف هذه الفاتورة؟")) return;
        await AlRabaaStore.deleteInvoice(del);
        await renderInvoices();
        toast("تم حذف الفاتورة");
      }
    } catch (err) {
      toast(err.message || "تعذر تنفيذ الإجراء");
    }
  });

  const itemsEl = document.getElementById("invoice-items");

  async function prepareInvoiceForm() {
    catalogCache = await AlRabaaStore.getCatalog();
    const select = document.getElementById("invoice-customer");
    const customers = await AlRabaaStore.listCustomers();
    select.innerHTML = customers.length
      ? customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} — ${escapeHtml(c.phone || "بدون جوال")}</option>`).join("")
      : `<option value="">أضف عميلًا أولًا</option>`;
    document.getElementById("invoice-date").value = new Date().toISOString().slice(0, 10);
    if (!itemsEl.children.length) addItemRow();
    updateTotal();
  }

  function addItemRow(preset) {
    const row = document.createElement("div");
    row.className = "item-row";
    const options = catalogCache
      .map((p) => {
        const stockHint = p.trackStock ? ` · متاح ${money(p.qty)}` : "";
        return `<option value="${p.id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)} — ${money(p.price)} د.ك${stockHint}</option>`;
      })
      .join("");
    row.innerHTML = `
      <select class="item-product">
        <option value="">بند مخصص</option>
        ${options}
      </select>
      <input class="item-name" placeholder="اسم البند" value="${escapeHtml(preset?.name || "")}" />
      <input class="item-qty" type="number" min="0.001" step="0.001" value="${preset?.qty || 1}" />
      <input class="item-price" type="number" min="0" step="0.001" value="${preset?.price ?? ""}" placeholder="السعر" />
      <button type="button" class="danger remove-item">حذف</button>
    `;
    itemsEl.appendChild(row);
  }

  document.getElementById("btn-add-item").addEventListener("click", () => {
    addItemRow();
    updateTotal();
  });

  itemsEl.addEventListener("change", (e) => {
    if (e.target.classList.contains("item-product") && e.target.value) {
      const opt = e.target.selectedOptions[0];
      const row = e.target.closest(".item-row");
      row.querySelector(".item-name").value = opt.dataset.name || "";
      row.querySelector(".item-price").value = opt.dataset.price || "";
      updateTotal();
    }
  });
  itemsEl.addEventListener("input", (e) => {
    if (e.target.classList.contains("item-qty") || e.target.classList.contains("item-price")) updateTotal();
  });
  itemsEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-item")) {
      e.target.closest(".item-row").remove();
      if (!itemsEl.children.length) addItemRow();
      updateTotal();
    }
  });

  function collectItems() {
    return [...itemsEl.querySelectorAll(".item-row")].map((row) => ({
      productId: row.querySelector(".item-product").value || undefined,
      name: row.querySelector(".item-name").value,
      qty: row.querySelector(".item-qty").value,
      price: row.querySelector(".item-price").value,
    }));
  }

  function updateTotal() {
    const total = collectItems().reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
    document.getElementById("invoice-total").textContent = money(total);
  }

  document.getElementById("invoice-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const invoice = await AlRabaaStore.createInvoice({
        customerId: document.getElementById("invoice-customer").value,
        date: document.getElementById("invoice-date").value,
        notes: document.getElementById("invoice-notes").value,
        items: collectItems(),
      });
      itemsEl.innerHTML = "";
      addItemRow();
      updateTotal();
      toast(`تم إصدار ${invoice.number}`);
      await showTab("invoices");
      window.open(`invoice.html?id=${encodeURIComponent(invoice.id)}`, "_blank");
    } catch (err) {
      toast(err.message || "تعذر إصدار الفاتورة");
    }
  });

  document.getElementById("btn-export").addEventListener("click", async () => {
    try {
      const json = await AlRabaaStore.exportBackup();
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `alrabaa-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("تم تصدير النسخة");
    } catch (err) {
      toast(err.message || "تعذر التصدير");
    }
  });

  document.getElementById("btn-import").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!confirm("سيتم استبدال البيانات الحالية على السيرفر. متابعة؟")) return;
      await AlRabaaStore.importBackup(text);
      await renderCustomers();
      await renderInvoices();
      await renderSupervisions();
      toast("تم الاستيراد بنجاح");
    } catch (err) {
      toast(err.message || "فشل الاستيراد");
    } finally {
      e.target.value = "";
    }
  });

  const supervisionForm = document.getElementById("supervision-form");
  const supervisionBody = document.getElementById("supervision-body");
  const visitCard = document.getElementById("visit-form-card");

  async function fillSupervisionCustomers(selectedId) {
    const select = document.getElementById("sup-customer");
    const customers = await AlRabaaStore.listCustomers();
    select.innerHTML = customers.length
      ? customers
          .map(
            (c) =>
              `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${escapeHtml(c.name)} — ${escapeHtml(
                c.phone || "بدون جوال"
              )}</option>`
          )
          .join("")
      : `<option value="">أضف عميلًا أولًا من سجل العملاء</option>`;
  }

  function updateSupFee() {
    const n = document.getElementById("sup-hive-count").value;
    document.getElementById("sup-fee").value = `${money(AlRabaaStore.supervisionFee(n))} د.ك / شهر`;
  }

  async function resetSupervisionForm() {
    supervisionForm.reset();
    document.getElementById("sup-id").value = "";
    supervisionForm.classList.add("hidden");
    await fillSupervisionCustomers();
    updateSupFee();
  }

  document.getElementById("btn-new-supervision").addEventListener("click", async () => {
    await resetSupervisionForm();
    supervisionForm.classList.remove("hidden");
    await fillSupervisionCustomers();
    document.getElementById("sup-hive-count").value = 5;
    updateSupFee();
    supervisionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("btn-cancel-supervision").addEventListener("click", () => resetSupervisionForm());
  document.getElementById("sup-hive-count").addEventListener("input", updateSupFee);
  document.getElementById("sup-hive-numbers").addEventListener("input", () => {
    const count = document
      .getElementById("sup-hive-numbers")
      .value.split(/[\n,،\s]+/)
      .map((s) => s.trim())
      .filter(Boolean).length;
    if (count > 0) {
      document.getElementById("sup-hive-count").value = count;
      updateSupFee();
    }
  });

  supervisionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.upsertSupervision({
        id: document.getElementById("sup-id").value || undefined,
        customerId: document.getElementById("sup-customer").value,
        beekeeper: document.getElementById("sup-beekeeper").value,
        hiveCount: document.getElementById("sup-hive-count").value,
        hiveNumbers: document.getElementById("sup-hive-numbers").value,
        location: document.getElementById("sup-location").value,
        status: document.getElementById("sup-status").value,
        installDate: document.getElementById("sup-install").value,
        nextVisitDate: document.getElementById("sup-next-visit").value,
        lastVisitDate: document.getElementById("sup-last-visit").value,
        extractionAppointment: document.getElementById("sup-extract-appt").value,
        extractionDate: document.getElementById("sup-extract-date").value,
        notes: document.getElementById("sup-notes").value,
      });
      await resetSupervisionForm();
      await renderSupervisions();
      toast("تم حفظ سجل الإشراف");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  document.getElementById("sup-search").addEventListener("input", () => renderSupervisions());

  async function renderSupervisions() {
    await fillSupervisionCustomers(document.getElementById("sup-customer").value);
    const q = (document.getElementById("sup-search").value || "").trim().toLowerCase();
    const all = await AlRabaaStore.listSupervisions();
    const rows = all.filter((s) => {
      if (!q) return true;
      return [s.customerName, s.customerPhone, s.beekeeper, s.location, ...(s.hiveNumbers || [])]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    supervisionBody.innerHTML = rows.length
      ? rows
          .map((s) => {
            const hives = (s.hiveNumbers || []).length
              ? `${s.hiveCount} — ${(s.hiveNumbers || []).join("، ")}`
              : String(s.hiveCount || "—");
            const overdue =
              s.status === "active" && s.nextVisitDate && s.nextVisitDate < new Date().toISOString().slice(0, 10);
            return `
      <tr class="${overdue ? "row-alert" : ""}">
        <td>
          <strong>${escapeHtml(s.customerName)}</strong>
          <div class="muted" dir="ltr">${escapeHtml(s.customerPhone || "")}</div>
          <div class="muted">${escapeHtml(s.customerArea || s.location || "")}</div>
          <div class="muted">الرسوم: ${money(s.monthlyFee)} د.ك/شهر</div>
        </td>
        <td>${escapeHtml(hives)}</td>
        <td>${escapeHtml(s.beekeeper || "—")}</td>
        <td>${escapeHtml(s.installDate || "—")}</td>
        <td>${escapeHtml(s.nextVisitDate || "—")}${overdue ? '<div class="muted danger-text">متأخرة</div>' : ""}</td>
        <td>${escapeHtml(s.extractionAppointment || "—")}</td>
        <td>${escapeHtml(s.extractionDate || "—")}</td>
        <td><span class="badge ${s.status}">${statusLabel[s.status] || s.status}</span></td>
        <td class="actions">
          <a href="supervision-contract.html?id=${encodeURIComponent(s.id)}" target="_blank">عقد / طباعة</a>
          <button type="button" data-edit-sup="${s.id}">تعديل</button>
          <button type="button" data-visit-sup="${s.id}">زيارة</button>
          <button type="button" data-contract-wa="${s.id}">إرسال العقد</button>
          <button type="button" data-del-sup="${s.id}" class="danger">حذف</button>
        </td>
      </tr>
      ${
        (s.visits || []).length
          ? `<tr class="visit-history"><td colspan="9"><strong>سجل الزيارات:</strong> ${(s.visits || [])
              .slice(0, 5)
              .map((v) => `${escapeHtml(v.date)} (${escapeHtml(v.beekeeper || "—")})${v.notes ? " — " + escapeHtml(v.notes) : ""}`)
              .join(" · ")}</td></tr>`
          : ""
      }`;
          })
          .join("")
      : `<tr><td colspan="9" class="empty">لا توجد سجلات إشراف بعد. أضف عميلًا ثم أنشئ سجل إشراف.</td></tr>`;
  }

  supervisionBody.addEventListener("click", async (e) => {
    const editId = e.target.getAttribute("data-edit-sup");
    const visitId = e.target.getAttribute("data-visit-sup");
    const contractWa = e.target.getAttribute("data-contract-wa");
    const delId = e.target.getAttribute("data-del-sup");

    try {
      if (editId) {
        const s = await AlRabaaStore.getSupervision(editId);
        await fillSupervisionCustomers(s.customerId);
        document.getElementById("sup-id").value = s.id;
        document.getElementById("sup-beekeeper").value = s.beekeeper || "";
        document.getElementById("sup-hive-count").value = s.hiveCount || "";
        document.getElementById("sup-hive-numbers").value = (s.hiveNumbers || []).join("، ");
        document.getElementById("sup-location").value = s.location || "";
        document.getElementById("sup-status").value = s.status || "active";
        document.getElementById("sup-install").value = s.installDate || "";
        document.getElementById("sup-next-visit").value = s.nextVisitDate || "";
        document.getElementById("sup-last-visit").value = s.lastVisitDate || "";
        document.getElementById("sup-extract-appt").value = s.extractionAppointment || "";
        document.getElementById("sup-extract-date").value = s.extractionDate || "";
        document.getElementById("sup-notes").value = s.notes || "";
        updateSupFee();
        supervisionForm.classList.remove("hidden");
        supervisionForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (visitId) {
        const s = await AlRabaaStore.getSupervision(visitId);
        document.getElementById("visit-sup-id").value = s.id;
        document.getElementById("visit-target-label").textContent = `زيارة لـ ${s.customerName} — ${s.hiveCount} خلية`;
        document.getElementById("visit-date").value = new Date().toISOString().slice(0, 10);
        document.getElementById("visit-beekeeper").value = s.beekeeper || "";
        document.getElementById("visit-next").value = "";
        document.getElementById("visit-notes").value = "";
        visitCard.classList.remove("hidden");
        visitCard.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (contractWa) {
        const s = await AlRabaaStore.getSupervision(contractWa);
        window.open(`supervision-contract.html?id=${encodeURIComponent(s.id)}`, "_blank");
        const phone = normalizePhone(s.customerPhone) || WA;
        const today = new Date().toLocaleDateString("ar-KW");
        const no = `SUP-${s.id.slice(-6).toUpperCase()}`;
        const text = [
          `عقد إشراف على خلايا النحل — الرباعية للنحل والعسل`,
          `رقم العقد: ${no}`,
          `تاريخ الإصدار: ${today}`,
          ``,
          `الطرف الأول: الرباعية للنحل والعسل`,
          `الطرف الثاني: ${s.customerName}`,
          `الجوال: ${s.customerPhone || "—"}`,
          ``,
          `عدد الخلايا: ${s.hiveCount}`,
          `أرقام الخلايا: ${(s.hiveNumbers || []).join("، ") || "—"}`,
          `موقع المنحل: ${s.location || s.customerArea || "—"}`,
          `النحال المشرف: ${s.beekeeper || "—"}`,
          `تاريخ التركيب: ${s.installDate || "—"}`,
          `موعد الزيارة القادم: ${s.nextVisitDate || "—"}`,
          `موعد الفرز: ${s.extractionAppointment || "—"}`,
          `تاريخ الفرز: ${s.extractionDate || "—"}`,
          `الرسوم الشهرية: ${money(s.monthlyFee)} د.ك`,
          ``,
          `يلتزم الطرف الأول بالفحص الدوري والتنسيق بشأن الفرز.`,
          `يلتزم الطرف الثاني بتسهيل الوصول وسداد الرسوم المتفق عليها.`,
          ``,
          `بالموافقة على هذه الرسالة يُعد العقد مقبولًا وفق البيانات أعلاه.`,
        ].join("\n");
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
        }, 300);
      }

      if (delId) {
        if (!confirm("حذف سجل الإشراف؟")) return;
        await AlRabaaStore.deleteSupervision(delId);
        await renderSupervisions();
        toast("تم حذف سجل الإشراف");
      }
    } catch (err) {
      toast(err.message || "تعذر تنفيذ الإجراء");
    }
  });

  document.getElementById("btn-cancel-visit").addEventListener("click", () => {
    visitCard.classList.add("hidden");
  });

  document.getElementById("btn-save-visit").addEventListener("click", async () => {
    try {
      await AlRabaaStore.addSupervisionVisit(document.getElementById("visit-sup-id").value, {
        date: document.getElementById("visit-date").value,
        beekeeper: document.getElementById("visit-beekeeper").value,
        nextVisitDate: document.getElementById("visit-next").value,
        notes: document.getElementById("visit-notes").value,
      });
      visitCard.classList.add("hidden");
      await renderSupervisions();
      toast("تم تسجيل الزيارة");
    } catch (err) {
      toast(err.message || "تعذر حفظ الزيارة");
    }
  });

  document.getElementById("btn-logout")?.addEventListener("click", async () => {
    await AlRabaaStore.logout();
    location.reload();
  });

  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await AlRabaaStore.login(document.getElementById("login-password").value);
      await enterApp();
    } catch (err) {
      toast(err.message || "فشل تسجيل الدخول");
    }
  });

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("965")) return digits;
    if (digits.length === 8) return `965${digits}`;
    return digits;
  }

  function buildInvoiceWhatsApp(inv) {
    const lines = inv.items.map((i) => `• ${i.name} × ${i.qty} = ${money(i.total)} د.ك`).join("\n");
    return `فاتورة إلكترونية من الرباعية للنحل والعسل\nرقم الفاتورة: ${inv.number}\nالتاريخ: ${inv.date}\nالعميل: ${inv.customerName}\n\n${lines}\n\nالإجمالي: ${money(inv.total)} د.ك\nيصل طلبك بعناية وأمان · توصيل داخل الكويت ودول الخليج`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function enterApp() {
    loginGate?.classList.add("hidden");
    adminApp?.classList.remove("hidden");
    await showTab((location.hash || "").replace("#", "") || "customers");
  }

  async function boot() {
    if (AlRabaaStore.isLoggedIn()) {
      try {
        await AlRabaaStore.listCustomers();
        await enterApp();
        return;
      } catch {
        await AlRabaaStore.logout();
      }
    }
    loginGate?.classList.remove("hidden");
    adminApp?.classList.add("hidden");
  }

  boot();
})();
