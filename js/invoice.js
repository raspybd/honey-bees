(async () => {
  const money = (n) => Number(n || 0).toLocaleString("ar-KW", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const statusLabel = { issued: "صادرة", paid: "مدفوعة", cancelled: "ملغاة" };
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const root = document.getElementById("invoice");

  if (!AlRabaaStore.isLoggedIn()) {
    root.innerHTML = `<p class="error">سجّل الدخول من <a href="admin.html">لوحة الإدارة</a> ثم افتح الفاتورة.</p>`;
    return;
  }

  let inv = null;
  try {
    inv = id ? await AlRabaaStore.getInvoice(id) : null;
  } catch (err) {
    root.innerHTML = `<p class="error">${esc(err.message || "تعذر تحميل الفاتورة")}</p>`;
    return;
  }

  if (!inv) {
    root.innerHTML = `<p class="error">الفاتورة غير موجودة. افتحها من صفحة الإدارة بعد إنشائها.</p>`;
    return;
  }

  document.title = `${inv.number} | فاتورة الرباعية`;

  root.innerHTML = `
    <header class="inv-head">
      <div class="brand">
        <img src="assets/logo.svg" alt="" width="72" height="72" />
        <div>
          <h1>الرباعية للنحل والعسل</h1>
          <p class="en">AL RABAA APIARIES</p>
          <p class="slogan">من الطبيعة .. لجودة تدوم</p>
        </div>
      </div>
      <div class="meta">
        <h2>فاتورة إلكترونية</h2>
        <p><strong>الرقم:</strong> ${esc(inv.number)}</p>
        <p><strong>التاريخ:</strong> ${esc(inv.date)}</p>
        <p><strong>الحالة:</strong> ${esc(statusLabel[inv.status] || inv.status)}</p>
      </div>
    </header>

    <section class="parties">
      <div>
        <h3>البائع</h3>
        <p>الرباعية للنحل والعسل</p>
        <p dir="ltr">+965 99787742</p>
        <p>توصيل داخل الكويت ودول الخليج</p>
      </div>
      <div>
        <h3>العميل</h3>
        <p>${esc(inv.customerName)}</p>
        <p dir="ltr">${esc(inv.customerPhone || "—")}</p>
        <p>${esc(inv.customerArea || "—")}</p>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>البند</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${inv.items
          .map(
            (item, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(item.name)}</td>
            <td>${esc(item.qty)}</td>
            <td>${money(item.price)} د.ك</td>
            <td>${money(item.total)} د.ك</td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <div class="totals">
      <p>الإجمالي المستحق: <strong>${money(inv.total)} د.ك</strong></p>
    </div>

    ${inv.notes ? `<p class="notes"><strong>ملاحظات:</strong> ${esc(inv.notes)}</p>` : ""}
    <p class="trust">طلبك يصل بتغليف آمن</p>
    <footer class="inv-foot">
      <p>هذه فاتورة إلكترونية صادرة من نظام الرباعية.</p>
    </footer>
  `;

  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-wa").addEventListener("click", () => {
    const phone = normalizePhone(inv.customerPhone) || "96599787742";
    const lines = inv.items.map((i) => `• ${i.name} × ${i.qty} = ${money(i.total)} د.ك`).join("\n");
    const text = `فاتورة إلكترونية من الرباعية للنحل والعسل\nرقم الفاتورة: ${inv.number}\nالتاريخ: ${inv.date}\nالعميل: ${inv.customerName}\n\n${lines}\n\nالإجمالي: ${money(inv.total)} د.ك\nطلبك يصل بتغليف آمن · توصيل داخل الكويت ودول الخليج`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank");
  });

  function normalizePhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("965")) return digits;
    if (digits.length === 8) return `965${digits}`;
    return digits;
  }

  function esc(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
