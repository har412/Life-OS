"use client";
import Link from "next/link";
import { ArrowLeft, Gavel, Scale, FileText, CheckCircle2 } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#fffcf9] text-stone-900 font-sans p-6 sm:p-12 lg:p-24">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-stone-400 hover:text-orange-600 transition-colors mb-8 font-semibold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900">Terms of Service</h1>
            <p className="text-stone-500 font-medium">Last Updated: April 25, 2026</p>
          </div>
        </div>

        <div className="space-y-12 bg-white border border-orange-100 rounded-3xl p-8 sm:p-12 shadow-sm">
          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-orange-500" /> Acceptance of Terms
            </h2>
            <p className="text-stone-600 leading-relaxed">
              By accessing or using LifeOS, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application. This is a personal productivity tool designed to help you capture and organize tasks via voice and manual input.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-500" /> Use of the Service
            </h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to:
            </p>
            <ul className="space-y-3">
              {[
                "Use the service only for lawful purposes.",
                "Not attempt to interfere with the proper working of the application.",
                "Provide accurate information when creating an account via Google Auth.",
                "Maintain the security of your login credentials."
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
               🤖 AI and Voice Features
            </h2>
            <p className="text-stone-600 leading-relaxed">
              LifeOS utilizes AI models to process voice recordings into text. By using these features, you acknowledge that voice data is sent to secure AI processing services. We strive for high accuracy but cannot guarantee that AI transcription will always be 100% correct.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2 mb-4">
               🚫 Limitation of Liability
            </h2>
            <p className="text-stone-600 leading-relaxed">
              LifeOS is provided "as is" without any warranties. We shall not be liable for any data loss or indirect damages arising from your use of the application. We reserve the right to modify or discontinue the service at any time.
            </p>
          </section>

          <section className="pt-8 border-t border-orange-50 text-center">
            <p className="text-sm text-stone-400">
              Questions about our Terms? Contact us at <span className="text-orange-600 font-bold">legal@lifeos-compute.vercel.app</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
