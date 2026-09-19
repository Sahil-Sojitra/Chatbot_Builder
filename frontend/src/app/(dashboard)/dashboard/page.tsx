"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useLogout } from "@/features/auth/useLogout";
import { useAppSelector } from "@/lib/hooks";

export default function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { logout, isLoggingOut } = useLogout();

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{user ? `Welcome, ${user.name}` : "Dashboard"}</CardTitle>
        <CardDescription>
          {user ? user.email : "Chatbot management will appear here once the dashboard is built."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="secondary"
          disabled={isLoggingOut}
          onClick={() => void logout()}
        >
          {isLoggingOut ? "Logging out…" : "Log out"}
        </Button>
      </CardContent>
    </Card>
  );
}
