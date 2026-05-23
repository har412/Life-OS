"use client";
import Link from "next/link";
import { Mail, ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
      toast.success("Reset link dispatched successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 px-4">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/50 sm:rounded-2xl sm:px-10 border border-stone-100">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <CheckCircle className="w-12 h-12 text-orange-500 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-stone-950">Check your inbox</h3>
              <p className="text-sm text-stone-600">
                If an account matches <strong>{email}</strong>, we have dispatched a password reset link to it. The link will expire in 1 hour.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
              >
                Send link to another email
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-stone-900 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-stone-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm transition-all disabled:opacity-50"
                    placeholder="you@example.com"
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
                      Sending... <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Send reset link <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}

