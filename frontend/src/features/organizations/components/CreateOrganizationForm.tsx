"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import { organizationApi } from "@/lib/api/organization";
import { ApiRequestError } from "@/lib/api/client";
import { useAppDispatch } from "@/lib/hooks";

import { setOrganization } from "../organizationSlice";

const NAME_MAX_LENGTH = 120;

/** Mirrors the backend's createOrganizationSchema (backend/src/modules/organizations/organization.validation.ts). */
function validate(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Organization name is required.";
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be at most ${NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export interface CreateOrganizationFormProps {
  onCancel?: () => void;
}

/**
 * On success, dispatches the real organization into Redux and stops —
 * there's no separate "success" screen here because the parent (the
 * dashboard Overview page) is subscribed to the same state and immediately
 * swaps this form out for the real dashboard once `status` becomes
 * "loaded". That swap *is* the success state.
 */
export function CreateOrganizationForm({ onCancel }: CreateOrganizationFormProps) {
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const error = validate(name);
    setFieldError(error);
    if (error) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const { organization } = await organizationApi.create({ name: name.trim() });
      dispatch(setOrganization(organization));
    } catch (err) {
      setIsSubmitting(false);
      setFormError(
        err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.",
      );
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Create your organization</CardTitle>
        <CardDescription>You&apos;ll be the owner of this organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          aria-busy={isSubmitting}
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-col gap-4"
        >
          {formError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/20 bg-red-50 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? "org-name-error" : undefined}
            />
            {fieldError ? (
              <p id="org-name-error" role="alert" className="text-sm text-destructive">
                {fieldError}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Creating…" : "Create Organization"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
