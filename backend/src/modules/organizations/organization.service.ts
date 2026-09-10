import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { organizationAlreadyExists } from "../../shared/errors.js";
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "./organization.repository.js";
import type { IOrganization } from "./organization.model.js";
import type { CreateOrganizationInput, PublicOrganization } from "./organization.types.js";

const toPublicOrganization = (
  org: HydratedDocument<IOrganization>,
): PublicOrganization => ({
  id: org._id.toString(),
  name: org.name,
  slug: org.slug,
  ownerId: org.ownerId.toString(),
  status: org.status,
  createdAt: org.createdAt.toISOString(),
  updatedAt: org.updatedAt.toISOString(),
});

export const organizationService = {
  async create(
    ownerId: string,
    input: CreateOrganizationInput,
  ): Promise<PublicOrganization> {
    if (await organizationRepository.ownerHasOrganization(ownerId)) {
      throw organizationAlreadyExists();
    }

    const slug = await generateUniqueSlug(input.name, (candidate) =>
      organizationRepository.slugExists(candidate),
    );

    const organization = await organizationRepository.create({
      name: input.name,
      slug,
      ownerId: new Types.ObjectId(ownerId),
    });

    return toPublicOrganization(organization);
  },
};
