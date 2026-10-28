"use client";

import { useState } from "react";

type CodeTab = "html" | "react" | "curl" | "python";

export function CodeShowcase() {
  const [activeTab, setActiveTab] = useState<CodeTab>("html");
  const [copied, setCopied] = useState(false);

  const snippets: Record<CodeTab, { title: string; filename: string; code: string }> = {
    html: {
      title: "1-Line HTML Embed",
      filename: "index.html",
      code: `<!-- Chatbot Studio Client Widget -->
<script
  src="https://cdn.chatbotstudio.io/v1/widget.js"
  data-public-id="bot_prod_94f82a"
  defer>
</script>`,
    },
    react: {
      title: "React / Next.js Component",
      filename: "ChatbotWidget.tsx",
      code: `import { ChatbotWidget } from "@chatbot-studio/react";

export function App() {
  return (
    <main>
      <h1>My Production App</h1>
      <ChatbotWidget
        publicId="bot_prod_94f82a"
        theme="dark"
        position="bottom-right"
        accentColor="#ffffff"
      />
    </main>
  );
}`,
    },
    curl: {
      title: "Direct REST API",
      filename: "terminal",
      code: `curl -X POST https://api.chatbotstudio.io/v1/chatbots/bot_prod_94f82a/messages \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "How do I configure presigned B2 storage uploads?",
    "stream": true,
    "temperature": 0.7
  }'`,
    },
    python: {
      title: "Python SDK",
      filename: "agent.py",
      code: `from chatbot_studio import ChatbotClient

client = ChatbotClient(api_key="cs_live_sec_...")

# Query assistant with vector RAG context
response = client.chatbots.query(
    chatbot_id="bot_prod_94f82a",
    message="Summarize the latest compliance guidelines",
    rag_enabled=True,
    top_k=5
)

print(f"Answer: {response.content}")
print(f"Citations: {response.citations}")`,
    },
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippets[activeTab].code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl overflow-hidden rounded-[22px] border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-800 dark:bg-[#0a0a0a]">
      {/* Code Header Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#000000] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {(["html", "react", "curl", "python"] as CodeTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1 text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-zinc-900 text-white font-semibold shadow-xs dark:bg-zinc-800"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab === "html" && "HTML Script"}
              {tab === "react" && "React / Next.js"}
              {tab === "curl" && "cURL / REST"}
              {tab === "python" && "Python SDK"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-zinc-500">
            {snippets[activeTab].filename}
          </span>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-mono text-zinc-700 hover:text-zinc-950 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#0a0a0a] dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Copied!</span>
            ) : (
              <span>Copy Code</span>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-5 overflow-x-auto bg-zinc-950 dark:bg-[#050505]">
        <pre className="font-mono text-xs sm:text-sm text-zinc-100 leading-relaxed">
          <code>{snippets[activeTab].code}</code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-[#000000] px-5 py-2.5 text-xs text-zinc-500 font-mono">
        <span>Zero-latency edge routing</span>
        <span>Shadow DOM isolation • CORS protected</span>
      </div>
    </div>
  );
}
