"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  forgotPassword as apiForgotPassword,
  resendVerification as apiResendVerification,
  signin as apiSignin,
  signup as apiSignup,
} from "@/lib/api";

type AuthTab = "signin" | "signup" | "forgot" | "sso";

function clearStoredAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("current_user");
  document.cookie = "token=; Path=/; Max-Age=0; SameSite=Lax";
}

function AuthPageContent() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
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
      setNotice(null);
      setUnverifiedEmail(null);

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
      const currentUser = { name: result.user.name || "User", email: result.user.email, avatarDataUrl: result.user.avatarDataUrl };
      localStorage.setItem("current_user", JSON.stringify(currentUser));
      document.cookie = `token=${result.token}; Path=/; Max-Age=${result.expiresInSeconds}; SameSite=Lax`;
      router.replace("/dashboard");
    } catch (err: any) {
      const message = err?.message ?? "Sign-in failed";
      setError(message);
      if (message.toLowerCase().includes("email not verified")) {
        clearStoredAuth();
        setUnverifiedEmail(normalizedEmail);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setDidTrySigninSubmit(true);

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    await handleEmailSignIn();
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Enter your email.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await apiForgotPassword(normalizedEmail);
      setNotice(result.message);
    } catch (err: any) {
      setError(err?.message ?? "Unable to send reset instructions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail ?? email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Enter your email to resend verification.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setNotice(null);
      const result = await apiResendVerification(targetEmail);
      setNotice(result.message);
    } catch (err: any) {
      setError(err?.message ?? "Unable to resend verification email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
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

      clearStoredAuth();
      toast.success("Verification email sent.");
      setNotice(signupResult.message);
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
    <div
      className={`flex justify-center bg-[#efeeee] px-4 ${
        tab === "signin"
          ? "min-h-dvh items-center overflow-hidden py-3"
          : "min-h-dvh items-start overflow-y-auto py-6"
      }`}
    >
      <div className="w-full max-w-md text-center">

        {/* Logo */}
        <div className="mb-2 flex justify-center">
          <img src="/logo.png" alt="UX Review Studio" className="h-12 w-12 rounded-xl object-contain" />
        </div>

        <h1 className="text-2xl font-semibold leading-tight text-[#0f172a]">
          UX Review Studio
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Sign in to continue to your workspace
        </p>

        {/* Card */}
        <div className={`rounded-2xl border border-gray-200 bg-white text-left shadow-lg ${tab === "signin" ? "p-5" : "p-6"}`}>

          <h2 className="text-lg font-semibold leading-tight text-[#0f172a]">
            {tab === "forgot" ? "Reset access" : "Welcome"}
          </h2>
          <p className={`${tab === "signin" ? "mb-4" : "mb-5"} text-sm text-gray-500`}>
            {tab === "forgot" ? "Enter your email and we will send reset instructions." : "Choose a sign-in method below."}
          </p>

          {/* Google / Apple */}
          {tab !== "forgot" && <div className={`${tab === "signin" ? "mb-3" : "mb-4"} grid grid-cols-2 gap-3`}>
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
          </div>}

          {/* Divider */}
          {tab !== "forgot" && <div className={`${tab === "signin" ? "mb-4" : "mb-5"} flex items-center gap-2`}>
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>}

          {/* Tabs */}
          {tab !== "forgot" && <div className={`${tab === "signin" ? "mb-4" : "mb-5"} flex rounded-xl bg-[#d9d3cc] p-1`}>
            <button
              type="button"
              role="tab"
              id="auth-tab-signin"
              aria-selected={tab === "signin"}
              aria-controls="auth-panel-signin"
              onClick={() => {
                setTab("signin");
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-lg transition ${
                tab === "signin"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-700"
              }`}
            >
              Sign in
            </button>

            <button
              type="button"
              role="tab"
              id="auth-tab-signup"
              aria-selected={tab === "signup"}
              aria-controls="auth-panel-signup"
              onClick={() => {
                setTab("signup");
                setError(null);
                setNotice(null);
              }}
              className={`flex-1 min-h-11 py-2 text-sm font-medium rounded-lg transition ${
                tab === "signup"
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-700"
              }`}
            >
              Sign up
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={false}
              aria-disabled="true"
              disabled
              className="flex-1 min-h-11 py-2 text-sm font-medium rounded-lg text-gray-500 cursor-not-allowed"
            >
              SSO
            </button>
          </div>}

          {/* ✅ SIGN IN */}
          {tab === "signin" && (
            <form
              id="auth-panel-signin"
              role="tabpanel"
              aria-labelledby="auth-tab-signin"
              onSubmit={handleSignIn}
              className="space-y-3"
            >

              <div>
                <label htmlFor="signin-email" className="text-sm font-medium">Email</label>
                <input
                  id="signin-email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/^\s+/, ""))}
                  aria-invalid={email.length > 0 && !isSigninEmailValid}
                  aria-describedby="signin-email-help"
                  className={`w-full mt-1 border rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${email.length === 0 && !didTrySigninSubmit
                    ? "border-gray-300 focus:ring-gray-300"
                    : isSigninEmailValid
                      ? "border-green-500 focus:ring-green-500"
                      : "border-red-500 focus:ring-red-500"
                    }`}
                />
                <div id="signin-email-help" className="mt-1 flex items-center gap-2 text-xs font-medium">
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
                <label htmlFor="signin-password" className="text-sm font-medium">Password</label>
                <div className="relative mt-1">
                  <input
                    id="signin-password"
                    type={showSigninPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={password.length === 0 && didTrySigninSubmit}
                    className={`password-input w-full border rounded-lg px-3 py-2 pr-12 shadow-sm focus:outline-none focus:ring-2 ${password.length === 0 && !didTrySigninSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isSigninPasswordValid
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSigninPassword((prev) => !prev)}
                    className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-lg text-gray-600 hover:text-gray-800"
                    aria-label={showSigninPassword ? "Hide password" : "Show password"}
                  >
                    {showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("forgot");
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-xs font-medium text-[#12083c] underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              {notice && <p className="text-sm text-green-700">{notice}</p>}
              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isSubmitting}
                  className="text-sm font-medium text-[#12083c] underline-offset-4 hover:underline disabled:opacity-60"
                >
                  Resend verification email
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-11 bg-[#12083c] text-white py-3 rounded-xl font-medium"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>

            </form>
          )}

          {/* ✅ FORGOT PASSWORD */}
          {tab === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {notice && <p className="text-sm text-green-700">{notice}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#12083c] text-white py-3 rounded-xl font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending..." : "Send reset instructions"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("signin");
                  setError(null);
                  setNotice(null);
                }}
                className="w-full rounded-xl bg-[#d9d3cc] py-3 font-medium text-gray-900"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* ✅ SIGN UP */}
          {tab === "signup" && (
            <form
              id="auth-panel-signup"
              role="tabpanel"
              aria-labelledby="auth-tab-signup"
              className="space-y-4"
              onSubmit={handleSignUp}
            >

              <div>
                <label htmlFor="signup-name" className="text-sm font-medium">Full name</label>
                <input
                  id="signup-name"
                  autoComplete="name"
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
                <label htmlFor="signup-email" className="text-sm font-medium">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input
                    id="signup-email"
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
                <label htmlFor="signup-password" className="text-sm font-medium">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (e.target.value.length > 0) {
                        setShowPasswordRules(true);
                      } else {
                        setShowPasswordRules(false);
                      }
                    }}
                    className={`password-input w-full border rounded-lg pl-9 pr-12 py-2 shadow-sm focus:outline-none focus:ring-2 ${signupPassword.length === 0 && !didTrySignupSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isPasswordReady
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-lg text-gray-600 hover:text-gray-800"
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                <label htmlFor="signup-confirm-password" className="text-sm font-medium">Confirm password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <input
                    id="signup-confirm-password"
                    ref={confirmPasswordRef}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                    }}
                    className={`password-input w-full border rounded-lg pl-9 pr-12 py-2 shadow-sm focus:outline-none focus:ring-2 ${confirmPassword.length === 0 && !didTrySignupSubmit
                      ? "border-gray-300 focus:ring-gray-300"
                      : isConfirmPasswordReady
                        ? "border-green-500 focus:ring-green-500"
                        : "border-red-500 focus:ring-red-500"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-lg text-gray-600 hover:text-gray-800"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
              {notice && <p className="text-sm text-green-700">{notice}</p>}

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
