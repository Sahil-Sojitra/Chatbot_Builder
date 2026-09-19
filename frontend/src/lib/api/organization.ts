import type { Organization } from "@/types/organization";

import { apiRequest } from "./client";

export interface CreateOrganizationInput {
  name: string;
}

export interface UpdateOrganizationInput {
  name?: string;
}

export interface OrganizationResponse {
  organization: Organization;
}

/**
 * Thin wrapper over the backend's real, already-implemented organization
 * endpoints (backend/src/modules/organizations) — no new endpoints, no
 * mocking. GET returns 404 ORGANIZATION_NOT_FOUND (surfaced as
 * ApiRequestError) when the caller doesn't own one yet; callers use that to
 * distinguish "no organization" from a genuine failure.
 */
export const organizationApi = {
  create: (input: CreateOrganizationInput): Promise<OrganizationResponse> =>
    apiRequest<OrganizationResponse>("/api/v1/organization", {
      method: "POST",
      body: input,
    }),

  get: (): Promise<OrganizationResponse> =>
    apiRequest<OrganizationResponse>("/api/v1/organization"),

  update: (input: UpdateOrganizationInput): Promise<OrganizationResponse> =>
    apiRequest<OrganizationResponse>("/api/v1/organization", {
      method: "PATCH",
      body: input,
    }),
};
