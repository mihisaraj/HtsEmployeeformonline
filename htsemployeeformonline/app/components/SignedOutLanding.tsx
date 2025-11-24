"use client";

import Image from "next/image";
import { RefObject } from "react";
import { motion } from "framer-motion";
import { StatusState } from "../types/status";

type SignedOutLandingProps = {
  landingRef: RefObject<HTMLDivElement | null>;
  heroRef: RefObject<HTMLElement | null>;
  canAuth: boolean;
  authLoading: boolean;
  status: StatusState;
  onLogin: () => void;
  showDetails: boolean;
  onProceed: () => void;
};

export function SignedOutLanding({
  landingRef,
  heroRef,
  canAuth,
  authLoading,
  status: _status,
  onLogin,
  showDetails,
  onProceed,
}: SignedOutLandingProps) {
  void _status;
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900">
      <div ref={landingRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 top-10 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
          <div className="absolute right-10 top-20 h-72 w-72 rounded-full bg-blue-100 blur-3xl opacity-70" />
          <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-cyan-100 blur-3xl opacity-60" />
        </div>

        <main className="relative z-10 mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10 sm:py-14">
          <div className="flex w-full max-w-4xl flex-col items-center gap-6">
            <section
              ref={heroRef}
              className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl bg-white/95 p-10 text-center shadow-2xl shadow-blue-100 ring-1 ring-blue-100 transition duration-700"
            >
              <div className="h-24 w-24 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-blue-100 sm:h-28 sm:w-28">
                <Image
                  src="/IMG_6950.jpeg"
                  alt="HTS Logo"
                  width={220}
                  height={220}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
              
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Welcome to HTS
              </h1>
              {!showDetails && (
                <button
                  onClick={onProceed}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:scale-[1.01] hover:shadow-xl"
                >
                  Proceed
                </button>
              )}
            </section>

            <div
              className={`space-y-4 rounded-3xl bg-white/90 p-6 text-center shadow-xl shadow-blue-100 ring-1 ring-blue-100 transition-all duration-700 ${
                showDetails
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-6 opacity-0"
              }`}
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900">
        Dear Colleague.
                </h2>
                <motion.p
                  className="text-sm leading-relaxed text-slate-700"
                  initial={{ opacity: 0, y: 16 }}
                  animate={showDetails ? { opacity: 1, y: 0 } : { opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  We are thrilled to have you join us at this exciting stage as we begin our journey
                  of building a leading BPO company here in Sri Lanka. Your skills, experience, and
                  enthusiasm will play a valuable role in shaping our culture and driving our success.
                </motion.p>
                <motion.p
                  className="text-sm leading-relaxed text-slate-700"
                  initial={{ opacity: 0, y: 16 }}
                  animate={showDetails ? { opacity: 1, y: 0 } : { opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
                >
                  You will not only contribute to our operations but also help us create a workplace
                  built on collaboration, innovation, and mutual respect. We look forward to seeing
                  you grow with us and being part of a rewarding journey together.
                </motion.p>
                <p className="text-sm font-semibold text-slate-800">
                  Welcome aboard!
                  <br />
                  <span className="text-blue-700">Best regards, HTS Family</span>
                </p>
              </div>

              <div className="space-y-3 rounded-2xl bg-blue-50/70 p-4 ring-1 ring-blue-100">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 animate-pulse">
                  Submit Your Employee Information Form
                </p>
                
                {!canAuth ? (
                  <div className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm text-blue-900">
                    Azure client/tenant env vars are missing. Populate them in
                    `.env.local` to enable Microsoft login.
                  </div>
                ) : (
                  <button
                    onClick={onLogin}
                    disabled={authLoading}
                    className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {authLoading && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    Sign in here and Fill Your HTS Credintials
                  </button>
                )}
               
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
