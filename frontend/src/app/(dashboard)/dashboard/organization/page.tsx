"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Spinner,
} from "@/components/ui";
import { OrganizationEmptyState } from "@/features/organizations/components/OrganizationEmptyState";
import { setOrganization } from "@/features/organizations/organizationSlice";
import { useOrganization } from "@/features/organizations/useOrganization";
import { organizationApi } from "@/lib/api/organization";
import { ApiRequestError } from "@/lib/api/client";
import { useAppDispatch } from "@/lib/hooks";
import type { Organization } from "@/types/organization";

const STATUS_BADGE_VARIANT: Record<Organization["status"], "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  DEACTIVATED: "destructive",
};

export default function OrganizationSettingsPage() {
  const dispatch = useAppDispatch();
  const { status, organization, error, refetch } = useOrganization();

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
    }
  }, [organization]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Spinner label="Loading organization settings…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Couldn't load organization settings"
        description={error ?? "Something went wrong. Please try again."}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  if (status === "none" || !organization) {
    return <OrganizationEmptyState />;
  }

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Organization name cannot be empty.");
      return;
    }
    if (trimmed.length > 100) {
      setFormError("Organization name must be at most 100 characters.");
      return;
    }

    if (trimmed === organization.name) {
      setSuccessMessage("Organization name is already up to date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await organizationApi.update({ name: trimmed });
      dispatch(setOrganization(response.organization));
      setSuccessMessage("Organization name updated successfully.");
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : "Failed to update organization name.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Organization Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization profile and workspace settings.
        </p>
      </div>

      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/20 bg-red-50 p-3 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/20 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      ) : null}

      {/* Organization Details Overview */}
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>{organization.name}</CardTitle>
              <Badge variant={STATUS_BADGE_VARIANT[organization.status]}>
                {organization.status}
              </Badge>
            </div>
            <CardDescription className="mt-1 font-mono text-xs">
              slug: {organization.slug}
            </CardDescription>
          </div>
          <span className="text-xs text-muted-foreground">
            Created on {new Date(organization.createdAt).toLocaleDateString()}
          </span>
        </CardHeader>
      </Card>

      {/* Edit Organization Name Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rename Organization</CardTitle>
          <CardDescription>
            Changing the name updates how your workspace appears. The slug remains stable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleUpdate(e)} className="flex flex-col gap-4 max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
