(() => {
  const tabs = [...document.querySelectorAll(".side-tab")];
  const panels = [...document.querySelectorAll(".tab-panel")];
  const valid = new Set(tabs.map((t) => t.dataset.tab));

  function showTab(name, pushHash = true) {
    const id = valid.has(name) ? name : "home";
    tabs.forEach((t) => {
      const on = t.dataset.tab === id;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === id));
    if (pushHash) {
      history.replaceState(null, "", `#${id}`);
    }
    const panel = document.getElementById(`panel-${id}`);
    if (panel) panel.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.tab));
  });

  document.querySelectorAll("[data-tab-link]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showTab(el.getAttribute("data-tab-link"));
    });
  });

  window.addEventListener("hashchange", () => {
    showTab(location.hash.replace("#", "") || "home", false);
  });

  showTab(location.hash.replace("#", "") || "home", false);
})();
