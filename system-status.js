(() => {
  const ID = "ruta-system-status-panel";
  const STYLE_ID = "ruta-system-status-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ID}{margin:12px 0;padding:16px;border:1px solid rgba(127,127,127,.22);border-radius:16px;background:rgba(127,127,127,.07);font:inherit;color:inherit}
      #${ID} .ruta-status-title{font-weight:700;margin-bottom:8px}
      #${ID} .ruta-status-row{display:flex;justify-content:space-between;gap:12px;margin:7px 0;font-size:.92em}
      #${ID} .ruta-status-ok{color:#218739;font-weight:650}
      #${ID} button{margin-top:10px;padding:8px 12px;border:0;border-radius:10px;font:inherit;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  async function refresh(panel) {
    const status = panel.querySelector("[data-ruta-status]");
    const checked = panel.querySelector("[data-ruta-checked]");
    status.textContent = "Checking…";
    status.className = "";
    try {
      const r = await fetch("/api/ruta-system-status", { cache: "no-store" });
      const data = await r.json();
      status.textContent = data.ok ? "Healthy" : "Unavailable";
      status.className = data.ok ? "ruta-status-ok" : "";
      checked.textContent = new Date(data.checked_at).toLocaleString();
    } catch {
      status.textContent = "Unable to check";
      status.className = "";
      checked.textContent = "—";
    }
  }

  function isSettingsButton(el) {
    const text = (el.textContent || "").trim().toLowerCase();
    return text === "settings" || text.includes("settings");
  }

  function install() {
    addStyles();
    const candidates = [...document.querySelectorAll("button,a,[role=button]")];
    const settings = candidates.find(isSettingsButton);
    if (!settings) return;
    const container = settings.closest("section,main,div") || settings.parentElement;
    if (!container || container.querySelector(`#${ID}`)) return;

    const panel = document.createElement("div");
    panel.id = ID;
    panel.innerHTML = `
      <div class="ruta-status-title">System Status</div>
      <div class="ruta-status-row"><span>RUTA services</span><span data-ruta-status>Checking…</span></div>
      <div class="ruta-status-row"><span>Last check</span><span data-ruta-checked>—</span></div>
      <div class="ruta-status-row"><span>Scheduled checks</span><span>Mon / Wed / Fri · 03:00 UTC</span></div>
      <button type="button" data-ruta-refresh>Check now</button>
    `;
    container.appendChild(panel);
    panel.querySelector("[data-ruta-refresh]").addEventListener("click", () => refresh(panel));
    refresh(panel);
  }

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
