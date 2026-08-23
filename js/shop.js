(() => {
  const WA = "96599787742";
  const CART_KEY = "alrabaa_cart_v1";
  const SESSION_KEY = "alrabaa_cart_session";
  const money = (n) => Number(n || 0).toLocaleString("ar-KW", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

  const grid = document.getElementById("store-grid");
  const cartItemsEl = document.getElementById("cart-items");
  const cartCountEls = document.querySelectorAll("[data-cart-count]");
  const cartTotalEl = document.getElementById("cart-total");
  const checkoutForm = document.getElementById("checkout-form");
  const cartEmpty = document.getElementById("cart-empty");
  const drawer = document.getElementById("cart-drawer");
  if (!grid || !cartItemsEl || !checkoutForm || !drawer) return;

  let catalog = [];
  let cart = loadCart();
  let syncTimer = null;

  function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function contactPayload() {
    return {
      customerName: document.getElementById("shop-name")?.value || "",
      phone: document.getElementById("shop-phone")?.value || "",
      area: document.getElementById("shop-area")?.value || "",
      notes: document.getElementById("shop-notes")?.value || "",
    };
  }

  function syncCartToServer() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      try {
        await fetch("/api/store/carts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: getSessionId(),
            items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
            ...contactPayload(),
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }, 350);
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
    syncCartToServer();
  }

  function openCart() {
    drawer.hidden = false;
    document.body.classList.add("cart-open");
    drawer.querySelector(".cart-close")?.focus();
  }

  function closeCart() {
    drawer.hidden = true;
    document.body.classList.remove("cart-open");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function fetchCatalog() {
    grid.innerHTML = `<p class="store-loading">جاري تحميل المنتجات...</p>`;
    try {
      const res = await fetch("/api/store/catalog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر التحميل");
      catalog = Array.isArray(data) ? data : [];
      renderCatalog();
      renderCart();
      if (cart.length) syncCartToServer();
    } catch (err) {
      grid.innerHTML = `<p class="store-error">تعذر تحميل المتجر. حدّث الصفحة أو تواصل عبر واتساب.</p>`;
      console.error(err);
    }
  }

  function renderCatalog() {
    if (!catalog.length) {
      grid.innerHTML = `<p class="store-empty">لا منتجات منشورة في المتجر حاليًا.</p>`;
      return;
    }
    grid.innerHTML = catalog
      .map((p) => {
        const stockLabel = !p.trackStock
          ? "متاح للطلب"
          : p.available > 0
            ? `متوفر · ${money(p.available)} ${escapeHtml(p.unit)}`
            : "حسب التوفر · يُؤكد عند الطلب";
        return `
      <article class="store-card">
        <div class="store-media"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" width="600" height="450" /></div>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="stock">${stockLabel}</p>
        <p class="price"><span>${money(p.price)}</span> د.ك</p>
        <div class="store-actions">
          <input type="number" min="1" step="1" value="1" class="store-qty" data-qty-for="${escapeHtml(p.id)}" />
          <button type="button" class="btn btn-dark" data-add="${escapeHtml(p.id)}">أضف للسلة</button>
        </div>
      </article>`;
      })
      .join("");
  }

  function cartCount() {
    return cart.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  }

  function cartTotal() {
    return cart.reduce((s, i) => {
      const p = catalog.find((c) => c.id === i.productId);
      const price = p ? p.price : i.price || 0;
      return s + price * (Number(i.qty) || 0);
    }, 0);
  }

  function renderCart() {
    const count = cartCount();
    cartCountEls.forEach((el) => {
      el.textContent = String(count);
      el.hidden = count === 0;
    });
    if (cartTotalEl) cartTotalEl.textContent = money(cartTotal());

    if (!cart.length) {
      cartItemsEl.innerHTML = "";
      if (cartEmpty) cartEmpty.hidden = false;
      return;
    }
    if (cartEmpty) cartEmpty.hidden = true;
    cartItemsEl.innerHTML = cart
      .map((item) => {
        const p = catalog.find((c) => c.id === item.productId);
        const name = p ? p.name : item.name || item.productId;
        const price = p ? p.price : item.price || 0;
        const line = price * (Number(item.qty) || 0);
        return `
      <div class="cart-row" data-id="${escapeHtml(item.productId)}">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <div class="muted">${money(price)} د.ك × ${item.qty}</div>
        </div>
        <div class="cart-row-actions">
          <strong>${money(line)} د.ك</strong>
          <button type="button" class="danger" data-remove="${escapeHtml(item.productId)}">حذف</button>
        </div>
      </div>`;
      })
      .join("");
  }

  function addToCart(productId, qty) {
    const product = catalog.find((p) => p.id === productId);
    if (!product) return false;
    const amount = Math.max(1, Math.floor(Number(qty) || 1));
    const existing = cart.find((i) => i.productId === productId);
    if (existing) existing.qty += amount;
    else cart.push({ productId, name: product.name, qty: amount, price: product.price });
    saveCart();
    return true;
  }

  function flashCartChip() {
    const chip = document.getElementById("btn-open-cart");
    if (!chip) return;
    chip.classList.add("cart-chip-pulse");
    clearTimeout(chip._pulseT);
    chip._pulseT = setTimeout(() => chip.classList.remove("cart-chip-pulse"), 700);
  }

  async function ensureCatalog() {
    if (catalog.length) return;
    const res = await fetch("/api/store/catalog");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "تعذر التحميل");
    catalog = Array.isArray(data) ? data : [];
  }

  grid.addEventListener("click", (e) => {
    const id = e.target.getAttribute("data-add");
    if (!id) return;
    const qtyInput = grid.querySelector(`[data-qty-for="${id}"]`);
    if (addToCart(id, qtyInput ? qtyInput.value : 1)) flashCartChip();
  });

  document.body.addEventListener("click", async (e) => {
    const pkgId = e.target.getAttribute("data-add-package");
    if (!pkgId) return;
    try {
      await ensureCatalog();
      const ok = addToCart(pkgId, 1);
      if (!ok) {
        alert("هذه الباقة غير منشورة في المتجر حاليًا. فعّلها من الأصناف في الإدارة.");
        return;
      }
      flashCartChip();
      openCart();
    } catch (err) {
      alert(err.message || "تعذر إضافة الباقة");
    }
  });

  cartItemsEl.addEventListener("click", (e) => {
    const id = e.target.getAttribute("data-remove");
    if (!id) return;
    cart = cart.filter((i) => i.productId !== id);
    saveCart();
  });

  checkoutForm.addEventListener("input", () => syncCartToServer());

  document.getElementById("btn-open-cart")?.addEventListener("click", openCart);
  document.getElementById("btn-open-cart-shop")?.addEventListener("click", openCart);
  drawer.querySelectorAll("[data-close-cart]").forEach((el) => el.addEventListener("click", closeCart));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) closeCart();
  });

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cart.length) {
      alert("السلة فارغة");
      return;
    }
    const btn = checkoutForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      const payload = {
        sessionId: getSessionId(),
        customerName: document.getElementById("shop-name").value,
        phone: document.getElementById("shop-phone").value,
        area: document.getElementById("shop-area").value,
        notes: document.getElementById("shop-notes").value,
        items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
      };
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر إرسال الطلب");

      const lines = data.items.map((i) => `• ${i.name} × ${i.qty} = ${money(i.total)} د.ك`).join("\n");
      const msg = `طلب جديد من متجر الرباعية\nرقم الطلب: ${data.number}\nالاسم: ${data.customerName}\nالجوال: ${data.phone}\nالمنطقة: ${data.area || "—"}\n\n${lines}\n\nالإجمالي: ${money(data.total)} د.ك\nالشحن: يُحسب عند التواصل\n${data.notes ? `ملاحظات: ${data.notes}\n` : ""}`;
      cart = [];
      saveCart();
      checkoutForm.reset();
      closeCart();
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank");
      alert(`تم تسجيل الطلب ${data.number}. أكمل عبر واتساب.`);
    } catch (err) {
      alert(err.message || "تعذر إرسال الطلب");
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.querySelectorAll("[data-tab-link='shop'], .side-tab[data-tab='shop']").forEach((el) => {
    el.addEventListener("click", () => {
      if (!catalog.length) fetchCatalog();
      else renderCatalog();
    });
  });

  window.addEventListener("hashchange", () => {
    if (location.hash.replace("#", "") === "shop") {
      if (!catalog.length) fetchCatalog();
      else renderCatalog();
    }
  });

  getSessionId();
  renderCart();
  if (cart.length) syncCartToServer();
  if (location.hash.replace("#", "") === "shop") fetchCatalog();
})();
