import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — UX Review Studio" },
      { name: "description", content: "Set a new password for your UX Review Studio account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z.string().min(8, { message: "Password must be at least 8 characters" }).max(72);

type Status = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // The recovery email link opens this page with a session in PASSWORD_RECOVERY mode.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setStatus((prev) => (prev === "checking" ? (data.session ? "ready" : "invalid") : prev));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const passRes = passwordSchema.safeParse(fd.get("password"));
    const confirm = String(fd.get("confirm") ?? "");
    if (!passRes.success) return toast.error(passRes.error.issues[0].message);
    if (passRes.data !== confirm) return toast.error("Passwords don't match");

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: passRes.data });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setStatus("done");
    toast.success("Password updated");
    // Sign the user out so they re-authenticate with the new password.
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account</p>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">
              {status === "done" ? "All set" : "Set new password"}
            </CardTitle>
            <CardDescription>
              {status === "done"
                ? "Your password has been updated."
                : status === "invalid"
                  ? "This reset link is invalid or has expired."
                  : "Pick a strong password you haven't used before."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "checking" && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Verifying link" />
              </div>
            )}

            {status === "invalid" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Reset links expire after a short time. Request a new one from the sign-in page.
                </p>
                <Button asChild className="h-11 w-full">
                  <Link to="/auth">Back to sign in</Link>
                </Button>
              </div>
            )}

            {status === "ready" && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input id="password" name="password" type="password" autoComplete="new-password" className="h-11 pl-9" required minLength={8} />
                  </div>
                  <p className="text-xs text-muted-foreground">At least 8 characters</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                      <Lock className="h-4 w-4" />
                    </span>
                    <Input id="confirm" name="confirm" type="password" autoComplete="new-password" className="h-11 pl-9" required minLength={8} />
                  </div>
                </div>
                <Button type="submit" className="h-11 w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            )}

            {status === "done" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your new password.
                  </p>
                </div>
                <Button className="h-11 w-full" onClick={() => navigate({ to: "/auth" })}>
                  Continue to sign in
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
