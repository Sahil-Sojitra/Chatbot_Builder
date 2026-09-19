"use client";

import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Spinner,
} from "@/components/ui";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { useOrganization } from "@/features/organizations/useOrganization";
import { useAppSelector } from "@/lib/hooks";

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

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{organization?.name}</CardTitle>
        <CardDescription>
          Welcome{user ? `, ${user.name}` : ""}. Chatbot management will appear here once the
          dashboard is built.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
