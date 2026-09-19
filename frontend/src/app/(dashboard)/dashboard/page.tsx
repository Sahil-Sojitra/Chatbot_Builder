"use client";

import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
  buttonVariants,
} from "@/components/ui";
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

  if (status === "none") {
    return <OrganizationEmptyState />;
  }

  // status === "loaded" always carries an organization — this guards TypeScript, not a real runtime case.
  if (!organization) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {organization.name}
          </h1>
        </div>
        <Badge variant={ORG_STATUS_BADGE_VARIANT[organization.status]}>
          {organization.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome{user ? `, ${user.name}` : ""}</CardTitle>
          <CardDescription>
            This is your organization&apos;s dashboard. Chatbots and knowledge sources you
            create will show up here.
          </CardDescription>
        </CardHeader>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Chatbots</h2>
        <EmptyState
          title="No chatbots yet"
          description="Chatbot management isn't built yet — once it is, your chatbots will show up here."
          action={
            <Link href="/dashboard/chatbots" className={buttonVariants({ variant: "default" })}>
              Create your first chatbot
            </Link>
          }
        />
      </div>
    </div>
  );
}
