export type InstantBotStageId =
  | "creating"
  | "discovering"
  | "extracting"
  | "preparing"
  | "completing";

export type InstantBotStatus = "creating" | "processing" | "ready" | "failed";

export interface InstantBotStage {
  id: InstantBotStageId;
  label: string;
  description: string;
  status: "pending" | "current" | "completed" | "failed";
}

export interface InstantBotResult {
  botId: string;
  publicId: string;
  name: string;
  websiteUrl: string;
  pagesDiscovered: number;
  documentsIndexed: number;
  pagesFailed?: number;
  publicUrl: string;
  embedSnippet: string;
}
