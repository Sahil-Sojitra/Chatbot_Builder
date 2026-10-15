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
 * Mock simulator for instant bot creation flow.
 * Isolated development service with callbacks for real-time stage updates.
 * Can be effortlessly replaced with an SSE/WebSocket/polling API client once the backend is ready.
 */
export class InstantBotMockService {
  private isCancelled = false;

  public cancel(): void {
    this.isCancelled = true;
  }

  public async runSetup({
    websiteUrl,
    onStatusChange,
    onStageUpdate,
    shouldFail = false,
  }: {
    websiteUrl: string;
    onStatusChange: (status: InstantBotStatus) => void;
    onStageUpdate: (stages: InstantBotStage[], currentStageId?: InstantBotStageId) => void;
    shouldFail?: boolean;
  }): Promise<InstantBotResult> {
    this.isCancelled = false;
    const stages: InstantBotStage[] = createInitialStages();
    const botName = deriveBotNameFromUrl(websiteUrl);
    const mockPublicId = `bot_${Math.random().toString(36).substring(2, 10)}`;
    const mockBotId = `mock-${Date.now()}`;

    onStatusChange("creating");

    // Stage 1: Creating chatbot
    stages[0].status = "current";
    onStageUpdate([...stages], "creating");
    await this.delay(1200);
    if (this.isCancelled) throw new Error("Cancelled");
    stages[0].status = "completed";

    onStatusChange("processing");

    // Stage 2: Discovering website pages
    stages[1].status = "current";
    onStageUpdate([...stages], "discovering");
    await this.delay(1400);
    if (this.isCancelled) throw new Error("Cancelled");

    // If intentional test failure requested
    if (shouldFail) {
      stages[1].status = "failed";
      onStageUpdate([...stages], "discovering");
      onStatusChange("failed");
      throw new Error(`Failed to crawl domain: could not discover pages on ${websiteUrl}.`);
    }

    stages[1].status = "completed";

    // Stage 3: Extracting website content
    stages[2].status = "current";
    onStageUpdate([...stages], "extracting");
    await this.delay(1500);
    if (this.isCancelled) throw new Error("Cancelled");
    stages[2].status = "completed";

    // Stage 4: Preparing the knowledge base
    stages[3].status = "current";
    onStageUpdate([...stages], "preparing");
    await this.delay(1600);
    if (this.isCancelled) throw new Error("Cancelled");
    stages[3].status = "completed";

    // Stage 5: Completing setup
    stages[4].status = "current";
    onStageUpdate([...stages], "completing");
    await this.delay(1000);
    if (this.isCancelled) throw new Error("Cancelled");
    stages[4].status = "completed";

    onStageUpdate([...stages]);
    onStatusChange("ready");

    const appOrigin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://chatbotstudio.io";

    const publicUrl = `${appOrigin}/chat/${mockPublicId}`;
    const embedSnippet = `<script\n  src="${appOrigin}/widget.js"\n  data-chatbot-id="${mockPublicId}"\n  defer\n></script>`;

    return {
      botId: mockBotId,
      publicId: mockPublicId,
      name: botName,
      websiteUrl,
      pagesDiscovered: 14,
      documentsIndexed: 42,
      publicUrl,
      embedSnippet,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
