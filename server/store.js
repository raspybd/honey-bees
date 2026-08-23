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
    purchases: [],
    expenses: [],
    cashEntries: [],
    orders: [],
    purchaseSeq: 5000,
    orderSeq: 7000,
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
      purchases: Array.isArray(data.purchases) ? data.purchases : [],
      expenses: Array.isArray(data.expenses) ? data.expenses : [],
      cashEntries: Array.isArray(data.cashEntries) ? data.cashEntries : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
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
    let cogs = 0;
    for (const { product, need, item } of needs) {
      const before = roundQty(product.qty);
      const after = roundQty(before - need);
      const unitCost = roundQty(product.costPrice);
      product.qty = after;
      product.updatedAt = now;
      item.costPrice = unitCost;
      item.costTotal = roundQty(need * unitCost);
      cogs = roundQty(cogs + item.costTotal);
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
    // snapshot cost also for non-tracked linked products / custom lines without stock
    for (const item of inv.items || []) {
      if (item.costTotal != null) continue;
      if (item.productId) {
        const product = data.products.find((p) => p.id === item.productId);
        if (product) {
          item.costPrice = roundQty(product.costPrice);
          item.costTotal = roundQty((Number(item.qty) || 0) * item.costPrice);
          cogs = roundQty(cogs + item.costTotal);
        }
      }
    }
    inv.cogs = cogs;
    inv.stockDeducted = true;
    inv.stockDeductedAt = now;

    if (!Array.isArray(data.cashEntries)) data.cashEntries = [];
    const alreadyCash = data.cashEntries.some((c) => c.refType === "invoice" && c.refId === inv.id);
    if (!alreadyCash && roundQty(inv.total) > 0) {
      data.cashEntries.unshift({
        id: uid("cash"),
        date: inv.date || now.slice(0, 10),
        type: "in",
        amount: roundQty(inv.total),
        category: "مبيعات",
        note: `فاتورة ${inv.number} — ${inv.customerName || ""}`,
        refType: "invoice",
        refId: inv.id,
        createdAt: now,
      });
    }
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

function nextPurchaseNumber(data) {
  data.purchaseSeq = (data.purchaseSeq || 5000) + 1;
  const y = new Date().getFullYear();
  return `PUR-${y}-${String(data.purchaseSeq).padStart(4, "0")}`;
}

function pushCash(data, entry) {
  if (!Array.isArray(data.cashEntries)) data.cashEntries = [];
  data.cashEntries.unshift(entry);
}

function listPurchases() {
  return (load().purchases || []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function getPurchase(id) {
  return (load().purchases || []).find((p) => p.id === id) || null;
}

function createPurchase(input) {
  const data = load();
  if (!Array.isArray(data.purchases)) data.purchases = [];
  if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
  const now = new Date().toISOString();
  const rawItems = Array.isArray(input.items) ? input.items : [];
  const items = [];
  for (const row of rawItems) {
    const productId = String(row.productId || "").trim();
    const product = data.products.find((p) => p.id === productId);
    if (!product) throw new Error("اختر صنفًا صحيحًا لكل بند");
    const qty = roundQty(row.qty);
    const cost = roundQty(row.cost);
    if (qty <= 0) throw new Error("كمية الشراء يجب أن تكون أكبر من صفر");
    items.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      qty,
      cost,
      total: roundQty(qty * cost),
    });
  }
  if (!items.length) throw new Error("أضف بند شراء واحدًا على الأقل");

  const purchaseId = uid("pur");
  const purchaseNumber = nextPurchaseNumber(data);

  for (const item of items) {
    const product = data.products.find((p) => p.id === item.productId);
    const before = roundQty(product.qty);
    const after = roundQty(before + item.qty);
    if (product.trackStock) {
      if (before > 0) {
        product.costPrice = roundQty((before * roundQty(product.costPrice) + item.qty * item.cost) / after);
      } else {
        product.costPrice = item.cost;
      }
      product.qty = after;
    } else {
      product.costPrice = item.cost;
    }
    product.updatedAt = now;
    data.stockMovements.unshift({
      id: uid("stk"),
      productId: product.id,
      productName: product.name,
      type: "purchase",
      qty: item.qty,
      qtyBefore: before,
      qtyAfter: product.trackStock ? after : before,
      refType: "purchase",
      refId: purchaseId,
      refLabel: purchaseNumber,
      note: `شراء @ ${item.cost} د.ك`,
      createdAt: now,
    });
  }

  const purchase = {
    id: purchaseId,
    number: purchaseNumber,
    supplierName: String(input.supplierName || "").trim() || "مورد",
    date: String(input.date || now.slice(0, 10)),
    items,
    total: roundQty(items.reduce((s, i) => s + i.total, 0)),
    paid: input.paid !== false && input.paid !== "false",
    notes: String(input.notes || "").trim(),
    createdAt: now,
  };

  data.purchases.unshift(purchase);

  if (purchase.paid && purchase.total > 0) {
    pushCash(data, {
      id: uid("cash"),
      date: purchase.date,
      type: "out",
      amount: purchase.total,
      category: "مشتريات",
      note: `${purchase.number} — ${purchase.supplierName}`,
      refType: "purchase",
      refId: purchase.id,
      createdAt: now,
    });
  }

  save(data);
  return purchase;
}

function deletePurchase(id) {
  const data = load();
  const purchase = (data.purchases || []).find((p) => p.id === id);
  if (!purchase) throw new Error("فاتورة الشراء غير موجودة");

  // reverse stock
  for (const item of purchase.items || []) {
    const product = data.products.find((p) => p.id === item.productId);
    if (!product || !product.trackStock) continue;
    const before = roundQty(product.qty);
    const after = roundQty(before - roundQty(item.qty));
    if (after < 0) {
      throw new Error(`لا يمكن حذف الشراء: كمية «${product.name}» أصبحت غير كافية بعد البيع`);
    }
    product.qty = after;
    product.updatedAt = new Date().toISOString();
  }

  data.purchases = data.purchases.filter((p) => p.id !== id);
  data.stockMovements = (data.stockMovements || []).filter((m) => !(m.refType === "purchase" && m.refId === id));
  data.cashEntries = (data.cashEntries || []).filter((c) => !(c.refType === "purchase" && c.refId === id));
  save(data);
}

function listExpenses() {
  return (load().expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function createExpense(input) {
  const data = load();
  if (!Array.isArray(data.expenses)) data.expenses = [];
  const amount = roundQty(input.amount);
  if (amount <= 0) throw new Error("أدخل مبلغ المصروف");
  const now = new Date().toISOString();
  const expense = {
    id: uid("exp"),
    date: String(input.date || now.slice(0, 10)),
    category: String(input.category || "عام").trim() || "عام",
    amount,
    note: String(input.note || "").trim(),
    createdAt: now,
  };
  data.expenses.unshift(expense);
  pushCash(data, {
    id: uid("cash"),
    date: expense.date,
    type: "out",
    amount: expense.amount,
    category: expense.category,
    note: expense.note || "مصروف",
    refType: "expense",
    refId: expense.id,
    createdAt: now,
  });
  save(data);
  return expense;
}

function deleteExpense(id) {
  const data = load();
  data.expenses = (data.expenses || []).filter((e) => e.id !== id);
  data.cashEntries = (data.cashEntries || []).filter((c) => !(c.refType === "expense" && c.refId === id));
  save(data);
}

function listCashEntries() {
  return (load().cashEntries || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function createCashEntry(input) {
  const data = load();
  const type = String(input.type || "").trim();
  if (type !== "in" && type !== "out") throw new Error("نوع الحركة: قبض أو صرف");
  const amount = roundQty(input.amount);
  if (amount <= 0) throw new Error("أدخل مبلغًا صحيحًا");
  const now = new Date().toISOString();
  const entry = {
    id: uid("cash"),
    date: String(input.date || now.slice(0, 10)),
    type,
    amount,
    category: String(input.category || (type === "in" ? "قبض" : "صرف")).trim(),
    note: String(input.note || "").trim(),
    refType: "manual",
    refId: "",
    createdAt: now,
  };
  pushCash(data, entry);
  save(data);
  return entry;
}

function deleteCashEntry(id) {
  const data = load();
  const entry = (data.cashEntries || []).find((c) => c.id === id);
  if (!entry) throw new Error("الحركة غير موجودة");
  if (entry.refType && entry.refType !== "manual") {
    throw new Error("احذف السجل الأصلي (فاتورة / شراء / مصروف) بدل حذف حركة الصندوق المرتبطة");
  }
  data.cashEntries = data.cashEntries.filter((c) => c.id !== id);
  save(data);
}

function cashBalance() {
  return roundQty(
    (load().cashEntries || []).reduce((s, e) => s + (e.type === "in" ? Number(e.amount) || 0 : -(Number(e.amount) || 0)), 0)
  );
}

function getReports() {
  const data = load();
  const paid = (data.invoices || []).filter((i) => i.status === "paid");
  const confirmedOrders = (data.orders || []).filter((o) => o.status === "confirmed");
  const salesInvoices = roundQty(paid.reduce((s, i) => s + (Number(i.total) || 0), 0));
  const salesOrders = roundQty(confirmedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0));
  const salesTotal = roundQty(salesInvoices + salesOrders);
  const cogsInvoices = roundQty(
    paid.reduce((s, i) => {
      if (i.cogs != null) return s + (Number(i.cogs) || 0);
      return (
        s +
        (i.items || []).reduce((ss, it) => ss + (Number(it.costTotal) || (Number(it.qty) || 0) * (Number(it.costPrice) || 0)), 0)
      );
    }, 0)
  );
  const cogsOrders = roundQty(confirmedOrders.reduce((s, o) => s + (Number(o.cogs) || 0), 0));
  const cogsTotal = roundQty(cogsInvoices + cogsOrders);
  const purchasesTotal = roundQty((data.purchases || []).reduce((s, p) => s + (Number(p.total) || 0), 0));
  const expensesTotal = roundQty((data.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0));
  const cashIn = roundQty((data.cashEntries || []).filter((c) => c.type === "in").reduce((s, c) => s + (Number(c.amount) || 0), 0));
  const cashOut = roundQty((data.cashEntries || []).filter((c) => c.type === "out").reduce((s, c) => s + (Number(c.amount) || 0), 0));
  const stockValue = roundQty(
    (data.products || [])
      .filter((p) => p.trackStock)
      .reduce((s, p) => s + roundQty(p.qty) * roundQty(p.costPrice), 0)
  );
  const lowStock = (data.products || []).filter((p) => p.trackStock && roundQty(p.qty) <= roundQty(p.minQty));
  const grossProfit = roundQty(salesTotal - cogsTotal);
  const netProfit = roundQty(grossProfit - expensesTotal);

  return {
    salesTotal,
    salesInvoices,
    salesOrders,
    cogsTotal,
    purchasesTotal,
    expensesTotal,
    grossProfit,
    netProfit,
    cashIn,
    cashOut,
    cashBalance: roundQty(cashIn - cashOut),
    stockValue,
    paidInvoicesCount: paid.length,
    openInvoicesCount: (data.invoices || []).filter((i) => i.status === "issued").length,
    newOrdersCount: (data.orders || []).filter((o) => o.status === "new").length,
    productsCount: (data.products || []).length,
    lowStockCount: lowStock.length,
    lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, qty: p.qty, unit: p.unit, minQty: p.minQty })),
  };
}

const PRODUCT_IMAGES = {
  "hive-boxes": "assets/products/hive-boxes.jpg",
  "bee-package": "assets/products/bee-package.jpg",
  queen: "assets/products/queen.jpg",
  honey: "assets/products/honey.jpg",
  beeswax: "assets/products/beeswax.jpg",
  propolis: "assets/products/propolis.jpg",
  frames: "assets/products/frames.jpg",
  suit: "assets/products/beekeeper-suit.jpg",
  smoker: "assets/products/smoker.jpg",
};

function getStoreCatalog() {
  return listProducts()
    .filter((p) => p.published)
    .map((p) => {
      const available = p.trackStock ? roundQty(p.qty) : null;
      return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: roundQty(p.sellPrice),
        trackStock: Boolean(p.trackStock),
        available,
        inStock: true,
        image: PRODUCT_IMAGES[p.id] || "assets/logo.svg",
      };
    });
}

