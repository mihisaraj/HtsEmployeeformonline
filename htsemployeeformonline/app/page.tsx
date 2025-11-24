"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";
import { AnimatePresence, motion } from "framer-motion";

type Nominee = {
  id: string;
  name: string;
  passportId: string;
  relationship: string;
  portion: string;
};

type FormState = {
  passportName: string;
  callingName: string;
  gender: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  nationality: string;
  religion: string;
  passportNo: string;
  maritalStatus: string;
  contactNumber: string;
  homeCountry: string;
  personalEmail: string;
  residentialAddress: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyContact: string;
  emergencyAddress: string;
  birthPlace: string;
  spouseName: string;
  motherName: string;
  fatherName: string;
  nominees: Nominee[];
};

type FieldKey = keyof Omit<FormState, "nominees">;
type NomineeField = "name" | "passportId" | "relationship" | "portion";

type ValidationErrors = {
  fields: Partial<Record<FieldKey, string>>;
  nominees: Record<string, Partial<Record<NomineeField, string>>>;
  global?: string;
};

type StatusState = {
  type: "idle" | "success" | "error" | "info";
  message: string;
};

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Divorced"];
const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Relative",
  "Friend",
  "Other",
];
const HOME_COUNTRY_OPTIONS = ["Sri Lanka", "India", "Malaysia", "Singapore"];

let nomineeIdCounter = 0;

const createNominee = (): Nominee => ({
  id: `nominee-${Date.now()}-${nomineeIdCounter++}`,
  name: "",
  passportId: "",
  relationship: "",
  portion: "",
});

const buildDefaultForm = (): FormState => ({
  passportName: "",
  callingName: "",
  gender: "",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  nationality: "",
  religion: "",
  passportNo: "",
  maritalStatus: "",
  contactNumber: "",
  homeCountry: "Sri Lanka",
  personalEmail: "",
  residentialAddress: "",
  emergencyName: "",
  emergencyRelationship: "",
  emergencyContact: "",
  emergencyAddress: "",
  birthPlace: "",
  spouseName: "",
  motherName: "",
  fatherName: "",
  nominees: [createNominee()],
});

const msalClientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
const msalTenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
const msalRedirectUri =
  process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI ?? "http://localhost:3000";
const LOGIN_SCOPES: string[] = ["User.Read", "Mail.Send"];
const ALLOWED_DOMAIN = "@hts.asia";

