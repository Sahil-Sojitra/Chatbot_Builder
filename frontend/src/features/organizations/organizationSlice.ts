import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import type { Organization } from "@/types/organization";

/**
 * "none" is a real, meaningful state here — distinct from "error" — because
 * the backend represents "you don't own an organization" as a 404, which is
 * an expected, normal outcome for a freshly-registered user, not a failure.
 */
export type OrganizationStatus = "idle" | "loading" | "loaded" | "none" | "error";

export interface OrganizationState {
  status: OrganizationStatus;
  organization: Organization | null;
  error: string | null;
}

const initialState: OrganizationState = {
  status: "idle",
  organization: null,
  error: null,
};

const organizationSlice = createSlice({
  name: "organization",
  initialState,
  reducers: {
    setOrganizationLoading: (state) => {
      state.status = "loading";
      state.error = null;
    },
    /** Call after a successful create/fetch/update — always the full current organization. */
    setOrganization: (state, action: PayloadAction<Organization>) => {
      state.status = "loaded";
      state.organization = action.payload;
      state.error = null;
    },
    /** Call when the fetch confirms the caller owns no organization (backend 404). */
    setNoOrganization: (state) => {
      state.status = "none";
      state.organization = null;
      state.error = null;
    },
    setOrganizationError: (state, action: PayloadAction<string>) => {
      state.status = "error";
      state.error = action.payload;
    },
    /** Call on logout so a subsequently-logged-in user doesn't briefly see the previous user's organization. */
    resetOrganization: () => initialState,
  },
});

export const {
  setOrganizationLoading,
  setOrganization,
  setNoOrganization,
  setOrganizationError,
  resetOrganization,
} = organizationSlice.actions;
export default organizationSlice.reducer;
