import { Router } from "express";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { devController } from "./dev.controller.js";

const router = Router();

// Developer activity stream for troubleshooting customer issues
router.get("/users-activity", asyncHandler(devController.listUserActivity));
router.post("/sources/:sourceId/retry", asyncHandler(devController.retryKnowledgeSource));
// Developer on-demand website reachability & crawlability diagnostic test
router.post("/test-url", asyncHandler(devController.testWebsiteDiagnostics));
// Step 1: Direct Test Chat as any Customer's Bot with full vector score inspection
router.post("/chatbots/:chatbotId/test-chat", asyncHandler(devController.testChatAsBot));
// Step 2: Live Visitor & Test Conversation Feed with RAG Inspection & Hallucination Flags
router.get("/conversations", asyncHandler(devController.listConversations));
router.patch("/conversations/:logId/flag", asyncHandler(devController.toggleConversationFlag));
// Step 4: Customer Token & Cost Usage Ledger
router.get("/usage-ledger", asyncHandler(devController.getUsageLedger));

export default router;
