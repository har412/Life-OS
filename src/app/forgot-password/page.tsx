"use client";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";

export default function ForgotPasswordPage() {
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
          <form className="space-y-5" onSubmit={e => e.preventDefault()}>
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
                  className="appearance-none block w-full pl-10 px-3 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
                Send reset link <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
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
