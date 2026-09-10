import type { HydratedDocument, Types } from "mongoose";

import { OrganizationModel } from "./organization.model.js";
import type { IOrganization } from "./organization.model.js";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
}

export const organizationRepository = {
  async slugExists(slug: string): Promise<boolean> {
    const existing = await OrganizationModel.exists({ slug });
    return existing !== null;
  },

  async ownerHasOrganization(ownerId: string): Promise<boolean> {
    const existing = await OrganizationModel.exists({ ownerId });
    return existing !== null;
  },

  async findByOwnerId(
    ownerId: string,
  ): Promise<HydratedDocument<IOrganization> | null> {
    return OrganizationModel.findOne({ ownerId });
  },

  async create(
    input: CreateOrganizationInput,
  ): Promise<HydratedDocument<IOrganization>> {
    return OrganizationModel.create(input);
  },
};
