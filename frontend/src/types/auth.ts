/** Mirrors backend/src/modules/auth/auth.types.ts PublicUser — never includes any token. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
