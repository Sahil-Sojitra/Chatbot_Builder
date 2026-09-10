import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import {
  organizationAlreadyExists,
  organizationNotFound,
} from "../../shared/errors.js";
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "./organization.repository.js";
import type { UpdateOrganizationFields } from "./organization.repository.js";
import type { IOrganization } from "./organization.model.js";
import type {
  CreateOrganizationInput,
  PublicOrganization,
  UpdateOrganizationInput,
} from "./organization.types.js";

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

  /** Returns the organization owned by this authenticated user, or 404. */
  async getForOwner(ownerId: string): Promise<PublicOrganization> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    return toPublicOrganization(organization);
  },

  /**
   * Updates only the caller's own organization. The lookup/update is always
   * scoped to ownerId, so a client can never touch another organization —
   * there is no organizationId input anywhere in this path. name is the
   * only editable field in V1; slug is intentionally left untouched — it's
   * derived once at creation and nothing in this codebase regenerates it,
   * so a rename does not change the organization's stable slug.
   */
  async updateForOwner(
    ownerId: string,
    input: UpdateOrganizationInput,
  ): Promise<PublicOrganization> {
    const fields: UpdateOrganizationFields = {};
    if (input.name !== undefined) {
      fields.name = input.name;
    }

    const organization = await organizationRepository.updateByOwnerId(
      ownerId,
      fields,
    );
    if (!organization) {
      throw organizationNotFound();
    }

    return toPublicOrganization(organization);
  },
};
