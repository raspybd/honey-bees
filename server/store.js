const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

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

const SERVICE_PREFIXES = ["svc-"];

function isServiceCatalogId(id) {
  return SERVICE_PREFIXES.some((p) => String(id || "").startsWith(p));
}

function seedProductsFromCatalog() {
  return defaultCatalog.map((item) => ({
    id: item.id,
    name: item.name,
    unit: guessUnit(item.id, item.name),
    sellPrice: Number(item.price) || 0,
    costPrice: 0,
    qty: 0,
    minQty: isServiceCatalogId(item.id) ? 0 : 2,
    trackStock: !isServiceCatalogId(item.id),
    published: !isServiceCatalogId(item.id),
    notes: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function guessUnit(id, name) {
  const s = `${id} ${name}`;
  if (/عسل|شمع|عكبر|honey|wax|propolis/i.test(s)) return "كيلو";
  if (/طرد|bee-package/i.test(s)) return "طرد";
  if (/ملكة|queen/i.test(s)) return "ملكة";
  if (/خلية|إشراف|فرز|باقة|svc-|pkg-/i.test(s)) return "خدمة";
  return "قطعة";
}

function roundQty(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function empty() {
  return {
    customers: [],
    invoices: [],
    supervisions: [],
    products: seedProductsFromCatalog(),
    stockMovements: [],
    seq: 1000,
    catalog: defaultCatalog,
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(empty(), null, 2), "utf8");
  }
}

function load() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const data = JSON.parse(raw);
    const needsProductSeed = !Array.isArray(data.products) || !data.products.length;
    const products = needsProductSeed ? seedProductsFromCatalog() : data.products;
    const merged = {
      ...empty(),
      ...data,
      customers: Array.isArray(data.customers) ? data.customers : [],
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      supervisions: Array.isArray(data.supervisions) ? data.supervisions : [],
      products,
      stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : [],
      catalog: Array.isArray(data.catalog) && data.catalog.length ? data.catalog : defaultCatalog,
    };
    if (needsProductSeed) save(merged);
    return merged;
  } catch {
    const fresh = empty();
    save(fresh);
    return fresh;
  }
}

function save(data) {
  ensureDb();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function supervisionFee(hiveCount) {
  const n = Math.max(0, Math.floor(Number(hiveCount) || 0));
  if (n < 1) return 0;
  if (n <= 5) return 15;
  if (n <= 10) return 20;
  if (n <= 15) return 25;
  if (n <= 20) return 30;
  return 30 + (n - 20);
}

function parseHiveNumbers(raw) {
  return String(raw || "")
    .split(/[\n,،\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function listCustomers() {
  return load().customers.sort((a, b) =>
    (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")
  );
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

function calcItems(items) {
  return (items || []).map((item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const productId = String(item.productId || "").trim();
    return {
      productId: productId || undefined,
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

function nextInvoiceNumber(data) {
  data.seq = (data.seq || 1000) + 1;
  const y = new Date().getFullYear();
  return `ARB-${y}-${String(data.seq).padStart(4, "0")}`;
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
    stockDeducted: false,
    createdAt: now,
  };
  data.invoices.unshift(invoice);
  save(data);
  return invoice;
}

function updateInvoiceStatus(id, status) {
  if (status === "paid") return confirmInvoiceSale(id);
  const data = load();
  const inv = data.invoices.find((i) => i.id === id);
  if (!inv) throw new Error("الفاتورة غير موجودة");
  inv.status = status;
  inv.updatedAt = new Date().toISOString();
  save(data);
  return inv;
}

function confirmInvoiceSale(id) {
  const data = load();
  const inv = data.invoices.find((i) => i.id === id);
  if (!inv) throw new Error("الفاتورة غير موجودة");
  if (inv.status === "cancelled") throw new Error("لا يمكن تأكيد فاتورة ملغاة");

  if (!inv.stockDeducted) {
    const needs = [];
    for (const item of inv.items || []) {
      if (!item.productId) continue;
      const product = data.products.find((p) => p.id === item.productId);
      if (!product || !product.trackStock) continue;
      const need = roundQty(item.qty);
      if (need <= 0) continue;
      needs.push({ product, need, item });
    }
    for (const { product, need } of needs) {
      if (roundQty(product.qty) < need) {
        throw new Error(
          `المخزون غير كافٍ للصنف «${product.name}» (المتاح: ${roundQty(product.qty)} ${product.unit}، المطلوب: ${need})`
        );
      }
    }
    const now = new Date().toISOString();
    if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
    for (const { product, need, item } of needs) {
      const before = roundQty(product.qty);
      const after = roundQty(before - need);
      product.qty = after;
      product.updatedAt = now;
      data.stockMovements.unshift({
        id: uid("stk"),
        productId: product.id,
        productName: product.name,
        type: "sale",
        qty: -need,
        qtyBefore: before,
        qtyAfter: after,
        refType: "invoice",
        refId: inv.id,
        refLabel: inv.number,
        note: item.name || "",
        createdAt: now,
      });
    }
    inv.stockDeducted = true;
    inv.stockDeductedAt = now;
  }

  inv.status = "paid";
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
  return listProducts().map((p) => ({
    id: p.id,
    name: p.name,
    price: p.sellPrice,
    unit: p.unit,
    qty: p.qty,
    trackStock: p.trackStock,
    published: p.published,
  }));
}

function listProducts() {
  return load().products.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
}

function getProduct(id) {
  return load().products.find((p) => p.id === id) || null;
}

function upsertProduct(input) {
  const data = load();
  if (!Array.isArray(data.products)) data.products = [];
  const now = new Date().toISOString();
  const name = String(input.name || "").trim();
  if (!name) throw new Error("اسم الصنف مطلوب");

  const fields = {
    name,
    unit: String(input.unit || "قطعة").trim() || "قطعة",
    sellPrice: roundQty(input.sellPrice),
    costPrice: roundQty(input.costPrice),
    minQty: roundQty(input.minQty),
    trackStock: input.trackStock !== false && input.trackStock !== "false",
    published: Boolean(input.published === true || input.published === "true" || input.published === "on"),
    notes: String(input.notes || "").trim(),
    updatedAt: now,
  };

  if (input.id) {
    const idx = data.products.findIndex((p) => p.id === input.id);
    if (idx === -1) throw new Error("الصنف غير موجود");
    data.products[idx] = {
      ...data.products[idx],
      ...fields,
      qty: roundQty(data.products[idx].qty),
    };
    save(data);
    return data.products[idx];
  }

  const product = {
    id: uid("prd"),
    ...fields,
    qty: roundQty(input.qty),
    createdAt: now,
  };
  data.products.unshift(product);
  if (product.trackStock && product.qty > 0) {
    if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
    data.stockMovements.unshift({
      id: uid("stk"),
      productId: product.id,
      productName: product.name,
      type: "adjust",
      qty: product.qty,
      qtyBefore: 0,
      qtyAfter: product.qty,
      refType: "opening",
      refId: "",
      refLabel: "رصيد افتتاحي",
      note: "كمية افتتاحية",
      createdAt: now,
    });
  }
  save(data);
  return product;
}

function deleteProduct(id) {
  const data = load();
  const used = data.invoices.some((inv) => (inv.items || []).some((i) => i.productId === id));
  if (used) throw new Error("لا يمكن حذف صنف مرتبط بفواتير — أوقف تتبعه أو عدّل الفواتير");
  data.products = data.products.filter((p) => p.id !== id);
  save(data);
}

function listStockMovements(limit = 100) {
  return (load().stockMovements || []).slice(0, Math.max(1, Number(limit) || 100));
}

function applyStockMovement(input) {
  const data = load();
  const product = data.products.find((p) => p.id === input.productId);
  if (!product) throw new Error("الصنف غير موجود");
  if (!product.trackStock) throw new Error("هذا الصنف لا يتتبع مخزونًا");

  const type = String(input.type || "").trim();
  const now = new Date().toISOString();
  const before = roundQty(product.qty);
  let delta = 0;
  let after = before;

  if (type === "purchase" || type === "in") {
    delta = roundQty(input.qty);
    if (delta <= 0) throw new Error("أدخل كمية موجبة للدخول");
    after = roundQty(before + delta);
  } else if (type === "damage" || type === "out" || type === "sale") {
    delta = -Math.abs(roundQty(input.qty));
    if (delta === 0) throw new Error("أدخل كمية للخروج");
    after = roundQty(before + delta);
    if (after < 0) throw new Error(`الكمية غير كافية (المتاح: ${before})`);
  } else if (type === "adjust") {
    after = roundQty(input.qty);
    delta = roundQty(after - before);
  } else {
    throw new Error("نوع الحركة غير صالح");
  }

  product.qty = after;
  product.updatedAt = now;
  if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
  const movement = {
    id: uid("stk"),
    productId: product.id,
    productName: product.name,
    type: type === "in" ? "purchase" : type === "out" ? "damage" : type,
    qty: delta,
    qtyBefore: before,
    qtyAfter: after,
    refType: "manual",
    refId: "",
    refLabel: "",
    note: String(input.note || "").trim(),
    createdAt: now,
  };
  data.stockMovements.unshift(movement);
  save(data);
  return { product, movement };
}

function lowStockProducts() {
  return listProducts().filter((p) => p.trackStock && roundQty(p.qty) <= roundQty(p.minQty));
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
  const hiveCount = Math.max(Number(input.hiveCount) || 0, hiveNumbers.length);
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
    date: String(visit.date || "").trim() || new Date().toISOString().slice(0, 10),
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

function deleteSupervision(id) {
  const data = load();
  data.supervisions = (data.supervisions || []).filter((s) => s.id !== id);
  save(data);
}

function exportBackup() {
  return load();
}

function importBackup(parsed) {
  if (!parsed || !Array.isArray(parsed.customers) || !Array.isArray(parsed.invoices)) {
    throw new Error("ملف النسخة الاحتياطية غير صالح");
  }
  save({
    ...empty(),
    ...parsed,
    supervisions: Array.isArray(parsed.supervisions) ? parsed.supervisions : [],
    products:
      Array.isArray(parsed.products) && parsed.products.length
        ? parsed.products
        : seedProductsFromCatalog(),
    stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
    catalog: Array.isArray(parsed.catalog) && parsed.catalog.length ? parsed.catalog : defaultCatalog,
  });
  return load();
}

module.exports = {
  listCustomers,
  getCustomer,
  upsertCustomer,
  deleteCustomer,
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  confirmInvoiceSale,
  deleteInvoice,
  listProducts,
  getProduct,
  upsertProduct,
  deleteProduct,
  listStockMovements,
  applyStockMovement,
  lowStockProducts,
  listSupervisions,
  getSupervision,
  upsertSupervision,
  addSupervisionVisit,
  deleteSupervision,
  supervisionFee,
  getCatalog,
  exportBackup,
  importBackup,
  defaultCatalog,
};
