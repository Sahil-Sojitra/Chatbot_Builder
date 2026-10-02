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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {organization.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ORG_STATUS_BADGE_VARIANT[organization.status]}>
            {organization.status}
          </Badge>
          <Link
            href="/dashboard/organization"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Settings
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Total Chatbots</CardDescription>
            <CardTitle className="text-3xl font-bold">{chatbotsState.chatbots.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Assistants in this organization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Active (Published)</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">
              {activeChatbotsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Ready to serve queries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium">Draft & Paused</CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {chatbotsState.chatbots.length - activeChatbotsCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Under configuration</p>
          </CardContent>
        </Card>
      </div>

      {/* Chatbots Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Chatbots</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/chatbots/new"
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              Create Chatbot
            </Link>
            {chatbotsState.chatbots.length > 0 ? (
              <Link
                href="/dashboard/chatbots"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                View all
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
