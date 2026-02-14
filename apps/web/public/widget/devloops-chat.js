/**
 * DevLoops Chat Widget Loader
 *
 * Embed on any external site:
 * <script src="https://your-domain.com/widget/devloops-chat.js"
 *         data-workspace-id="YOUR_WORKSPACE_ID"></script>
 *
 * Required:
 *   data-workspace-id — your workspace public ID (found in Settings)
 *
 * Optional:
 *   data-theme="light" | "dark"
 *   data-position="right" | "left"
 *   data-color="#6366f1"
 */
(function () {
  "use strict";

  if (window.__devloops_chat_loaded) return;
  window.__devloops_chat_loaded = true;

  // ── Resolve configuration ──────────────────────────────────────────────
  // Priority: window.__DEVLOOPS_WIDGET_CONFIG (set before this script loads)
  //         > script tag attributes (data-workspace-id, etc.)
  //         > defaults
  var globalCfg = window.__DEVLOOPS_WIDGET_CONFIG || {};

  // document.currentScript is null when loaded asynchronously (e.g. next/Script).
  var script =
    document.currentScript ||
    document.querySelector('script[src*="devloops-chat.js"]') ||
    document.querySelector('script[data-workspace-id]');

  function attr(name) {
    return (script && script.getAttribute(name)) || "";
  }

  var config = {
    baseUrl: attr("data-base-url") || globalCfg.baseUrl || (script && script.src
      ? script.src.replace(/\/widget\/devloops-chat\.js.*$/, "")
      : window.location.origin),
    workspaceId: attr("data-workspace-id") || globalCfg.workspaceId || "",
    theme: attr("data-theme") || globalCfg.theme || "light",
    position: attr("data-position") || globalCfg.position || "right",
    color: attr("data-color") || globalCfg.color || "#6366f1",
  };

  if (!config.workspaceId) {
    console.error("[DevLoops] Missing required data-workspace-id attribute.");
    return;
  }

  // ── Fetch workspace brand color (non-blocking) ────────────────────────
  var resolvedColor = config.color;
  function applyColor(hex) {
    resolvedColor = hex;
    if (btn) btn.style.background = hex;
  }

  if (!attr("data-color") && !globalCfg.color) {
    // No explicit color override — try to fetch workspace brand color
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", config.baseUrl + "/api/chat/brand-color?workspaceId=" + encodeURIComponent(config.workspaceId), true);
      xhr.onload = function () {
        try {
          var data = JSON.parse(xhr.responseText);
          if (data.brandColor && /^#[0-9a-fA-F]{6}$/.test(data.brandColor)) {
            applyColor(data.brandColor);
          }
        } catch (e) { /* ignore */ }
      };
      xhr.send();
    } catch (e) { /* non-critical */ }
  }

  var chatSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  // ── Wrapper (holds both button + badge, ensures absolute positioning works)
  var wrapper = document.createElement("div");
  wrapper.id = "devloops-chat-wrapper";
  wrapper.style.cssText =
    "position:fixed;bottom:20px;" + config.position + ":20px;" +
    "z-index:2147483646;width:56px;height:56px;";

  // ── Floating button ─────────────────────────────────────────────────────
  var btn = document.createElement("div");
  btn.id = "devloops-chat-button";
  btn.style.cssText =
    "width:56px;height:56px;border-radius:50%;background:" + config.color +
    ";color:#fff;display:flex;align-items:center;justify-content:center;" +
    "cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.16);transition:transform 0.2s;";

  var iconSpan = document.createElement("span");
  iconSpan.style.cssText = "display:flex;align-items:center;justify-content:center;pointer-events:none;";
  iconSpan.innerHTML = chatSvg;
  btn.appendChild(iconSpan);

  btn.addEventListener("mouseenter", function () { btn.style.transform = "scale(1.08)"; });
  btn.addEventListener("mouseleave", function () { btn.style.transform = "scale(1)"; });

  wrapper.appendChild(btn);

  // ── Unread badge (absolutely positioned on top-right of wrapper) ─────────
  var badge = document.createElement("div");
  badge.id = "devloops-chat-badge";
  badge.style.cssText =
    "position:absolute;top:-6px;right:-6px;" +
    "min-width:24px;height:24px;border-radius:12px;" +
    "background:#f43f5e;color:#fff;" +
    "font-size:13px;font-weight:700;font-family:-apple-system,BlinkMacSystemFont,sans-serif;" +
    "line-height:1;text-align:center;" +
    "padding:5px 6px;" +
    "border:2px solid #fff;pointer-events:none;" +
    "box-shadow:0 2px 8px rgba(244,63,94,0.5);" +
    "box-sizing:content-box;" +
    "display:none;";
  wrapper.appendChild(badge);

  var currentUnread = 0;

  function updateBadge(count) {
    currentUnread = count;
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.style.display = "block";
    } else {
      badge.textContent = "";
      badge.style.display = "none";
    }
  }

  // ── Iframe container ────────────────────────────────────────────────────
  var container = document.createElement("div");
  container.id = "devloops-chat-container";
  container.style.cssText =
    "position:fixed;bottom:88px;" + config.position +
    ":20px;z-index:2147483647;width:380px;height:520px;" +
    "max-height:calc(100vh - 100px);border-radius:16px;overflow:hidden;" +
    "box-shadow:0 8px 32px rgba(0,0,0,0.18);display:none;background:#fff;";

  var iframe = document.createElement("iframe");
  iframe.src =
    config.baseUrl +
    "/widget/embed?theme=" + encodeURIComponent(config.theme) +
    "&workspaceId=" + encodeURIComponent(config.workspaceId);
  iframe.style.cssText = "width:100%;height:100%;border:none;border-radius:16px;";
  iframe.setAttribute("allow", "clipboard-read; clipboard-write; autoplay");
  container.appendChild(iframe);

  // ── Toggle ──────────────────────────────────────────────────────────────
  var isOpen = false;

  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    container.style.display = isOpen ? "block" : "none";
    iconSpan.innerHTML = isOpen ? closeSvg : chatSvg;

    if (isOpen) {
      // Clear badge when user opens the chat
      updateBadge(0);
      // Tell iframe that chat is visible so it can mark as read
      iframe.contentWindow && iframe.contentWindow.postMessage(
        { type: "devloops-widget-opened" }, "*"
      );
    } else {
      // Tell iframe that chat is hidden so it stops marking messages as read
      iframe.contentWindow && iframe.contentWindow.postMessage(
        { type: "devloops-widget-closed" }, "*"
      );
    }
  });

  // ── Listen for messages from iframe ─────────────────────────────────────
  window.addEventListener("message", function (e) {
    if (!e.data || typeof e.data !== "object") return;

    if (e.data.type === "devloops-widget-resize") {
      var h = Math.min(Math.max(e.data.height || 520, 300), 600);
      container.style.height = h + "px";
    }

    if (e.data.type === "devloops-widget-unread") {
      var count = e.data.count || 0;
      // Only show badge when chat is closed
      if (!isOpen && count > 0) {
        updateBadge(count);
      } else if (isOpen) {
        updateBadge(0);
      }
    }
  });

  // ── Mount ───────────────────────────────────────────────────────────────
  document.body.appendChild(container);
  document.body.appendChild(wrapper);
})();
