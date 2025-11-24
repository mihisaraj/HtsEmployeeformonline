"use client";

import {
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";
import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";
import { Nominee, NomineeField } from "./types/form";
import {
  type FieldKey,
  type FormState,
  type ValidationErrors,
} from "./types/formState";
import { SignedOutLanding } from "./components/SignedOutLanding";
import { SignedInForm } from "./components/SignedInForm";
import { StatusState } from "./types/status";
import {
  useSignedInAnimations,
  useSignedOutAnimations,
} from "./hooks/animations";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary"];
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
const HOME_COUNTRY_CODES = [
  { label: "Sri Lanka (+94)", value: "+94" },
  { label: "India (+91)", value: "+91" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Singapore (+65)", value: "+65" },
];

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
  sriLankaContact: "",
  homeContactCode: "",
  homeContactNumber: "",
  homeCountry: "Sri Lanka",
  sriLankaAddress: "",
  homeCountryAddress: "",
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
  const landingRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canAuth = Boolean(msalClientId && msalTenantId);
  useSignedOutAnimations(landingRef, heroRef);
  useSignedInAnimations(flowRef);

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
      setAuthChecked(true);
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

    void initialize().finally(() => setAuthChecked(true));
  }, [acquireMailToken, canAuth, hydrateProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      if (window.scrollY > 40 && !showDetails) {
        setShowDetails(true);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [showDetails]);

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
    setFormData((prev) => ({
      ...prev,
      nominees: prev.nominees.filter((nominee) => nominee.id !== id),
    }));
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

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 text-slate-900">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-amber-100">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          Preparing your welcome page...
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <SignedOutLanding
        landingRef={landingRef}
        heroRef={heroRef}
        canAuth={canAuth}
        authLoading={authLoading}
        status={status}
        onLogin={handleLogin}
        showDetails={showDetails}
        onProceed={() => setShowDetails(true)}
      />
    );
  }

  const dobError =
    errors.fields.dobDay || errors.fields.dobMonth || errors.fields.dobYear;
  const showGlobalError =
    Boolean(errors.global) &&
    !(status.type === "error" && status.message === errors.global);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <SignedInForm
        flowRef={flowRef}
        status={status}
        showGlobalError={showGlobalError}
        errors={errors}
        formData={formData}
        onFieldChange={handleFieldChange}
        onNomineeChange={handleNomineeChange}
        onAddNominee={addNominee}
        onRemoveNominee={removeNominee}
        onSubmit={handleSubmit}
        submitting={submitting}
        profileLoading={profileLoading}
        profile={profile}
        account={account}
        dobError={dobError}
        relationshipOptions={RELATIONSHIP_OPTIONS}
        countryOptions={HOME_COUNTRY_OPTIONS}
        genderOptions={GENDER_OPTIONS}
        maritalOptions={MARITAL_STATUS_OPTIONS}
        countryCodes={HOME_COUNTRY_CODES}
      />
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
    "sriLankaContact",
    "homeContactCode",
    "homeContactNumber",
    "homeCountry",
    "sriLankaAddress",
    "homeCountryAddress",
    "personalEmail",
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

  const sriLankaPattern = /^\+94\d{9}$/;
  if (data.sriLankaContact && !sriLankaPattern.test(data.sriLankaContact)) {
    errors.fields.sriLankaContact =
      "Sri Lanka contact must start with +94 and include 9 digits.";
  }
  const homePattern = /^\d{6,12}$/;
  if (data.homeContactNumber && !homePattern.test(data.homeContactNumber)) {
    errors.fields.homeContactNumber = "Enter 6-12 digits for home contact.";
  }
  if (!data.homeContactCode.trim()) {
    errors.fields.homeContactCode = "Select a home contact code.";
  }
  const phonePattern = /^[0-9+][0-9\s-]{6,}$/;
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