export default function Home() {
  const [msalInstance, setMsalInstance] = useState<
    PublicClientApplication | undefined
  >(undefined);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [profile, setProfile] = useState<{ name?: string; email?: string }>(
    {}
  );
  const [mailToken, setMailToken] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(() => buildDefaultForm());
  const [errors, setErrors] = useState<ValidationErrors>({
    fields: {},
    nominees: {},
  });
  const [status, setStatus] = useState<StatusState>({
    type: "info",
    message: "Welcome - sign in with your HTS Microsoft account to begin.",
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canAuth = Boolean(msalClientId && msalTenantId);

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
        const email = (activeAccount.username ?? "").toLowerCase();
        if (!email.endsWith(ALLOWED_DOMAIN)) {
          setStatus({
            type: "error",
            message:
              "Only @hts.asia accounts can sign in here. Please use your HTS address.",
          });
          return;
        }

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

  const handleFieldChange = (key: FieldKey, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev.fields[key] && !prev.global) {
        return prev;
      }
      const nextFields = { ...prev.fields };
      delete nextFields[key];
      return { ...prev, fields: nextFields, global: undefined };
    });
  };

  const handleNomineeChange = (
    id: string,
    key: NomineeField,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      nominees: prev.nominees.map((nominee) =>
        nominee.id === id ? { ...nominee, [key]: value } : nominee
      ),
    }));
    setErrors((prev) => {
      const nomineeErrors = prev.nominees[id];
      if (!nomineeErrors?.[key] && !prev.global) {
        return prev;
      }
      const nextNomineeErrors = { ...prev.nominees };
      const updatedEntry = { ...(nextNomineeErrors[id] ?? {}) };
      delete updatedEntry[key];
      if (Object.keys(updatedEntry).length === 0) {
        delete nextNomineeErrors[id];
      } else {
        nextNomineeErrors[id] = updatedEntry;
      }
      return { ...prev, nominees: nextNomineeErrors, global: undefined };
    });
  };

  const addNominee = () => {
    setFormData((prev) => ({
      ...prev,
      nominees: [...prev.nominees, createNominee()],
    }));
    setErrors((prev) => ({ ...prev, global: undefined }));
  };

  const removeNominee = (id: string) => {
    setFormData((prev) => {
      if (prev.nominees.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        nominees: prev.nominees.filter((nominee) => nominee.id !== id),
      };
    });
    setErrors((prev) => {
      const nextNomineeErrors = { ...prev.nominees };
      delete nextNomineeErrors[id];
      return { ...prev, nominees: nextNomineeErrors, global: undefined };
    });
  };

  const handleSubmit = async () => {
    if (!account) {
      setStatus({
        type: "error",
        message: "Please sign in with your HTS Microsoft account first.",
      });
      return;
    }

    const validation = validateForm(formData);
    setErrors(validation.errors);
    if (validation.hasErrors) {
      setStatus({
        type: "error",
        message:
          validation.errors.global ??
          "Please correct the highlighted fields before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      type: "info",
      message: "Validating and sending securely via Microsoft Graph...",
    });

    const emailToSend = (profile.email || account.username || "").toLowerCase();
    if (!emailToSend.endsWith(ALLOWED_DOMAIN)) {
      setSubmitting(false);
      setStatus({
        type: "error",
        message: "Only @hts.asia accounts can submit onboarding packets.",
      });
      return;
    }

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
          formData.passportName ||
          formData.callingName ||
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
          "Information submitted to PeopleOps with the Excel attachment.",
      });
      setFormData(buildDefaultForm());
      setErrors({ fields: {}, nominees: {} });
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
      <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full rounded-2xl bg-white p-10 shadow-lg ring-1 ring-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-200">
                HTS
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Employee Information
                </p>
                <p className="text-sm text-slate-500">
                  Secure sign in with Microsoft
                </p>
              </div>
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-slate-900">
              Sign in to continue
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Use your HTS Microsoft account to access and submit the employee
              information form.
            </p>

            {!canAuth ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Azure client/tenant env vars are missing. Populate them in
                `.env.local` to enable Microsoft login.
              </div>
            ) : (
              <>
                <button
                  onClick={handleLogin}
                  disabled={authLoading}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                      className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                        status.type === "error"
                          ? "border border-rose-200 bg-rose-50 text-rose-700"
                          : status.type === "success"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-blue-200 bg-blue-50 text-blue-700"
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

  const dobError =
    errors.fields.dobDay || errors.fields.dobMonth || errors.fields.dobYear;
  const showGlobalError =
    Boolean(errors.global) &&
    !(status.type === "error" && status.message === errors.global);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200"
        >
          <div className="border-b border-slate-100 pb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              Employee Information
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Please fill out the form carefully and accurately.
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Signed in
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {profileLoading ? "Loading profile" : profile.name || "HTS employee"}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {profile.email ?? account.username}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <StatusCallout status={status} />
            {showGlobalError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {errors.global}
              </div>
            ) : null}
          </div>

          <FormSection title="Personal Information">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Name (As per Passport)"
                required
                value={formData.passportName}
                onChange={(v) => handleFieldChange("passportName", v)}
                error={errors.fields.passportName}
              />
              <TextField
                label="Calling Name"
                required
                value={formData.callingName}
                onChange={(v) => handleFieldChange("callingName", v)}
                error={errors.fields.callingName}
              />
              <SelectField
                label="Gender"
                required
                value={formData.gender}
                onChange={(v) => handleFieldChange("gender", v)}
                options={GENDER_OPTIONS}
                placeholder="Select gender"
                error={errors.fields.gender}
              />
              <DateOfBirthField
                value={{
                  dobDay: formData.dobDay,
                  dobMonth: formData.dobMonth,
                  dobYear: formData.dobYear,
                }}
                onChange={handleFieldChange}
                error={dobError}
              />
              <TextField
                label="Nationality"
                required
                value={formData.nationality}
                onChange={(v) => handleFieldChange("nationality", v)}
                error={errors.fields.nationality}
              />
              <TextField
                label="Religion"
                value={formData.religion}
                onChange={(v) => handleFieldChange("religion", v)}
                error={errors.fields.religion}
                helper="Optional"
              />
              <TextField
                label="Passport No"
                required
                value={formData.passportNo}
                onChange={(v) => handleFieldChange("passportNo", v)}
                error={errors.fields.passportNo}
              />
              <SelectField
                label="Marital Status"
                required
                value={formData.maritalStatus}
                onChange={(v) => handleFieldChange("maritalStatus", v)}
                options={MARITAL_STATUS_OPTIONS}
                placeholder="Select status"
                error={errors.fields.maritalStatus}
              />
              <TextField
                label="Contact Details"
                required
                value={formData.contactNumber}
                onChange={(v) => handleFieldChange("contactNumber", v)}
                error={errors.fields.contactNumber}
                placeholder="Mobile number"
              />
              <SelectField
                label="Home Country"
                required
                value={formData.homeCountry}
                onChange={(v) => handleFieldChange("homeCountry", v)}
                options={HOME_COUNTRY_OPTIONS}
                placeholder="Select country"
                error={errors.fields.homeCountry}
              />
              <TextField
                label="Personal Email"
                required
                type="email"
                value={formData.personalEmail}
                onChange={(v) => handleFieldChange("personalEmail", v)}
                error={errors.fields.personalEmail}
              />
            </div>
            <TextAreaField
              label="Residential Address"
              required
              value={formData.residentialAddress}
              onChange={(v) => handleFieldChange("residentialAddress", v)}
              error={errors.fields.residentialAddress}
              placeholder="Street, city, postal code"
            />
          </FormSection>

          <FormSection title="Emergency Contacts">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Name"
                required
                value={formData.emergencyName}
                onChange={(v) => handleFieldChange("emergencyName", v)}
                error={errors.fields.emergencyName}
              />
              <TextField
                label="Relationship"
                required
                value={formData.emergencyRelationship}
                onChange={(v) =>
                  handleFieldChange("emergencyRelationship", v)
                }
                error={errors.fields.emergencyRelationship}
              />
            </div>
            <TextField
              label="Contact No"
              required
              value={formData.emergencyContact}
              onChange={(v) => handleFieldChange("emergencyContact", v)}
              error={errors.fields.emergencyContact}
            />
            <TextAreaField
              label="Address"
              required
              value={formData.emergencyAddress}
              onChange={(v) => handleFieldChange("emergencyAddress", v)}
              error={errors.fields.emergencyAddress}
              placeholder="Full address of the emergency contact"
            />
          </FormSection>

          <FormSection title="Additional Info to be registered at EPF/ETF Financial Fund">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Birth Place"
                required
                value={formData.birthPlace}
                onChange={(v) => handleFieldChange("birthPlace", v)}
                error={errors.fields.birthPlace}
              />
              <TextField
                label="Name of the Spouse (If Married)"
                required={formData.maritalStatus === "Married"}
                helper={
                  formData.maritalStatus === "Married"
                    ? "Required when married"
                    : "Optional"
                }
                value={formData.spouseName}
                onChange={(v) => handleFieldChange("spouseName", v)}
                error={errors.fields.spouseName}
              />
              <TextField
                label="Name of the Mother"
                required
                value={formData.motherName}
                onChange={(v) => handleFieldChange("motherName", v)}
                error={errors.fields.motherName}
              />
              <TextField
                label="Name of the Father"
                required
                value={formData.fatherName}
                onChange={(v) => handleFieldChange("fatherName", v)}
                error={errors.fields.fatherName}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">
                  Nominees
                </h4>
                <p className="text-xs text-slate-500">
                  Portions must total 100%
                </p>
              </div>
              <NomineeTable
                nominees={formData.nominees}
                onChange={handleNomineeChange}
                onRemove={removeNominee}
                onAdd={addNominee}
                errors={errors.nominees}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              You can nominate your spouse, children, or parents as nominees for
              your EPF/ETF claim. You may add one or more nominees, and for each
              nominee, you must provide their Identity Card (NIC) or Passport
              number along with the percentage of the fund allocated to them. If
              you nominate more than one person, the total percentage must add
              up to 100% (for example, 70% and 30%).
            </div>
          </FormSection>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Submit Information
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function StatusCallout({ status }: { status: StatusState }) {
  if (status.type === "idle") return null;
  const tone =
    status.type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status.type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-blue-200 bg-blue-50 text-blue-700";
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}
    >
      {status.message}
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  helper?: string;
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = "text",
  helper,
}: FieldProps) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-800">
      <div className="flex items-center gap-2">
        <span>
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </span>
        {helper ? (
          <span className="text-xs font-normal text-slate-500">{helper}</span>
        ) : null}
      </div>
      <input
        className={`${baseClasses} ${ringClasses}`}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
}: FieldProps) {
  const baseClasses =
    "min-h-[100px] w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-800">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <textarea
        className={`${baseClasses} ${ringClasses}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
}: FieldProps & { options: string[] }) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";

  return (
    <label className="space-y-1 text-sm font-semibold text-slate-800">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <select
        className={`${baseClasses} ${ringClasses}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder ?? "Select an option"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </label>
  );
}

