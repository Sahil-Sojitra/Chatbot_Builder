"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, type DragEvent, type ChangeEvent } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CustomSelect,
  Input,
  Label,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { chatbotsApi } from "@/lib/api/chatbots";
import { knowledgeSourcesApi } from "@/lib/api/knowledgeSources";
import { LLM_PROVIDERS, LLM_MODELS_BY_PROVIDER } from "../llmCatalog";
import { validateHttpUrl } from "./InstantBotUrlForm";

export interface CreateChatbotFormProps {
  onBack?: () => void;
}

interface PersonaPreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  systemPrompt: string;
  starterQuestions: string[];
}

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: "support",
    title: "Customer Support",
    description: "Empathetic, clear, and focused on swift issue resolution.",
    icon: "🤝",
    systemPrompt:
      "You are a friendly, knowledgeable, and empathetic customer support specialist. Your goal is to help users resolve inquiries quickly, clearly, and accurately using the provided knowledge base. If the knowledge base does not contain the answer, politely let the user know and offer next steps.",
    starterQuestions: [
      "How do I track my order or request?",
      "What is your refund and return policy?",
      "How can I contact a human agent?",
    ],
  },
  {
    id: "sales",
    title: "Sales & Product Advisor",
    description: "Consultative, persuasive, highlighting value propositions.",
    icon: "🚀",
    systemPrompt:
      "You are a professional, consultative product advisor. Help prospective customers understand our products and services, identify their core needs, and recommend the best plan or solution. Highlight key differentiators and benefits based on the provided knowledge base.",
    starterQuestions: [
      "Which plan or product is best for my needs?",
      "What are your core features and benefits?",
      "Do you offer enterprise pricing or custom solutions?",
    ],
  },
  {
    id: "docs",
    title: "Technical Documentation",
    description: "Accurate, structured, with step-by-step code guidance.",
    icon: "💻",
    systemPrompt:
      "You are a precise technical documentation specialist. Provide clear, structured step-by-step instructions, code snippets, and configuration guidance based strictly on the provided documentation. Always format code blocks with language syntax highlighting.",
    starterQuestions: [
      "How do I get started with integration?",
      "Show me an example configuration.",
      "How do I troubleshoot common errors?",
    ],
  },
  {
    id: "general",
    title: "Knowledge Navigator",
    description: "Versatile assistant for company policies, FAQs, and guides.",
    icon: "📚",
    systemPrompt:
      "You are an intelligent knowledge base assistant. Answer queries thoroughly and objectively using the provided documents and resources. Reference relevant sections when applicable to help users navigate complex information.",
    starterQuestions: [
      "Summarize the key points of this documentation.",
      "What are the essential policies I should know?",
      "Where can I find additional resources?",
    ],
  },
];

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".txt",
  ".csv",
  ".md",
  ".markdown",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
];

