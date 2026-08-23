(async () => {
  const money = (n) =>
    Number(n || 0).toLocaleString("ar-KW", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const statusLabel = { active: "نشط", paused: "موقوف مؤقتًا", ended: "منتهي" };
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const root = document.getElementById("contract");

  if (!AlRabaaStore.isLoggedIn()) {
    root.innerHTML = `<p class="error">سجّل الدخول من <a href="admin.html">لوحة الإدارة</a> ثم افتح العقد.</p>`;
    return;
  }

  let rec = null;
  try {
    rec = id ? await AlRabaaStore.getSupervision(id) : null;
  } catch (err) {
    root.innerHTML = `<p class="error">${String(err.message || "تعذر تحميل العقد")}</p>`;
    return;
  }

  if (!rec) {
    root.innerHTML = `<p class="error">عقد الإشراف غير موجود. افتحه من متابعة الإشراف بعد حفظ السجل.</p>`;
    return;
  }

  document.title = `عقد إشراف ${rec.customerName} | الرباعية`;
  const today = new Date().toLocaleDateString("ar-KW");
  const contractNo = `SUP-${(rec.id || "").slice(-6).toUpperCase()}`;
  const hiveNumbers = (rec.hiveNumbers || []).join("، ") || "—";

  root.innerHTML = `
    <header class="contract-head">
      <div class="brand">
        <img src="assets/logo.svg" alt="" width="72" height="72" />
        <div>
          <h1>الرباعية للنحل والعسل</h1>
          <p class="en">AL RABAA APIARIES</p>
          <p class="slogan">من الطبيعة .. لجودة تدوم</p>
        </div>
      </div>
      <div class="meta">
        <h2>عقد إشراف</h2>
        <p><strong>رقم العقد:</strong> ${esc(contractNo)}</p>
        <p><strong>تاريخ الإصدار:</strong> ${esc(today)}</p>
        <p><strong>الحالة:</strong> ${esc(statusLabel[rec.status] || rec.status)}</p>
      </div>
    </header>

    <h2 class="doc-title">عقد إشراف على خلايا النحل</h2>

    <section class="parties">
      <div class="party">
        <h3>الطرف الأول (المشرف)</h3>
        <p>الرباعية للنحل والعسل — Al Rabaa Apiaries</p>
        <p dir="ltr">+965 99787742</p>
        <p>تقديم خدمة الإشراف الدوري على خلايا النحل</p>
      </div>
      <div class="party">
        <h3>الطرف الثاني (العميل)</h3>
        <p><strong>الاسم:</strong> ${esc(rec.customerName)}</p>
        <p dir="ltr"><strong>الجوال:</strong> ${esc(rec.customerPhone || "—")}</p>
        <p><strong>المنطقة/الدولة:</strong> ${esc(rec.customerArea || rec.location || "—")}</p>
      </div>
    </section>

    <section class="block">
      <h3>موضوع التعاقد</h3>
      <p>
        اتفق الطرفان على أن يقوم الطرف الأول بالإشراف الدوري على خلايا النحل العائدة للطرف الثاني،
        وفق البيانات والمواعيد الموضحة أدناه، مقابل الرسوم الشهرية المتفق عليها.
      </p>
    </section>

    <section class="block">
      <h3>بيانات المنحل والخلايا</h3>
      <div class="kv">
        <div><span>عدد الخلايا</span><strong>${esc(rec.hiveCount)}</strong></div>
        <div><span>أرقام الخلايا</span><strong>${esc(hiveNumbers)}</strong></div>
        <div><span>موقع المنحل</span><strong>${esc(rec.location || rec.customerArea || "—")}</strong></div>
        <div><span>النحال المشرف</span><strong>${esc(rec.beekeeper || "—")}</strong></div>
        <div><span>تاريخ التركيب</span><strong>${esc(rec.installDate || "—")}</strong></div>
        <div><span>الرسوم الشهرية</span><strong>${money(rec.monthlyFee)} د.ك</strong></div>
        <div><span>موعد الزيارة القادم</span><strong>${esc(rec.nextVisitDate || "—")}</strong></div>
        <div><span>تاريخ آخر زيارة</span><strong>${esc(rec.lastVisitDate || "—")}</strong></div>
        <div><span>موعد الفرز</span><strong>${esc(rec.extractionAppointment || "—")}</strong></div>
        <div><span>تاريخ الفرز الفعلي</span><strong>${esc(rec.extractionDate || "—")}</strong></div>
      </div>
    </section>

    <section class="block">
      <h3>التزامات الطرف الأول</h3>
      <ol class="terms">
        <li>الالتزام بالفحص الدوري للخلايا حسب مواعيد الزيارة المتفق عليها.</li>
        <li>تعيين نحال مشرف ومتابعة حالة الطوائف وإبلاغ العميل بالملاحظات المهمة.</li>
        <li>التنسيق مع العميل بشأن مواعيد الفرز وأي أعمال إضافية عند الحاجة.</li>
        <li>المحافظة على سلامة الخلايا أثناء الزيارات قدر الإمكان ووفق أصول المهنة.</li>
      </ol>
    </section>

    <section class="block">
      <h3>التزامات الطرف الثاني</h3>
      <ol class="terms">
        <li>توفير الوصول الآمن إلى موقع المنحل في مواعيد الزيارة المتفق عليها.</li>
        <li>سداد رسوم الإشراف الشهرية في مواعيدها المتفق عليها.</li>
        <li>إبلاغ الطرف الأول بأي تغيير في عدد الخلايا أو أرقامها أو موقعها.</li>
        <li>التعاون في جدولة مواعيد الفرز وأي خدمات إضافية.</li>
      </ol>
    </section>

    ${
      rec.notes
        ? `<section class="block"><h3>ملاحظات خاصة</h3><p>${esc(rec.notes)}</p></section>`
        : ""
    }

    <section class="block">
      <h3>أحكام عامة</h3>
      <ol class="terms">
        <li>يُعد هذا المستند عقد إشراف إلكتروني صادر من نظام الرباعية.</li>
        <li>أي تعديل على عدد الخلايا قد يغيّر الرسوم الشهرية وفق باقات الإشراف المعتمدة.</li>
        <li>خدمة الفرز تُحتسب وفق أسعار الفرز المعتمدة عند تنفيذها، ما لم يُتفق على خلاف ذلك.</li>
        <li>بتوقيع الطرفين أو بالموافقة عبر واتساب يُعد العقد ساريًا وفق البيانات أعلاه.</li>
      </ol>
    </section>

    <section class="signs">
      <div class="sign-box">
        <h3>توقيع الطرف الأول (الرباعية)</h3>
        <p>الاسم: ........................</p>
        <p>التوقيع: ......................</p>
        <p>التاريخ: ......................</p>
      </div>
      <div class="sign-box">
        <h3>توقيع الطرف الثاني (العميل)</h3>
        <p>الاسم: ${esc(rec.customerName)}</p>
        <p>التوقيع: ......................</p>
        <p>التاريخ: ......................</p>
      </div>
    </section>

    <p class="footer-note">الرباعية للنحل والعسل · +965 99787742 · توصيل داخل الكويت ودول الخليج</p>
  `;

  document.getElementById("btn-print").addEventListener("click", () => window.print());
  document.getElementById("btn-wa").addEventListener("click", () => {
    const phone = normalizePhone(rec.customerPhone) || "96599787742";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildContractWhatsApp(rec, contractNo, today))}`, "_blank");
  });

  function buildContractWhatsApp(s, no, date) {
    return [
      `عقد إشراف على خلايا النحل — الرباعية للنحل والعسل`,
      `رقم العقد: ${no}`,
      `تاريخ الإصدار: ${date}`,
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
      `يصل طلبك بعناية وأمان · توصيل داخل الكويت ودول الخليج`,
    ].join("\n");
  }

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
