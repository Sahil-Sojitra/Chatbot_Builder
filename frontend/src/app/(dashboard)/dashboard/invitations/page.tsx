"use client";

import { Button, EmptyState, Spinner } from "@/components/ui";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import { useInvitations } from "@/features/invitations/useInvitations";

export default function InvitationsPage() {
  const { status, invitations, error, refetch } = useInvitations();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading invitations…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Couldn't load invitations"
        description={error ?? "Something went wrong. Please try again."}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        title="No pending invitations"
        description="When someone invites you to join their organization, it will show up here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invitations</h1>
        <p className="text-sm text-muted-foreground">
          Organizations that have invited you to join.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onResolved={() => void refetch()}
          />
        ))}
      </div>
    </div>
  );
}
