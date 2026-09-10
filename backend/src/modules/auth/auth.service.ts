import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import type { HydratedDocument } from "mongoose";

import {
  accountDeactivated,
  accountSuspended,
  emailAlreadyExists,
  invalidCredentials,
  invalidRefreshToken,
  refreshTokenExpired,
} from "../../shared/errors.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../shared/jwt.js";
import { hashPassword, verifyPassword } from "../../shared/password.js";
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import type { IOrganization } from "../organizations/organization.model.js";
import { authRepository } from "./auth.repository.js";
import type {
  LoginInput,
  LoginResult,
  PublicOrganization,
  PublicUser,
  RefreshInput,
  RefreshResult,
  RegisterInput,
  RegisterResult,
} from "./auth.types.js";
import type { IUser } from "./user.model.js";

const toPublicUser = (user: HydratedDocument<IUser>): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  status: user.status,
  emailVerified: user.emailVerified,
  avatarUrl: user.avatarUrl ?? null,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

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

const isTransactionUnsupported = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("Transaction numbers are only allowed on a replica set") ||
    message.includes("does not support transactions") ||
    message.includes("Transactions are not supported")
  );
};

export const authService = {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const { name, email, password } = input;

    if (await authRepository.emailExists(email)) {
      throw emailAlreadyExists();
    }

    const passwordHash = await hashPassword(password);
    const slug = await generateUniqueSlug(name, (candidate) =>
      organizationRepository.slugExists(candidate),
    );

    let user: HydratedDocument<IUser>;
    let organization: HydratedDocument<IOrganization>;
      // Start a session for the transaction (transaction is : either both user and organization are created or neither is created)
    const session = await mongoose.startSession();
    try {
      // Start a transaction to ensure data consistency.
      session.startTransaction();

      user = await authRepository.createUser(
        { name, email, passwordHash },
        session,
      );
      organization = await organizationRepository.create(
        { name, slug, ownerId: user._id },
        session,
      );
      // user and the orgamazation of the user are created in a transaction to ensure that either both are created or neither is created, maintaining data integrity.
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction().catch(() => undefined);

      if (isTransactionUnsupported(err)) {
        // Standalone MongoDB: fall back to sequential writes with cleanup.
        return this.registerWithoutTransaction({ name, email, passwordHash, slug });
      }
      throw err;
    } finally {
      await session.endSession();
    }

    return {
      user: toPublicUser(user),
      organization: toPublicOrganization(organization),
    };
  },

  async registerWithoutTransaction(params: {
    name: string;
    email: string;
    passwordHash: string;
    slug: string;
  }): Promise<RegisterResult> {
    const { name, email, passwordHash, slug } = params;

    const user = await authRepository.createUser({ name, email, passwordHash });

    try {
      const organization = await organizationRepository.create({
        name,
        slug,
        ownerId: user._id,
      });

      return {
        user: toPublicUser(user),
        organization: toPublicOrganization(organization),
      };
    } catch (err) {
      // Roll back the orphaned user so registration is all-or-nothing.
      await authRepository.deleteUserById(user._id.toString()).catch(() => undefined);
      throw err;
    }
  },

  async login(input: LoginInput): Promise<LoginResult> {
    const { email, password } = input;

    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw invalidCredentials();
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (user.status === "SUSPENDED") {
      throw accountSuspended();
    }
    if (user.status === "DEACTIVATED") {
      throw accountDeactivated();
    }

    const userId = user._id.toString();
    const accessToken = signAccessToken({ sub: userId });
    const refreshToken = signRefreshToken({ sub: userId });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    };
  },

  /**
   * Exchange a still-valid refresh token for a fresh access token. The
   * refresh token is a stateless, signed credential — no server-side
   * session record is looked up or touched.
   */
  async refresh(input: RefreshInput): Promise<RefreshResult> {
    const { refreshToken } = input;

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw refreshTokenExpired();
      }
      throw invalidRefreshToken();
    }

    // The owning user must still exist and be allowed to authenticate.
    const user = await authRepository.findUserById(payload.sub);
    if (!user) {
      throw invalidRefreshToken();
    }
    if (user.status === "SUSPENDED") {
      throw accountSuspended();
    }
    if (user.status === "DEACTIVATED") {
      throw accountDeactivated();
    }

    const accessToken = signAccessToken({ sub: user._id.toString() });

    return { accessToken };
  },
};
