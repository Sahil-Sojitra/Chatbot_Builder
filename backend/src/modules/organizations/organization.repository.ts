import type { ClientSession, HydratedDocument, Types } from "mongoose";

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

  async create(
    input: CreateOrganizationInput,
    session?: ClientSession,
  ): Promise<HydratedDocument<IOrganization>> {
    const docs = await OrganizationModel.create([input], session ? { session } : {});
    // create([...]) always returns an array
    return docs[0] as HydratedDocument<IOrganization>;
  },
};
