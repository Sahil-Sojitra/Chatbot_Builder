"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, EmptyState, buttonVariants } from "@/components/ui";

import { CreateOrganizationForm } from "./CreateOrganizationForm";

export function OrganizationEmptyState() {
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return <CreateOrganizationForm onCancel={() => setIsCreating(false)} />;
  }

  return (
    <EmptyState
      title="You're not part of an organization yet"
      description="Create an organization to start building chatbots, or check whether you've been invited to join an existing one."
      action={
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <Button onClick={() => setIsCreating(true)}>Create Organization</Button>
          <Link href="/dashboard/invitations" className={buttonVariants({ variant: "secondary" })}>
            View Invitations
          </Link>
        </div>
      }
    />
  );
}
