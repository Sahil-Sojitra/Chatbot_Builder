/**
 * Chatbot Builder Embeddable Widget
 * Encapsulated inside an isolated Shadow DOM container.
 * Zero external dependencies.
 */
(function () {
  "use strict";

  if (window.__CHATBOT_BUILDER_WIDGET_LOADED__) return;
  window.__CHATBOT_BUILDER_WIDGET_LOADED__ = true;

  // Identify the executing script tag and parameters
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (
          scripts[i].src &&
          (scripts[i].src.includes("widget.js") ||
            scripts[i].hasAttribute("data-chatbot-id") ||
            scripts[i].hasAttribute("data-public-id"))
        ) {
          return scripts[i];
        }
      }
      return null;
    })();

  let publicId =
    (currentScript &&
      (currentScript.getAttribute("data-chatbot-id") ||
        currentScript.getAttribute("data-public-id"))) ||
    window.CHATBOT_BUILDER_ID ||
    "";

  // Resolve API Host: explicitly supplied or derived from script origin
  let apiHost =
    (currentScript && currentScript.getAttribute("data-api-host")) ||
    window.CHATBOT_API_HOST ||
    "";

  if (!apiHost && currentScript && currentScript.src) {
    try {
      const scriptUrl = new URL(currentScript.src);
      // In local development, frontend runs on 3000, backend on 5000
      if (scriptUrl.hostname === "localhost" || scriptUrl.hostname === "127.0.0.1") {
        apiHost = `${scriptUrl.protocol}//${scriptUrl.hostname}:5000`;
      } else {
        apiHost = scriptUrl.origin;
      }
    } catch {
      apiHost = "http://localhost:5000";
    }
  }

  if (!apiHost) {
    apiHost = "http://localhost:5000";
  }

  // Create isolated container host element
  const host = document.createElement("div");
  host.id = "cb-widget-container";
  host.style.position = "fixed";
  host.style.bottom = "0";
  host.style.right = "0";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Widget State
  let isOpen = false;
  let botConfig = {
    name: "AI Assistant",
    description: "Ask me anything",
    primaryColor: "#7c3aed",
    starterQuestions: [],
    isPublished: true,
    status: "ACTIVE",
    sessionMessageLimit: null,
  };
  let messages = [];
  let isSending = false;
  let sessionMessageCount = 0;

  // Insert Styles
  const styleEl = document.createElement("style");
  styleEl.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .widget-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 16px;
      pointer-events: auto;
    }

    /* Floating Launcher Button */
    .launcher-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      box-shadow: 0 8px 24px -4px rgba(124, 58, 237, 0.4), 0 4px 12px -2px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      color: #ffffff;
      outline: none;
    }

    .launcher-btn:hover {
      transform: scale(1.06) translateY(-2px);
      box-shadow: 0 12px 28px -4px rgba(124, 58, 237, 0.5), 0 6px 16px -2px rgba(0, 0, 0, 0.35);
    }

    .launcher-btn:active {
      transform: scale(0.96);
    }

    .launcher-icon, .close-icon {
      position: absolute;
      transition: all 0.2s ease-in-out;
    }

    .launcher-btn.open .launcher-icon {
      opacity: 0;
      transform: rotate(90deg) scale(0.5);
    }

    .launcher-btn.open .close-icon {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .launcher-btn:not(.open) .close-icon {
      opacity: 0;
      transform: rotate(-90deg) scale(0.5);
    }

    .status-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background-color: #10b981;
      border: 2px solid #09090b;
      box-shadow: 0 0 8px #10b981;
    }

    /* Chat Window Card */
    .chat-window {
      width: 380px;
      height: 590px;
      max-height: calc(100vh - 120px);
      background-color: #09090b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      visibility: hidden;
    }

    .chat-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
      visibility: visible;
    }

    /* Header */
    .chat-header {
      padding: 16px 18px;
      background: linear-gradient(180deg, rgba(24, 24, 27, 0.95) 0%, rgba(18, 18, 20, 0.95) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bot-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
    }

    .bot-title-area {
      display: flex;
      flex-direction: column;
    }

    .bot-name {
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.2;
    }

    .bot-status-pill {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #10b981;
      font-size: 11px;
      font-weight: 500;
      margin-top: 3px;
    }

    .bot-status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .header-action-btn,
    .header-close-btn {
      background: transparent;
      border: none;
      color: #a1a1aa;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
    }

    .header-action-btn:hover,
    .header-close-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    /* Message Body */
    .chat-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scroll-behavior: smooth;
    }

    .chat-body::-webkit-scrollbar {
      width: 5px;
    }

    .chat-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 4px;
    }

    /* Welcome Area & Starter Questions */
    .welcome-card {
      background: rgba(24, 24, 27, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .welcome-title {
      font-size: 13px;
      font-weight: 600;
      color: #ffffff;
    }

    .welcome-desc {
      font-size: 12px;
      color: #a1a1aa;
      line-height: 1.45;
    }

    .starter-questions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }

    .starter-question-btn {
      background: rgba(124, 58, 237, 0.08);
      border: 1px solid rgba(124, 58, 237, 0.25);
      border-radius: 8px;
      padding: 8px 12px;
      color: #ddd6fe;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      line-height: 1.35;
    }

    .starter-question-btn:hover {
      background: rgba(124, 58, 237, 0.18);
      border-color: rgba(124, 58, 237, 0.45);
      color: #ffffff;
      transform: translateX(2px);
    }

    /* Message Bubbles */
    .message-row {
      display: flex;
      width: 100%;
    }

    .message-row.user {
      justify-content: flex-end;
    }

    .message-row.bot {
      justify-content: flex-start;
    }

    .message-bubble {
      max-width: 84%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }

    .message-row.user .message-bubble {
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }

    .message-row.bot .message-bubble {
      background-color: #18181b;
      color: #e4e4e7;
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-bottom-left-radius: 4px;
    }

    .message-bubble a {
      color: #a78bfa;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .message-bubble a:hover {
      color: #c4b5fd;
    }

    /* Sources citation pill row */
    .sources-container {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .source-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(124, 58, 237, 0.25);
      color: #c4b5fd;
      padding: 2px 7px;
      border-radius: 4px;
      text-decoration: none;
      transition: all 0.15s;
    }

    .source-pill:hover {
      background: rgba(124, 58, 237, 0.25);
      color: #ffffff;
    }

    /* Typing Dots */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 4px;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #a1a1aa;
      animation: typingPulse 1.2s infinite ease-in-out;
    }

    .typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingPulse {
      0%, 80%, 100% {
        transform: scale(0.6);
        opacity: 0.4;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Footer / Input Area */
    .chat-footer {
      padding: 12px 14px;
      background: #121215;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #18181b;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 4px 6px 4px 12px;
      transition: border-color 0.15s;
    }

    .input-form:focus-within {
      border-color: #7c3aed;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25);
    }

    .chat-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 13px;
      line-height: 1.4;
      resize: none;
      max-height: 80px;
      padding: 6px 0;
    }

    .chat-input::placeholder {
      color: #71717a;
    }

    .send-btn {
      background: #7c3aed;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      background: #6d28d9;
      transform: scale(1.05);
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .branding-footer {
      text-align: center;
      font-size: 10px;
      color: #52525b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .branding-footer span {
      color: #71717a;
      font-weight: 500;
    }

    /* Session Message Rate Limit Card */
    .session-limit-card {
      margin: 12px 16px;
      padding: 12px 14px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      text-align: center;
    }
    .session-limit-text {
      font-size: 12px;
      color: #fde68a;
      line-height: 1.4;
    }
    .session-limit-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .session-limit-btn:hover {
      background: #6d28d9;
    }

    /* Mobile Responsive */
    @media (max-width: 480px) {
      .widget-root {
        bottom: 16px;
        right: 16px;
      }
      .chat-window {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        border: none;
      }
    }
  `;
  shadow.appendChild(styleEl);

  // Widget HTML structure
  const rootDiv = document.createElement("div");
  rootDiv.className = "widget-root";
  rootDiv.innerHTML = `
    <!-- Expandable Chat Window -->
    <div class="chat-window" id="cb-chat-window">
      <div class="chat-header">
        <div class="header-info">
          <div class="bot-avatar" id="cb-bot-avatar">AI</div>
          <div class="bot-title-area">
            <span class="bot-name" id="cb-bot-name">AI Assistant</span>
            <span class="bot-status-pill">
              <span class="bot-status-indicator"></span>
              <span id="cb-bot-status-text">Online</span>
            </span>
          </div>
        <div class="header-actions">
          <button class="header-action-btn" id="cb-header-reset" aria-label="Restart Conversation" title="Restart conversation (clears history)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
          <button class="header-close-btn" id="cb-header-close" aria-label="Close Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="chat-body" id="cb-chat-body">
        <div class="welcome-card" id="cb-welcome-card">
          <span class="welcome-title" id="cb-welcome-title">How can we help you today?</span>
          <span class="welcome-desc" id="cb-welcome-desc">
            Ask any question about our services, products, or documentation.
          </span>
          <div class="starter-questions" id="cb-starter-questions"></div>
        </div>
      </div>

      <div class="chat-footer">
        <form class="input-form" id="cb-chat-form">
          <input
            type="text"
            class="chat-input"
            id="cb-chat-input"
            placeholder="Type your message…"
            autocomplete="off"
          />
          <button type="submit" class="send-btn" id="cb-send-btn" aria-label="Send message">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div class="branding-footer">
          Powered by <span>Chatbot Studio</span>
        </div>
      </div>
    </div>

    <!-- Floating Toggle Launcher Button -->
    <button class="launcher-btn" id="cb-launcher-btn" aria-label="Open Chat">
      <div class="status-dot"></div>
      <svg class="launcher-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg class="close-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  shadow.appendChild(rootDiv);

  // Element handles
  const launcherBtn = shadow.getElementById("cb-launcher-btn");
  const chatWindow = shadow.getElementById("cb-chat-window");
  const headerClose = shadow.getElementById("cb-header-close");
  const headerReset = shadow.getElementById("cb-header-reset");
  const botNameEl = shadow.getElementById("cb-bot-name");
  const botAvatarEl = shadow.getElementById("cb-bot-avatar");
  const statusTextEl = shadow.getElementById("cb-bot-status-text");
  const welcomeTitleEl = shadow.getElementById("cb-welcome-title");
  const welcomeDescEl = shadow.getElementById("cb-welcome-desc");
  const starterQuestionsEl = shadow.getElementById("cb-starter-questions");
  const chatBody = shadow.getElementById("cb-chat-body");
  const chatForm = shadow.getElementById("cb-chat-form");
  const chatInput = shadow.getElementById("cb-chat-input");
  const sendBtn = shadow.getElementById("cb-send-btn");

  // Toggle Function
  function toggleWidget(show) {
    isOpen = typeof show === "boolean" ? show : !isOpen;
    if (isOpen) {
      chatWindow.classList.add("open");
      launcherBtn.classList.add("open");
      setTimeout(() => chatInput.focus(), 150);
    } else {
      chatWindow.classList.remove("open");
      launcherBtn.classList.remove("open");
    }
  }

  launcherBtn.addEventListener("click", () => toggleWidget());
  headerClose.addEventListener("click", () => toggleWidget(false));
  if (headerReset) {
    headerReset.addEventListener("click", () => {
      resetSession();
    });
  }

  // Escape key closes modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleWidget(false);
    }
  });

  // Markdown-like basic link formatting
  function formatMessageText(text) {
    if (!text) return "";
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Markdown links [title](url)
    formatted = formatted.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Raw links
    formatted = formatted.replace(
      /(?<!href=")(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Newlines
    formatted = formatted.replace(/\n/g, "<br />");
    return formatted;
  }

  function appendMessage(sender, text, sources) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = formatMessageText(text);

    // Render source pills if provided
    if (sources && sources.length > 0) {
      const sourcesDiv = document.createElement("div");
      sourcesDiv.className = "sources-container";

      const validSources = sources
        .filter((s) => s.source_url || s.canonical_url)
        .slice(0, 3);

      validSources.forEach((source) => {
        const url = source.canonical_url || source.source_url;
        let title = source.title;
        if (!title) {
          try {
            title = new URL(url).hostname.replace(/^www\./, "");
          } catch {
            title = "Reference";
          }
        }

        const pill = document.createElement("a");
        pill.className = "source-pill";
        pill.href = url;
        pill.target = "_blank";
        pill.rel = "noopener noreferrer";
        pill.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span>${title}</span>
        `;
        sourcesDiv.appendChild(pill);
      });

      if (validSources.length > 0) {
        bubble.appendChild(sourcesDiv);
      }
    }

    row.appendChild(bubble);
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const row = document.createElement("div");
    row.className = "message-row bot typing-row";
    row.id = "cb-typing-indicator";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;

    row.appendChild(bubble);
    chatBody.appendChild(row);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = shadow.getElementById("cb-typing-indicator");
    if (el) el.remove();
  }

  function renderSessionLimitBanner(limit) {
    if (shadow.getElementById("cb-session-limit-card")) return;

    const card = document.createElement("div");
    card.id = "cb-session-limit-card";
    card.className = "session-limit-card";
    card.innerHTML = `
      <div class="session-limit-text">
        <strong>Session Message Limit Reached</strong><br />
        You've reached the maximum limit of ${limit} questions for this session. Please refresh or click below to start a new chat.
      </div>
      <button type="button" class="session-limit-btn" id="cb-reset-session-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M23 4v6h-6"></path>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Start New Session</span>
      </button>
    `;

    chatBody.appendChild(card);
    chatBody.scrollTop = chatBody.scrollHeight;

    const resetBtn = card.querySelector("#cb-reset-session-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetSession();
      });
    }

    chatInput.disabled = true;
    chatInput.placeholder = "Session message limit reached.";
    sendBtn.disabled = true;
  }

  function getStorageKey() {
    return "cb_convo_" + (publicId || "default");
  }

  function loadStoredHistory() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-5);
      }
    } catch {
      // LocalStorage access might be restricted or corrupted
    }
    return [];
  }

  function saveStoredHistory() {
    try {
      const trimmed = messages.slice(-5).map((m) => ({
        role: m.role === "bot" ? "assistant" : m.role,
        content: m.content,
        sources: m.sources || [],
      }));
      localStorage.setItem(getStorageKey(), JSON.stringify(trimmed));
    } catch {
      // LocalStorage might be full or restricted
    }
  }

  function clearStoredHistory() {
    try {
      localStorage.removeItem(getStorageKey());
    } catch {}
  }

  function restoreHistory() {
    const saved = loadStoredHistory();
    if (saved && saved.length > 0) {
      messages = saved;
      const welcomeCard = shadow.getElementById("cb-welcome-card");
      if (welcomeCard) {
        welcomeCard.style.display = "none";
      }
      messages.forEach((msg) => {
        const sender = msg.role === "assistant" || msg.role === "bot" ? "bot" : "user";
        appendMessage(sender, msg.content, msg.sources || []);
      });
    }
  }

  function resetSession() {
    sessionMessageCount = 0;
    messages = [];
    clearStoredHistory();
    const rows = chatBody.querySelectorAll(".message-row");
    rows.forEach((r) => r.remove());
    const banner = shadow.getElementById("cb-session-limit-card");
    if (banner) banner.remove();
    const welcomeCard = shadow.getElementById("cb-welcome-card");
    if (welcomeCard) welcomeCard.style.display = "block";
    chatInput.disabled = false;
    chatInput.placeholder = "Type your question…";
    sendBtn.disabled = false;
    chatInput.focus();
  }

  async function handleSendQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    const limit = botConfig.sessionMessageLimit;
    if (typeof limit === "number" && limit > 0 && sessionMessageCount >= limit) {
      renderSessionLimitBanner(limit);
      return;
    }

    sessionMessageCount++;

    // Hide welcome card once a conversation begins
    const welcomeCard = shadow.getElementById("cb-welcome-card");
    if (welcomeCard) {
      welcomeCard.style.display = "none";
    }

    // Capture the previous history (up to last 5 messages) to provide conversational memory to the LLM
    const historyToSend = messages.slice(-5).map((m) => ({
      role: m.role === "bot" ? "assistant" : m.role,
      content: m.content,
    }));

    appendMessage("user", trimmed);
    messages.push({ role: "user", content: trimmed });
    if (messages.length > 5) messages = messages.slice(-5);
    saveStoredHistory();

    chatInput.value = "";
    isSending = true;
    sendBtn.disabled = true;

    showTypingIndicator();

    try {
      const response = await fetch(`${apiHost}/api/v1/public/chatbots/${publicId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          chatHistory: historyToSend,
        }),
      });

      removeTypingIndicator();

      if (!response.ok) {
        throw new Error("Unable to receive answer");
      }

      const data = await response.json();
      const answer =
        data.data?.answer ||
        data.answer ||
        "I couldn't process your request. Please try again.";
      const sources = data.data?.sources || data.sources || [];

      appendMessage("bot", answer, sources);
      messages.push({ role: "assistant", content: answer, sources });
      if (messages.length > 5) messages = messages.slice(-5);
      saveStoredHistory();
    } catch {
      removeTypingIndicator();
      appendMessage(
        "bot",
        "We are having trouble reaching our assistant right now. Please try again in a few moments."
      );
    } finally {
      isSending = false;
      const currentLimit = botConfig.sessionMessageLimit;
      if (typeof currentLimit === "number" && currentLimit > 0 && sessionMessageCount >= currentLimit) {
        renderSessionLimitBanner(currentLimit);
      } else {
        sendBtn.disabled = false;
        chatInput.focus();
      }
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSendQuestion(chatInput.value);
  });

  // Fetch Public Configuration
  async function loadConfig() {
    if (!publicId) return;

    try {
      const res = await fetch(`${apiHost}/api/v1/public/chatbots/${publicId}`);
      if (!res.ok) return;

      const body = await res.json();
      const cfg = body.data || body;
      botConfig = { ...botConfig, ...cfg };

      // Update UI elements
      botNameEl.textContent = botConfig.name || "AI Assistant";
      const initial = (botConfig.name || "A").charAt(0).toUpperCase();
      botAvatarEl.textContent = initial;

      if (!botConfig.isPublished || botConfig.status !== "ACTIVE") {
        statusTextEl.textContent = "Offline (Paused)";
        statusTextEl.style.color = "#a1a1aa";
      } else {
        statusTextEl.textContent = "Online";
        statusTextEl.style.color = "#10b981";
      }

      welcomeTitleEl.textContent = `Welcome to ${botConfig.name}`;
      welcomeDescEl.textContent =
        botConfig.description || "Ask anything about our services, products, or docs.";

      // Populate starter questions
      starterQuestionsEl.innerHTML = "";
      const questions =
        botConfig.starterQuestions && botConfig.starterQuestions.length > 0
          ? botConfig.starterQuestions.slice(0, 3)
          : [
              "What services do you offer?",
              "How can I get started?",
              "Where can I find more details?",
            ];

      questions.forEach((q) => {
        const qBtn = document.createElement("button");
        qBtn.type = "button";
        qBtn.className = "starter-question-btn";
        qBtn.textContent = q;
        qBtn.addEventListener("click", () => handleSendQuestion(q));
        starterQuestionsEl.appendChild(qBtn);
      });
    } catch {
      // Non-blocking fallback
    }
  }

  // Load config & restore stored conversation on mount
  loadConfig();
  restoreHistory();

  // Expose global interface for testing or programmatic triggering
  window.ChatbotWidget = {
    open: () => toggleWidget(true),
    close: () => toggleWidget(false),
    toggle: () => toggleWidget(),
    show: () => {
      if (!document.body.contains(host)) {
        document.body.appendChild(host);
      }
      host.style.display = "block";
    },
    hide: () => {
      toggleWidget(false);
      host.style.display = "none";
    },
    destroy: () => {
      try {
        host.remove();
      } catch {}
      window.__CHATBOT_BUILDER_WIDGET_LOADED__ = false;
      try {
        delete window.ChatbotWidget;
      } catch {}
      const script = document.getElementById("cb-live-preview-script");
      if (script) script.remove();
    },
    init: (newPublicId, newApiHost) => {
      const idChanged = newPublicId && newPublicId !== publicId;
      if (newPublicId) publicId = newPublicId;
      if (newApiHost) apiHost = newApiHost;
      if (!document.body.contains(host)) {
        document.body.appendChild(host);
      }
      host.style.display = "block";
      if (idChanged) {
        const rows = chatBody.querySelectorAll(".message-row");
        rows.forEach((r) => r.remove());
        restoreHistory();
      }
      loadConfig();
    },
  };
})();
