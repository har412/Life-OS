"use client";

import Link from "next/link";
import { Lock, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError(null);

    if (!token) {
      setValidationError("Missing reset token. Please request a new link.");
      return;
    }

    if (password.length < 8) {
      setValidationError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
      toast.success("Password reset successfully!");
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setValidationError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Error resetting password.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100 text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-stone-950">Invalid Reset Link</h3>
        <p className="text-sm text-stone-600">
          This password reset link is missing a validation token. Please request a new link from the forgot password page.
        </p>
        <div className="pt-2">
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center py-2.5 px-4 w-full border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            Go to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
      {success ? (
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-stone-950">Password Updated</h3>
          <p className="text-sm text-stone-600">
            Your password has been reset successfully. Redirecting you to the login page...
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center py-2.5 px-4 w-full border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
            >
              Log in immediately
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-stone-900 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-stone-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="appearance-none block w-full pl-10 px-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm transition-all disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
            <p className="mt-1.5 text-xs text-stone-500">
              Must be at least 8 characters long.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-stone-900 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-stone-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="appearance-none block w-full pl-10 px-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm transition-all disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  Updating password... <Loader2 className="w-4 h-4 animate-spin" />
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
            <rect width="36" height="36" rx="9" fill="#EA580C"/>
            <rect x="9" y="10.5" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.35"/>
            <path d="M19 11.5L21 13.5L25.5 9" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="9" y="17" width="7" height="1.75" rx="0.875" fill="white" fillOpacity="0.65"/>
            <path d="M19 18L21 20L25.5 15.5" stroke="white" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="9" y="23.5" width="7" height="1.75" rx="0.875" fill="white"/>
            <path d="M19 24.5L21 26.5L25.5 22" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900 tracking-tight">
          Create New Password
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 px-4">
          Please choose a strong, secure password that is different from your previous ones.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={
          <div className="bg-white py-12 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-stone-100 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="text-sm text-stone-500 font-medium">Validating session token...</span>
          </div>
        }>
          <ResetPasswordFormContent />
        </Suspense>

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
