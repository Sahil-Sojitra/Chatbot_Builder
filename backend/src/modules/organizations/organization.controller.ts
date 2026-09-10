import type { Request, Response } from "express";

import { unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { organizationService } from "./organization.service.js";
import type { CreateOrganizationInput } from "./organization.types.js";

export const organizationController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const organization = await organizationService.create(
      req.auth.userId,
      req.body as CreateOrganizationInput,
    );

    sendSuccess(res, { organization }, 201);
  },
};
