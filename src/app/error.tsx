"use client";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fffcf9] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mb-8 animate-bounce">
        <AlertTriangle className="w-10 h-10 text-orange-600" />
      </div>
      
      <h1 className="text-3xl font-extrabold text-stone-900 mb-4 tracking-tight">
        Something went wrong
      </h1>
      
      <p className="text-stone-500 max-w-md mb-10 leading-relaxed">
        We encountered an unexpected error while rendering this page. Our team has been notified.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => reset()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
        <Link
          href="/"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-white border border-stone-200 text-stone-600 font-bold rounded-2xl hover:bg-stone-50 transition-all"
        >
          <Home className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-12 p-4 bg-red-50 border border-red-100 rounded-xl text-left max-w-2xl overflow-auto">
          <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
            {error.message || "No error message provided"}
            {"\n\n"}
            {error.stack}
          </p>
        </div>
      )}
    </div>
  );
}
