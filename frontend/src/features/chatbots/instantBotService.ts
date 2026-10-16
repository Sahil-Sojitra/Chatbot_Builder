import { chatbotsApi } from "@/lib/api/chatbots";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import type {
  InstantBotResult,
  InstantBotStage,
  InstantBotStageId,
  InstantBotStatus,
} from "./instantBotTypes";

export const DEFAULT_STAGES: readonly {
  id: InstantBotStageId;
  label: string;
  description: string;
}[] = [
  {
    id: "creating",
    label: "Creating chatbot",
    description: "Setting up your assistant profile, guardrails, and default parameters.",
  },
  {
    id: "discovering",
    label: "Discovering website pages",
    description: "Finding sitemap links and crawling discoverable endpoints on your domain.",
  },
  {
    id: "extracting",
    label: "Extracting website content",
    description: "Filtering HTML, parsing clean text, and preparing article chunks.",
  },
  {
    id: "preparing",
    label: "Preparing the knowledge base",
    description: "Structuring vectors, generating embeddings, and linking knowledge sources.",
  },
  {
    id: "completing",
    label: "Completing setup",
    description: "Finalizing assistant deployment and generating preview widget scripts.",
  },
] as const;

/**
 * Builds the initial stages array with all stages marked pending.
 */
export function createInitialStages(): InstantBotStage[] {
  return DEFAULT_STAGES.map((s) => ({
    ...s,
    status: "pending",
  }));
}

/**
 * Derives a clean chatbot name from a website URL.
 * e.g. "https://docs.stripe.com/payments" -> "Stripe Assistant"
 */
export function deriveBotNameFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const parts = host.split(".");
    const mainPart = parts.length > 1 ? parts[0] : host;
    const capitalized =
      mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    return `${capitalized} AI Assistant`;
  } catch {
    return "Website AI Assistant";
  }
}

/**
 * Instant Bot Service that connects the browser directly to the public Node.js API.
 * The Node.js API validates auth/ownership and delegates crawling, chunking,
 * embedding, and vector indexing to FastAPI.
 */
export class InstantBotService {
  private isCancelled = false;

  public cancel(): void {
    this.isCancelled = true;
  }

  public async runSetup({
    websiteUrl,
    existingChatbot,
    onChatbotCreated,
    onStatusChange,
    onStageUpdate,
  }: {
    websiteUrl: string;
    existingChatbot?: { id: string; publicId: string; name: string };
    onChatbotCreated?: (chatbot: { id: string; publicId: string; name: string }) => void;
    onStatusChange: (status: InstantBotStatus) => void;
    onStageUpdate: (stages: InstantBotStage[], currentStageId?: InstantBotStageId) => void;
  }): Promise<InstantBotResult> {
    this.isCancelled = false;
    const stages: InstantBotStage[] = createInitialStages();
    const botName = existingChatbot?.name ?? deriveBotNameFromUrl(websiteUrl);

    let createdChatbot: { id: string; publicId: string; name: string };

    if (existingChatbot) {
      // Reusing existing failed setup's chatbot: Skip Stage 0 creation and preserve original chatbot ID
      createdChatbot = existingChatbot;
      stages[0].status = "completed";
      onChatbotCreated?.(createdChatbot);
    } else {
      // Stage 1: Creating chatbot via Node.js POST /api/v1/chatbots
      onStatusChange("creating");
      stages[0].status = "current";
      onStageUpdate([...stages], "creating");

      try {
        const response = await chatbotsApi.create({
          name: botName,
          description: `Instant AI Assistant created from ${websiteUrl}`,
          creationMode: "INSTANT",
        });
        createdChatbot = response.chatbot;
        onChatbotCreated?.(createdChatbot);
      } catch (err: unknown) {
        stages[0].status = "failed";
        onStageUpdate([...stages], "creating");
        onStatusChange("failed");
        const msg = err instanceof Error ? err.message : "Failed to initialize chatbot in workspace.";
        throw new Error(msg);
      }

      if (this.isCancelled) throw new Error("Cancelled");
      stages[0].status = "completed";
    }

    // Stage 2: Discovering website pages (Initiate Ingestion through Node.js)
    onStatusChange("processing");
    stages[1].status = "current";
    onStageUpdate([...stages], "discovering");

    // Timers to provide smooth visual progression across sub-stages while crawl & index runs
    let timer1: NodeJS.Timeout | null = null;
    let timer2: NodeJS.Timeout | null = null;

    timer1 = setTimeout(() => {
      if (!this.isCancelled && stages[1].status === "current") {
        stages[1].status = "completed";
        stages[2].status = "current";
        onStageUpdate([...stages], "extracting");
      }
    }, 2200);

    timer2 = setTimeout(() => {
      if (!this.isCancelled && stages[2].status === "current") {
        stages[2].status = "completed";
        stages[3].status = "current";
        onStageUpdate([...stages], "preparing");
      }
    }, 4800);

    let ksResult;
    try {
      ksResult = await knowledgeSourcesApi.create(createdChatbot.id, {
        type: "URL",
        name: `${botName} Knowledge Base`,
        sourceUrl: websiteUrl,
      });
    } catch (err: unknown) {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);

      const activeIdx = stages.findIndex((s) => s.status === "current");
      if (activeIdx >= 0) {
        stages[activeIdx].status = "failed";
      } else {
        stages[1].status = "failed";
      }
      onStageUpdate([...stages]);
      onStatusChange("failed");

      const msg = err instanceof Error ? err.message : "Failed to crawl and index website pages.";
      throw new Error(msg);
    } finally {
      if (timer1) clearTimeout(timer1);
      if (timer2) clearTimeout(timer2);
    }

