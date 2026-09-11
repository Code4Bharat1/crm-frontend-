"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/crm-ui";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2, CheckCircle2, RotateCw } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(queryEmail);
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [queryEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your work email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedEmail(email.trim());
        setSuccess(true);
        toast.success(data.message || "Reset link dispatched to your email!");
      } else {
        toast.error(data.message || "Failed to request password reset");
      }
    } catch (err) {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setSuccess(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <img src="/assets/contech-logo.png" alt="CONTECH" className="mx-auto h-8 w-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reset Your Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We will send a secure password reset link to your registered work email.
          </p>
        </div>

        <Section className="p-6 shadow-sm border border-border">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Work Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoFocus
                  />
                  <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The link will be valid for 60 minutes and can only be used once.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full gap-2 mt-2">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <Mail className="size-4" />
                    Send Password Reset Link
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
                  href="/change-password"
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Know your password?
                </Link>
              </div>
            </form>
          ) : (
            <div className="text-center py-3 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Check Your Email</h3>
                <p className="text-xs text-muted-foreground">
                  A reset link has been dispatched to:
                </p>
                <p className="text-sm font-semibold text-primary">{submittedEmail}</p>
              </div>

              <div className="bg-muted/60 rounded-lg p-3 text-left text-xs text-muted-foreground space-y-1 border border-border">
                <p className="font-semibold text-foreground">Didn’t receive the email?</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Check your spam, junk, or promotional folders.</li>
                  <li>Verify that <strong>{submittedEmail}</strong> is your registered login email.</li>
                  <li>Wait 1-2 minutes for mail transfer agents to deliver.</li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResend}
                  className="w-full gap-1.5 text-xs"
                >
                  <RotateCw className="size-3.5" />
                  Resend or Try Another Email
                </Button>

                <Button asChild size="sm" className="w-full text-xs">
                  <Link href="/login">Return to Sign In</Link>
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
