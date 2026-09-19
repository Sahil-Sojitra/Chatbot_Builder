import jwt from "jsonwebtoken";
import type { HydratedDocument } from "mongoose";

import {
  accountDeactivated,
  accountSuspended,
  emailAlreadyExists,
  incorrectPassword,
  invalidCredentials,
  invalidRefreshToken,
  refreshTokenExpired,
  samePassword,
  unauthorized,
} from "../../shared/errors.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../shared/jwt.js";
import { hashPassword, verifyPassword } from "../../shared/password.js";
import { authRepository } from "./auth.repository.js";
import type { UpdateUserFields } from "./auth.repository.js";
import type {
  ChangePasswordInput,
  LoginInput,
  LoginResult,
  MeResult,
  PublicUser,
  RefreshResult,
  RegisterInput,
  RegisterResult,
  UpdateMeInput,
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

export const authService = {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const { name, email, password } = input;

    if (await authRepository.emailExists(email)) {
      throw emailAlreadyExists();
    }

    const passwordHash = await hashPassword(password);
    const user = await authRepository.createUser({ name, email, passwordHash });

    return { user: toPublicUser(user) };
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
   * Exchange a still-valid refresh token (read from the HttpOnly cookie by
   * the controller) for a fresh access token. The refresh token is a
   * stateless, signed credential — no server-side session record is looked
   * up or touched.
   */
  async refresh(refreshToken: string): Promise<RefreshResult> {
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

  /** Returns the profile of the user identified by the access JWT's sub. */
  async me(userId: string): Promise<MeResult> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw unauthorized("User not found");
    }

    return { user: toPublicUser(user) };
  },

  /**
   * Updates only the caller's own genuinely-editable profile fields.
   * Explicitly whitelisted here — never a raw pass-through of the request
   * body — so a client can never touch status, email, emailVerified,
   * passwordHash, or any other server-controlled field.
   */
  async updateMe(userId: string, input: UpdateMeInput): Promise<MeResult> {
    const fields: UpdateUserFields = {};
    if (input.name !== undefined) {
      fields.name = input.name;
    }
    if (input.avatarUrl !== undefined) {
      fields.avatarUrl = input.avatarUrl;
    }

    const user = await authRepository.updateUserById(userId, fields);
    if (!user) {
      throw unauthorized("User not found");
    }

    return { user: toPublicUser(user) };
  },

  /**
   * Changes the caller's own password. Only passwordHash is ever written —
   * no other user field is touched. Already-issued JWTs are unaffected:
   * this architecture has no server-side revocation, by design.
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const { currentPassword, newPassword } = input;

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw unauthorized("User not found");
    }

    const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentMatches) {
      throw incorrectPassword();
    }

    const isSameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
    if (isSameAsCurrent) {
      throw samePassword();
    }

    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePasswordById(userId, passwordHash);
  },
};
