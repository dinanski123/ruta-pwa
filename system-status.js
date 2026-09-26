(() => {
  const ID = "ruta-system-status-panel";
  const STYLE_ID = "ruta-system-status-style";

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ID}{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.45);font:inherit;color:inherit}
      #${ID}.open{display:flex}
      #${ID} .ruta-status-card{width:min(430px,100%);padding:20px;border-radius:20px;background:Canvas;color:CanvasText;box-shadow:0 20px 60px rgba(0,0,0,.25)}
      #${ID} .ruta-status-title{font-weight:750;font-size:1.1em;margin-bottom:14px}
      #${ID} .ruta-status-row{display:flex;justify-content:space-between;gap:14px;margin:10px 0;font-size:.93em}
      #${ID} .ruta-status-ok{color:#218739;font-weight:700}
      #${ID} .ruta-status-actions{display:flex;gap:8px;margin-top:16px}
      #${ID} button{padding:9px 13px;border:0;border-radius:10px;font:inherit;cursor:pointer}
      .ruta-system-status-trigger{margin-left:8px;width:96px;height:48px;padding:0 12px;border:1px solid currentColor;border-radius:12px;background:transparent;color:inherit;font:inherit;font-size:17px;font-weight:650;cursor:pointer;white-space:nowrap}
      .ruta-system-status-trigger:active{opacity:.7}
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
      checked.textContent = "—";
    }
  }

  function looksLikeSettings(el) {
    const text = `${el.textContent || ""} ${el.getAttribute?.("aria-label") || ""} ${el.getAttribute?.("title") || ""}`.toLowerCase();
    return text.includes("settings") || text.includes("setting");
  }

  function openPanel() {
    const panel = document.getElementById(ID);
    if (!panel) return;
    panel.classList.add("open");
    refresh(panel);
  }

  function install() {
    addStyles();
    if (!document.getElementById(ID)) {
      const panel = document.createElement("div");
      panel.id = ID;
      panel.innerHTML = `
        <div class="ruta-status-card" role="dialog" aria-label="RUTA System Status">
          <div class="ruta-status-title">System Status</div>
          <div class="ruta-status-row"><span>RUTA services</span><span data-ruta-status>Checking…</span></div>
          <div class="ruta-status-row"><span>Last live check</span><span data-ruta-checked>—</span></div>
          <div class="ruta-status-row"><span>Scheduled checks</span><span>Mon / Wed / Fri · 03:00 UTC</span></div>
          <div class="ruta-status-actions">
            <button type="button" data-ruta-refresh>Check now</button>
            <button type="button" data-ruta-close>Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
      panel.querySelector("[data-ruta-refresh]").addEventListener("click", () => refresh(panel));
      panel.querySelector("[data-ruta-close]").addEventListener("click", () => panel.classList.remove("open"));
      panel.addEventListener("click", event => { if (event.target === panel) panel.classList.remove("open"); });
    }
  }

  function installTrigger() {
    if (document.querySelector("[data-ruta-status-trigger]")) return;
    const candidates = [...document.querySelectorAll("button,a,[role=button],input")];
    const settings = candidates.find(looksLikeSettings);
    if (!settings || !settings.parentElement) return;

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "ruta-system-status-trigger";
    trigger.setAttribute("data-ruta-status-trigger", "true");
    trigger.setAttribute("aria-label", "System Status");
    trigger.textContent = "Status";
    trigger.addEventListener("click", openPanel);

    settings.insertAdjacentElement("afterend", trigger);
  }

  const observer = new MutationObserver(() => {
    install();
    installTrigger();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
  installTrigger();
})();
