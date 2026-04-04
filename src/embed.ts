/**
 * embedChat — drop a fully-customisable AI chat widget into any webpage.
 * Supports all 17 providers via AIClient under the hood.
 */

// BUG FIX: import AbortableStream from "./client" directly, NOT from "./index".
// Importing from "./index" created a circular dependency:
//   index.ts → embed.ts → index.ts
import { AIClient } from "./client";
import type { ProviderName, AbortableStream } from "./client";
import type { Message } from "./providers/base";

export interface EmbedChatBehavior {
  allowTopics?: string[];
  blockTopics?: string[];
  personality?: string;
  rules?: string[];
  language?: string;
  replyLength?: "short" | "medium" | "long";
}

export interface EmbedChatTheme {
  primaryColor?: string;
  panelBackground?: string;
  userBubbleColor?: string;
  userBubbleText?: string;
  assistantBubbleColor?: string;
  assistantBubbleText?: string;
  fontFamily?: string;
  fontSize?: number;
  borderRadius?: number;
  bubbleRadius?: number;
  width?: number;
  messagesHeight?: number;
  shadow?: "none" | "soft" | "medium" | "strong";
  darkMode?: boolean;
}

export interface EmbedChatRuntimeOptions {
  modelSwitcher?: boolean | string[];
  temperatureControl?: boolean;
  maxTokensControl?: boolean;
  showTokenUsage?: boolean;
  allowClear?: boolean;
  allowCopy?: boolean;
  allowExport?: boolean;
}

export interface EmbedChatOptions {
  apiKey: string;
  provider?: ProviderName;
  assistantName?: string;
  assistantAvatar?: string;
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  suggestedQuestions?: string[];
  model?: string;
  systemPrompt?: string;
  behavior?: EmbedChatBehavior;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  autoContext?: boolean;
  maxContextChars?: number;
  contextSelector?: string;
  position?: "bottom-right" | "bottom-left";
  theme?: EmbedChatTheme;
  placeholder?: string;
  customCss?: string;
  zIndex?: number;
  controls?: EmbedChatRuntimeOptions;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (userText: string, assistantReply: string) => void;
  onError?: (error: Error) => void;
}

function scrapePageContext(maxChars = 4000, selector = "body"): string {
  if (typeof document === "undefined") return "";
  const root = document.querySelector(selector) ?? document.body;
  const tags = ["main", "article", "section", "h1", "h2", "h3", "p", "li"];
  const parts: string[] = [];
  for (const tag of tags) {
    root.querySelectorAll(tag).forEach((el) => {
      const text = (el as HTMLElement).innerText?.trim();
      if (text && text.length > 20) parts.push(text);
    });
  }
  return [...new Set(parts)].join("\n").slice(0, maxChars);
}

