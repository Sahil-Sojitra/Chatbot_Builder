export interface LLMModelOption {
  value: string;
  label: string;
}

export interface LLMProviderOption {
  value: string;
  label: string;
  defaultModel: string;
  keyPlaceholder: string;
  keyPrefixHint: string;
  docsUrl: string;
}

export const LLM_PROVIDERS: readonly LLMProviderOption[] = [
  {
    value: "openai",
    label: "OpenAI",
    defaultModel: "gpt-5.4-mini",
    keyPlaceholder: "sk-proj-...",
    keyPrefixHint: "OpenAI keys typically start with sk-",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    value: "google",
    label: "Google Gemini",
    defaultModel: "gemini-3.8-flash",
    keyPlaceholder: "AIzaSy...",
    keyPrefixHint: "Google Gemini keys start with AIzaSy",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    value: "anthropic",
    label: "Anthropic Claude",
    defaultModel: "claude-sonnet-5-5",
    keyPlaceholder: "sk-ant-...",
    keyPrefixHint: "Anthropic keys typically start with sk-ant-",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    value: "groq",
    label: "Groq (Ultra-Fast)",
    defaultModel: "llama-3.3-70b-versatile",
    keyPlaceholder: "gsk_...",
    keyPrefixHint: "Groq keys typically start with gsk_",
    docsUrl: "https://console.groq.com/keys",
  },
] as const;

export const LLM_MODELS_BY_PROVIDER: Record<string, LLMModelOption[]> = {
  openai: [
    // GPT-6 & GPT-5.6 Tier
    { value: "gpt-6-sol", label: "GPT-6 Sol (Complex Coding & Agents)" },
    { value: "gpt-5.6-sol", label: "GPT-5.6 Sol (Flagship Professional)" },
    { value: "gpt-5.6-terra", label: "GPT-5.6 Terra (Balanced Cost & Intel)" },
    { value: "gpt-5.6-luna", label: "GPT-5.6 Luna (Cost-Optimized)" },

    // GPT-5.5 & GPT-5.4 Tier
    { value: "gpt-5.5-pro", label: "GPT-5.5 Pro (Precise & Smart)" },
    { value: "gpt-5.5", label: "GPT-5.5 (Coding & Professional)" },
    { value: "gpt-5.4-pro", label: "GPT-5.4 Pro (Precise Coding)" },
    { value: "gpt-5.4", label: "GPT-5.4 (Affordable Coding & Work)" },
    { value: "gpt-5.4-mini", label: "GPT-5.4 Mini (Strong Mini Model)" },

    // GPT-5.2 & GPT-5 Tier
    { value: "gpt-5.2-pro", label: "GPT-5.2 Pro (Configurable Reasoning)" },
    { value: "gpt-5.2", label: "GPT-5.2 (Professional Work)" },
    { value: "gpt-5-pro", label: "GPT-5 Pro (Intelligent Reasoning)" },
    { value: "gpt-5", label: "GPT-5 (Intelligent Reasoning)" },
    { value: "gpt-5-mini", label: "GPT-5 Mini (Low Latency, High Volume)" },
    { value: "gpt-5-nano", label: "GPT-5 nano (Fastest, Cost-Efficient)" },

    // Reasoning & Staples
    { value: "o3-pro", label: "o3-pro (High-Compute Reasoning)" },
    { value: "o3", label: "o3 (Reasoning)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast & Reliable)" },
    { value: "gpt-4o", label: "GPT-4o (High Intelligence)" },
  ],

  google: [
    // Gemini 4 Family
    { value: "gemini-4-argon", label: "Gemini 4 Argon (Flagship Reasoning)" },

    // Gemini 3 Family (Speed & Efficiency)
    { value: "gemini-3.8-flash", label: "Gemini 3.8 Flash (Speed & Efficiency)" },
    { value: "gemini-3.8-live", label: "Gemini 3.8 Live (Real-Time)" },
    { value: "gemini-3.8-live-extended-thinking", label: "Gemini 3.8 Live Extended Thinking" },
    { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash (Fast & Balanced)" },
    { value: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (Low Latency)" },
    { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (Cost-Effective)" },
    { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },

    // Gemini 2.5 & Standard Staples
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (High Capability)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Proven Workhorse)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Deep Context)" },
  ],

  anthropic: [
    // Claude 5.5 & 5.1 Next-Gen (1M Context)
    { value: "claude-fable-5-1", label: "Claude Fable 5.1 (1M Context - Enterprise)" },
    { value: "claude-mythos-5-1", label: "Claude Mythos 5.1 (1M Context - Agentic)" },
    { value: "claude-opus-5-5", label: "Claude Opus 5.5 (1M Context - Deep Research)" },
    { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (1M Context)" },
    { value: "claude-haiku-5-5", label: "Claude Haiku 5.5 (1M Context - Fast Scale)" },

    // Claude 5 & 4 Tiers
    { value: "claude-opus-5", label: "Claude Opus 5 (Advanced Coding)" },
    { value: "claude-fable-5", label: "Claude Fable 5 (Multi-Stage Tasks)" },
    { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
    { value: "claude-sonnet-5", label: "Claude Sonnet 5 (General Instruction)" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (High Speed)" },

    // Production Legacy Snapshots
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Legacy Stable)" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Legacy Fast)" },
  ],

  groq: [
    // Meta Llama
    { value: "llama-3.3-70b-versatile", label: "Meta Llama 3.3 70B (Versatile)" },
    { value: "llama-3.1-8b-instant", label: "Meta Llama 3.1 8B Instant (Ultra-Fast)" },

    // OpenAI GPT-OSS (MoE)
    { value: "gpt-oss-120b", label: "OpenAI GPT-OSS 120B (Balanced RAG)" },
    { value: "gpt-oss-20b", label: "OpenAI GPT-OSS 20B (Fast Agentic Loops)" },

    // Alibaba Qwen & MiniMax
    { value: "qwen/qwen3.8-27b", label: "Alibaba Qwen 3.8 27B (Math & Dense)" },
    { value: "minimax-m2.7", label: "MiniMax M2.7 (Extended Context)" },
    { value: "meta-models/muse-spark-open", label: "Muse Spark (Reasoning MoE)" },
  ],
};
