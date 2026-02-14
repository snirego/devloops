/**
 * DevLoops Chat Widget Loader
 *
 * Embed on any external site:
 * <script src="https://your-domain.com/widget/devloops-chat.js"></script>
 *
 * Each visitor gets their own conversation thread. Returning visitors
 * resume their existing conversation via localStorage.
 *
 * Optional attributes:
 *   data-theme="light" | "dark"
 *   data-position="right" | "left"
 *   data-color="#6366f1"
 */
(function () {
  "use strict";

  // Prevent double initialization
  if (window.__devloops_chat_loaded) return;
  window.__devloops_chat_loaded = true;

  // Read config from script tag
  var script =
    document.currentScript ||
    document.querySelector('script[src*="devloops-chat.js"]');
  var config = {
    baseUrl: script ? script.src.replace(/\/widget\/devloops-chat\.js.*$/, "") : "",
    theme: script ? script.getAttribute("data-theme") || "light" : "light",
    position: script ? script.getAttribute("data-position") || "right" : "right",
    color: script ? script.getAttribute("data-color") || "#6366f1" : "#6366f1",
  };

  // ── Create floating button ──────────────────────────────────────────────
  var btn = document.createElement("div");
  btn.id = "devloops-chat-button";
  btn.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText =
    "position:fixed;bottom:20px;" +
    config.position +
    ":20px;z-index:2147483646;width:56px;height:56px;border-radius:50%;background:" +
    config.color +
    ";color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.16);transition:transform 0.2s;";
  btn.addEventListener("mouseenter", function () {
    btn.style.transform = "scale(1.08)";
  });
  btn.addEventListener("mouseleave", function () {
    btn.style.transform = "scale(1)";
  });

  // ── Create iframe container ─────────────────────────────────────────────
  var container = document.createElement("div");
  container.id = "devloops-chat-container";
  container.style.cssText =
    "position:fixed;bottom:88px;" +
    config.position +
    ":20px;z-index:2147483647;width:380px;height:520px;max-height:calc(100vh - 100px);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.18);display:none;background:#fff;";

  var iframe = document.createElement("iframe");
  iframe.src =
    config.baseUrl +
    "/widget/embed?theme=" +
    config.theme;
  iframe.style.cssText =
    "width:100%;height:100%;border:none;border-radius:16px;";
  iframe.setAttribute("allow", "clipboard-read; clipboard-write");
  container.appendChild(iframe);

  // ── Toggle logic ────────────────────────────────────────────────────────
  var isOpen = false;
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    container.style.display = isOpen ? "block" : "none";
    btn.innerHTML = isOpen
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  });

  // ── Listen for resize messages from iframe ──────────────────────────────
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "devloops-widget-resize") {
      var h = Math.min(Math.max(e.data.height || 520, 300), 600);
      container.style.height = h + "px";
    }
  });

  // ── Mount ───────────────────────────────────────────────────────────────
  document.body.appendChild(container);
  document.body.appendChild(btn);
})();
