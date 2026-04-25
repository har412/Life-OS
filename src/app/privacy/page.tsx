"use client";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fffcf9] text-stone-900 font-sans p-6 sm:p-12 lg:p-24">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors mb-8 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900">Privacy Policy</h1>
            <p className="text-stone-500 font-medium">Effective Date: April 25, 2026</p>
          </div>
        </div>

        <div className="space-y-12 bg-white border border-orange-100 rounded-3xl p-8 sm:p-12 shadow-sm">
          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-orange-500" /> Introduction
            </h2>
            <p className="text-stone-600 leading-relaxed">
              At LifeOS, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our voice-first task management application. We prioritize your data security and transparency in our practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-500" /> Information We Collect
            </h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              To provide you with the best experience, we collect the following types of information:
            </p>
            <ul className="space-y-3">
              {[
                "Account Information: Your name and email address when you sign in via Google.",
                "Voice Data: Temporary audio recordings used solely for task transcription through our AI models.",
                "Task Content: The titles, descriptions, and categories of the tasks you create.",
                "Usage Data: Basic information about how you interact with the app to help us improve features."
              ].map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-emerald-500" /> How We Use Your Data
            </h2>
            <p className="text-stone-600 leading-relaxed">
              Your data is used exclusively to provide and improve the LifeOS service. We do not sell your personal information to third parties. Voice data is processed securely and is not stored permanently beyond what is necessary for transcription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
               🛡️ Data Security
            </h2>
            <p className="text-stone-600 leading-relaxed">
              We implement a variety of security measures to maintain the safety of your personal information. Your data is stored in encrypted databases, and we use industry-standard protocols for authentication through NextAuth and Google OAuth.
            </p>
          </section>

          <section className="pt-8 border-t border-orange-50 text-center">
            <p className="text-sm text-stone-400">
              If you have any questions about this policy, please contact us at <span className="text-orange-600 font-bold">privacy@lifeos-compute.vercel.app</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
