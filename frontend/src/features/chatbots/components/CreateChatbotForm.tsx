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
      return { label: "PDF", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30" };
    case "docx":
    case "doc":
      return { label: "DOCX", color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30" };
    case "pptx":
    case "ppt":
      return { label: "PPTX", color: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30" };
    case "csv":
      return { label: "CSV", color: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30" };
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return { label: "IMAGE", color: "bg-purple-500/10 text-purple-800 dark:text-purple-300 border-purple-500/30" };
    default:
      return { label: "TEXT", color: "bg-zinc-100 text-zinc-700 dark:bg-white/[0.04] dark:text-zinc-300 border-zinc-200 dark:border-white/[0.1]" };
  }
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === "google") {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
          fill="url(#gemini-provider-grad)"
        />
        <defs>
          <linearGradient id="gemini-provider-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1A73E8" />
            <stop offset="0.45" stopColor="#8E24AA" />
            <stop offset="1" stopColor="#EA4335" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
  if (provider === "openai") {
    return (
      <svg className="size-5 shrink-0 text-[#10A37F]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    );
  }
  if (provider === "anthropic") {
    return (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="#D97757">
        <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
      </svg>
    );
  }
  // Groq official brand icon (clean standalone vector)
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 201 201" fill="none">
      <path
        fill="#F55036"
        d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z"
      />
    </svg>
  );
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
  const [ragTopK, setRagTopK] = useState(6);

  // Step 3: Knowledge Sources
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const currentProviderModels = LLM_MODELS_BY_PROVIDER[provider] || [];
  const selectedProviderMeta = LLM_PROVIDERS.find((p) => p.value === provider);

  const handleProviderSelect = (newProvider: string) => {
    setProvider(newProvider);
    const models = LLM_MODELS_BY_PROVIDER[newProvider] || [];
    if (models.length > 0) {
      setModel(models[0].value);
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.provider;
      delete next.model;
      return next;
    });
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
        starterQuestions: "Maximum of 6 starter questions allowed.",
      }));
      return;
    }
    setStarterQuestions((prev) => [...prev, trimmed]);
    setNewQuestionInput("");
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.starterQuestions;
      return next;
    });
  };

  const handleRemoveQuestion = (idx: number) => {
    setStarterQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

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
    const valid: File[] = [];

    for (const file of newFiles) {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setUploadError(`File type "${ext}" is not supported. Use PDF, DOCX, TXT, CSV, or MD.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File "${file.name}" exceeds the 25 MB limit.`);
        return;
      }
      valid.push(file);
    }

    setAttachedFiles((prev) => [...prev, ...valid]);
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!provider) errors.provider = "Please choose an AI provider.";
    if (!model) errors.model = "Please select a model.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Assistant name is required.";
    else if (name.trim().length > 120) errors.name = "Name cannot exceed 120 characters.";

    if (!systemPrompt.trim()) {
      errors.systemPrompt = "System instructions / persona prompt cannot be empty.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};
    if (websiteUrl.trim()) {
      const res = validateHttpUrl(websiteUrl.trim());
      if (!res.isValid) {
        errors.websiteUrl = res.error || "Please enter a valid website URL.";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep2()) return;
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 1 && onBack) onBack();
  };

  const handleFinalSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    setFormError(null);
    setSubmissionStage("Initializing custom chatbot instance…");

    try {
      const botResponse = await chatbotsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
        starterQuestions: starterQuestions.filter(Boolean),
        ragTopK,
      });

      const newBotId = botResponse.chatbot.id;

      if (attachedFiles.length > 0) {
        setSubmissionStage(`Uploading and indexing ${attachedFiles.length} document(s)…`);
        await knowledgeSourcesApi.uploadDirect(newBotId, attachedFiles);
      }

      if (websiteUrl.trim()) {
        setSubmissionStage("Connecting website URL crawler pipeline…");
        await knowledgeSourcesApi.create(newBotId, {
          type: "URL",
          name: `${name.trim()} Website`,
          sourceUrl: websiteUrl.trim(),
        });
      }

      setSubmissionStage("Finalizing workspace…");
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

  const stepsMeta = [
    {
      step: 1,
      title: "Provider & Model",
      subtitle: "BYOK & Intelligence engine",
    },
    {
      step: 2,
      title: "Persona & Prompts",
      subtitle: "Tone, identity & chips",
    },
    {
      step: 3,
      title: "Knowledge Ingestion",
      subtitle: "Documents, URLs & RAG",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* =========================================================================
          ENTERPRISE SAAS STEPPER TRACKER
      ========================================================================= */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stepsMeta.map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            const isClickable = s.step < currentStep && !isSubmitting;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (isClickable) setCurrentStep(s.step as 1 | 2 | 3);
                }}
                disabled={!isClickable}
                className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all ${
                  isActive
                    ? "border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/25 dark:ring-emerald-500/30"
                    : isCompleted
                      ? "border-emerald-500/30 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500/50 dark:border-emerald-500/20 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/30 cursor-pointer"
                      : "border-zinc-200/90 bg-zinc-50/50 opacity-70 dark:border-white/[0.06] dark:bg-white/[0.02] cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-transform ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs ring-4 ring-emerald-500/20"
                        : isCompleted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {isCompleted ? "✓" : s.step}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isActive
                          ? "text-zinc-900 dark:text-white"
                          : isCompleted
                            ? "text-emerald-900 dark:text-emerald-300"
                            : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {s.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>

                {/* Micro Progress Bar on each step */}
                <div className="mt-3 w-full bg-zinc-200/80 dark:bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted || isActive ? "bg-emerald-600 dark:bg-emerald-400" : "bg-transparent"
                    }`}
                    style={{ width: isCompleted ? "100%" : isActive ? "60%" : "0%" }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {formError && (
        <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-50/80 dark:bg-rose-950/30 p-4 text-xs sm:text-sm text-rose-800 dark:text-rose-300 font-mono shadow-xs">
          [ERROR]: {formError}
        </div>
      )}

      {/* =========================================================================
          STEP 1: MODEL SELECTION & BRING YOUR OWN KEY (BYOK)
      ========================================================================= */}
      {currentStep === 1 && (
        <Card className="rounded-3xl border border-zinc-200/90 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#0E1015]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <CardHeader className="pb-5 border-b border-zinc-100 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Select AI Provider &amp; Model
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Connect your preferred model provider or attach your private API key for zero token markups.
                </CardDescription>
              </div>
              <Badge variant="lime">Step 1 of 3</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Provider Grid Cards */}
            <div className="space-y-2.5">
              <Label className="text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono font-semibold">
                Choose Intelligence Provider
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {LLM_PROVIDERS.map((p) => {
                  const isSelected = provider === p.value;
                  return (
                    <div
                      key={p.value}
                      onClick={() => handleProviderSelect(p.value)}
                      className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 text-zinc-900 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-white ring-2 ring-emerald-500/25 shadow-xs"
                          : "border-zinc-200/90 bg-zinc-50/60 hover:bg-zinc-100/80 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ProviderIcon provider={p.value} />
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {p.label}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white font-bold shadow-2xs">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="mt-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
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
                <Label htmlFor="chatbot-model-select" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Model Endpoint
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
                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{fieldErrors.model}</p>
              )}
            </div>

            {/* Private API Key (BYOK) */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <Label htmlFor="chatbot-api-key" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Private Provider API Key (Optional / BYOK)
                </Label>
                {selectedProviderMeta?.docsUrl && (
                  <a
                    href={selectedProviderMeta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Get {selectedProviderMeta.label} Key</span>
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>

              <div className="relative">
                <Input
                  id="chatbot-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={selectedProviderMeta?.keyPlaceholder || "Paste your API key (e.g. AIzaSy...)"}
                  className="rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-16 font-mono text-xs px-4 h-11 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer px-1 py-0.5 rounded font-mono"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="text-emerald-600 dark:text-emerald-400 text-xs">🔒</span>
                <span>
                  Keys are encrypted at rest with AES-256-GCM. If omitted, system defaults will be used.
                </span>
              </div>
            </div>

            {/* Step 1 Actions */}
            <div className="flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-white/[0.06]">
              {onBack ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="rounded-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05] px-5 h-9 text-xs font-medium"
                >
                  Cancel
                </Button>
              ) : (
                <div />
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 h-9 text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Persona</span>
                <span className="text-sm">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          STEP 2: BOT IDENTITY, PERSONA & PROMPTS
      ========================================================================= */}
      {currentStep === 2 && (
        <Card className="rounded-3xl border border-zinc-200/90 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#0E1015]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <CardHeader className="pb-5 border-b border-zinc-100 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Bot Identity &amp; Persona
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Define your assistant&apos;s name, tone, instructions, and prompt questions.
                </CardDescription>
              </div>
              <Badge variant="lime">Step 2 of 3</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Bot Name & Description */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-bot-name" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Assistant Name *
                  </Label>
                  <span className="text-[10px] text-zinc-500 font-mono">{name.length}/120</span>
                </div>
                <Input
                  id="custom-bot-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Support Assistant"
                  className="rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm px-4 h-11 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{fieldErrors.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-bot-desc" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Short Tagline / Description
                </Label>
                <Input
                  id="custom-bot-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 24/7 AI guide for documentation & billing"
                  className="rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm px-4 h-11 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                />
              </div>
            </div>

            {/* Persona Preset Picker */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
              <Label className="text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono font-semibold">
                Persona Templates (1-Click Presets)
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PERSONA_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/70 text-zinc-900 ring-2 ring-emerald-500/25 shadow-xs dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-white"
                          : "border-zinc-200/90 bg-zinc-50/60 hover:bg-zinc-100/80 hover:border-zinc-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{preset.icon}</span>
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {preset.title}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="mt-3 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
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
                <Label htmlFor="custom-system-prompt" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  System Instructions &amp; Persona
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
                className="rounded-2xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-mono leading-relaxed p-4 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              />
              {fieldErrors.systemPrompt && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{fieldErrors.systemPrompt}</p>
              )}
            </div>

            {/* Starter Questions Manager */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
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
                    className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100/80 px-3.5 py-1.5 text-xs text-zinc-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-200 font-medium"
                  >
                    <span>{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-1 cursor-pointer"
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
                  className="rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 text-xs flex-1 px-4 h-10 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQuestion}
                  disabled={!newQuestionInput.trim() || starterQuestions.length >= 6}
                  className="rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05] px-4 h-10 text-xs font-medium cursor-pointer"
                >
                  Add Chip
                </Button>
              </div>
              {fieldErrors.starterQuestions && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{fieldErrors.starterQuestions}</p>
              )}
            </div>

            {/* RAG Top-K Depth */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
              <div>
                <Label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  RAG Retrieval Depth (Top-K)
                </Label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Number of most relevant knowledge chunks retrieved per user question.
                </p>
              </div>
              <div className="w-36">
                <CustomSelect
                  value={String(ragTopK)}
                  options={[
                    { value: "4", label: "4 chunks (Fast)" },
                    { value: "6", label: "6 chunks (Balanced)" },
                    { value: "8", label: "8 chunks (Deep)" },
                    { value: "12", label: "12 chunks (Exhaustive)" },
                  ]}
                  onChange={(val) => setRagTopK(Number(val))}
                />
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-white/[0.06]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="rounded-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05] px-5 h-9 text-xs font-medium cursor-pointer"
              >
                ← Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 h-9 text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue to Knowledge Base</span>
                <span className="text-sm">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          STEP 3: MULTI-SOURCE KNOWLEDGE INGESTION
      ========================================================================= */}
      {currentStep === 3 && (
        <Card className="rounded-3xl border border-zinc-200/90 bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#0E1015]/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <CardHeader className="pb-5 border-b border-zinc-100 dark:border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Add Knowledge Base Sources
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Upload documents or connect websites to ground your chatbot with factual evidence.
                </CardDescription>
              </div>
              <Badge variant="lime">Step 3 of 3</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 transition-all cursor-pointer ${
                isDragging
                  ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "border-zinc-300 bg-zinc-50/70 hover:border-emerald-500 hover:bg-emerald-50/30 dark:border-white/15 dark:bg-[#0E1015]/60 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/20"
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

              <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-2xl mb-3 shadow-2xs">
                📁
              </div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                Drag and drop files here, or <span className="text-emerald-700 dark:text-emerald-400 underline font-semibold">browse</span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Supports PDF, Word, PowerPoint, Spreadsheets, Markdown, and Images (up to 25 MB each)
              </p>

              {/* Supported format badges */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {["PDF", "DOCX", "PPTX", "CSV", "TXT", "MD", "PNG / JPG"].map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-full border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-mono text-zinc-600 dark:text-zinc-400"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-700 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50">
                {uploadError}
              </p>
            )}

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider text-zinc-700 dark:text-zinc-300 font-mono font-semibold">
                    Attached Documents ({attachedFiles.length})
                  </Label>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles([])}
                    className="text-[11px] text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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
                        className="flex items-center justify-between rounded-xl border border-zinc-200/90 bg-white p-3 text-xs shadow-2xs dark:border-white/[0.08] dark:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">
                            {file.name}
                          </span>
                          <span className="text-zinc-500 font-mono text-[11px]">
                            ({formatBytes(file.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors ml-2 px-1 cursor-pointer"
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
            <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-white/[0.06]">
              <Label htmlFor="custom-bot-url" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Attach Website URL (Optional)
              </Label>
              <Input
                id="custom-bot-url"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 text-xs font-mono px-4 h-11 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                The crawler will discover and index pages alongside your uploaded documents.
              </p>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-white/[0.06]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isSubmitting}
                className="rounded-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05] px-5 h-9 text-xs font-medium cursor-pointer"
              >
                ← Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 h-10 shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl text-center space-y-4 dark:border-white/10 dark:bg-[#0E1015]">
            <Spinner className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Building Your Custom Chatbot
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-mono">{submissionStage}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left space-y-2 text-xs dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Configured model: {model}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Encrypted private credentials</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300">
                <span className="text-emerald-600 dark:text-emerald-400 animate-pulse">●</span>
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
