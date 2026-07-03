"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lock, Mail, X } from "lucide-react";
import { toast } from "sonner";
import {
  signin as apiSignin,
  signup as apiSignup,
  verifyEmail as apiVerifyEmail,
} from "@/lib/api";

function AuthPageContent() {
  const router = useRouter();
  const [tab, setTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [didTrySigninSubmit, setDidTrySigninSubmit] = useState(false);
  const [didTrySignupSubmit, setDidTrySignupSubmit] = useState(false);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const fullNamePattern = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
  const isSignupNameInvalid = signupName.length > 0 && !fullNamePattern.test(signupName);
  const isSignupNameValid = signupName.length > 0 && fullNamePattern.test(signupName);
  const signupEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  const isSignupEmailValid = signupEmail.length > 0 && signupEmailPattern.test(signupEmail.trim());
  const isSignupEmailInvalid = signupEmail.length > 0 && !isSignupEmailValid;
  const isSigninEmailValid = email.length > 0 && signupEmailPattern.test(email.trim());
  const isSigninEmailInvalid = email.length > 0 && !isSigninEmailValid;
  const isSigninPasswordValid = password.length > 0;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  const isStrongPassword = (value: string) => {
    return (
      value.length >= 10 &&
      /[A-Z]/.test(value) &&
      /[a-z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value)
    );
  };

  const passwordRules = [
    { label: "At least 10 characters", passed: signupPassword.length >= 10 },
    { label: "At least one capital letter", passed: /[A-Z]/.test(signupPassword) },
    { label: "At least one lowercase letter", passed: /[a-z]/.test(signupPassword) },
    { label: "At least one numeric character", passed: /[0-9]/.test(signupPassword) },
    { label: "At least one special character", passed: /[^A-Za-z0-9]/.test(signupPassword) },
  ];

  const isPasswordReady = signupPassword.length > 0 && passwordRules.every((rule) => rule.passed);
  const isConfirmPasswordReady = confirmPassword.length > 0 && confirmPassword === signupPassword && isPasswordReady;
  const passwordsMismatch = (signupPassword.length > 0 || confirmPassword.length > 0) && signupPassword !== confirmPassword;
  const canCreateAccount =
    isSignupNameValid &&
    isSignupEmailValid &&
    isPasswordReady &&
    isConfirmPasswordReady &&
    !isSubmitting;

  useEffect(() => {
    if (isPasswordReady) {
      setShowPasswordRules(false);
    }
  }, [isPasswordReady]);

  useEffect(() => {
    if (tab === "signup" && isPasswordReady && !confirmPassword) {
      confirmPasswordRef.current?.focus();
    }
  }, [confirmPassword, isPasswordReady, tab]);

  const handleEmailSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      setIsSubmitting(true);
      setError(null);

      if (!normalizedEmail) {
        throw new Error("Enter your email to continue");
      }

      if (!password) {
        throw new Error("Enter your password.");
      }

      const result = await apiSignin({
        email: normalizedEmail,
        password,
      });

      localStorage.setItem("token", result.token);
      const currentUser = { name: result.user.name || "User", email: result.user.email };
      localStorage.setItem("current_user", JSON.stringify(currentUser));
      document.cookie = `token=${result.token}; Path=/; Max-Age=${result.expiresInSeconds}; SameSite=Lax`;

      toast.success("User authenticated");
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDidTrySigninSubmit(true);

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    await handleEmailSignIn();
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("Forgot password is disabled for now.");
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDidTrySignupSubmit(true);

    if (!signupName.trim() || !fullNamePattern.test(signupName)) {
      setError("Enter a valid full name.");
      return;
    }

    if (!signupEmail.trim() || !signupPassword) {
      setError("Enter both email and password.");
      return;
    }

    if (signupPassword !== confirmPassword) {
      setError("Passwords not matched");
      return;
    }

    if (!isStrongPassword(signupPassword)) {
      setError("Password must have at least one capital, one lower case, one numeric, one special character, and be minimum 10 characters long.");
      return;
    }

    try {
      setIsSubmitting(true);
      const normalizedEmail = signupEmail.trim().toLowerCase();
      const name = signupName.trim() || "User";
      const signupResult = await apiSignup({
        name,
        email: normalizedEmail,
        password: signupPassword,
      });

      toast.success("Account Created successfully. Verification email sent.");
      setEmail(normalizedEmail);
      setPassword("");
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setConfirmPassword("");
      setTab("signin");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efeeee] px-4 py-10">
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img src="/logo.png" alt="UX Review Studio" className="h-12 w-12 rounded-xl object-contain" />
        </div>

        <h1 className="text-2xl font-semibold text-[#0f172a]">
          UX Review Studio
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to continue to your workspace
        </p>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg text-left">

          <h2 className="text-lg font-semibold text-[#0f172a]">
            Welcome
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Choose a sign-in method below.
          </p>

          {/* Google / Apple */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              disabled
              className="group relative flex items-center justify-center gap-2 border border-gray-300 rounded-xl bg-[#f6f4f1] h-[44px] px-4 shadow-sm transition whitespace-nowrap opacity-70 cursor-not-allowed"
            >
              <img src="/google.svg" alt="Google" className="w-5 h-5" />
              <span className="text-sm font-semibold text-gray-900">
                Continue with Google
              </span>
            </button>

            <button
              type="button"
              disabled
              className="group relative flex items-center justify-center gap-2 border border-gray-300 rounded-xl bg-[#f6f4f1] h-[44px] px-4 shadow-sm transition whitespace-nowrap opacity-70 cursor-not-allowed"
            >
              <img src="/apple.svg" alt="Apple" className="w-5 h-5" />
              <span className="text-sm font-semibold text-gray-900">
                Continue with Apple
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {/* Tabs */}
          <div className="bg-[#d9d3cc] p-1 rounded-xl flex mb-5">
            <button
              onClick={() => setTab("signin")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                tab === "signin"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600"
              }`}
            >
              Sign in
            </button>

            <button
              onClick={() => setTab("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                tab === "signup"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-600"
              }`}
            >
              Sign up
            </button>

            <button
              type="button"
              disabled
              className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-400 cursor-not-allowed"
            >
              SSO
            </button>
          </div>

          {/* ✅ SIGN IN */}
          {tab === "signin" && (
            <form
              onSubmit={handleSignIn}
              className="space-y-4"
            >

              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/^\s+/, ""))}
                  className={`w-full mt-1 border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${email.length === 0 && !didTrySigninSubmit
                    ? "border-gray-300 focus:ring-gray-300"
                    : isSigninEmailValid
                      ? "border-green-500 focus:ring-green-500"
                      : "border-red-500 focus:ring-red-500"
                    }`}
                />
                <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                  {email.length === 0 ? (
                    <span className="text-gray-400"></span>
                  ) : isSigninEmailValid ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-green-700">Email format looks good.</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span className="text-red-600">Enter a valid email address.</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full mt-1 border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${password.length === 0 && !didTrySigninSubmit
                    ? "border-gray-300 focus:ring-gray-300"
                    : isSigninPasswordValid
                      ? "border-green-500 focus:ring-green-500"
                      : "border-red-500 focus:ring-red-500"
                    }`}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#12083c] text-white py-3 rounded-xl font-medium"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>

            </form>
          )}

          {/* ✅ SIGN UP */}
          {tab === "signup" && (
            <form className="space-y-4" onSubmit={handleSignUp}>

              <div>
                <label className="text-sm font-medium">Full name</label>
                <input
                  value={signupName}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .replace(/[^A-Za-z ]/g, "")
                      .replace(/^\s+/, "")
                      .replace(/\s{2,}/g, " ");
                    setSignupName(sanitized);
                  }}
                  className={`w-full mt-1 border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${signupName.length === 0 && !didTrySignupSubmit
                    ? "border-gray-300 focus:ring-gray-300"
                    : isSignupNameValid
                      ? "border-green-500 focus:ring-green-500"
                      : "border-red-500 focus:ring-red-500"
                    }`}
                />
                <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                  {signupName.length === 0 ? (
                    <span className="text-gray-400">Enter your full name.</span>
                  ) : isSignupNameValid ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-green-700">Full name looks good.</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span className="text-red-600">Use letters only, like Jane Doe.</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value.replace(/^\s+/, ""))}
                    className={`w-full border rounded-lg pl-9 py-2 shadow-sm focus:outline-none focus:ring-2 ${signupEmail.length === 0 && !didTrySignupSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isSignupEmailValid
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                  {signupEmail.length === 0 ? (
                    <span className="text-gray-400">Enter your email.</span>
                  ) : isSignupEmailValid ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-green-700">Email format looks good.</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                      <span className="text-red-600">Enter a valid email address.</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (e.target.value.length > 0) {
                        setShowPasswordRules(true);
                      } else {
                        setShowPasswordRules(false);
                      }
                    }}
                    className={`w-full border rounded-lg pl-9 py-2 shadow-sm focus:outline-none focus:ring-2 ${signupPassword.length === 0 && !didTrySignupSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isPasswordReady
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum 10 chars, with uppercase, lowercase, number, and special character
                </p>
                {signupPassword.length > 0 && !isPasswordReady && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50">
                    <button
                      type="button"
                      onClick={() => setShowPasswordRules((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700"
                    >
                      Password characteristics
                      <ChevronDown className={`h-4 w-4 transition ${showPasswordRules ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    {showPasswordRules && (
                      <div className="space-y-2 border-t border-gray-200 p-3">
                        {passwordRules.map((rule) => (
                          <div key={rule.label} className="flex items-center gap-2 text-xs font-medium">
                            {rule.passed ? (
                              <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                            ) : (
                              <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            )}
                            <span className={rule.passed ? "text-green-700" : "text-gray-500"}>{rule.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Confirm password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    ref={confirmPasswordRef}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                    }}
                    className={`w-full border rounded-lg pl-9 py-2 shadow-sm focus:outline-none focus:ring-2 ${confirmPassword.length === 0 && !didTrySignupSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isConfirmPasswordReady
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                </div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-medium">
                    {confirmPassword.length === 0 ? (
                      <span className="text-gray-400">Re-enter your password to confirm it.</span>
                    ) : isConfirmPasswordReady ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                        <span className="text-green-700">Passwords match.</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                        <span className="text-red-600">Passwords must match.</span>
                      </>
                    )}
                  </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!canCreateAccount}
                className="w-full bg-[#12083c] text-white py-3 rounded-xl font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>

            </form>
          )}

          {/* ✅ SSO */}
          {tab === "sso" && (
            <div className="space-y-4">

              <p className="text-sm text-gray-600">
                For enterprise teams with SAML SSO. Enter your company's
                domain to continue.
              </p>

              <div>
                <label className="text-sm font-medium">Company domain</label>
                <input
                  placeholder="acme.com"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 shadow-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => setError("SSO is disabled for now.")}
                className="w-full bg-[#d9d3cc] py-3 rounded-xl"
              >
                Continue with SSO
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#efeeee]" />}>
      <AuthPageContent />
    </Suspense>
  );
}