function buildSystemPrompt(
  options: EmbedChatOptions,
  pageContext: string
): string {
  if (options.systemPrompt) return options.systemPrompt;
  const b = options.behavior ?? {};
  const name = options.assistantName ?? "Assistant";
  const personality = b.personality ?? "helpful and concise";
  const lengthHint =
    b.replyLength === "short"
      ? "Keep replies to 1-2 sentences."
      : b.replyLength === "long"
        ? "Provide detailed, thorough answers."
        : "Keep replies to a short paragraph.";
  const lang = b.language ? `Always respond in ${b.language}.` : "";
  const allowed = b.allowTopics?.length
    ? `You may ONLY discuss: ${b.allowTopics.join(", ")}. If asked about anything else, politely decline.`
    : "";
  const blocked = b.blockTopics?.length
    ? `You must REFUSE to discuss: ${b.blockTopics.join(", ")}.`
    : "";
  const rules = b.rules?.length
    ? `Additional rules:\n${b.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
    : "";
  const context = pageContext
    ? `\nPage context:\n---\n${pageContext}\n---`
    : "";
  return [
    `You are ${name}, a ${personality} AI assistant.`,
    lengthHint,
    lang,
    allowed,
    blocked,
    rules,
    context,
  ]
    .filter(Boolean)
    .join("\n");
}

const SHADOW_MAP: Record<string, string> = {
  none: "none",
  soft: "0 4px 16px rgba(0,0,0,.10)",
  medium: "0 8px 40px rgba(0,0,0,.18)",
  strong: "0 16px 64px rgba(0,0,0,.30)",
};

const DEFAULT_MODELS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "gpt-4o-mini",
  "gemini-2.0-flash",
];

export function embedChat(options: EmbedChatOptions): () => void {
  if (typeof document === "undefined") {
    throw new Error("embedChat() requires a browser environment.");
  }

  const {
    apiKey,
    provider = "groq",
    assistantName = "Assistant",
    assistantAvatar = "🤖",
    title,
    subtitle,
    welcomeMessage,
    suggestedQuestions = [],
    model: initialModel,
    maxTokens: initialMaxTokens = 512,
    temperature: initialTemperature = 0.7,
    topP = 1,
    autoContext = true,
    maxContextChars = 4000,
    contextSelector = "body",
    position = "bottom-right",
    placeholder = "Type a message…",
    customCss = "",
    zIndex = 99998,
    theme: t = {},
    controls: ctrl = {},
    onOpen,
    onClose,
    onMessage,
    onError,
  } = options;

  const providerSubtitle =
    subtitle ??
    `Powered by ${provider.charAt(0).toUpperCase() + provider.slice(1)}`;

  const ai = new AIClient({ provider, apiKey, model: initialModel });

  // BUG FIX: use the public getter instead of ai["adapter"].defaultModel
  // which bypassed TypeScript's private access control.
  const defaultModel = ai.resolvedDefaultModel;

  const theme = {
    primaryColor: t.primaryColor ?? "#6366f1",
    panelBackground: t.panelBackground ?? (t.darkMode ? "#1e293b" : "#ffffff"),
    userBubbleColor: t.userBubbleColor ?? t.primaryColor ?? "#6366f1",
    userBubbleText: t.userBubbleText ?? "#ffffff",
    assistantBubbleColor:
      t.assistantBubbleColor ?? (t.darkMode ? "#334155" : "#f1f5f9"),
    assistantBubbleText:
      t.assistantBubbleText ?? (t.darkMode ? "#e2e8f0" : "#1e293b"),
    fontFamily: t.fontFamily ?? "system-ui, sans-serif",
    fontSize: t.fontSize ?? 14,
    borderRadius: t.borderRadius ?? 16,
    bubbleRadius: t.bubbleRadius ?? 12,
    width: t.width ?? 370,
    messagesHeight: t.messagesHeight ?? 360,
    shadow: SHADOW_MAP[t.shadow ?? "medium"] ?? SHADOW_MAP["medium"],
    darkMode: t.darkMode ?? false,
  };

  const controls = {
    modelSwitcher: ctrl.modelSwitcher ?? false,
    temperatureControl: ctrl.temperatureControl ?? false,
    maxTokensControl: ctrl.maxTokensControl ?? false,
    showTokenUsage: ctrl.showTokenUsage ?? true,
    allowClear: ctrl.allowClear ?? true,
    allowCopy: ctrl.allowCopy ?? false,
    allowExport: ctrl.allowExport ?? false,
  };

  const modelList: string[] =
    ctrl.modelSwitcher === true
      ? DEFAULT_MODELS
      : Array.isArray(ctrl.modelSwitcher)
        ? ctrl.modelSwitcher
        : [];

  let currentModel = defaultModel;
  let currentMaxTokens = initialMaxTokens;
  let currentTemperature = initialTemperature;

  const pageContext =
    autoContext && !options.systemPrompt
      ? scrapePageContext(maxContextChars, contextSelector)
      : "";
  const systemPrompt = buildSystemPrompt(options, pageContext);

  const isRight = position === "bottom-right";
  const side = isRight ? "right: 24px;" : "left: 24px;";
  const origin = isRight ? "bottom right" : "bottom left";
  const p = theme.primaryColor,
    bg = theme.panelBackground,
    fs = theme.fontSize;
  const ff = theme.fontFamily,
    br = theme.borderRadius,
    bbr = theme.bubbleRadius;
  const w = theme.width,
    mh = theme.messagesHeight;
  const borderColor = t.darkMode ? "#334155" : "#e2e8f0";
  const inputBg = t.darkMode ? "#0f172a" : "#ffffff";
  const inputText = t.darkMode ? "#e2e8f0" : "#1e293b";
  const subtitleColor = t.darkMode
    ? "rgba(255,255,255,.55)"
    : "rgba(255,255,255,.72)";

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    #sgq-root *, #sgq-root *::before, #sgq-root *::after { box-sizing: border-box; }
    #sgq-root { font-family: ${ff}; font-size: ${fs}px; }
    #sgq-btn { position: fixed; bottom: 24px; ${side} z-index: ${zIndex}; width: 58px; height: 58px; border-radius: 50%; background: ${p}; border: none; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,.28); display: flex; align-items: center; justify-content: center; transition: transform .2s ease, box-shadow .2s ease; }
    #sgq-btn:hover { transform: scale(1.09); box-shadow: 0 6px 28px rgba(0,0,0,.34); }
    #sgq-btn-icon { width: 26px; height: 26px; fill: #fff; transition: opacity .15s; }
    #sgq-btn-close { display: none; font-size: 26px; color: #fff; line-height: 1; }
    #sgq-root.sgq-open #sgq-btn-icon { display: none; }
    #sgq-root.sgq-open #sgq-btn-close { display: block; }
    #sgq-panel { position: fixed; bottom: 94px; ${side} z-index: ${zIndex + 1}; width: ${w}px; max-width: calc(100vw - 32px); background: ${bg}; border-radius: ${br}px; box-shadow: ${theme.shadow}; display: flex; flex-direction: column; overflow: hidden; transform-origin: ${origin}; transition: opacity .22s ease, transform .22s ease; }
    #sgq-panel.sgq-hidden { opacity: 0; transform: scale(.9) translateY(12px); pointer-events: none; }
    #sgq-header { background: ${p}; color: #fff; padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
    #sgq-header-avatar { font-size: 22px; line-height: 1; flex-shrink: 0; }
    #sgq-header-info { flex: 1; min-width: 0; }
    #sgq-header-name { font-weight: 700; font-size: ${fs + 1}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #sgq-header-sub { font-size: ${fs - 2}px; color: ${subtitleColor}; margin-top: 1px; }
    #sgq-header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    #sgq-header-actions button { background: rgba(255,255,255,.18); border: none; color: #fff; cursor: pointer; border-radius: 6px; padding: 4px 7px; font-size: 14px; transition: background .15s; line-height: 1; }
    #sgq-header-actions button:hover { background: rgba(255,255,255,.32); }
    #sgq-settings { background: ${t.darkMode ? "#0f172a" : "#f8fafc"}; border-bottom: 1px solid ${borderColor}; padding: 10px 14px; display: none; flex-direction: column; gap: 8px; font-size: ${fs - 1}px; color: ${inputText}; }
    #sgq-settings.sgq-vis { display: flex; }
    #sgq-settings label { display: flex; flex-direction: column; gap: 3px; font-weight: 500; }
    #sgq-settings select, #sgq-settings input[type=range] { width: 100%; }
    #sgq-settings select { background: ${inputBg}; color: ${inputText}; border: 1.5px solid ${borderColor}; border-radius: 7px; padding: 5px 8px; font-size: ${fs - 1}px; outline: none; }
    #sgq-settings .sgq-row { display: flex; align-items: center; gap: 8px; }
    #sgq-settings .sgq-row span { min-width: 30px; text-align: right; }
    #sgq-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 12px 0; }
    .sgq-chip { background: ${t.darkMode ? "#334155" : "#f1f5f9"}; color: ${inputText}; border: 1.5px solid ${borderColor}; border-radius: 999px; padding: 5px 12px; cursor: pointer; font-size: ${fs - 1}px; transition: border-color .15s, background .15s; white-space: nowrap; }
    .sgq-chip:hover { border-color: ${p}; }
    #sgq-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; max-height: ${mh}px; min-height: 80px; scrollbar-width: thin; }
    .sgq-msg-row { display: flex; align-items: flex-end; gap: 7px; }
    .sgq-msg-row.user { flex-direction: row-reverse; }
    .sgq-msg-avatar { font-size: 18px; flex-shrink: 0; line-height: 1; margin-bottom: 2px; }
    .sgq-msg { max-width: 78%; padding: 9px 13px; border-radius: ${bbr}px; font-size: ${fs}px; line-height: 1.55; word-break: break-word; position: relative; }
    .sgq-msg.user { background: ${theme.userBubbleColor}; color: ${theme.userBubbleText}; border-bottom-right-radius: 3px; }
    .sgq-msg.assistant { background: ${theme.assistantBubbleColor}; color: ${theme.assistantBubbleText}; border-bottom-left-radius: 3px; }
    .sgq-msg.error { background: #fee2e2; color: #b91c1c; }
    .sgq-copy-btn { display: none; position: absolute; top: 5px; right: 7px; background: rgba(0,0,0,.12); border: none; border-radius: 4px; color: inherit; cursor: pointer; font-size: 11px; padding: 2px 5px; }
    .sgq-msg:hover .sgq-copy-btn { display: block; }
    .sgq-typing { display: flex; gap: 4px; align-items: center; padding: 10px 13px; background: ${theme.assistantBubbleColor}; border-radius: ${bbr}px; border-bottom-left-radius: 3px; width: fit-content; }
    .sgq-typing span { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: sgq-bounce .9s infinite; }
    .sgq-typing span:nth-child(2) { animation-delay: .18s; }
    .sgq-typing span:nth-child(3) { animation-delay: .36s; }
    @keyframes sgq-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
    #sgq-token-bar { font-size: ${fs - 3}px; color: ${t.darkMode ? "#64748b" : "#94a3b8"}; padding: 3px 14px 5px; text-align: right; }
    #sgq-footer { padding: 10px 12px; border-top: 1px solid ${borderColor}; display: flex; gap: 8px; align-items: center; background: ${bg}; }
    #sgq-input { flex: 1; border: 1.5px solid ${borderColor}; border-radius: 10px; padding: 9px 12px; font-size: ${fs}px; outline: none; background: ${inputBg}; color: ${inputText}; transition: border-color .15s; }
    #sgq-input:focus { border-color: ${p}; }
    #sgq-input::placeholder { color: ${t.darkMode ? "#475569" : "#94a3b8"}; }
    #sgq-send { background: ${p}; color: #fff; border: none; border-radius: 10px; width: 38px; height: 38px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: opacity .15s, transform .1s; flex-shrink: 0; }
    #sgq-send:hover { opacity: .88; transform: scale(1.05); }
    #sgq-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }
    ${customCss}
  `;
  document.head.appendChild(styleEl);

  const hasSettings =
    controls.modelSwitcher ||
    controls.temperatureControl ||
    controls.maxTokensControl;
  const headerTitle = title ?? assistantName;
  const modelOptions = modelList
    .map(
      (m) =>
        `<option value="${m}"${m === currentModel ? " selected" : ""}>${m}</option>`
    )
    .join("");
  const settingsHTML = hasSettings
    ? `<div id="sgq-settings">
    ${controls.modelSwitcher ? `<label>Model<select id="sgq-model-select">${modelOptions}</select></label>` : ""}
    ${controls.temperatureControl ? `<label>Temperature<div class="sgq-row"><input type="range" id="sgq-temp-slider" min="0" max="1" step="0.05" value="${currentTemperature}" /><span id="sgq-temp-val">${currentTemperature}</span></div></label>` : ""}
    ${controls.maxTokensControl ? `<label>Max tokens<div class="sgq-row"><input type="range" id="sgq-tokens-slider" min="64" max="2048" step="64" value="${currentMaxTokens}" /><span id="sgq-tokens-val">${currentMaxTokens}</span></div></label>` : ""}
  </div>`
    : "";
  const suggestionsHTML =
    suggestedQuestions.length > 0
      ? `<div id="sgq-suggestions">${suggestedQuestions.map((q) => `<button class="sgq-chip" type="button">${q}</button>`).join("")}</div>`
      : "";

  const root = document.createElement("div");
  root.id = "sgq-root";
  root.innerHTML = `
    <button id="sgq-btn" aria-label="Open chat" aria-expanded="false">
      <svg id="sgq-btn-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
      <span id="sgq-btn-close" aria-hidden="true">×</span>
    </button>
    <div id="sgq-panel" class="sgq-hidden" role="dialog" aria-label="${headerTitle}">
      <div id="sgq-header">
        <div id="sgq-header-avatar">${assistantAvatar}</div>
        <div id="sgq-header-info">
          <div id="sgq-header-name">${headerTitle}</div>
          <div id="sgq-header-sub">${providerSubtitle}</div>
        </div>
        <div id="sgq-header-actions">
          ${hasSettings ? `<button id="sgq-settings-btn" title="Settings">⚙️</button>` : ""}
          ${controls.allowClear ? `<button id="sgq-clear-btn" title="Clear chat">🗑️</button>` : ""}
          ${controls.allowExport ? `<button id="sgq-export-btn" title="Export chat">💾</button>` : ""}
          <button id="sgq-close" aria-label="Close chat">×</button>
        </div>
      </div>
      ${settingsHTML}${suggestionsHTML}
      <div id="sgq-messages" role="log" aria-live="polite"></div>
      ${controls.showTokenUsage ? `<div id="sgq-token-bar"></div>` : ""}
      <div id="sgq-footer">
        <input id="sgq-input" type="text" placeholder="${placeholder}" autocomplete="off" aria-label="Message input" />
        <button id="sgq-send" aria-label="Send message">↑</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const btn = root.querySelector("#sgq-btn") as HTMLButtonElement;
  const panel = root.querySelector("#sgq-panel") as HTMLDivElement;
  const closeBtn = root.querySelector("#sgq-close") as HTMLButtonElement;
  const messagesEl = root.querySelector("#sgq-messages") as HTMLDivElement;
  const inputEl = root.querySelector("#sgq-input") as HTMLInputElement;
  const sendBtn = root.querySelector("#sgq-send") as HTMLButtonElement;
  const tokenBar = root.querySelector(
    "#sgq-token-bar"
  ) as HTMLDivElement | null;
  const settingsPanel = root.querySelector(
    "#sgq-settings"
  ) as HTMLDivElement | null;
  const settingsBtn = root.querySelector(
    "#sgq-settings-btn"
  ) as HTMLButtonElement | null;
  const clearBtn = root.querySelector(
    "#sgq-clear-btn"
  ) as HTMLButtonElement | null;
  const exportBtn = root.querySelector(
    "#sgq-export-btn"
  ) as HTMLButtonElement | null;
  const modelSelect = root.querySelector(
    "#sgq-model-select"
  ) as HTMLSelectElement | null;
  const tempSlider = root.querySelector(
    "#sgq-temp-slider"
  ) as HTMLInputElement | null;
  const tempVal = root.querySelector("#sgq-temp-val") as HTMLSpanElement | null;
  const tokensSlider = root.querySelector(
    "#sgq-tokens-slider"
  ) as HTMLInputElement | null;
  const tokensVal = root.querySelector(
    "#sgq-tokens-val"
  ) as HTMLSpanElement | null;
  const suggestionsEl = root.querySelector(
    "#sgq-suggestions"
  ) as HTMLDivElement | null;

  let open = false;
  const history: Message[] = [{ role: "system", content: systemPrompt }];
  let totalTokens = 0;
  const estimateTokens = (s: string) => Math.ceil(s.split(/\s+/).length * 1.35);
  const scroll = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const addMsgRow = (
    role: "user" | "assistant" | "error",
    text: string
  ): HTMLElement => {
    const row = document.createElement("div");
    row.className = `sgq-msg-row ${role}`;
    if (role === "assistant") {
      const av = document.createElement("div");
      av.className = "sgq-msg-avatar";
      av.textContent = assistantAvatar;
      row.appendChild(av);
    }
    const bubble = document.createElement("div");
    bubble.className = `sgq-msg ${role}`;
    bubble.textContent = text;
    if (controls.allowCopy && (role === "user" || role === "assistant")) {
      const copyBtn = document.createElement("button");
      copyBtn.className = "sgq-copy-btn";
      copyBtn.textContent = "copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(bubble.textContent ?? "").catch(() => {});
        copyBtn.textContent = "✓";
        setTimeout(() => {
          copyBtn.textContent = "copy";
        }, 1500);
      });
      bubble.appendChild(copyBtn);
    }
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scroll();
    return bubble;
  };

  const showTyping = (): HTMLElement => {
    const row = document.createElement("div");
    row.className = "sgq-msg-row assistant";
    const av = document.createElement("div");
    av.className = "sgq-msg-avatar";
    av.textContent = assistantAvatar;
    const dots = document.createElement("div");
    dots.className = "sgq-typing";
    dots.innerHTML = "<span></span><span></span><span></span>";
    row.appendChild(av);
    row.appendChild(dots);
    messagesEl.appendChild(row);
    scroll();
    return row;
  };

  const toggle = () => {
    open = !open;
    panel.classList.toggle("sgq-hidden", !open);
    root.classList.toggle("sgq-open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      inputEl.focus();
      onOpen?.();
    } else onClose?.();
  };

  btn.addEventListener("click", toggle);
  closeBtn.addEventListener("click", toggle);
  settingsBtn?.addEventListener("click", () => {
    settingsPanel?.classList.toggle("sgq-vis");
  });
  modelSelect?.addEventListener("change", () => {
    currentModel = modelSelect.value;
  });
  tempSlider?.addEventListener("input", () => {
    currentTemperature = parseFloat(tempSlider.value);
    if (tempVal) tempVal.textContent = currentTemperature.toFixed(2);
  });
  tokensSlider?.addEventListener("input", () => {
    currentMaxTokens = parseInt(tokensSlider.value, 10);
    if (tokensVal) tokensVal.textContent = String(currentMaxTokens);
  });

  clearBtn?.addEventListener("click", () => {
    history.length = 1;
    messagesEl.innerHTML = "";
    totalTokens = 0;
    if (tokenBar) tokenBar.textContent = "";
    if (suggestionsEl) suggestionsEl.style.display = "flex";
    if (welcomeMessage) addMsgRow("assistant", welcomeMessage);
  });

  exportBtn?.addEventListener("click", () => {
    const lines = history
      .filter((m) => m.role !== "system")
      .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat-export.txt";
    a.click();
    URL.revokeObjectURL(url);
  });

  suggestionsEl?.querySelectorAll(".sgq-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      inputEl.value = (chip as HTMLElement).textContent ?? "";
      if (suggestionsEl) suggestionsEl.style.display = "none";
      sendMessage();
    });
  });

  let activeStream: AbortableStream | null = null;

  const sendMessage = async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    sendBtn.disabled = true;
    if (suggestionsEl) suggestionsEl.style.display = "none";
    addMsgRow("user", text);
    history.push({ role: "user", content: text });
    const typingRow = showTyping();
    try {
      activeStream = ai.stream(history, {
        model: currentModel,
        maxTokens: currentMaxTokens,
        temperature: currentTemperature,
        topP,
      });
      typingRow.remove();
      const bubble = addMsgRow("assistant", "");
      let fullContent = "";
      for await (const chunk of activeStream) {
        fullContent += chunk.content;
        const copyBtn = bubble.querySelector(".sgq-copy-btn");
        bubble.childNodes.forEach((n) => {
          if (n.nodeType === 3) n.remove();
        });
        bubble.insertBefore(
          document.createTextNode(fullContent),
          copyBtn ?? null
        );
        scroll();
      }
      history.push({ role: "assistant", content: fullContent });
      totalTokens += estimateTokens(text) + estimateTokens(fullContent);
      if (tokenBar)
        tokenBar.textContent = `~${totalTokens} tokens · ${currentModel}`;
      onMessage?.(text, fullContent);
    } catch (err) {
      if (typingRow.isConnected) typingRow.remove();
      const e = err instanceof Error ? err : new Error(String(err));
      addMsgRow("error", `⚠️ ${e.message}`);
      onError?.(e);
    } finally {
      activeStream = null;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  };

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  if (welcomeMessage) addMsgRow("assistant", welcomeMessage);

  return () => {
    activeStream?.cancel();
    root.remove();
    styleEl.remove();
  };
}
