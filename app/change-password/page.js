"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/crm-ui";
import { toast } from "sonner";
import { ShieldCheck, KeyRound, Loader2, ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { getUser } from "@/lib/authUtils";

function ChangePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(queryEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const activeUser = getUser();
    if (activeUser?.email) {
      setEmail(activeUser.email);
      setIsLoggedIn(true);
    } else if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !newPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentPassword) {
      toast.error("Please enter your current password. If forgotten, use 'Reset via Email'.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Password updated successfully!");
        setTimeout(() => {
          if (isLoggedIn) {
            router.push("/");
          } else {
            router.push("/login");
          }
        }, 1500);
      } else {
        toast.error(data.message || "Failed to update password");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <KeyRound className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Change Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Update your account password with your current credentials.
          </p>
        </div>

        <Section className="p-6 shadow-sm border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Work Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoggedIn}
                className={isLoggedIn ? "bg-muted cursor-not-allowed" : ""}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="currentPassword" className="text-xs font-semibold">
                  Current Password <span className="text-destructive">*</span>
                </Label>
                <Link
                  href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Forgot current password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current or onboarding password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded focus:outline-none"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-semibold">
                New Confidential Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded focus:outline-none"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                Confirm New Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type={showNew ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gap-2 mt-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Update Password &amp; Continue
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center border-t border-border/80 pt-4 flex items-center justify-between">
            <Link
              href={isLoggedIn ? "/" : "/login"}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              {isLoggedIn ? "Back to Dashboard" : "Back to Sign In"}
            </Link>
            <Link
              href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
            >
              <Mail className="size-3" />
              Reset via Email
            </Link>
          </div>
        </Section>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ChangePasswordContent />
    </Suspense>
  );
}