function nextOrderNumber(data) {
  data.orderSeq = (data.orderSeq || 7000) + 1;
  const y = new Date().getFullYear();
  return `ORD-${y}-${String(data.orderSeq).padStart(4, "0")}`;
}

function listOrders() {
  return (load().orders || []).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function getOrder(id) {
  return (load().orders || []).find((o) => o.id === id) || null;
}

function createStoreOrder(input) {
  const data = load();
  if (!Array.isArray(data.orders)) data.orders = [];
  const name = String(input.customerName || "").trim();
  const phone = String(input.phone || "").trim();
  if (!name) throw new Error("الاسم مطلوب");
  if (!phone) throw new Error("رقم الجوال مطلوب");

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (!rawItems.length) throw new Error("السلة فارغة");

  const items = [];
  for (const row of rawItems) {
    const product = data.products.find((p) => p.id === row.productId);
    if (!product || !product.published) throw new Error("أحد الأصناف غير متاح في المتجر");
    const qty = roundQty(row.qty);
    if (qty <= 0) throw new Error("كمية غير صالحة");
    const price = roundQty(product.sellPrice);
    items.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      qty,
      price,
      total: roundQty(qty * price),
    });
  }

  const now = new Date().toISOString();
  const order = {
    id: uid("ord"),
    number: nextOrderNumber(data),
    status: "new",
    customerName: name,
    phone,
    area: String(input.area || "").trim(),
    notes: String(input.notes || "").trim(),
    items,
    total: roundQty(items.reduce((s, i) => s + i.total, 0)),
    stockDeducted: false,
    createdAt: now,
  };
  data.orders.unshift(order);
  save(data);
  return order;
}

