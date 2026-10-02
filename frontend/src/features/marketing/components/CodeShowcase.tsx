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
    <div className="w-full max-w-4xl overflow-hidden rounded-md border border-zinc-800 bg-[#0a0a0a]">
      {/* Code Header Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 bg-[#000000] px-4 py-2">
        <div className="flex items-center gap-2">
          {(["html", "react", "curl", "python"] as CodeTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-mono font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
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
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-[#0a0a0a] px-2.5 py-1 text-xs font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <span className="text-emerald-400">Copied!</span>
            ) : (
              <span>Copy Code</span>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto bg-[#050505]">
        <pre className="font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed">
          <code>{snippets[activeTab].code}</code>
        </pre>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-zinc-800/80 bg-[#000000] px-4 py-2.5 text-xs text-zinc-500 font-mono">
        <span>Zero-latency edge routing</span>
        <span>Shadow DOM isolation • CORS protected</span>
      </div>
    </div>
  );
}
