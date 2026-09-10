import type { IUser } from "./user.model.js";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

/** Public shape of a user — never contains passwordHash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  status: IUser["status"];
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterResult {
  user: PublicUser;
}

export interface LoginResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  accessToken: string;
}

export interface MeResult {
  user: PublicUser;
}