function confirmStoreOrder(id) {
  const data = load();
  const order = (data.orders || []).find((o) => o.id === id);
  if (!order) throw new Error("الطلب غير موجود");
  if (order.status === "cancelled") throw new Error("الطلب ملغى");
  if (order.stockDeducted) {
    order.status = "confirmed";
    order.updatedAt = new Date().toISOString();
    save(data);
    return order;
  }

  const needs = [];
  for (const item of order.items || []) {
    const product = data.products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`الصنف غير موجود: ${item.name}`);
    if (!product.trackStock) {
      item.costPrice = roundQty(product.costPrice);
      item.costTotal = roundQty(item.qty * item.costPrice);
      continue;
    }
    const need = roundQty(item.qty);
    if (roundQty(product.qty) < need) {
      throw new Error(
        `المخزون غير كافٍ للصنف «${product.name}» (المتاح: ${roundQty(product.qty)}، المطلوب: ${need})`
      );
    }
    needs.push({ product, need, item });
  }

  const now = new Date().toISOString();
  if (!Array.isArray(data.stockMovements)) data.stockMovements = [];
  let cogs = 0;
  for (const { product, need, item } of needs) {
    const before = roundQty(product.qty);
    const after = roundQty(before - need);
    const unitCost = roundQty(product.costPrice);
    product.qty = after;
    product.updatedAt = now;
    item.costPrice = unitCost;
    item.costTotal = roundQty(need * unitCost);
    cogs = roundQty(cogs + item.costTotal);
    data.stockMovements.unshift({
      id: uid("stk"),
      productId: product.id,
      productName: product.name,
      type: "sale",
      qty: -need,
      qtyBefore: before,
      qtyAfter: after,
      refType: "order",
      refId: order.id,
      refLabel: order.number,
      note: item.name || "",
      createdAt: now,
    });
  }
  order.cogs = roundQty((order.items || []).reduce((s, it) => s + (Number(it.costTotal) || 0), 0));
  order.stockDeducted = true;
  order.status = "confirmed";
  order.confirmedAt = now;
  order.updatedAt = now;

  if (!Array.isArray(data.cashEntries)) data.cashEntries = [];
  const alreadyCash = data.cashEntries.some((c) => c.refType === "order" && c.refId === order.id);
  if (!alreadyCash && roundQty(order.total) > 0) {
    data.cashEntries.unshift({
      id: uid("cash"),
      date: now.slice(0, 10),
      type: "in",
      amount: roundQty(order.total),
      category: "مبيعات متجر",
      note: `طلب ${order.number} — ${order.customerName}`,
      refType: "order",
      refId: order.id,
      createdAt: now,
    });
  }

  // upsert customer by phone if possible
  const phoneDigits = String(order.phone || "").replace(/\D/g, "");
  let customer = data.customers.find((c) => String(c.phone || "").replace(/\D/g, "") === phoneDigits);
  if (!customer) {
    customer = {
      id: uid("cus"),
      name: order.customerName,
      phone: order.phone,
      area: order.area || "",
      notes: `من طلب متجر ${order.number}`,
      createdAt: now,
      updatedAt: now,
    };
    data.customers.unshift(customer);
  }
  order.customerId = customer.id;

  save(data);
  return order;
}

