"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";
import { updateUser } from "@/features/auth/authSlice";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function AccountSettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  // Profile fields
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("Name cannot be empty.");
      return;
    }
    if (trimmedName.length > 100) {
      setProfileError("Name must be at most 100 characters.");
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const response = await authApi.updateMe({
        name: trimmedName,
        avatarUrl: avatarUrl.trim() || null,
      });
      dispatch(updateUser(response.user));
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof ApiRequestError ? err.message : "Failed to update profile.",
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password cannot be the same as your current password.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof ApiRequestError ? err.message : "Failed to change password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile details and security credentials.
        </p>
      </div>

      {/* User Information & Profile Form */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>Update your display name and public avatar.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
                {user.status}
              </Badge>
              {user.emailVerified ? <Badge variant="default">Verified</Badge> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleUpdateProfile(e)} className="flex flex-col gap-4 max-w-md">
            {profileError ? (
              <div
                role="alert"
                className="rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm font-medium text-red-300"
              >
                {profileError}
              </div>
            ) : null}

            {profileSuccess ? (
              <div
                role="status"
                className="rounded-md border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm font-medium text-emerald-300"
              >
                {profileSuccess}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-email">Email Address</Label>
              <Input
                id="account-email"
                value={user.email}
                disabled
                className="bg-secondary/40 text-muted-foreground"
              />
              <span className="text-xs text-muted-foreground">
                Email cannot be changed directly.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-name">Full Name</Label>
              <Input
                id="account-name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                disabled={isUpdatingProfile}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-avatar">Avatar URL</Label>
              <Input
                id="account-avatar"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                disabled={isUpdatingProfile}
                placeholder="https://example.com/avatar.png (optional)"
              />
            </div>

            <div>
              <Button type="submit" disabled={isUpdatingProfile || !name.trim()}>
                {isUpdatingProfile ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password. Must be at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleChangePassword(e)} className="flex flex-col gap-4 max-w-md">
            {passwordError ? (
              <div
                role="alert"
                className="rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm font-medium text-red-300"
              >
                {passwordError}
              </div>
            ) : null}

            {passwordSuccess ? (
              <div
                role="status"
                className="rounded-md border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm font-medium text-emerald-300"
              >
                {passwordSuccess}
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-current-password">Current Password</Label>
              <Input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-new-password">New Password</Label>
              <Input
                id="account-new-password"
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-confirm-password">Confirm New Password</Label>
              <Input
                id="account-confirm-password"
                type="password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isChangingPassword}
                required
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isChangingPassword ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
