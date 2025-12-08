"use client";

import { useEffect, useRef, useState } from "react";
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

export default function Home() {
  const [profile, setProfile] = useState<{ name?: string; email?: string }>(
    {}
  );
  const [formData, setFormData] = useState<FormState>(() => buildDefaultForm());
  const [errors, setErrors] = useState<ValidationErrors>({
    fields: {},
    nominees: {},
  });
  const [status, setStatus] = useState<StatusState>({
    type: "info",
    message: "Sign in with your email to continue.",
  });
  const [submitting, setSubmitting] = useState(false);
  const landingRef = useRef<HTMLDivElement | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useSignedOutAnimations(landingRef, heroRef);
  useSignedInAnimations(flowRef);

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

  const handleEmailSubmit = (email: string) => {
    const nextEmail = email.trim();
    setSignedInEmail(nextEmail);
    setProfile((prev) => ({ ...prev, email: nextEmail }));
    setStatus({
      type: "success",
      message: `Signed in with ${nextEmail}. You can now fill out the form.`,
    });
    setShowDetails(true);
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

    const senderEmail = profile.email?.trim() || signedInEmail || "";
    if (!senderEmail) {
      setStatus({
        type: "error",
        message: "Please sign in with your email before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setStatus({
      type: "info",
      message: "Validating and sending your details via email...",
    });

    const payload = {
      profile: {
        name:
          profile.name ||
          formData.passportName ||
          formData.callingName ||
          "HTS Employee",
        email: senderEmail,
      },
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
        message: "Information submitted to PeopleOps. Redirecting to home...",
      });
      setFormData(buildDefaultForm());
      setErrors({ fields: {}, nominees: {} });
      
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      // Wait 3 seconds then return to landing page
      setTimeout(() => {
        setSignedInEmail(null);
        setProfile({});
        setShowDetails(false);
        setStatus({
          type: "info",
          message: "Sign in with your email to continue.",
        });
      }, 3000);
    } catch (error) {
      console.error("Submit error", error);
      const message =
        error instanceof Error
          ? error.message
          : "Sending failed. Please try again.";
      setStatus({
        type: "error",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const dobError =
    errors.fields.dobDay || errors.fields.dobMonth || errors.fields.dobYear;
  const showGlobalError =
    Boolean(errors.global) &&
    !(status.type === "error" && status.message === errors.global);

  if (!signedInEmail && !profile.email) {
    return (
      <SignedOutLanding
        landingRef={landingRef}
        heroRef={heroRef}
        onEmailSubmit={handleEmailSubmit}
        showDetails={showDetails}
        onProceed={() => setShowDetails(true)}
      />
    );
  }

  const userEmail = profile.email ?? signedInEmail ?? undefined;

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
        profileLoading={false}
        profile={profile}
        signedInEmail={userEmail}
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