    if (this.isCancelled) throw new Error("Cancelled");

    // Verification: Poll until asynchronous crawler and vector indexing pipeline finishes
    let source = ksResult.knowledgeSource;
    if (source.status === "PROCESSING" || source.status === "PENDING") {
      const pollIntervalMs = 2500;
      const maxPollAttempts = 360; // Up to 15 minutes
      let attempts = 0;

      while (
        (source.status === "PROCESSING" || source.status === "PENDING") &&
        attempts < maxPollAttempts
      ) {
        if (this.isCancelled) throw new Error("Cancelled");
        await this.delay(pollIntervalMs);
        attempts++;

        // Ensure stages advance smoothly if timers were cleared
        if (attempts >= 2 && stages[1].status === "current") {
          stages[1].status = "completed";
          stages[2].status = "current";
          onStageUpdate([...stages], "extracting");
        } else if (attempts >= 5 && stages[2].status === "current") {
          stages[2].status = "completed";
          stages[3].status = "current";
          onStageUpdate([...stages], "preparing");
        }

        try {
          const polled = await knowledgeSourcesApi.get(createdChatbot.id, source.id);
          source = polled.knowledgeSource;
        } catch {
          // Transient network failure during polling; continue next poll attempt
        }
      }
    }

    if (source.status !== "READY") {
      const activeIdx = stages.findIndex((s) => s.status === "current");
      if (activeIdx >= 0) {
        stages[activeIdx].status = "failed";
      } else {
        stages[3].status = "failed";
      }
      onStageUpdate([...stages]);
      onStatusChange("failed");
      throw new Error(
        source.error || `Indexing completed with unready status '${source.status}'.`
      );
    }

    // Complete crawling, extraction, and vectorization stages
    stages[1].status = "completed";
    stages[2].status = "completed";
    stages[3].status = "completed";

    // Stage 5: Completing setup
    stages[4].status = "current";
    onStageUpdate([...stages], "completing");
    await this.delay(500);

    if (this.isCancelled) throw new Error("Cancelled");
    stages[4].status = "completed";

    onStageUpdate([...stages]);
    onStatusChange("ready");

    const appOrigin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "http://localhost:3000";

    const publicUrl = `${appOrigin}/chat/${createdChatbot.publicId}`;
    const embedSnippet = `<script\n  src="${appOrigin}/widget.js"\n  data-chatbot-id="${createdChatbot.publicId}"\n  defer\n></script>`;

    const pagesDiscovered =
      source.pagesDiscovered ?? source.pagesCrawled ?? 1;
    const documentsIndexed =
      source.chunksIndexed ?? 1;
    const pagesFailed =
      source.pagesFailed ?? 0;

    return {
      botId: createdChatbot.id,
      publicId: createdChatbot.publicId,
      name: createdChatbot.name,
      websiteUrl,
      pagesDiscovered,
      documentsIndexed,
      pagesFailed,
      publicUrl,
      embedSnippet,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export InstantBotMockService as an alias for backwards compatibility
export const InstantBotMockService = InstantBotService;