function DateOfBirthField({
  value,
  onChange,
  error,
}: {
  value: Pick<FormState, "dobDay" | "dobMonth" | "dobYear">;
  onChange: (key: FieldKey, value: string) => void;
  error?: string;
}) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";

  const numericChange = (key: FieldKey, input: string, maxLength: number) => {
    const onlyNumbers = input.replace(/\D/g, "").slice(0, maxLength);
    onChange(key, onlyNumbers);
  };

  return (
    <div className="space-y-1 text-sm font-semibold text-slate-800">
      <span>
        Date of Birth <span className="text-rose-600">*</span>
      </span>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <input
            className={`${baseClasses} ${ringClasses}`}
            type="text"
            inputMode="numeric"
            placeholder="Date"
            value={value.dobDay}
            onChange={(e) => numericChange("dobDay", e.target.value, 2)}
          />
        </div>
        <div>
          <input
            className={`${baseClasses} ${ringClasses}`}
            type="text"
            inputMode="numeric"
            placeholder="Month"
            value={value.dobMonth}
            onChange={(e) => numericChange("dobMonth", e.target.value, 2)}
          />
        </div>
        <div>
          <input
            className={`${baseClasses} ${ringClasses}`}
            type="text"
            inputMode="numeric"
            placeholder="Year"
            value={value.dobYear}
            onChange={(e) => numericChange("dobYear", e.target.value, 4)}
          />
        </div>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function NomineeTable({
  nominees,
  onChange,
  onRemove,
  onAdd,
  errors,
}: {
  nominees: Nominee[];
  onChange: (id: string, key: NomineeField, value: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  errors: Record<string, Partial<Record<NomineeField, string>>>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="hidden gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1.2fr,1.2fr,1fr,0.6fr,auto]">
        <span>Name of Nominee</span>
        <span>Nominee Passport/ID No</span>
        <span>Relationship</span>
        <span>Portion (%)</span>
        <span />
      </div>
      <div className="space-y-3">
        {nominees.map((nominee) => (
          <NomineeRow
            key={nominee.id}
            nominee={nominee}
            onChange={onChange}
            onRemove={onRemove}
            disableRemove={nominees.length <= 1}
            errors={errors[nominee.id]}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
      >
        + Add Another Nominee
      </button>
    </div>
  );
}

function NomineeRow({
  nominee,
  onChange,
  onRemove,
  disableRemove,
  errors,
}: {
  nominee: Nominee;
  onChange: (id: string, key: NomineeField, value: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
  errors?: Partial<Record<NomineeField, string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1.2fr,1.2fr,1fr,0.6fr,auto]">
      <NomineeInput
        label="Name of Nominee"
        placeholder="Full name"
        value={nominee.name}
        onChange={(value) => onChange(nominee.id, "name", value)}
        error={errors?.name}
      />
      <NomineeInput
        label="Nominee Passport/ID No"
        placeholder="ID number"
        value={nominee.passportId}
        onChange={(value) => onChange(nominee.id, "passportId", value)}
        error={errors?.passportId}
      />
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-500 sm:hidden">
          Relationship
        </p>
        <select
          className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none ${
            errors?.relationship
              ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
              : "border-slate-200"
          }`}
          value={nominee.relationship}
          onChange={(e) => onChange(nominee.id, "relationship", e.target.value)}
        >
          <option value="">Select</option>
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors?.relationship ? (
          <p className="text-xs text-rose-600">{errors.relationship}</p>
        ) : null}
      </div>
      <NomineeInput
        label="Portion (%)"
        placeholder="50"
        value={nominee.portion}
        onChange={(value) => onChange(nominee.id, "portion", value)}
        error={errors?.portion}
        type="number"
      />
      <div className="flex items-center sm:justify-end">
        <button
          type="button"
          onClick={() => onRemove(nominee.id)}
          disabled={disableRemove}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function NomineeInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
}) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 sm:hidden">{label}</p>
      <input
        className={`${baseClasses} ${ringClasses}`}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function validateForm(data: FormState): {
  hasErrors: boolean;
  errors: ValidationErrors;
} {
  const errors: ValidationErrors = { fields: {}, nominees: {} };
  const required: FieldKey[] = [
    "passportName",
    "callingName",
    "gender",
    "dobDay",
    "dobMonth",
    "dobYear",
    "nationality",
    "passportNo",
    "maritalStatus",
    "contactNumber",
    "homeCountry",
    "personalEmail",
    "residentialAddress",
    "emergencyName",
    "emergencyRelationship",
    "emergencyContact",
    "emergencyAddress",
    "birthPlace",
    "motherName",
    "fatherName",
  ];

  required.forEach((field) => {
    if (!data[field].trim()) {
      errors.fields[field] = "This field is required.";
    }
  });

  if (data.maritalStatus === "Married" && !data.spouseName.trim()) {
    errors.fields.spouseName = "Spouse name is required for married employees.";
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (data.personalEmail && !emailPattern.test(data.personalEmail)) {
    errors.fields.personalEmail = "Enter a valid email address.";
  }

  if (
    data.dobDay &&
    data.dobMonth &&
    data.dobYear &&
    !isValidDate(data.dobYear, data.dobMonth, data.dobDay)
  ) {
    errors.fields.dobYear = "Enter a valid date of birth.";
  }

  const phonePattern = /^[0-9+][0-9\s-]{6,}$/;
  if (data.contactNumber && !phonePattern.test(data.contactNumber)) {
    errors.fields.contactNumber = "Enter a valid contact number.";
  }
  if (data.emergencyContact && !phonePattern.test(data.emergencyContact)) {
    errors.fields.emergencyContact = "Enter a valid contact number.";
  }

  const nomineeList = data.nominees ?? [];
  if (!nomineeList.length) {
    errors.global =
      "Add at least one nominee and ensure their portions total 100%.";
  }

  let totalPortion = 0;
  let portionsAreValid = true;
  nomineeList.forEach((nominee) => {
    const entryErrors: Partial<Record<NomineeField, string>> = {};
    if (!nominee.name.trim()) {
      entryErrors.name = "Required";
    }
    if (!nominee.passportId.trim()) {
      entryErrors.passportId = "Required";
    }
    if (!nominee.relationship.trim()) {
      entryErrors.relationship = "Required";
    }
    if (!nominee.portion.trim()) {
      entryErrors.portion = "Required";
      portionsAreValid = false;
    } else {
      const portionNumber = Number(nominee.portion);
      if (!Number.isFinite(portionNumber) || portionNumber <= 0) {
        entryErrors.portion = "Enter a number above 0";
        portionsAreValid = false;
      } else if (portionNumber > 100) {
        entryErrors.portion = "Cannot exceed 100";
        portionsAreValid = false;
      } else {
        totalPortion += portionNumber;
      }
    }
    if (Object.keys(entryErrors).length) {
      errors.nominees[nominee.id] = entryErrors;
    }
  });

  if (
    portionsAreValid &&
    nomineeList.length &&
    Math.abs(totalPortion - 100) > 0.01
  ) {
    errors.global = "Nominee portions must add up to 100%.";
  }

  const hasErrors =
    Object.keys(errors.fields).length > 0 ||
    Object.keys(errors.nominees).length > 0 ||
    Boolean(errors.global);

  return { hasErrors, errors };
}

function isValidDate(year: string, month: string, day: string) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return false;
  }
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}