const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileBadge(filename: string): { label: string; color: string } {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return { label: "PDF", color: "bg-red-950/60 text-red-300 border-red-800/60" };
    case "docx":
    case "doc":
      return { label: "DOCX", color: "bg-blue-950/60 text-blue-300 border-blue-800/60" };
    case "pptx":
    case "ppt":
      return { label: "PPTX", color: "bg-amber-950/60 text-amber-300 border-amber-800/60" };
    case "csv":
      return { label: "CSV", color: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" };
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return { label: "IMAGE", color: "bg-purple-950/60 text-purple-300 border-purple-800/60" };
    default:
      return { label: "TEXT", color: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  }
}

export function CreateChatbotForm({ onBack }: CreateChatbotFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Step (1, 2, or 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Model & BYOK
  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Step 2: Persona & Identity
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("support");
  const [systemPrompt, setSystemPrompt] = useState(PERSONA_PRESETS[0].systemPrompt);
  const [starterQuestions, setStarterQuestions] = useState<string[]>(
    PERSONA_PRESETS[0].starterQuestions,
  );
  const [newQuestionInput, setNewQuestionInput] = useState("");
  const [ragTopK, setRagTopK] = useState(8);

  // Step 3: Knowledge Sources
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form State & Progress Modal
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);

  const selectedProviderMeta = LLM_PROVIDERS.find((p) => p.value === provider);
  const currentProviderModels = LLM_MODELS_BY_PROVIDER[provider] || [];

  const handleProviderSelect = (newProvider: string) => {
    setProvider(newProvider);
    const meta = LLM_PROVIDERS.find((p) => p.value === newProvider);
    const defModel = meta?.defaultModel || LLM_MODELS_BY_PROVIDER[newProvider]?.[0]?.value || "";
    setModel(defModel);
    setFieldErrors((prev) => ({ ...prev, apiKey: undefined }));
  };

  const handleApplyPreset = (preset: PersonaPreset) => {
    setSelectedPresetId(preset.id);
    setSystemPrompt(preset.systemPrompt);
    setStarterQuestions([...preset.starterQuestions]);
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestionInput.trim();
    if (!trimmed) return;
    if (starterQuestions.length >= 6) {
      setFieldErrors((prev) => ({
        ...prev,
        starterQuestions: "You can add up to 6 starter questions.",
      }));
      return;
    }
    setStarterQuestions([...starterQuestions, trimmed]);
    setNewQuestionInput("");
    setFieldErrors((prev) => ({ ...prev, starterQuestions: undefined }));
  };

  const handleRemoveQuestion = (index: number) => {
    setStarterQuestions(starterQuestions.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles: File[]) => {
    setUploadError(null);
    const validFiles: File[] = [];

    for (const file of newFiles) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setUploadError(
          `File '${file.name}' has an unsupported format. Supported formats: PDF, DOCX, PPTX, CSV, TXT, MD, PNG, JPG, WEBP.`,
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File '${file.name}' exceeds the 25 MB limit.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      // Append unique files by name
      setAttachedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const filtered = validFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...filtered];
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  // Step validation
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!model) {
      errors.model = "Please select an AI model.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = "Chatbot name is required.";
    } else if (name.trim().length > 120) {
      errors.name = "Name must be at most 120 characters.";
    }
    if (systemPrompt.length > 8000) {
      errors.systemPrompt = "System prompt must be at most 8000 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    setFormError(null);
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setFormError(null);
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 1 && onBack) onBack();
  };

  // Final Submission
  const handleFinalSubmit = async () => {
    setFormError(null);
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }

    if (websiteUrl.trim()) {
      const urlCheck = validateHttpUrl(websiteUrl);
      if (!urlCheck.isValid) {
        setUploadError(urlCheck.error || "Please enter a valid website URL.");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmissionStage("Creating chatbot configuration…");

    try {
      // 1. Create the Custom Chatbot record
      const botResponse = await chatbotsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        provider: provider.trim(),
        model: model.trim(),
        apiKey: apiKey.trim() || undefined,
        ragEnabled: true,
        ragTopK,
        starterQuestions: starterQuestions.length > 0 ? starterQuestions : undefined,
        creationMode: "CUSTOM",
      });

      const newBotId = botResponse.chatbot.id;

      // 2. Direct upload attached document files (if any)
      if (attachedFiles.length > 0) {
        setSubmissionStage(`Uploading and indexing ${attachedFiles.length} document(s)…`);
        await knowledgeSourcesApi.uploadDirect(newBotId, attachedFiles);
      }

      // 3. Initiate website URL ingestion (if provided)
      if (websiteUrl.trim()) {
        setSubmissionStage("Initiating website crawling & sitemap discovery…");
        await knowledgeSourcesApi.create(newBotId, {
          type: "URL",
          name: `${name.trim()} Website`,
          sourceUrl: websiteUrl.trim(),
        });
      }

      setSubmissionStage("Finalizing workspace…");
      // Redirect to the Bot Studio
      router.push(`/dashboard/chatbots/${newBotId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setSubmissionStage(null);
      setFormError(
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred while creating the chatbot.",
      );
    }
  };

  return (
    <div className="w-full">
      {/* Wizard Step Navigation Bar */}
      <div className="mb-6 flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {[
              { step: 1, label: "Model & BYOK" },
              { step: 2, label: "Persona & Prompts" },
              { step: 3, label: "Knowledge Base" },
            ].map((s, idx) => (
              <div key={s.step} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (s.step < currentStep) setCurrentStep(s.step as 1 | 2 | 3);
                  }}
                  disabled={isSubmitting || s.step > currentStep}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    currentStep === s.step
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                      : currentStep > s.step
                        ? "text-zinc-300 hover:text-white cursor-pointer"
                        : "text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      currentStep === s.step
                        ? "bg-violet-500 text-white"
                        : currentStep > s.step
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {currentStep > s.step ? "✓" : s.step}
                  </span>
                  <span>{s.label}</span>
                </button>
                {idx < 2 && <span className="text-zinc-700 text-xs">→</span>}
              </div>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-zinc-500">Step {currentStep} of 3</span>
      </div>

      {formError && (
        <div className="mb-6 rounded-md border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-300 font-mono">
          [ERROR]: {formError}
        </div>
      )}

      {/* =========================================================================
          STEP 1: MODEL SELECTION & BRING YOUR OWN KEY (BYOK)
      ========================================================================= */}
      {currentStep === 1 && (
        <Card className="border-zinc-800/80 bg-zinc-950 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  Select AI Provider & Model
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  Connect your preferred model provider or use your own private API key for zero
                  token markups.
                </CardDescription>
              </div>
              <Badge variant="primary">Step 1</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Provider Grid Cards */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
                Choose Provider
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {LLM_PROVIDERS.map((p) => {
                  const isSelected = provider === p.value;
                  return (
                    <div
                      key={p.value}
                      onClick={() => handleProviderSelect(p.value)}
                      className={`relative flex flex-col justify-between rounded-lg border p-3.5 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-violet-500 bg-violet-950/20 shadow-md shadow-violet-950/30"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-semibold text-zinc-200">{p.label}</span>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] text-white font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] font-mono text-zinc-400 truncate">
                        Default: {p.defaultModel}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Selector Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="chatbot-model-select" className="text-xs font-medium text-zinc-300">
                  Model
                </Label>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {currentProviderModels.length} models available
                </span>
              </div>
              <CustomSelect
                id="chatbot-model-select"
                value={model}
                options={currentProviderModels}
                onChange={(val) => setModel(val)}
                className="w-full"
              />
              {fieldErrors.model && (
                <p className="text-xs text-red-400 font-mono">{fieldErrors.model}</p>
              )}
            </div>

            {/* Private API Key (BYOK) */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <Label htmlFor="chatbot-api-key" className="text-xs font-medium text-zinc-300">
                  Private API Key (Optional / BYOK)
                </Label>
                {selectedProviderMeta?.docsUrl && (
                  <a
                    href={selectedProviderMeta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-violet-400 hover:text-violet-300 underline font-mono flex items-center gap-1"
                  >
                    <span>Get {selectedProviderMeta.label} Key</span>
                    <span>↗</span>
                  </a>
                )}
              </div>

              <div className="relative">
                <Input
                  id="chatbot-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedProviderMeta?.keyPlaceholder || "Enter your API key…"}
                  className="pr-16 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="text-emerald-400 text-xs">🔒</span>
                <span>
                  Keys are encrypted at rest with AES-256-GCM. If omitted, system defaults will be
                  used.
                </span>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              {onBack ? (
                <Button type="button" variant="outline" size="sm" onClick={onBack}>
                  Cancel
                </Button>
              ) : (
                <div />
              )}
              <Button type="button" size="sm" onClick={handleNext} className="gap-2">
                <span>Continue to Persona</span>
                <span>→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          STEP 2: BOT IDENTITY, PERSONA & PROMPTS
      ========================================================================= */}
      {currentStep === 2 && (
        <Card className="border-zinc-800/80 bg-zinc-950 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  Bot Identity & Persona
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  Define your assistant&apos;s name, tone, instructions, and prompt questions.
                </CardDescription>
              </div>
              <Badge variant="primary">Step 2</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Bot Name & Description */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-bot-name" className="text-xs font-medium text-zinc-300">
                    Assistant Name *
                  </Label>
                  <span className="text-[10px] text-zinc-500 font-mono">{name.length}/120</span>
                </div>
                <Input
                  id="custom-bot-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Support Assistant"
                  className="text-sm"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-400 font-mono">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-bot-desc" className="text-xs font-medium text-zinc-300">
                  Short Tagline / Description
                </Label>
                <Input
                  id="custom-bot-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 24/7 AI guide for documentation & billing"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Persona Preset Picker */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <Label className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
                Persona Templates (1-Click Presets)
              </Label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {PERSONA_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`flex flex-col justify-between rounded-lg border p-3 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-violet-500 bg-violet-950/20"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{preset.icon}</span>
                          <span className="text-xs font-semibold text-zinc-200">
                            {preset.title}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="mt-2 text-[10px] font-mono text-violet-400">
                          Active Preset ✓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Prompt Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-system-prompt" className="text-xs font-medium text-zinc-300">
                  System Instructions & Persona
                </Label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {systemPrompt.length}/8000
                </span>
              </div>
              <Textarea
                id="custom-system-prompt"
                rows={4}
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  setSelectedPresetId("");
                }}
                placeholder="Instructions governing how the chatbot responds..."
                className="text-xs font-mono leading-relaxed"
              />
              {fieldErrors.systemPrompt && (
                <p className="text-xs text-red-400 font-mono">{fieldErrors.systemPrompt}</p>
              )}
            </div>

            {/* Starter Questions Manager */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-300">
                  Suggested Starter Questions
                </Label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {starterQuestions.length}/6 chips
                </span>
              </div>

              {/* Tag Chips List */}
              <div className="flex flex-wrap gap-2">
                {starterQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                  >
                    <span>{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-zinc-500 hover:text-red-400 transition-colors ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Question Input */}
              <div className="flex gap-2">
                <Input
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  placeholder="Type a new starter question and press Enter…"
                  className="text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  disabled={!newQuestionInput.trim() || starterQuestions.length >= 6}
                >
                  Add Chip
                </Button>
              </div>
              {fieldErrors.starterQuestions && (
                <p className="text-xs text-red-400 font-mono">{fieldErrors.starterQuestions}</p>
              )}
            </div>

            {/* RAG Top-K Depth */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
              <div>
                <Label className="text-xs font-medium text-zinc-300">
                  RAG Retrieval Depth (Top-K)
                </Label>
                <p className="text-[11px] text-zinc-400">
                  Number of most relevant knowledge chunks retrieved per user question.
                </p>
              </div>
              <div className="w-28">
                <CustomSelect
                  value={String(ragTopK)}
                  options={[
                    { value: "4", label: "4 chunks (Fast)" },
                    { value: "8", label: "8 chunks (Balanced)" },
                    { value: "12", label: "12 chunks (Deep)" },
                    { value: "16", label: "16 chunks (Exhaustive)" },
                  ]}
                  onChange={(val) => setRagTopK(Number(val))}
                />
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                ← Back
              </Button>
              <Button type="button" size="sm" onClick={handleNext} className="gap-2">
                <span>Continue to Knowledge Base</span>
                <span>→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          STEP 3: MULTI-SOURCE KNOWLEDGE INGESTION
      ========================================================================= */}
      {currentStep === 3 && (
        <Card className="border-zinc-800/80 bg-zinc-950 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-zinc-100">
                  Add Knowledge Base Sources
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1">
                  Upload documents or connect websites to ground your chatbot with factual evidence.
                </CardDescription>
              </div>
              <Badge variant="primary">Step 3</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer ${
                isDragging
                  ? "border-violet-500 bg-violet-950/20"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.csv,.md,.markdown,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 text-xl mb-3">
                📁
              </div>
              <p className="text-sm font-medium text-zinc-200">
                Drag and drop files here, or <span className="text-violet-400 underline">browse</span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Supports PDF, Word, PowerPoint, Spreadsheets, Markdown, and Images (up to 25 MB each)
              </p>

              {/* Supported format badges */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["PDF", "DOCX", "PPTX", "CSV", "TXT", "MD", "PNG / JPG"].map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-400 font-mono bg-red-950/30 p-2 rounded border border-red-900/50">
                {uploadError}
              </p>
            )}

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
                    Attached Documents ({attachedFiles.length})
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles([])}
                    className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                  {attachedFiles.map((file, idx) => {
                    const badge = getFileBadge(file.name);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-medium text-zinc-200 truncate">{file.name}</span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            ({formatBytes(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-zinc-500 hover:text-red-400 transition-colors ml-2 px-1"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional Website Link */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <Label htmlFor="custom-bot-url" className="text-xs font-medium text-zinc-300">
                Attach Website URL (Optional)
              </Label>
              <Input
                id="custom-bot-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-zinc-400">
                The crawler will discover and index pages alongside your uploaded documents.
              </p>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                ← Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-violet-600 hover:bg-violet-500 text-white font-medium px-5"
              >
                {attachedFiles.length > 0 || websiteUrl
                  ? `Build Chatbot with ${attachedFiles.length} Source${attachedFiles.length === 1 ? "" : "s"}`
                  : "Build Custom Chatbot"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission & Ingestion Overlay Modal */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-center space-y-4">
            <Spinner className="mx-auto h-8 w-8 text-violet-400" />
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Building Your Custom Chatbot
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">{submissionStage}</p>
            </div>

            <div className="rounded-lg border border-zinc-900 bg-zinc-900/50 p-3 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-emerald-400">✓</span>
                <span>Configured model: {model}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-emerald-400">✓</span>
                <span>Encrypted private credentials</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-violet-400 animate-pulse">●</span>
                <span>
                  Preparing {attachedFiles.length} document(s) for vector embedding...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
