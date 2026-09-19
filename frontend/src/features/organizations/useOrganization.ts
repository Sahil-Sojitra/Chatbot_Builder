"use client";

import { useCallback, useEffect } from "react";

import { ApiRequestError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organization";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

import {
  setNoOrganization,
  setOrganization,
  setOrganizationError,
  setOrganizationLoading,
} from "./organizationSlice";

/**
 * Fetches the caller's organization once (on first use, while status is
 * "idle") and exposes the resulting Redux state plus a manual `refetch`.
 * A 404 ORGANIZATION_NOT_FOUND is treated as the expected "none" state, not
 * an error — every other failure becomes "error".
 */
export function useOrganization() {
  const dispatch = useAppDispatch();
  const { status, organization, error } = useAppSelector((state) => state.organization);

  const fetchOrganization = useCallback(async () => {
    dispatch(setOrganizationLoading());
    try {
      const { organization: org } = await organizationApi.get();
      dispatch(setOrganization(org));
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ORGANIZATION_NOT_FOUND") {
        dispatch(setNoOrganization());
        return;
      }
      dispatch(
        setOrganizationError(
          err instanceof ApiRequestError ? err.message : "Failed to load your organization.",
        ),
      );
    }
  }, [dispatch]);

  useEffect(() => {
    if (status === "idle") {
      void fetchOrganization();
    }
  }, [status, fetchOrganization]);

  return { status, organization, error, refetch: fetchOrganization };
}
