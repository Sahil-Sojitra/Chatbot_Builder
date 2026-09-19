import type { Invitation } from "@/types/invitation";

/**
 * ISOLATION BOUNDARY — no invitation endpoints exist on the backend yet.
 * This module is the *only* place that knows that. Everything above it
 * (features/invitations/**, the Invitations page) calls `invitationsApi`
 * and has no idea whether it's talking to a mock or a real API.
 *
 * TODO(backend): once real endpoints exist (e.g.
 * GET /api/v1/invitations, POST /api/v1/invitations/:id/accept,
 * POST /api/v1/invitations/:id/decline — exact contract TBD by the
 * backend), replace the three function bodies below with `apiRequest`
 * calls, matching the pattern in lib/api/organization.ts. No other file
 * should need to change.
 *
 * `list()` deliberately returns an empty array rather than fabricated
 * invitations — this boundary must never inject fake data into the running
 * app, even while there's nothing real to fetch yet.
 */
export const invitationsApi = {
  list: (): Promise<Invitation[]> => Promise.resolve([]),

  accept: (invitationId: string): Promise<void> =>
    Promise.reject(
      new Error(
        `Accepting invitation ${invitationId} isn't available yet — no backend endpoint exists.`,
      ),
    ),

  decline: (invitationId: string): Promise<void> =>
    Promise.reject(
      new Error(
        `Declining invitation ${invitationId} isn't available yet — no backend endpoint exists.`,
      ),
    ),
};
