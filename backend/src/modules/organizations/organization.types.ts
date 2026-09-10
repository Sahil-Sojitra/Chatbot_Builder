import type { IOrganization } from "./organization.model.js";

export interface CreateOrganizationInput {
  name: string;
}

export interface UpdateOrganizationInput {
  name?: string;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: IOrganization["status"];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationResult {
  organization: PublicOrganization;
}
