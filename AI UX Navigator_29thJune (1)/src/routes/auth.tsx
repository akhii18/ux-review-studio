import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, Building2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import googleIcon from "@/assets/google_icon.png.asset.json";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — UX Review Studio" },
      { name: "description", content: "Sign in to UX Review Studio with email, Google, Apple, or your enterprise SSO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "Enter a valid email address" }).max(255);
const passwordSchema = z.string().min(8, { message: "Password must be at least 8 characters" }).max(72);
const domainSchema = z.string().trim().min(3).max(253).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i, { message: "Enter a valid company domain (e.g. acme.com)" });

function AuthPage() {
  const navigate = useNavigate();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [signInErrors, setSignInErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const signInFormRef = useRef<HTMLFormElement>(null);

  function focusFirstInvalid(form: HTMLFormElement, fields: string[]) {
    for (const name of fields) {
      const el = form.elements.namedItem(name) as HTMLInputElement | null;
      if (el) {
        el.focus();
        return;
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailRes = emailSchema.safeParse(fd.get("email"));
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    setLoadingProvider("forgot");
    const { error } = await supabase.auth.resetPasswordForEmail(emailRes.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoadingProvider(null);
    if (error) return toast.error(error.message);
    toast.success("If an account exists, a reset link is on its way.");
    setForgotMode(false);
  }

  // If already signed in, bounce to dashboard
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/" });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleEmailSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const emailRes = emailSchema.safeParse(fd.get("email"));
    const passRes = passwordSchema.safeParse(fd.get("password"));
    const nextErrors: { email?: string; password?: string; form?: string } = {};
    if (!emailRes.success) nextErrors.email = emailRes.error.issues[0].message;
    if (!passRes.success) nextErrors.password = passRes.error.issues[0].message;
    if (nextErrors.email || nextErrors.password) {
      setSignInErrors(nextErrors);
      const invalid: string[] = [];
      if (nextErrors.email) invalid.push("email");
      if (nextErrors.password) invalid.push("password");
      focusFirstInvalid(form, invalid);
      return;
    }
    setSignInErrors({});
    setLoadingProvider("email-in");
    const { error } = await supabase.auth.signInWithPassword({ email: emailRes.data!, password: passRes.data! });
    setLoadingProvider(null);
    if (error) {
      setSignInErrors({ form: error.message });
      focusFirstInvalid(form, ["email"]);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/" });
  }

  async function handleEmailSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const emailRes = emailSchema.safeParse(fd.get("email"));
    const passRes = passwordSchema.safeParse(fd.get("password"));
    const fullName = String(fd.get("fullName") ?? "").trim().slice(0, 120);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    if (!passRes.success) return toast.error(passRes.error.issues[0].message);
    setLoadingProvider("email-up");
    const { error } = await supabase.auth.signUp({
      email: emailRes.data,
      password: passRes.data,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName || undefined },
      },
    });
    setLoadingProvider(null);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm your email.");
  }

  async function handleOAuth(provider: "google" | "apple") {
    setLoadingProvider(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoadingProvider(null);
      toast.error(`Could not sign in with ${provider}. ${result.error.message ?? ""}`);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  async function handleSSO(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const domainRes = domainSchema.safeParse(fd.get("domain"));
    if (!domainRes.success) return toast.error(domainRes.error.issues[0].message);
    setLoadingProvider("sso");
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: domainRes.data,
      options: { redirectTo: `${window.location.origin}/` },
    });
    setLoadingProvider(null);
    if (error) return toast.error(error.message ?? "SSO is not configured for this domain.");
    if (data?.url) window.location.href = data.url;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">UX Review Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace</p>
        </div>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Welcome</CardTitle>
            <CardDescription>Choose a sign-in method below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={loadingProvider !== null}
                className="group h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {loadingProvider === "google" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("apple")}
                disabled={loadingProvider !== null}
                className="group h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {loadingProvider === "apple" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <AppleIcon />
                )}
                Continue with Apple
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="sso">SSO</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4">
                {forgotMode ? (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Enter your account email and we'll send you a link to reset your password.
                    </p>
                    <Field id="email" label="Email" type="email" icon={<Mail className="h-4 w-4" />} autoComplete="email" required />
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-11 flex-1" onClick={() => setForgotMode(false)} disabled={loadingProvider !== null}>
                        Back
                      </Button>
                      <Button type="submit" className="h-11 flex-1" disabled={loadingProvider !== null}>
                        {loadingProvider === "forgot" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send link
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailSignIn} ref={signInFormRef} noValidate className="space-y-3" aria-describedby="signin-form-error">
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      icon={<Mail className="h-4 w-4" />}
                      autoComplete="email"
                      required
                      error={signInErrors.email}
                      onChange={() => signInErrors.email && setSignInErrors((p) => ({ ...p, email: undefined }))}
                    />
                    <Field
                      id="password"
                      label="Password"
                      type="password"
                      icon={<Lock className="h-4 w-4" />}
                      autoComplete="current-password"
                      required
                      error={signInErrors.password}
                      onChange={() => signInErrors.password && setSignInErrors((p) => ({ ...p, password: undefined }))}
                    />
                    <div
                      id="signin-form-error"
                      role="alert"
                      aria-atomic="true"
                      className={signInErrors.form ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" : "sr-only"}
                    >
                      {signInErrors.form ?? ""}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setForgotMode(true)}
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Button type="submit" className="h-11 w-full" disabled={loadingProvider !== null}>
                      {loadingProvider === "email-in" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleEmailSignUp} className="space-y-3">
                  <Field id="fullName" label="Full name" type="text" autoComplete="name" placeholder="Jane Doe" />
                  <Field id="email" label="Work email" type="email" icon={<Mail className="h-4 w-4" />} autoComplete="email" required />
                  <Field id="password" label="Password" type="password" icon={<Lock className="h-4 w-4" />} autoComplete="new-password" required hint="At least 8 characters" />
                  <Button type="submit" className="h-11 w-full" disabled={loadingProvider !== null}>
                    {loadingProvider === "email-up" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="sso" className="mt-4">
                <form onSubmit={handleSSO} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    For enterprise teams with SAML SSO. Enter your company's email domain to be redirected to your identity provider.
                  </p>
                  <Field id="domain" label="Company domain" type="text" icon={<Building2 className="h-4 w-4" />} placeholder="acme.com" required />
                  <Button type="submit" variant="secondary" className="h-11 w-full" disabled={loadingProvider !== null}>
                    {loadingProvider === "sso" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue with SSO
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in you agree to our{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  icon,
  hint,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon?: React.ReactNode; hint?: string; error?: string }) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={error ? "text-destructive" : undefined}>
        {label}
      </Label>
      <div className="relative">
        {icon && (
          <span
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${error ? "text-destructive" : "text-muted-foreground"}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <Input
          id={id}
          name={id}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${icon ? "h-11 pl-9" : "h-11"} ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} aria-live="polite" aria-atomic="true" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <img
      src={googleIcon.url}
      alt=""
      aria-hidden="true"
      className="mr-2 h-4 w-4 transition-[filter] duration-150 group-hover:brightness-0 group-hover:invert"
    />
  );
}



function AppleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.365 12.74c-.024-2.43 1.985-3.6 2.077-3.658-1.13-1.654-2.892-1.88-3.518-1.906-1.498-.151-2.927.882-3.69.882-.764 0-1.94-.86-3.193-.836-1.643.024-3.157.953-4.003 2.42-1.708 2.96-.437 7.34 1.222 9.745.81 1.18 1.778 2.504 3.046 2.457 1.222-.05 1.683-.79 3.16-.79 1.476 0 1.893.79 3.187.766 1.316-.024 2.15-1.2 2.954-2.385.93-1.37 1.314-2.7 1.336-2.77-.03-.013-2.562-.984-2.578-3.925zM13.84 5.32c.673-.82 1.128-1.958 1.003-3.09-.97.04-2.146.646-2.84 1.464-.622.726-1.166 1.887-1.02 3 .083.01 1.085.07 2.027-.69.74-.602 1.196-.972 1.83-.684z" />
    </svg>
  );
}
