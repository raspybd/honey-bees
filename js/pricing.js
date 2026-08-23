const AlRabaaPricing = (() => {
  function supervisionMonthly(hives) {
    const n = Math.max(0, Math.floor(Number(hives) || 0));
    if (n < 1) return { total: 0, label: "أدخل عدد الخلايا", detail: "" };
    if (n <= 5) return { total: 15, label: "باقة 1–5 خلايا", detail: "إشراف شهري ثابت" };
    if (n <= 10) return { total: 20, label: "باقة 5–10 خلايا", detail: "إشراف شهري ثابت" };
    if (n <= 15) return { total: 25, label: "باقة 10–15 خلية", detail: "إشراف شهري ثابت" };
    if (n <= 20) return { total: 30, label: "باقة 15–20 خلية", detail: "إشراف شهري ثابت" };
    const extra = n - 20;
    return {
      total: 30 + extra * 1,
      label: `باقة 20 خلية + ${extra} زيادة`,
      detail: `30 د.ك + ${extra} × 1 د.ك عن كل خلية فوق 20`,
    };
  }

  function extractionTotal(hives) {
    const n = Math.max(0, Math.floor(Number(hives) || 0));
    if (n < 1) return { total: 0, rate: 0, label: "أدخل عدد الخلايا", detail: "" };
    if (n <= 5) {
      return { total: round3(n * 5), rate: 5, label: "باقة 1–5 خلايا", detail: `${n} × 5 د.ك` };
    }
    if (n <= 10) {
      return { total: round3(n * 4.5), rate: 4.5, label: "باقة 5–10 خلايا", detail: `${n} × 4.5 د.ك` };
    }
    if (n <= 15) {
      return { total: round3(n * 3), rate: 3, label: "باقة 10–15 خلية", detail: `${n} × 3 د.ك` };
    }
    if (n <= 20) {
      return { total: round3(n * 2.75), rate: 2.75, label: "باقة 15–20 خلية", detail: `${n} × 2.75 د.ك` };
    }
    const base = 20 * 2.75;
    const extra = n - 20;
    const extraTotal = extra * 2.5;
    return {
      total: round3(base + extraTotal),
      rate: 2.5,
      label: `باقة 20 خلية + ${extra} زيادة`,
      detail: `(20 × 2.75) + (${extra} × 2.5) د.ك`,
    };
  }

  function round3(n) {
    return Math.round(n * 1000) / 1000;
  }

  function money(n) {
    return Number(n || 0).toLocaleString("ar-KW", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  return { supervisionMonthly, extractionTotal, money };
})();
