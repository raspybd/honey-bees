require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const store = require("./store");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const SITE_URL = process.env.SITE_URL || "https://the4beez.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alrabaa2026";
const tokens = new Map();

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "5mb" }));

if (!process.env.ADMIN_PASSWORD) {
  console.warn("[security] ADMIN_PASSWORD is using the default. Set it in Hostinger environment variables.");
}

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ error: "غير مصرح — سجّل الدخول أولًا" });
  }
  // refresh activity timestamp
  tokens.set(token, Date.now());
  next();
}

function handle(res, fn) {
  try {
    const result = fn();
    res.json(result === undefined ? { ok: true } : result);
  } catch (err) {
    res.status(400).json({ error: err.message || "طلب غير صالح" });
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "alrabaa-node",
    site: SITE_URL,
    time: new Date().toISOString(),
  });
});

app.post("/api/login", (req, res) => {
  const password = String(req.body?.password || "");
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
  }
  const token = createToken();
  tokens.set(token, Date.now());
  res.json({ token, ok: true });
});

app.post("/api/logout", requireAuth, (req, res) => {
  const token = (req.headers.authorization || "").slice(7);
  tokens.delete(token);
  res.json({ ok: true });
});

app.get("/api/catalog", requireAuth, (_req, res) => handle(res, () => store.getCatalog()));

app.get("/api/products", requireAuth, (_req, res) => handle(res, () => store.listProducts()));
app.get("/api/products/low-stock", requireAuth, (_req, res) => handle(res, () => store.lowStockProducts()));
app.get("/api/products/:id", requireAuth, (req, res) => {
  const item = store.getProduct(req.params.id);
  if (!item) return res.status(404).json({ error: "الصنف غير موجود" });
  res.json(item);
});
app.post("/api/products", requireAuth, (req, res) => handle(res, () => store.upsertProduct(req.body || {})));
app.put("/api/products/:id", requireAuth, (req, res) =>
  handle(res, () => store.upsertProduct({ ...(req.body || {}), id: req.params.id }))
);
app.delete("/api/products/:id", requireAuth, (req, res) =>
  handle(res, () => {
    store.deleteProduct(req.params.id);
    return { ok: true };
  })
);
app.post("/api/products/:id/stock", requireAuth, (req, res) =>
  handle(res, () => store.applyStockMovement({ ...(req.body || {}), productId: req.params.id }))
);

app.get("/api/stock-movements", requireAuth, (req, res) =>
  handle(res, () => store.listStockMovements(req.query.limit))
);

app.get("/api/customers", requireAuth, (_req, res) => handle(res, () => store.listCustomers()));
app.get("/api/customers/:id", requireAuth, (req, res) => {
  const item = store.getCustomer(req.params.id);
  if (!item) return res.status(404).json({ error: "العميل غير موجود" });
  res.json(item);
});
app.post("/api/customers", requireAuth, (req, res) => handle(res, () => store.upsertCustomer(req.body || {})));
app.put("/api/customers/:id", requireAuth, (req, res) =>
  handle(res, () => store.upsertCustomer({ ...(req.body || {}), id: req.params.id }))
);
app.delete("/api/customers/:id", requireAuth, (req, res) =>
  handle(res, () => {
    store.deleteCustomer(req.params.id);
    return { ok: true };
  })
);

app.get("/api/invoices", requireAuth, (_req, res) => handle(res, () => store.listInvoices()));
app.get("/api/invoices/:id", requireAuth, (req, res) => {
  const item = store.getInvoice(req.params.id);
  if (!item) return res.status(404).json({ error: "الفاتورة غير موجودة" });
  res.json(item);
});
app.post("/api/invoices", requireAuth, (req, res) => handle(res, () => store.createInvoice(req.body || {})));
app.patch("/api/invoices/:id/status", requireAuth, (req, res) =>
  handle(res, () => store.updateInvoiceStatus(req.params.id, req.body?.status))
);
app.post("/api/invoices/:id/confirm", requireAuth, (req, res) =>
  handle(res, () => store.confirmInvoiceSale(req.params.id))
);
app.delete("/api/invoices/:id", requireAuth, (req, res) =>
  handle(res, () => {
    store.deleteInvoice(req.params.id);
    return { ok: true };
  })
);

app.get("/api/supervisions", requireAuth, (_req, res) => handle(res, () => store.listSupervisions()));
app.get("/api/supervisions/:id", requireAuth, (req, res) => {
  const item = store.getSupervision(req.params.id);
  if (!item) return res.status(404).json({ error: "سجل الإشراف غير موجود" });
  res.json(item);
});
app.post("/api/supervisions", requireAuth, (req, res) =>
  handle(res, () => store.upsertSupervision(req.body || {}))
);
app.put("/api/supervisions/:id", requireAuth, (req, res) =>
  handle(res, () => store.upsertSupervision({ ...(req.body || {}), id: req.params.id }))
);
app.post("/api/supervisions/:id/visits", requireAuth, (req, res) =>
  handle(res, () => store.addSupervisionVisit(req.params.id, req.body || {}))
);
app.delete("/api/supervisions/:id", requireAuth, (req, res) =>
  handle(res, () => {
    store.deleteSupervision(req.params.id);
    return { ok: true };
  })
);

app.get("/api/backup", requireAuth, (_req, res) => handle(res, () => store.exportBackup()));
app.post("/api/backup/import", requireAuth, (req, res) =>
  handle(res, () => store.importBackup(req.body || {}))
);

app.get("/api/supervision-fee/:count", requireAuth, (req, res) => {
  res.json({ fee: store.supervisionFee(req.params.count) });
});

const root = path.join(__dirname, "..");
app.use(express.static(root, { extensions: ["html"] }));

app.listen(PORT, () => {
  console.log(`Al Rabaa Node server running on port ${PORT}`);
  console.log(`Site: ${SITE_URL}`);
});
