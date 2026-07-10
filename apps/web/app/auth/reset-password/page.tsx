"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { resetPassword } from "@/lib/api";

function isStrongPassword(value: string) {
  return (
    value.length >= 10 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const passwordRules = [
    { label: "At least 10 characters", passed: password.length >= 10 },
    { label: "At least one capital letter", passed: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", passed: /[a-z]/.test(password) },
    { label: "At least one numeric character", passed: /[0-9]/.test(password) },
    { label: "At least one special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const canSubmit = token && isStrongPassword(password) && password === confirmPassword && !isSubmitting;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Reset link is missing a token.");
      return;
    }

    if (!isStrongPassword(password)) {
      setError("Password must have at least one capital, one lower case, one numeric, one special character, and be minimum 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await resetPassword(token, password);
      setSuccess(result.message || "Password updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message ?? "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efeeee] px-4 py-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 flex justify-center">
          <img src="/logo.png" alt="UX Review Studio" className="h-12 w-12 rounded-xl object-contain" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-lg">
          <h1 className="text-lg font-semibold text-[#0f172a]">Reset password</h1>
          <p className="mb-5 mt-1 text-sm text-gray-500">Choose a new password for your account.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium">New password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password.length > 0 && !isStrongPassword(password) && (
                <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  {passwordRules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-2 text-xs font-medium">
                      {rule.passed ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-gray-400" />}
                      <span className={rule.passed ? "text-green-700" : "text-gray-500"}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Confirm password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">{success}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[#12083c] py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => router.replace("/auth")}
            className="mt-4 w-full rounded-xl bg-[#d9d3cc] py-3 font-medium text-gray-900"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#efeeee]" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
