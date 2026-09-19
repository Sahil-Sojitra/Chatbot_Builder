/** Mirrors backend/src/modules/organizations/organization.types.ts PublicOrganization. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: string;
  updatedAt: string;
}
