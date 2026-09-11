"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/crm-ui";
import { toast } from "sonner";
import { ShieldCheck, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token) {
      setErrorMsg("Password reset token is missing. Please click the link in your email or request a new one.");
      toast.error("Missing reset token");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email || undefined,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        toast.success(data.message || "Password successfully reset!");
      } else {
        setErrorMsg(data.message || "Failed to reset password. The link may have expired.");
        toast.error(data.message || "Reset failed");
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
          <img src="/assets/contech-logo.png" alt="CONTECH" className="mx-auto h-8 w-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {email ? `Choose a strong new password for ${email}` : "Enter your new credentials below to regain access"}
          </p>
        </div>

        <Section className="p-6 shadow-sm border border-border">
          {!token ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Invalid Reset Link</h3>
                <p className="text-xs text-muted-foreground">
                  The password reset link appears incomplete or missing the required security token.
                </p>
              </div>
              <div className="pt-2">
                <Button asChild className="w-full text-xs">
                  <Link href="/forgot-password">Request a New Reset Link</Link>
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Password Reset Successfully!</h3>
                <p className="text-xs text-muted-foreground">
                  Your account password has been updated. You can now sign in using your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Button asChild className="w-full text-xs gap-1.5">
                  <Link href="/login">
                    Proceed to Sign In →
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-semibold">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm New Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Reset Password &amp; Login
                  </>
                )}
              </Button>

              <div className="mt-5 text-center border-t border-border/80 pt-4 flex items-center justify-between">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Sign In
                </Link>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Need a fresh link?
                </Link>
              </div>
            </form>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
