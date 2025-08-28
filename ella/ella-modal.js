(function () {
  "use strict";

  // Prevent running twice if already initialized
  if (window.ELLAModal) return;

  // Chainlit app URL (deployed on Render)
  const APP_URL = "https://ella-ai-agent.onrender.com";

  // Modal + overlay + iframe styles
  const css = `
    .ella-overlay {
      position: fixed; 
      inset: 0;
      background: rgba(0,0,0,.5);
      display: none; 
      z-index: 999998;
      backdrop-filter: blur(3px);
    }
    .ella-modal {
      position: fixed; 
      display: none; 
      z-index: 999999;
      background: #fff; 
      border: none;
      border-radius: 12px;
      overflow: hidden; 
      box-shadow: 0 8px 32px rgba(0,0,0,.3);
    }
    /* Desktop: centered, fixed size */
    @media(min-width:768px){
      .ella-modal {
        width: min(850px, 90vw);
        height: min(750px, 85vh);
        top: 50%; 
        left: 50%;
        transform: translate(-50%, -50%);
      }
    }
    /* Mobile: full-screen modal */
    @media(max-width:767px){
      .ella-modal {
        inset: 0;
        width: 100vw; 
        height: 100vh;
        border-radius: 0;
        transform: none;
        top: 0;
        left: 0;
      }
    }
    .ella-iframe {
      display: block; 
      width: 100%; 
      height: 100%; 
      border: 0;
      background: #f9fafb;
    }
    .ella-close {
      position: absolute; 
      top: 16px; 
      right: 16px;
      background: transparent; 
      border: none;
      color: #6b7280; 
      font-size: 22px; 
      line-height: 1;
      cursor: pointer; 
      z-index: 1000000;
    }
    .ella-close:hover { 
      color: #111827; 
    }
    .ella-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #9ca3af;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 400;
      z-index: 1000001;
    }
    .ella-error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-family: system-ui, sans-serif;
      font-size: 16px;
      z-index: 1000001;
      padding: 20px;
    }
  `;

  function init() {
    // Only load CSS once
    if (document.getElementById("ella-styles")) return;

    // Inject CSS into page
    const style = document.createElement("style");
    style.id = "ella-styles";
    style.textContent = css;
    document.head.appendChild(style);

    // Build modal DOM elements
    const overlay = document.createElement("div");
    overlay.className = "ella-overlay";

    const modal = document.createElement("div");
    modal.className = "ella-modal";

    const closeBtn = document.createElement("button");
    closeBtn.className = "ella-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close modal");

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "ella-loading";
    loadingDiv.textContent = "Loading...";

    const iframe = document.createElement("iframe");
    iframe.className = "ella-iframe";
    iframe.allow = "clipboard-read; clipboard-write; microphone; camera;";
    iframe.loading = "lazy";
    iframe.setAttribute("aria-label", "ELLA Chatbot Application");

    // State flags
    let isLoaded = false;
    let hasError = false;
    let loadTimeout;

    // Handle iframe load success
    iframe.onload = function () {
      isLoaded = true;
      hasError = false;
      clearTimeout(loadTimeout);
      loadingDiv.style.display = "none";
    };

    // Handle iframe load failure
    iframe.onerror = function () {
      console.warn("ELLA Widget: Failed to load iframe");
      clearTimeout(loadTimeout);
      showError();
    };

    // Timeout if iframe takes too long (15s)
    loadTimeout = setTimeout(function () {
      if (!isLoaded && !hasError) {
        console.warn("ELLA Widget: Load timeout");
        showError();
      }
    }, 15000);

    // Error handler
    function showError(
      message = "Our AI assistant is temporarily unavailable. Please try again in a few minutes."
    ) {
      hasError = true;
      isLoaded = false;
      loadingDiv.style.display = "none";

      // Remove any existing error block first
      const existingError = modal.querySelector(".ella-error");
      if (existingError) existingError.remove();

      const errorDiv = document.createElement("div");
      errorDiv.className = "ella-error";
      errorDiv.innerHTML = `
          <div style="text-align: center; max-width: 300px;">
            <div style="font-size: 48px; margin-bottom: 16px;">😴</div>
            <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 18px; font-weight: 600;">ELLA is taking a nap</h3>
            <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${message}</p>
            <button onclick="window.ELLAModal.reload()" style="padding: 10px 20px; background: #0f766e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">Try Again</button>
          </div>
        `;
      modal.appendChild(errorDiv);
    }

    // Assemble modal into DOM
    modal.appendChild(closeBtn);
    modal.appendChild(loadingDiv);
    modal.appendChild(iframe);
    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Open modal when triggered
    function openModal() {
      overlay.style.display = "block";
      modal.style.display = "block";
      document.body.style.overflow = "hidden";

      // Only load app once, unless error occurred
      if (!iframe.src && !hasError) {
        loadingDiv.style.display = "block";
        checkConnection();
      }
    }

    // Check if the Chainlit app is reachable before loading iframe
    function checkConnection() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // fail fast after 2s

      fetch(APP_URL, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      })
        .then(() => {
          clearTimeout(timeoutId);
          loadingDiv.style.display = "none";
          iframe.src = APP_URL; // safe to load
        })
        .catch(() => {
          clearTimeout(timeoutId);
          loadingDiv.style.display = "none";
          showError();
        });
    }

    // Close modal and re-enable scrolling
    function closeModal() {
      overlay.style.display = "none";
      modal.style.display = "none";
      document.body.style.overflow = "";
    }

    // Reload iframe after error
    function reloadIframe() {
      hasError = false;
      isLoaded = false;

      const existingError = modal.querySelector(".ella-error");
      if (existingError) existingError.remove();

      loadingDiv.style.display = "block";
      iframe.src = ""; // clear previous
      checkConnection();
    }

    // Event listeners
    // Close modal when the "X" button is clicked
    closeBtn.addEventListener("click", closeModal);

    // Close modal when clicking outside the modal content (on the overlay)
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    // Close modal when pressing the Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.style.display === "block") {
        closeModal();
      }
    });

    // Open modal when clicking any <a> or <button> with text "Ask our AI"
    document.addEventListener("click", function (e) {
      const target = e.target.closest("a, button");
      if (target && target.textContent.trim().toLowerCase() === "ask our ai") {
        e.preventDefault();
        openModal();
      }
    });

    // Expose helper functions globally
    window.ELLAModal = {
      open: openModal,
      close: closeModal,
      reload: reloadIframe,
    };
  }

  // Initialize after page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
