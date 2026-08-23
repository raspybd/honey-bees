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
  };

  const toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.hidden = true;
    }, 2400);
  }

  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${name}`));
    if (name === "customers") renderCustomers();
    if (name === "invoices") renderInvoices();
    if (name === "create") prepareInvoiceForm();
    if (name === "supervision") renderSupervisions();
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.goto));
  });

  /* Customers */
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

  customerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      AlRabaaStore.upsertCustomer({
        id: document.getElementById("customer-id").value || undefined,
        name: document.getElementById("customer-name").value,
        phone: document.getElementById("customer-phone").value,
        area: document.getElementById("customer-area").value,
        notes: document.getElementById("customer-notes").value,
      });
      resetCustomerForm();
      renderCustomers();
      toast("تم حفظ العميل");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  document.getElementById("customer-search").addEventListener("input", renderCustomers);

  function renderCustomers() {
    const q = (document.getElementById("customer-search").value || "").trim().toLowerCase();
    const rows = AlRabaaStore.listCustomers().filter((c) => {
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

  customersBody.addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit-customer");
    const delId = e.target.getAttribute("data-del-customer");
    if (editId) {
      const c = AlRabaaStore.getCustomer(editId);
      if (!c) return;
      document.getElementById("customer-id").value = c.id;
      document.getElementById("customer-name").value = c.name || "";
      document.getElementById("customer-phone").value = c.phone || "";
      document.getElementById("customer-area").value = c.area || "";
      document.getElementById("customer-notes").value = c.notes || "";
      customerForm.classList.remove("hidden");
      customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (delId) {
      if (!confirm("حذف هذا العميل؟")) return;
      AlRabaaStore.deleteCustomer(delId);
      renderCustomers();
      toast("تم حذف العميل");
    }
  });

  /* Invoices list */
  const invoicesBody = document.getElementById("invoices-body");

  function renderInvoices() {
    const rows = AlRabaaStore.listInvoices();
    invoicesBody.innerHTML = rows.length
      ? rows
          .map(
            (inv) => `
      <tr>
        <td><strong>${escapeHtml(inv.number)}</strong></td>
        <td>${escapeHtml(inv.customerName)}<div class="muted" dir="ltr">${escapeHtml(inv.customerPhone || "")}</div></td>
        <td>${escapeHtml(inv.date)}</td>
        <td>${money(inv.total)} د.ك</td>
        <td><span class="badge ${inv.status}">${statusLabel[inv.status] || inv.status}</span></td>
        <td class="actions">
          <a href="invoice.html?id=${encodeURIComponent(inv.id)}" target="_blank">عرض/طباعة</a>
          <button type="button" data-status="${inv.id}|paid">مدفوعة</button>
          <button type="button" data-wa-inv="${inv.id}">واتساب</button>
          <button type="button" data-del-inv="${inv.id}" class="danger">حذف</button>
        </td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="empty">لا توجد فواتير بعد.</td></tr>`;
  }

  invoicesBody.addEventListener("click", (e) => {
    const status = e.target.getAttribute("data-status");
    const wa = e.target.getAttribute("data-wa-inv");
    const del = e.target.getAttribute("data-del-inv");
    if (status) {
      const [id, st] = status.split("|");
      AlRabaaStore.updateInvoiceStatus(id, st);
      renderInvoices();
      toast("تم تحديث الحالة");
    }
    if (wa) {
      const inv = AlRabaaStore.getInvoice(wa);
      if (!inv) return;
      const phone = normalizePhone(inv.customerPhone) || WA;
      const text = buildInvoiceWhatsApp(inv);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
    }
    if (del) {
      if (!confirm("حذف هذه الفاتورة؟")) return;
      AlRabaaStore.deleteInvoice(del);
      renderInvoices();
      toast("تم حذف الفاتورة");
    }
  });

  /* Create invoice */
  const itemsEl = document.getElementById("invoice-items");
  const catalog = () => AlRabaaStore.getCatalog();

  function prepareInvoiceForm() {
    const select = document.getElementById("invoice-customer");
    const customers = AlRabaaStore.listCustomers();
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
    const options = catalog()
      .map((p) => `<option value="${p.id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)} — ${money(p.price)} د.ك</option>`)
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
      name: row.querySelector(".item-name").value,
      qty: row.querySelector(".item-qty").value,
      price: row.querySelector(".item-price").value,
    }));
  }

  function updateTotal() {
    const total = collectItems().reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
    document.getElementById("invoice-total").textContent = money(total);
  }

  document.getElementById("invoice-form").addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      const invoice = AlRabaaStore.createInvoice({
        customerId: document.getElementById("invoice-customer").value,
        date: document.getElementById("invoice-date").value,
        notes: document.getElementById("invoice-notes").value,
        items: collectItems(),
      });
      itemsEl.innerHTML = "";
      addItemRow();
      updateTotal();
      toast(`تم إصدار ${invoice.number}`);
      showTab("invoices");
      window.open(`invoice.html?id=${encodeURIComponent(invoice.id)}`, "_blank");
    } catch (err) {
      toast(err.message || "تعذر إصدار الفاتورة");
    }
  });

  /* Backup */
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([AlRabaaStore.exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `alrabaa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("تم تصدير النسخة");
  });

  document.getElementById("btn-import").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!confirm("سيتم استبدال البيانات الحالية. متابعة؟")) return;
      AlRabaaStore.importBackup(text);
      renderCustomers();
      renderInvoices();
      renderSupervisions();
      toast("تم الاستيراد بنجاح");
    } catch (err) {
      toast(err.message || "فشل الاستيراد");
    } finally {
      e.target.value = "";
    }
  });

  /* Supervision follow-up */
  const supervisionForm = document.getElementById("supervision-form");
  const supervisionBody = document.getElementById("supervision-body");
  const visitCard = document.getElementById("visit-form-card");

  function fillSupervisionCustomers(selectedId) {
    const select = document.getElementById("sup-customer");
    const customers = AlRabaaStore.listCustomers();
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

  function resetSupervisionForm() {
    supervisionForm.reset();
    document.getElementById("sup-id").value = "";
    supervisionForm.classList.add("hidden");
    fillSupervisionCustomers();
    updateSupFee();
  }

  document.getElementById("btn-new-supervision").addEventListener("click", () => {
    resetSupervisionForm();
    supervisionForm.classList.remove("hidden");
    fillSupervisionCustomers();
    document.getElementById("sup-hive-count").value = 5;
    updateSupFee();
    supervisionForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("btn-cancel-supervision").addEventListener("click", resetSupervisionForm);
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

  supervisionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    try {
      AlRabaaStore.upsertSupervision({
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
      resetSupervisionForm();
      renderSupervisions();
      toast("تم حفظ سجل الإشراف");
    } catch (err) {
      toast(err.message || "تعذر الحفظ");
    }
  });

  document.getElementById("sup-search").addEventListener("input", renderSupervisions);

  function renderSupervisions() {
    fillSupervisionCustomers(document.getElementById("sup-customer").value);
    const q = (document.getElementById("sup-search").value || "").trim().toLowerCase();
    const rows = AlRabaaStore.listSupervisions().filter((s) => {
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

  supervisionBody.addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit-sup");
    const visitId = e.target.getAttribute("data-visit-sup");
    const contractWa = e.target.getAttribute("data-contract-wa");
    const delId = e.target.getAttribute("data-del-sup");

    if (editId) {
      const s = AlRabaaStore.getSupervision(editId);
      if (!s) return;
      fillSupervisionCustomers(s.customerId);
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
      const s = AlRabaaStore.getSupervision(visitId);
      if (!s) return;
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
      const s = AlRabaaStore.getSupervision(contractWa);
      if (!s) return;
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
        `لطباعة نسخة PDF افتح صفحة العقد من لوحة الإدارة.`,
      ].join("\n");
      setTimeout(() => {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
      }, 300);
    }

    if (delId) {
      if (!confirm("حذف سجل الإشراف؟")) return;
      AlRabaaStore.deleteSupervision(delId);
      renderSupervisions();
      toast("تم حذف سجل الإشراف");
    }
  });

  document.getElementById("btn-cancel-visit").addEventListener("click", () => {
    visitCard.classList.add("hidden");
  });

  document.getElementById("btn-save-visit").addEventListener("click", () => {
    try {
      AlRabaaStore.addSupervisionVisit(document.getElementById("visit-sup-id").value, {
        date: document.getElementById("visit-date").value,
        beekeeper: document.getElementById("visit-beekeeper").value,
        nextVisitDate: document.getElementById("visit-next").value,
        notes: document.getElementById("visit-notes").value,
      });
      visitCard.classList.add("hidden");
      renderSupervisions();
      toast("تم تسجيل الزيارة");
    } catch (err) {
      toast(err.message || "تعذر حفظ الزيارة");
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
    return `فاتورة إلكترونية من الرباعية للنحل والعسل\nرقم الفاتورة: ${inv.number}\nالتاريخ: ${inv.date}\nالعميل: ${inv.customerName}\n\n${lines}\n\nالإجمالي: ${money(inv.total)} د.ك\nطلبك يصل بتغليف آمن · توصيل داخل الكويت ودول الخليج`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  showTab((location.hash || "").replace("#", "") || "customers");
})();
