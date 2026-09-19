/**
 * No backend invitation model exists yet — this shape is this frontend's own
 * best guess at what one will look like, kept deliberately small. It is NOT
 * a contract the backend has agreed to; treat every field as provisional
 * until a real API is designed. See lib/api/invitations.ts for the isolated
 * mock boundary that will need to change once that API exists.
 */
export type InvitationRole = "OWNER" | "ADMIN" | "MEMBER";
export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface Invitation {
  id: string;
  organizationName: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedAt: string;
}
