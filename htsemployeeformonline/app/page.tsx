"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";
import { AnimatePresence, motion } from "framer-motion";

type FormState = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  startDate: string;
  manager: string;
  location: string;
  equipment: string;
  notes: string;
};

type StatusState = {
  type: "idle" | "success" | "error" | "info";
  message: string;
};

const defaultForm: FormState = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  department: "",
  startDate: "",
  manager: "",
  location: "",
  equipment: "Standard laptop + Office 365",
  notes: "",
};

const msalClientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
const msalTenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
const msalRedirectUri =
  process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ?? "http://localhost:3000";
const LOGIN_SCOPES: string[] = ["User.Read", "Mail.Send"];

export default function Home() {
  const [msalInstance, setMsalInstance] = useState<
    PublicClientApplication | undefined
  >(undefined);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [profile, setProfile] = useState<{ name?: string; email?: string }>(
    {}
  );
  const [mailToken, setMailToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [status, setStatus] = useState<StatusState>({
    type: "info",
    message: "Welcome—sign in with your HTS Microsoft account to begin.",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canAuth = useMemo(
    () => Boolean(msalClientId && msalTenantId),
    []
  );

  const hydrateProfile = useCallback(
    async (instance: PublicClientApplication, nextAccount: AccountInfo) => {
      setProfileLoading(true);
      setProfile({
        name: nextAccount.name ?? "",
        email: nextAccount.username ?? "",
      });

      try {
        const token = await instance.acquireTokenSilent({
          account: nextAccount,
          scopes: ["User.Read"],
        });

        const res = await fetch("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${token.accessToken}` },
        });

        if (res.ok) {
          const me = await res.json();
          setProfile({
            name: me.displayName ?? nextAccount.name ?? "",
            email:
              me.mail ?? me.userPrincipalName ?? nextAccount.username ?? "",
          });
        }
      } catch (error) {
        console.error("Unable to fetch profile", error);
      } finally {
        setProfileLoading(false);
      }
    },
    []
  );

  const acquireMailToken = useCallback(
    async (
      instance: PublicClientApplication,
      nextAccount: AccountInfo
    ): Promise<boolean> => {
      try {
        const token = await instance.acquireTokenSilent({
          account: nextAccount,
          scopes: LOGIN_SCOPES,
        });
        setMailToken(token.accessToken);
        return true;
      } catch (error) {
        console.error("Unable to fetch Mail.Send token", error);
        setStatus({
          type: "error",
          message:
            "We could not get permission to send mail. Please re-sign in and accept Mail.Send.",
        });
        return false;
      }
    },
    []
  );

  useEffect(() => {
    if (!canAuth || typeof window === "undefined") {
      return;
    }

    const instance = new PublicClientApplication({
      auth: {
        clientId: msalClientId!,
        authority: `https://login.microsoftonline.com/${msalTenantId}`,
        redirectUri: msalRedirectUri,
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
      },
    });

    const initialize = async () => {
      await instance.initialize();
      setMsalInstance(instance);

      const result = await instance.handleRedirectPromise();
      const activeAccount =
        result?.account ?? instance.getActiveAccount() ?? null;

      if (activeAccount) {
        instance.setActiveAccount(activeAccount);
        setAccount(activeAccount);
        hydrateProfile(instance, activeAccount);
        const mailOk = await acquireMailToken(instance, activeAccount);
        setStatus({
          type: mailOk ? "success" : "error",
          message: mailOk
            ? `Signed in as ${activeAccount.username}`
            : "Signed in, but Mail.Send consent is missing. Please re-sign in and accept Mail.Send.",
        });
      }
    };

    void initialize();
  }, [acquireMailToken, canAuth, hydrateProfile]);

  const handleLogin = async () => {
    if (!msalInstance) {
      setStatus({
        type: "error",
        message:
          "Microsoft sign-in is not ready. Check your Azure client/tenant ID env vars.",
      });
      return;
    }

    setAuthLoading(true);
    try {
      await msalInstance.loginRedirect({
        scopes: LOGIN_SCOPES,
        prompt: "select_account",
      });
    } catch (error) {
      console.error("Login error", error);
      setStatus({
        type: "error",
        message: "Login failed. Verify your HTS Microsoft credentials.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleInputChange = (
    key: keyof FormState,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!account) {
      setStatus({
        type: "error",
        message: "Please sign in with your HTS Microsoft account first.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      type: "info",
      message: "Packaging onboarding details and sending securely via Graph…",
    });

    let effectiveToken = mailToken;
    if (!effectiveToken && msalInstance) {
      try {
        const token = await msalInstance.acquireTokenSilent({
          account: account!,
          scopes: LOGIN_SCOPES,
        });
        effectiveToken = token.accessToken;
        setMailToken(token.accessToken);
      } catch (error) {
        console.error("Mail.Send token error", error);
      }
    }

    if (!effectiveToken) {
      setSubmitting(false);
      setStatus({
        type: "error",
        message:
          "Unable to send because Mail.Send permission was not granted. Please sign in again.",
      });
      return;
    }

    const payload = {
      profile: {
        name:
          profile.name ||
          `${formData.firstName} ${formData.lastName}`.trim() ||
          "HTS Employee",
        email: profile.email || account.username,
      },
      accessToken: effectiveToken,
      form: formData,
    };

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();
      if (!res.ok) {
        throw new Error(responseBody.error ?? "Unable to send onboarding.");
      }

      setStatus({
        type: "success",
        message:
          "Onboarding packet sent to the PeopleOps mailbox with the Excel attachment.",
      });
      setFormData(defaultForm);
    } catch (error) {
      console.error("Submit error", error);
      setStatus({
        type: "error",
        message:
          "Sending failed. Confirm your Graph credentials and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!account) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 text-slate-900">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-20 top-10 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
          <div className="absolute right-12 top-20 h-72 w-72 rounded-full bg-blue-200 blur-3xl opacity-60" />
          <div className="absolute bottom-10 right-16 h-60 w-60 rounded-full bg-sky-300 blur-3xl opacity-40" />
        </div>

        <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full rounded-3xl bg-white/80 p-10 text-center shadow-2xl shadow-blue-100 backdrop-blur-md ring-1 ring-white/60"
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200">
              <span className="text-xl font-semibold">HTS</span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Welcome to HTS onboarding
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Sign in with your HTS Microsoft account to continue.
            </p>

            {!canAuth ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Azure client/tenant env vars are missing. Populate them in
                `.env.local` to enable Microsoft login.
              </div>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-200 transition hover:shadow-xl hover:shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {authLoading && (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  Sign in with Microsoft
                </button>
                <AnimatePresence>
                  {status.type !== "idle" && (
                    <motion.div
                      key={status.message}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                        status.type === "error"
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : status.type === "success"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-sky-50 text-sky-700 border border-sky-100"
                      }`}
                    >
                      {status.message}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-20 top-10 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
        <div className="absolute right-12 top-20 h-72 w-72 rounded-full bg-blue-200 blur-3xl opacity-60" />
        <div className="absolute bottom-10 right-16 h-60 w-60 rounded-full bg-sky-300 blur-3xl opacity-40" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 lg:flex-row lg:items-start lg:py-16">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1 rounded-3xl bg-white/70 p-8 shadow-xl shadow-sky-100 backdrop-blur-md ring-1 ring-white/60"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-200">
              <span className="text-xl font-semibold">HTS</span>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-700">
                Employee Access
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Welcome to HTS employee onboarding
              </h1>
            </div>
          </div>

          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-slate-700">
            Signed in as {profile.email ?? account.username}. Complete the form
            to generate an Excel packet and send it to PeopleOps via Microsoft
            Graph.
          </p>

          <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm shadow-sky-50">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-600">
              Status
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {status.message}
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-xl rounded-3xl bg-white p-7 shadow-2xl shadow-blue-100 ring-1 ring-white/60"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-sky-600">
                Onboarding form
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Finish and submit
              </h2>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Signed in
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm shadow-sky-50">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <span className="text-sm font-semibold">MS</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-sky-600">
                  Signed in
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {profileLoading
                    ? "Loading profile…"
                    : profile.name || "HTS employee"}
                </p>
                <p className="text-xs text-slate-500">
                  {profile.email ?? account.username}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                label="First name"
                value={formData.firstName}
                onChange={(v) => handleInputChange("firstName", v)}
              />
              <FormField
                label="Last name"
                value={formData.lastName}
                onChange={(v) => handleInputChange("lastName", v)}
              />
              <FormField
                label="Job title"
                value={formData.jobTitle}
                onChange={(v) => handleInputChange("jobTitle", v)}
              />
              <FormField
                label="Department"
                value={formData.department}
                onChange={(v) => handleInputChange("department", v)}
              />
              <FormField
                label="Manager"
                value={formData.manager}
                onChange={(v) => handleInputChange("manager", v)}
              />
              <FormField
                label="Location"
                value={formData.location}
                onChange={(v) => handleInputChange("location", v)}
              />
              <FormField
                label="Start date"
                type="date"
                value={formData.startDate}
                onChange={(v) => handleInputChange("startDate", v)}
              />
              <FormField
                label="Equipment bundle"
                value={formData.equipment}
                onChange={(v) => handleInputChange("equipment", v)}
                placeholder="Standard laptop + Office 365"
              />
            </div>

            <FormField
              label="Notes or access needs"
              value={formData.notes}
              onChange={(v) => handleInputChange("notes", v)}
              multiline
              placeholder="VPN groups, software, building access, etc."
            />

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:shadow-xl hover:shadow-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Send onboarding packet
            </button>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
};

function FormField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = "text",
}: FormFieldProps) {
  const sharedClasses =
    "w-full rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner shadow-sky-50 outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";

  return (
    <label className="space-y-2 text-sm font-semibold text-slate-800">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className={`${sharedClasses} min-h-[96px] resize-none`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={sharedClasses}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
