import type { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Chatbot Builder API",
    version: "1.0.0",
    description:
      "Comprehensive REST API documentation for the Chatbot Builder backend platform. Handles user authentication, organizations, chatbot lifecycles, knowledge base ingestion (RAG & web crawling), and public widget chat interactions.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Default API v1 Base Path",
    },
    {
      url: "/",
      description: "Root Base Path",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Access Token provided in the Authorization header as: Bearer <token>",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "HttpOnly cookie containing the refresh token for session renewals.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Invalid request payload" },
              details: { type: "object", nullable: true },
            },
          },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Alice Johnson" },
          email: { type: "string", format: "email", example: "alice@example.com" },
          password: { type: "string", format: "password", minLength: 8, example: "Password123!" },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "alice@example.com" },
          password: { type: "string", format: "password", example: "Password123!" },
        },
      },
      UpdateMeInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Alice Johnson Updated" },
          email: { type: "string", format: "email", example: "alice.new@example.com" },
        },
      },
      ChangePasswordInput: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string", format: "password", example: "OldPassword123!" },
          newPassword: { type: "string", format: "password", minLength: 8, example: "NewPassword123!" },
        },
      },
      CreateOrganizationInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Acme Corporation" },
          slug: { type: "string", example: "acme-corp" },
        },
      },
      UpdateOrganizationInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Acme Corp Worldwide" },
        },
      },
      CreateChatbotInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Customer Support AI" },
          description: { type: "string", example: "Answers customer queries from our website" },
          creationMode: { type: "string", enum: ["BLANK", "TEMPLATE", "INSTANT"], default: "BLANK" },
          provider: { type: "string", enum: ["openai", "gemini", "anthropic", "custom"], default: "openai" },
          model: { type: "string", example: "gpt-4o-mini" },
          systemPrompt: { type: "string", example: "You are a friendly support assistant." },
          apiKey: { type: "string", description: "Optional BYOK LLM API Key" },
          sessionMessageLimit: { type: "integer", nullable: true, example: 50 },
        },
      },
      UpdateChatbotInput: {
        type: "object",
        properties: {
          name: { type: "string", example: "Customer Support AI (Updated)" },
          description: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
          systemPrompt: { type: "string" },
          apiKey: { type: "string" },
          temperature: { type: "number", minimum: 0, maximum: 1, example: 0.3 },
          sessionMessageLimit: { type: "integer", nullable: true },
          branding: {
            type: "object",
            properties: {
              brandColor: { type: "string", example: "#6366f1" },
              welcomeMessage: { type: "string", example: "Hi! How can I help you today?" },
              botName: { type: "string", example: "SupportBot" },
            },
          },
        },
      },
      ChatMessageInput: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string", example: "What are your business hours?" },
          sessionId: { type: "string", example: "sess_abc123" },
          chatHistory: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["user", "assistant", "system"] },
                content: { type: "string" },
              },
            },
          },
        },
      },
      CreateKnowledgeSourceInput: {
        type: "object",
        required: ["type", "name"],
        properties: {
          type: { type: "string", enum: ["URL", "WEBPAGE", "TEXT", "FILE"] },
          name: { type: "string", example: "Company Knowledge Base" },
          sourceUrl: { type: "string", format: "uri", example: "https://example.com" },
          sourceText: { type: "string" },
        },
      },
      InitiateFileUploadInput: {
        type: "object",
        required: ["originalName", "mimeType", "sizeBytes"],
        properties: {
          originalName: { type: "string", example: "user-manual.pdf" },
          mimeType: { type: "string", example: "application/pdf" },
          sizeBytes: { type: "integer", example: 1048576 },
        },
      },
      CompleteFileUploadInput: {
        type: "object",
        required: ["uploadId"],
        properties: {
          uploadId: { type: "string", example: "upl_123456" },
          name: { type: "string", example: "Product Manual" },
        },
      },
    },
  },
  tags: [
    { name: "Auth", description: "User registration, login, token refresh, and logout" },
    { name: "Me", description: "Authenticated user profile management and settings" },
    { name: "Organization", description: "Workspace / tenant management" },
    { name: "Chatbots", description: "Chatbot builder configuration and lifecycle management" },
    { name: "Public Chatbots", description: "Endpoints consumed by the embedded chat widget" },
    { name: "Knowledge Sources", description: "Knowledge base ingestion, web crawling, and document indexing" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          201: { description: "User created successfully" },
          400: { description: "Validation error or email already in use", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate user and receive access token & refresh cookie",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          200: { description: "Logged in successfully" },
          401: { description: "Invalid email or password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh expired access token using HttpOnly cookie",
        security: [{ cookieAuth: [] }],
        responses: {
          200: { description: "New access token issued" },
          401: { description: "Invalid or expired refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out user and clear refresh token cookie",
        responses: {
          200: { description: "Logged out successfully" },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Me"],
        summary: "Get current user profile and organization info",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User profile details" },
          401: { description: "Unauthorized" },
        },
      },
      patch: {
        tags: ["Me"],
        summary: "Update current user profile information",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMeInput" },
            },
          },
        },
        responses: {
          200: { description: "Profile updated successfully" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/me/change-password": {
      post: {
        tags: ["Me"],
        summary: "Change account password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordInput" },
            },
          },
        },
        responses: {
          200: { description: "Password changed successfully" },
          401: { description: "Incorrect current password or unauthorized" },
        },
      },
    },
    "/organization": {
      post: {
        tags: ["Organization"],
        summary: "Create an organization for the active user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrganizationInput" },
            },
          },
        },
        responses: {
          201: { description: "Organization created" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
        },
      },
      get: {
        tags: ["Organization"],
        summary: "Get organization owned by the active user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Organization details" },
          404: { description: "Organization not found" },
        },
      },
      patch: {
        tags: ["Organization"],
        summary: "Update organization information",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateOrganizationInput" },
            },
          },
        },
        responses: {
          200: { description: "Organization updated" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/chatbots": {
      post: {
        tags: ["Chatbots"],
        summary: "Create a new chatbot",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateChatbotInput" },
            },
          },
        },
        responses: {
          201: { description: "Chatbot created successfully" },
          400: { description: "Validation error" },
        },
      },
      get: {
        tags: ["Chatbots"],
        summary: "List all chatbots in the organization",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "List of chatbots" },
        },
      },
    },
    "/chatbots/{id}": {
      get: {
        tags: ["Chatbots"],
        summary: "Get chatbot details by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Chatbot ID" },
        ],
        responses: {
          200: { description: "Chatbot details" },
          404: { description: "Chatbot not found" },
        },
      },
      patch: {
        tags: ["Chatbots"],
        summary: "Update chatbot settings and configuration",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Chatbot ID" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateChatbotInput" },
            },
          },
        },
        responses: {
          200: { description: "Chatbot updated" },
          404: { description: "Chatbot not found" },
        },
      },
      delete: {
        tags: ["Chatbots"],
        summary: "Delete a chatbot",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Chatbot ID" },
        ],
        responses: {
          200: { description: "Chatbot deleted successfully" },
          404: { description: "Chatbot not found" },
        },
      },
    },
    "/chatbots/{id}/publish": {
      post: {
        tags: ["Chatbots"],
        summary: "Publish chatbot and enable public widget access",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Chatbot published" },
        },
      },
    },
    "/chatbots/{id}/unpublish": {
      post: {
        tags: ["Chatbots"],
        summary: "Unpublish chatbot and disable public widget access",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Chatbot unpublished" },
        },
      },
    },
    "/chatbots/{id}/chat": {
      post: {
        tags: ["Chatbots"],
        summary: "Send a test message to the chatbot in dashboard preview",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatMessageInput" },
            },
          },
        },
        responses: {
          200: { description: "AI generated response with source grounding" },
        },
      },
    },
    "/public/chatbots/{publicId}": {
      get: {
        tags: ["Public Chatbots"],
        summary: "Get public chatbot widget configuration",
        parameters: [
          { name: "publicId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Public widget configuration and branding" },
          404: { description: "Chatbot not found or not published" },
        },
      },
    },
    "/public/chatbots/{publicId}/chat": {
      post: {
        tags: ["Public Chatbots"],
        summary: "Public chat interaction from the embedded widget",
        parameters: [
          { name: "publicId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatMessageInput" },
            },
          },
        },
        responses: {
          200: { description: "AI generated response" },
        },
      },
    },
    "/knowledge-sources/{chatbotId}": {
      post: {
        tags: ["Knowledge Sources"],
        summary: "Create a knowledge source (URL crawl, text, or file attachment)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateKnowledgeSourceInput" },
            },
          },
        },
        responses: {
          201: { description: "Knowledge source ingestion initialized" },
        },
      },
      get: {
        tags: ["Knowledge Sources"],
        summary: "List all knowledge sources for a chatbot",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "List of knowledge sources" },
        },
      },
    },
    "/knowledge-sources/{chatbotId}/{sourceId}": {
      get: {
        tags: ["Knowledge Sources"],
        summary: "Get status and details of a specific knowledge source",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
          { name: "sourceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Knowledge source details and indexing status" },
          404: { description: "Source not found" },
        },
      },
      delete: {
        tags: ["Knowledge Sources"],
        summary: "Delete a knowledge source and prune vectors",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
          { name: "sourceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Knowledge source deleted" },
        },
      },
    },
    "/knowledge-sources/{chatbotId}/upload": {
      post: {
        tags: ["Knowledge Sources"],
        summary: "Initiate direct S3/storage presigned file upload",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InitiateFileUploadInput" },
            },
          },
        },
        responses: {
          200: { description: "Presigned upload URL returned" },
        },
      },
    },
    "/knowledge-sources/{chatbotId}/upload/complete": {
      post: {
        tags: ["Knowledge Sources"],
        summary: "Confirm uploaded file and start parsing/embedding pipeline",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "chatbotId", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CompleteFileUploadInput" },
            },
          },
        },
        responses: {
          201: { description: "File upload confirmed and queued for processing" },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  // Serve Swagger UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Chatbot Builder API Documentation",
      customCss: ".swagger-ui .topbar { display: none }",
    }),
  );

  // Serve raw JSON spec
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Convenient alias
  app.get("/docs", (_req: Request, res: Response) => {
    res.redirect("/api-docs");
  });
}
