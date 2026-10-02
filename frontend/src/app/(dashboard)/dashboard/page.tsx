"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  buttonVariants,
} from "@/components/ui";
import { ChatbotCard } from "@/features/chatbots/components/ChatbotCard";
import { useChatbots } from "@/features/chatbots/useChatbots";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { useOrganization } from "@/features/organizations/useOrganization";
import { useAppSelector } from "@/lib/hooks";
import type { Organization } from "@/types/organization";

const ORG_STATUS_BADGE_VARIANT: Record<
  Organization["status"],
  "success" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "destructive",
};

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { status, organization, error, refetch } = useOrganization();
  const chatbotsState = useChatbots(status === "loaded");

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading your organization…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Couldn't load your organization"
        description={error ?? "Something went wrong. Please try again."}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  if (status === "none" || !organization) {
    return <OrganizationEmptyState />;
  }

  const activeChatbotsCount = chatbotsState.chatbots.filter(
    (c) => c.status === "ACTIVE",
  ).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Workspace Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Workspace</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-300 font-mono">{organization.slug || "default"}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {organization.name}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your deployed conversational agents, linked knowledge bases, and custom widgets.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant={ORG_STATUS_BADGE_VARIANT[organization.status]}>
            <span className="h-2 w-2 rounded-full bg-emerald-400 mr-1" />
            {organization.status}
          </Badge>
          <Link
            href="/dashboard/organization"
            className={buttonVariants({ variant: "secondary", size: "default" })}
          >
            Settings
          </Link>
          <Link
            href="/dashboard/chatbots/new"
            className={buttonVariants({ variant: "default", size: "default" })}
          >
            Deploy Chatbot
          </Link>
        </div>
      </div>

      {/* Telemetry Stat Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total Chatbots</span>
            <span className="text-xs text-zinc-500 font-mono">ALL DEPLOYMENTS</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{chatbotsState.chatbots.length}</span>
            <span className="text-xs text-zinc-400">configured</span>
          </div>
        </Card>

        <Card className="rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Live / Ready</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {activeChatbotsCount}
            </span>
            <span className="text-xs text-zinc-400">serving live traffic</span>
          </div>
        </Card>

        <Card className="rounded-md border border-zinc-800 bg-[#0a0a0a] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Staging / Paused</span>
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400">
              {chatbotsState.chatbots.length - activeChatbotsCount}
            </span>
            <span className="text-xs text-zinc-400">offline or draft</span>
          </div>
        </Card>
      </div>

      {/* Chatbots Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-zinc-100">
              Deployed Chatbots
            </h2>
            <span className="rounded-md bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 font-mono">
              {chatbotsState.chatbots.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {chatbotsState.chatbots.length > 0 ? (
              <Link
                href="/dashboard/chatbots"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                View all &rarr;
              </Link>
            ) : null}
          </div>
        </div>

        {chatbotsState.status === "loading" ? (
          <div className="py-8">
            <Spinner label="Loading chatbots…" />
          </div>
        ) : chatbotsState.chatbots.length === 0 ? (
          <EmptyState
            title="No chatbots yet"
            description="Create your first chatbot to start configuring prompts, models, and knowledge bases."
            action={
              <Link
                href="/dashboard/chatbots/new"
                className={buttonVariants({ variant: "default" })}
              >
                Create Chatbot
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {chatbotsState.chatbots.slice(0, 3).map((bot) => (
              <ChatbotCard key={bot.id} chatbot={bot} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