function cancelStoreOrder(id) {
  const data = load();
  const order = (data.orders || []).find((o) => o.id === id);
  if (!order) throw new Error("الطلب غير موجود");
  if (order.stockDeducted) throw new Error("لا يمكن إلغاء طلب خُصم مخزونه — راجع المخزون يدويًا إن لزم");
  order.status = "cancelled";
  order.updatedAt = new Date().toISOString();
  save(data);
  return order;
}

function deleteStoreOrder(id) {
  const data = load();
  const order = (data.orders || []).find((o) => o.id === id);
  if (!order) throw new Error("الطلب غير موجود");
  if (order.stockDeducted) throw new Error("لا يمكن حذف طلب مؤكد ومخصوم من المخزون");
  data.orders = data.orders.filter((o) => o.id !== id);
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
    purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
    expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
    cashEntries: Array.isArray(parsed.cashEntries) ? parsed.cashEntries : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
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
  listPurchases,
  getPurchase,
  createPurchase,
  deletePurchase,
  listExpenses,
  createExpense,
  deleteExpense,
  listCashEntries,
  createCashEntry,
  deleteCashEntry,
  cashBalance,
  getReports,
  getStoreCatalog,
  listOrders,
  getOrder,
  createStoreOrder,
  confirmStoreOrder,
  cancelStoreOrder,
  deleteStoreOrder,
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
