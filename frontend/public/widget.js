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
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .widget-root {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 14px;
      z-index: 2147483647;
      pointer-events: auto;
    }

    /* Floating Launcher Button */
    .launcher-btn {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      box-shadow: 0 10px 32px -4px rgba(124, 58, 237, 0.55), 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      color: #ffffff;
      outline: none;
    }

    .launcher-btn:hover {
      transform: scale(1.08) translateY(-2px);
      box-shadow: 0 14px 38px -4px rgba(124, 58, 237, 0.7), 0 6px 16px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.45);
    }

    .launcher-btn:active {
      transform: scale(0.96);
    }

    .launcher-icon, .close-icon {
      position: absolute;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .launcher-btn.open .launcher-icon {
      opacity: 0;
      transform: rotate(90deg) scale(0.4);
    }

    .launcher-btn.open .close-icon {
      opacity: 1;
      transform: rotate(0deg) scale(1);
    }

    .launcher-btn:not(.open) .close-icon {
      opacity: 0;
      transform: rotate(-90deg) scale(0.4);
    }

    .status-dot {
      position: absolute;
      top: 1px;
      right: 1px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: #10b981;
      border: 2.5px solid #0d0d11;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.8);
      animation: pulseGreen 2.5s infinite;
    }

    @keyframes pulseGreen {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
      }
      50% {
        transform: scale(1.15);
        box-shadow: 0 0 12px rgba(16, 185, 129, 1);
      }
    }

    /* Chat Window Card */
    .chat-window {
      width: 395px;
      height: 620px;
      max-height: calc(100vh - 105px);
      max-width: calc(100vw - 32px);
      background-color: #0d0d12;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 32px -4px rgba(124, 58, 237, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.96);
      pointer-events: none;
      transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      visibility: hidden;
      backdrop-filter: blur(20px);
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
      background: linear-gradient(180deg, rgba(124, 58, 237, 0.15) 0%, rgba(18, 18, 24, 0.98) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1;
    }

    .bot-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .bot-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: 1.5px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
    }

    .bot-title-area {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .bot-name {
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 210px;
    }

    .bot-status-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #34d399;
      font-size: 11.5px;
      font-weight: 500;
      margin-top: 3px;
    }

    .bot-status-indicator {
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
      background-color: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.9);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .header-action-btn,
    .header-close-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #a1a1aa;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .header-action-btn:hover,
    .header-close-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
      transform: translateY(-1px);
    }

    /* Message Body */
    .chat-body {
      flex: 1 1 0%;
      min-height: 0;
      overflow-y: auto;
      padding: 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      scroll-behavior: smooth;
      background-color: #0d0d12;
      background-image: radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.06) 0%, transparent 60%);
    }

    .chat-body::-webkit-scrollbar {
      width: 5px;
    }

    .chat-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.14);
      border-radius: 6px;
    }

    /* Welcome Hero Area */
    .welcome-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 14px;
      margin: auto 0;
      gap: 16px;
      animation: fadeInHero 0.3s ease-out;
    }

    @keyframes fadeInHero {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hero-badge-icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 8px 24px -4px rgba(124, 58, 237, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
    }

    .hero-text-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .welcome-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    .welcome-desc {
      font-size: 13px;
      color: #a1a1aa;
      line-height: 1.5;
      max-width: 310px;
    }

    .suggested-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .suggested-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
      font-weight: 600;
      text-align: left;
      display: flex;
      align-items: center;
      gap: 5px;
      padding-left: 2px;
    }

    .starter-questions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .starter-question-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      padding: 11px 14px;
      color: #f4f4f5;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      line-height: 1.4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .starter-question-btn:hover {
      background: rgba(124, 58, 237, 0.14);
      border-color: rgba(124, 58, 237, 0.4);
      color: #ffffff;
      transform: translateX(3px);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    .starter-question-btn svg {
      opacity: 0.4;
      transition: opacity 0.2s, transform 0.2s;
      flex-shrink: 0;
    }

    .starter-question-btn:hover svg {
      opacity: 1;
      transform: translateX(2px);
      color: #c4b5fd;
    }

    .trust-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #71717a;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 4px 10px;
      border-radius: 20px;
      margin-top: 4px;
    }

    /* Message Bubbles */
    .message-row {
      display: flex;
      width: 100%;
      gap: 8px;
      animation: fadeInMsg 0.25s ease-out;
    }

    @keyframes fadeInMsg {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-row.user {
      justify-content: flex-end;
    }

    .message-row.bot {
      justify-content: flex-start;
      align-items: flex-end;
    }

    .bot-msg-avatar {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      margin-bottom: 2px;
    }

    .message-bubble {
      max-width: 82%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.55;
      word-break: break-word;
    }

    .message-row.user .message-bubble {
      background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
      color: #ffffff;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.28);
    }

    .message-row.bot .message-bubble {
      background-color: #17171d;
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }

    .message-bubble a {
      color: #93c5fd;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .message-bubble a:hover {
      color: #bfdbfe;
    }

    /* Sources citation pill row */
    .sources-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .sources-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #a1a1aa;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .source-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .source-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #c4b5fd;
      padding: 3px 9px;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .source-pill:hover {
      background: rgba(124, 58, 237, 0.2);
      border-color: rgba(124, 58, 237, 0.4);
      color: #ffffff;
      transform: translateY(-1px);
    }

    /* Typing Dots */
    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 6px;
    }

    .typing-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #a78bfa;
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
        opacity: 0.35;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }

    /* Footer / Input Area */
    .chat-footer {
      padding: 14px 16px 14px 16px;
      background: #111115;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex-shrink: 0;
    }

    .input-form {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #17171d;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 26px;
      padding: 5px 6px 5px 16px;
      transition: all 0.2s ease;
    }

    .input-form:focus-within {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
      background: #1a1a22;
    }

    .chat-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #ffffff;
      font-size: 13.5px;
      line-height: 1.4;
      padding: 6px 0;
    }

    .chat-input::placeholder {
      color: #71717a;
    }

    .send-btn {
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.06);
      filter: brightness(1.1);
    }

    .send-btn:active:not(:disabled) {
      transform: scale(0.96);
    }

    .send-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }

    .branding-footer {
      text-align: center;
      font-size: 11px;
      color: #71717a;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .branding-footer strong {
      color: #a1a1aa;
      font-weight: 600;
    }

    /* Session Message Rate Limit Card */
    .session-limit-card {
      margin: 12px 14px;
      padding: 14px 16px;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      text-align: center;
      animation: fadeInMsg 0.25s ease-out;
    }

    .session-limit-text {
      font-size: 12.5px;
      color: #fde68a;
      line-height: 1.45;
    }

    .session-limit-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #7c3aed;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      border-radius: 8px;
      font-size: 12px;
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
          <div class="bot-avatar-wrap">
            <div class="bot-avatar" id="cb-bot-avatar">AI</div>
          </div>
          <div class="bot-title-area">
            <span class="bot-name" id="cb-bot-name">AI Assistant</span>
            <span class="bot-status-pill">
              <span class="bot-status-indicator"></span>
              <span id="cb-bot-status-text">Online • Instant Answers</span>
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" id="cb-header-reset" aria-label="Restart Conversation" title="Restart chat (clears history)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
          <button class="header-close-btn" id="cb-header-close" aria-label="Close Chat" title="Close chat">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="chat-body" id="cb-chat-body">
        <div class="welcome-hero" id="cb-welcome-hero">
          <div class="hero-badge-icon" id="cb-hero-icon">✨</div>
          <div class="hero-text-wrap">
            <h3 class="welcome-title" id="cb-welcome-title">How can we help today?</h3>
            <p class="welcome-desc" id="cb-welcome-desc">
              Ask anything about our products, services, or documentation.
            </p>
          </div>

          <div class="suggested-section" id="cb-suggested-section">
            <span class="suggested-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Suggested Questions
            </span>
            <div class="starter-questions" id="cb-starter-questions"></div>
          </div>

          <div class="trust-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Verified answers grounded in site content</span>
          </div>
        </div>
      </div>

      <div class="chat-footer">
        <form class="input-form" id="cb-chat-form">
          <input
            type="text"
            class="chat-input"
            id="cb-chat-input"
            placeholder="Ask a question..."
            autocomplete="off"
          />
          <button type="submit" class="send-btn" id="cb-send-btn" aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
        <div class="branding-footer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Powered by <strong>Chatbot Studio</strong>
        </div>
      </div>
    </div>

    <!-- Floating Toggle Launcher Button -->
    <button class="launcher-btn" id="cb-launcher-btn" aria-label="Open Chat">
      <div class="status-dot"></div>
      <svg class="launcher-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg class="close-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
  const heroIconEl = shadow.getElementById("cb-hero-icon");
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

  // Markdown formatting
  function formatMessageText(text) {
    if (!text) return "";
    let formatted = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Markdown bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

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

    if (sender === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "bot-msg-avatar";
      avatar.textContent = (botConfig.name || "A").charAt(0).toUpperCase();
      row.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML = formatMessageText(text);

    // Render source pills if provided
    if (sources && sources.length > 0) {
      const validSources = sources
        .filter((s) => s.source_url || s.canonical_url)
        .slice(0, 3);

      if (validSources.length > 0) {
        const sourcesDiv = document.createElement("div");
        sourcesDiv.className = "sources-container";

        const label = document.createElement("div");
        label.className = "sources-label";
        label.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span>Sources</span>
        `;
        sourcesDiv.appendChild(label);

        const pillsRow = document.createElement("div");
        pillsRow.className = "source-pills-row";

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
          pill.title = url;
          pill.innerHTML = `
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>${title}</span>
          `;
          pillsRow.appendChild(pill);
        });

        sourcesDiv.appendChild(pillsRow);
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

    const avatar = document.createElement("div");
    avatar.className = "bot-msg-avatar";
    avatar.textContent = (botConfig.name || "A").charAt(0).toUpperCase();
    row.appendChild(avatar);

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
        <strong>Session Limit Reached</strong><br />
        You've reached the maximum limit of ${limit} questions for this session. Please start a new session below.
      </div>
      <button type="button" class="session-limit-btn" id="cb-reset-session-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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

  const MAX_STORED_HISTORY = 100; // Store extensive conversation history in localStorage

  function loadStoredHistory() {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_STORED_HISTORY);
      }
    } catch {
      // LocalStorage access restricted
    }
    return [];
  }

  function saveStoredHistory() {
    try {
      const serialized = messages.slice(-MAX_STORED_HISTORY).map((m) => ({
        role: m.role === "bot" ? "assistant" : m.role,
        content: m.content,
        sources: m.sources || [],
      }));
      localStorage.setItem(getStorageKey(), JSON.stringify(serialized));
    } catch {
      // LocalStorage restricted or full
    }
  }

  function clearStoredHistory() {
    try {
      localStorage.removeItem(getStorageKey());
    } catch {}
  }

  /**
   * Extracts up to the last 5 turns of conversation (up to 10 messages:
   * 5 user questions and 5 assistant answers) to provide memory context to the LLM.
   */
  function getRecentTurnHistory(msgs, maxTurns = 5) {
    const maxMessages = maxTurns * 2;
    const recent = msgs.slice(-maxMessages);
    return recent
      .filter((m) => m && m.content && String(m.content).trim().length > 0)
      .map((m) => ({
        role: m.role === "bot" ? "assistant" : (m.role === "user" ? "user" : "assistant"),
        content: String(m.content).trim(),
      }));
  }

  function restoreHistory() {
    const saved = loadStoredHistory();
    if (saved && saved.length > 0) {
      messages = saved;
      const hero = shadow.getElementById("cb-welcome-hero");
      if (hero) {
        hero.style.display = "none";
      }
      messages.forEach((msg) => {
        const sender = msg.role === "assistant" || msg.role === "bot" ? "bot" : "user";
        appendMessage(sender, msg.content, msg.sources || []);
      });
      chatBody.scrollTop = chatBody.scrollHeight;
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
    const hero = shadow.getElementById("cb-welcome-hero");
    if (hero) hero.style.display = "flex";
    chatInput.disabled = false;
    chatInput.placeholder = `Ask anything about ${botConfig.name || "us"}...`;
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

    // Hide welcome hero once a conversation begins
    const hero = shadow.getElementById("cb-welcome-hero");
    if (hero) {
      hero.style.display = "none";
    }

    // Capture memory history (last 5 questions and answers = up to 10 messages)
    const historyToSend = getRecentTurnHistory(messages, 5);

    appendMessage("user", trimmed);
    messages.push({ role: "user", content: trimmed });
    if (messages.length > MAX_STORED_HISTORY) {
      messages = messages.slice(-MAX_STORED_HISTORY);
    }
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
      if (messages.length > MAX_STORED_HISTORY) {
        messages = messages.slice(-MAX_STORED_HISTORY);
      }
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
      const name = botConfig.name || "AI Assistant";
      botNameEl.textContent = name;
      const initial = name.charAt(0).toUpperCase();
      botAvatarEl.textContent = initial;
      if (heroIconEl) heroIconEl.textContent = initial;

      chatInput.placeholder = `Ask anything about ${name}...`;

      const statusIndicator = shadow.querySelector(".bot-status-indicator");
      const launcherStatusDot = shadow.querySelector(".status-dot");

      // Give modern, helpful status
      if (botConfig.status === "ACTIVE" && botConfig.isPublished) {
        statusTextEl.textContent = "Online • Replies instantly";
        statusTextEl.style.color = "#34d399";
        if (statusIndicator) {
          statusIndicator.style.backgroundColor = "#10b981";
          statusIndicator.style.boxShadow = "0 0 8px rgba(16, 185, 129, 0.9)";
        }
        if (launcherStatusDot) {
          launcherStatusDot.style.backgroundColor = "#10b981";
        }
      } else {
        // If in preview or draft mode, present cleanly as ready for interactive preview
        statusTextEl.textContent = "Preview Mode • Ready";
        statusTextEl.style.color = "#a78bfa";
        if (statusIndicator) {
          statusIndicator.style.backgroundColor = "#8b5cf6";
          statusIndicator.style.boxShadow = "0 0 8px rgba(139, 92, 246, 0.9)";
        }
        if (launcherStatusDot) {
          launcherStatusDot.style.backgroundColor = "#8b5cf6";
        }
      }

      welcomeTitleEl.textContent = `Welcome to ${name}!`;
      welcomeDescEl.textContent =
        botConfig.description ||
        `Ask any question about our services, products, or documentation.`;

      // Populate starter questions
      starterQuestionsEl.innerHTML = "";
      const questions =
        botConfig.starterQuestions && botConfig.starterQuestions.length > 0
          ? botConfig.starterQuestions.slice(0, 3)
          : [
              `What products or services do you offer?`,
              `How do I get started?`,
              `Where can I find pricing or subscription plans?`,
            ];

      questions.forEach((q) => {
        const qBtn = document.createElement("button");
        qBtn.type = "button";
        qBtn.className = "starter-question-btn";
        qBtn.innerHTML = `
          <span>${q}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;
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
