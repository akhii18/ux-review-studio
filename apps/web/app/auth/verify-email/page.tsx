"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyEmail } from "@/lib/api";

const verifiedTokens = new Set<string>();

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      if (!token) {
        setStatus("error");
        setMessage("Verification link is missing a token.");
        return;
      }

      if (verifiedTokens.has(token)) {
        setStatus("success");
        setMessage("Email verified successfully. You can now sign in.");
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (!isMounted) return;
        verifiedTokens.add(token);
        setStatus("success");
        setMessage(result.message || "Email verified successfully. You can now sign in.");
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setMessage(err?.message ?? "Verification link is invalid or expired.");
      }
    }

    runVerification();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#efeeee] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 flex justify-center">
          <img src="/logo.png" alt="UX Review Studio" className="h-12 w-12 rounded-xl object-contain" />
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-lg">
          <div className="mb-4 flex items-center gap-3">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-[#12083c]" aria-hidden="true" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />}
            {status === "error" && <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />}
            <h1 className="text-lg font-semibold text-[#0f172a]">Email verification</h1>
          </div>

          <p className="text-sm text-gray-600">{message}</p>

          <button
            type="button"
            onClick={() => router.replace("/auth")}
            className="mt-6 w-full rounded-xl bg-[#12083c] py-3 font-medium text-white"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#efeeee]" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
