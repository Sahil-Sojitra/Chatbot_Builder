"use client";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { invitationsApi } from "@/lib/api/invitations";
import type { Invitation } from "@/types/invitation";

const ROLE_LABEL: Record<Invitation["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export interface InvitationCardProps {
  invitation: Invitation;
  /** Called after a successful accept/decline so the parent can refresh its list. */
  onResolved: (invitationId: string) => void;
}

export function InvitationCard({ invitation, onResolved }: InvitationCardProps) {
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setPendingAction("accept");
    setError(null);
    try {
      await invitationsApi.accept(invitation.id);
      onResolved(invitation.id);
    } catch (err) {
      setPendingAction(null);
      setError(err instanceof Error ? err.message : "Failed to accept invitation.");
    }
  };

  const handleDecline = async () => {
    setPendingAction("decline");
    setError(null);
    try {
      await invitationsApi.decline(invitation.id);
      onResolved(invitation.id);
    } catch (err) {
      setPendingAction(null);
      setError(err instanceof Error ? err.message : "Failed to decline invitation.");
    }
  };

  const isPending = invitation.status === "PENDING";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{invitation.organizationName}</CardTitle>
          <CardDescription>Invited as {ROLE_LABEL[invitation.role]}</CardDescription>
        </div>
        <Badge variant={isPending ? "primary" : "default"}>{invitation.status}</Badge>
      </CardHeader>
      {isPending ? (
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={pendingAction !== null} onClick={() => void handleAccept()}>
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pendingAction !== null}
              onClick={() => void handleDecline()}
            >
              {pendingAction === "decline" ? "Declining…" : "Decline"}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}
