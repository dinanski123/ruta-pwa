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
      #${ID} .ruta-status-card{width:min(500px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;padding:20px;border-radius:20px;background:Canvas;color:CanvasText;box-shadow:0 20px 60px rgba(0,0,0,.25)}
      #${ID} .ruta-status-title{font-weight:750;font-size:1.1em;margin-bottom:4px}
      #${ID} .ruta-status-subtitle{font-size:.78em;opacity:.62;margin-bottom:16px}
      #${ID} .ruta-status-section{margin-top:16px;padding-top:14px;border-top:1px solid color-mix(in srgb, CanvasText 12%, transparent)}
      #${ID} .ruta-status-section-title{font-size:.76em;font-weight:750;letter-spacing:.04em;text-transform:uppercase;opacity:.58;margin-bottom:8px}
      #${ID} .ruta-status-row{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin:9px 0;font-size:.9em}
      #${ID} .ruta-status-row>span:last-child{text-align:right;word-break:break-word}
      #${ID} .ruta-status-ok{color:#218739;font-weight:700}
      #${ID} .ruta-status-warn{color:#9a6a00;font-weight:700}
      #${ID} .ruta-status-actions{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}
      #${ID} button{padding:9px 13px;border:0;border-radius:10px;font:inherit;cursor:pointer}
      #${ID} .ruta-status-link{display:inline-flex;align-items:center;padding:9px 13px;border:1px solid color-mix(in srgb, CanvasText 16%, transparent);border-radius:10px;text-decoration:none;color:inherit}
      #${ID} .ruta-status-note{font-size:.76em;opacity:.58;line-height:1.4;margin-top:7px}
      .ruta-system-status-trigger{margin-left:8px;width:64px;height:32px;padding:0 6px;border:1px solid #c9c9c2;border-radius:8px;background:#fff;color:#202422;font:inherit;font-size:13px;line-height:1;font-weight:600;cursor:pointer;white-space:nowrap;box-sizing:border-box;box-shadow:0 1px 2px rgba(0,0,0,.04)}
      .ruta-system-status-trigger:active{opacity:.7}
    `;
    document.head.appendChild(style);
  }

  function value(value, fallback = "—") {
    return value === null || value === undefined || value === "" ? fallback : String(value);
  }

  function formatNumber(value) {
    return typeof value === "number" ? new Intl.NumberFormat().format(value) : value(value);
  }

  async function refresh(panel) {
    const status = panel.querySelector("[data-ruta-status]");
    status.textContent = "Checking…";
    status.className = "";

    try {
      const r = await fetch("/api/ruta-system-status", { cache: "no-store" });
      const data = await r.json();

      status.textContent = data.ok ? "Healthy" : "Unavailable";
      status.className = data.ok ? "ruta-status-ok" : "";

      panel.querySelector("[data-ruta-origin]").textContent = value(data.origin);
      panel.querySelector("[data-ruta-environment]").textContent = value(data.environment);
      panel.querySelector("[data-ruta-region]").textContent = value(data.region);
      panel.querySelector("[data-ruta-deployment]").textContent = value(data.deployment);
      panel.querySelector("[data-ruta-supabase]").textContent =
        data.supabase?.ok ? "Healthy" : "Unavailable";
      panel.querySelector("[data-ruta-supabase]").className =
        data.supabase?.ok ? "ruta-status-ok" : "";
      panel.querySelector("[data-ruta-supabase-code]").textContent =
        value(data.supabase?.status);
      panel.querySelector("[data-ruta-checked]").textContent =
        value(data.checked_at ? new Date(data.checked_at).toLocaleString() : null);

      const traffic = data.traffic || {};
      panel.querySelector("[data-ruta-views]").textContent =
        traffic.available ? formatNumber(traffic.page_views) : "Not connected";
      panel.querySelector("[data-ruta-traffic-note]").textContent =
        traffic.available
          ? traffic.note || "Vercel Web Analytics"
          : traffic.reason || "Vercel traffic data unavailable.";

      panel.querySelector("[data-ruta-refresh-time]").textContent =
        data.checked_at ? new Date(data.checked_at).toLocaleTimeString() : "—";
    } catch {
      status.textContent = "Unable to check";
      status.className = "";
      panel.querySelector("[data-ruta-refresh-time]").textContent = "—";
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
          <div class="ruta-status-subtitle">Live service health and traffic signals</div>

          <div class="ruta-status-section">
            <div class="ruta-status-section-title">Service</div>
            <div class="ruta-status-row"><span>RUTA services</span><span data-ruta-status>Checking…</span></div>
            <div class="ruta-status-row"><span>Supabase</span><span data-ruta-supabase>Checking…</span></div>
            <div class="ruta-status-row"><span>Supabase HTTP</span><span data-ruta-supabase-code>—</span></div>
          </div>

          <div class="ruta-status-section">
            <div class="ruta-status-section-title">Traffic</div>
            <div class="ruta-status-row"><span>Page views · 24H</span><span data-ruta-views>Checking…</span></div>
            <div class="ruta-status-note" data-ruta-traffic-note>Loading Vercel traffic data…</div>
            <div class="ruta-status-note">Vercel Edge Requests are a separate metric and are not represented by Web Analytics page views.</div>
          </div>

          <div class="ruta-status-section">
            <div class="ruta-status-section-title">Deployment</div>
            <div class="ruta-status-row"><span>Origin</span><span data-ruta-origin>—</span></div>
            <div class="ruta-status-row"><span>Environment</span><span data-ruta-environment>—</span></div>
            <div class="ruta-status-row"><span>Region</span><span data-ruta-region>—</span></div>
            <div class="ruta-status-row"><span>Build</span><span data-ruta-deployment>—</span></div>
          </div>

          <div class="ruta-status-section">
            <div class="ruta-status-section-title">Checks</div>
            <div class="ruta-status-row"><span>Last live check</span><span data-ruta-checked>—</span></div>
            <div class="ruta-status-row"><span>Scheduled checks</span><span>Mon / Wed / Fri · 03:00 UTC</span></div>
            <div class="ruta-status-row"><span>Panel refreshed</span><span data-ruta-refresh-time>—</span></div>
          </div>

          <div class="ruta-status-actions">
            <button type="button" data-ruta-refresh>Check now</button>
            <a class="ruta-status-link" href="https://vercel.com/ferdz/ruta-pwa/observability" target="_blank" rel="noopener noreferrer">Open Vercel Observability</a>
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
