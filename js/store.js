const AlRabaaStore = (() => {
  const KEY = "alrabaa_crm_v1";

  const defaultCatalog = [
    { id: "hive-boxes", name: "صناديق تربية النحل", price: 18 },
    { id: "bee-package", name: "طرد نحل", price: 25 },
    { id: "queen", name: "ملكة ملقحة", price: 12 },
    { id: "honey", name: "عسل طبيعي", price: 8 },
    { id: "beeswax", name: "شمع النحل", price: 6 },
    { id: "propolis", name: "العكبر (البروبوليس)", price: 10 },
    { id: "frames", name: "إطارات إضافية", price: 1.5 },
    { id: "suit", name: "بدلة النحال", price: 22 },
    { id: "smoker", name: "مدخن النحل", price: 9 },
    { id: "pkg-beginner", name: "باقة المبتدئ", price: 65 },
    { id: "pkg-expand", name: "باقة التوسعة", price: 55 },
    { id: "pkg-honey", name: "باقة العسل", price: 20 },
    { id: "svc-sup-1-5", name: "إشراف شهري (1–5 خلايا)", price: 15 },
    { id: "svc-sup-5-10", name: "إشراف شهري (5–10 خلايا)", price: 20 },
    { id: "svc-sup-10-15", name: "إشراف شهري (10–15 خلية)", price: 25 },
    { id: "svc-sup-15-20", name: "إشراف شهري (15–20 خلية)", price: 30 },
    { id: "svc-sup-extra", name: "إشراف شهري — خلية زيادة فوق 20", price: 1 },
    { id: "svc-extract-rate-5", name: "فرز — سعر الخلية (باقة 1–5)", price: 5 },
    { id: "svc-extract-rate-4-5", name: "فرز — سعر الخلية (باقة 5–10)", price: 4.5 },
    { id: "svc-extract-rate-3", name: "فرز — سعر الخلية (باقة 10–15)", price: 3 },
    { id: "svc-extract-rate-2-75", name: "فرز — سعر الخلية (باقة 15–20)", price: 2.75 },
    { id: "svc-extract-extra", name: "فرز — خلية زيادة فوق 20", price: 2.5 },
  ];

  function empty() {
    return {
      customers: [],
      invoices: [],
      supervisions: [],
      seq: 1000,
      catalog: defaultCatalog,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const data = JSON.parse(raw);
      return {
        ...empty(),
        ...data,
        catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : defaultCatalog,
      };
    } catch {
      return empty();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function listCustomers() {
    return load().customers.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
  }

  function getCustomer(id) {
    return load().customers.find((c) => c.id === id) || null;
  }

  function upsertCustomer(input) {
    const data = load();
    const now = new Date().toISOString();
    if (input.id) {
      const idx = data.customers.findIndex((c) => c.id === input.id);
      if (idx === -1) throw new Error("العميل غير موجود");
      data.customers[idx] = {
        ...data.customers[idx],
        name: String(input.name || "").trim(),
        phone: String(input.phone || "").trim(),
        area: String(input.area || "").trim(),
        notes: String(input.notes || "").trim(),
        updatedAt: now,
      };
      save(data);
      return data.customers[idx];
    }
    const customer = {
      id: uid("cus"),
      name: String(input.name || "").trim(),
      phone: String(input.phone || "").trim(),
      area: String(input.area || "").trim(),
      notes: String(input.notes || "").trim(),
      createdAt: now,
      updatedAt: now,
    };
    if (!customer.name) throw new Error("اسم العميل مطلوب");
    data.customers.unshift(customer);
    save(data);
    return customer;
  }

  function deleteCustomer(id) {
    const data = load();
    data.customers = data.customers.filter((c) => c.id !== id);
    save(data);
  }

  function nextInvoiceNumber(data) {
    data.seq = (data.seq || 1000) + 1;
    const y = new Date().getFullYear();
    return `ARB-${y}-${String(data.seq).padStart(4, "0")}`;
  }

  function calcItems(items) {
    return (items || []).map((item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return {
        name: String(item.name || "").trim(),
        qty,
        price,
        total: Math.round(qty * price * 1000) / 1000,
      };
    });
  }

  function sumItems(items) {
    return Math.round(items.reduce((s, i) => s + (i.total || 0), 0) * 1000) / 1000;
  }

  function listInvoices() {
    return load().invoices.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  function getInvoice(id) {
    return load().invoices.find((inv) => inv.id === id) || null;
  }

  function createInvoice(input) {
    const data = load();
    const items = calcItems(input.items).filter((i) => i.name && i.qty > 0);
    if (!items.length) throw new Error("أضف بندًا واحدًا على الأقل");
    const customer = data.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error("اختر عميلًا من السجل");
    const now = new Date().toISOString();
    const invoice = {
      id: uid("inv"),
      number: nextInvoiceNumber(data),
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerArea: customer.area || "",
      date: input.date || now.slice(0, 10),
      items,
      subtotal: sumItems(items),
      total: sumItems(items),
      notes: String(input.notes || "").trim(),
      status: input.status || "issued",
      createdAt: now,
    };
    data.invoices.unshift(invoice);
    save(data);
    return invoice;
  }

  function updateInvoiceStatus(id, status) {
    const data = load();
    const inv = data.invoices.find((i) => i.id === id);
    if (!inv) throw new Error("الفاتورة غير موجودة");
    inv.status = status;
    inv.updatedAt = new Date().toISOString();
    save(data);
    return inv;
  }

  function deleteInvoice(id) {
    const data = load();
    data.invoices = data.invoices.filter((i) => i.id !== id);
    save(data);
  }

  function getCatalog() {
    const saved = load().catalog || [];
    const byId = new Map(saved.map((item) => [item.id, item]));
    defaultCatalog.forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }

  function parseHiveNumbers(raw) {
    return String(raw || "")
      .split(/[\n,،\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
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

  function listSupervisions() {
    return (load().supervisions || []).sort((a, b) =>
      (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")
    );
  }

  function getSupervision(id) {
    return (load().supervisions || []).find((s) => s.id === id) || null;
  }

  function upsertSupervision(input) {
    const data = load();
    if (!Array.isArray(data.supervisions)) data.supervisions = [];
    const now = new Date().toISOString();
    const customer = data.customers.find((c) => c.id === input.customerId);
    if (!customer) throw new Error("اختر عميلًا من السجل");

    const hiveNumbers = Array.isArray(input.hiveNumbers)
      ? input.hiveNumbers.map(String).map((s) => s.trim()).filter(Boolean)
      : parseHiveNumbers(input.hiveNumbers);
    const hiveCount = Math.max(
      Number(input.hiveCount) || 0,
      hiveNumbers.length
    );
    if (hiveCount < 1) throw new Error("أدخل عدد الخلايا أو أرقامها");

    const base = {
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      customerArea: customer.area || "",
      hiveCount,
      hiveNumbers,
      beekeeper: String(input.beekeeper || "").trim(),
      location: String(input.location || "").trim(),
      installDate: String(input.installDate || "").trim(),
      nextVisitDate: String(input.nextVisitDate || "").trim(),
      lastVisitDate: String(input.lastVisitDate || "").trim(),
      extractionAppointment: String(input.extractionAppointment || "").trim(),
      extractionDate: String(input.extractionDate || "").trim(),
      status: input.status || "active",
      monthlyFee: supervisionFee(hiveCount),
      notes: String(input.notes || "").trim(),
      updatedAt: now,
    };

    if (input.id) {
      const idx = data.supervisions.findIndex((s) => s.id === input.id);
      if (idx === -1) throw new Error("سجل الإشراف غير موجود");
      data.supervisions[idx] = {
        ...data.supervisions[idx],
        ...base,
        visits: Array.isArray(data.supervisions[idx].visits) ? data.supervisions[idx].visits : [],
      };
      save(data);
      return data.supervisions[idx];
    }

    const record = {
      id: uid("sup"),
      ...base,
      visits: [],
      createdAt: now,
    };
    data.supervisions.unshift(record);
    save(data);
    return record;
  }

  function addSupervisionVisit(id, visit) {
    const data = load();
    const rec = (data.supervisions || []).find((s) => s.id === id);
    if (!rec) throw new Error("سجل الإشراف غير موجود");
    if (!Array.isArray(rec.visits)) rec.visits = [];
    const entry = {
      id: uid("vis"),
      date: String(visit.date || "").trim() || nowDate(),
      beekeeper: String(visit.beekeeper || rec.beekeeper || "").trim(),
      notes: String(visit.notes || "").trim(),
      createdAt: new Date().toISOString(),
    };
    rec.visits.unshift(entry);
    rec.lastVisitDate = entry.date;
    if (visit.nextVisitDate) rec.nextVisitDate = String(visit.nextVisitDate).trim();
    rec.updatedAt = new Date().toISOString();
    save(data);
    return rec;
  }

  function nowDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function deleteSupervision(id) {
    const data = load();
    data.supervisions = (data.supervisions || []).filter((s) => s.id !== id);
    save(data);
  }

  function exportBackup() {
    return JSON.stringify(load(), null, 2);
  }

  function importBackup(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.invoices)) {
      throw new Error("ملف النسخة الاحتياطية غير صالح");
    }
    save({
      ...empty(),
      ...parsed,
      supervisions: Array.isArray(parsed.supervisions) ? parsed.supervisions : [],
      catalog: Array.isArray(parsed.catalog) && parsed.catalog.length ? parsed.catalog : defaultCatalog,
    });
  }

  return {
    listCustomers,
    getCustomer,
    upsertCustomer,
    deleteCustomer,
    listInvoices,
    getInvoice,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    listSupervisions,
    getSupervision,
    upsertSupervision,
    addSupervisionVisit,
    deleteSupervision,
    supervisionFee,
    getCatalog,
    exportBackup,
    importBackup,
  };
})();
