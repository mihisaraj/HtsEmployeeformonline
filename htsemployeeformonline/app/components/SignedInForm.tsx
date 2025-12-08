"use client";

import { RefObject } from "react";
import { StatusCallout } from "./StatusCallout";
import {
  DateOfBirthField,
  type DobChangeHandler,
  SelectField,
  TextAreaField,
  TextField,
} from "./Fields";
import { NomineeTable } from "./Nominees";
import { StatusState } from "../types/status";
import { FormState, ValidationErrors, FieldKey } from "../types/formState";
import { NomineeField } from "../types/form";

type SignedInFormProps = {
  flowRef: RefObject<HTMLDivElement | null>;
  status: StatusState;
  showGlobalError: boolean;
  errors: ValidationErrors;
  formData: FormState;
  onFieldChange: (key: FieldKey, value: string) => void;
  onNomineeChange: (id: string, key: NomineeField, value: string) => void;
  onAddNominee: () => void;
  onRemoveNominee: (id: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  profileLoading: boolean;
  profile: { name?: string; email?: string };
  signedInEmail?: string | null;
  dobError?: string;
  relationshipOptions: string[];
  countryOptions: string[];
  genderOptions: string[];
  maritalOptions: string[];
  countryCodes: { label: string; value: string }[];
};

export function SignedInForm({
  flowRef,
  status,
  showGlobalError,
  errors,
  formData,
  onFieldChange,
  onNomineeChange,
  onAddNominee,
  onRemoveNominee,
  onSubmit,
  submitting,
  profileLoading,
  profile,
  signedInEmail,
  dobError,
  relationshipOptions,
  countryOptions,
  genderOptions,
  maritalOptions,
  countryCodes,
}: SignedInFormProps) {
  const displayEmail = profile.email ?? signedInEmail ?? "Email not provided";

  return (
    <main
      ref={flowRef}
      className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:space-y-10"
    >
      <div className="flow-reveal space-y-4 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Signed in
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {profileLoading ? "Loading profile" : profile.name || "Employee"}
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {displayEmail}
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">
            Employee Information
          </h1>
          <p className="mt-2 max-w-3xl text-base text-slate-700">
            Please fill out the form carefully and accurately.
          </p>
        </div>
      </div>

      <div className="flow-reveal space-y-3">
        <StatusCallout status={status} />
        {showGlobalError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errors.global}
          </div>
        ) : null}
      </div>

      <div className="flow-reveal">
        <FormSection title="Personal Information">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Name (As per Passport)"
              required
              value={formData.passportName}
              onChange={(v) => onFieldChange("passportName", v)}
              error={errors.fields.passportName}
            />
            <TextField
              label="Calling Name"
              required
              value={formData.callingName}
              onChange={(v) => onFieldChange("callingName", v)}
              error={errors.fields.callingName}
            />
            <SelectField
              label="Gender"
              required
              value={formData.gender}
              onChange={(v) => onFieldChange("gender", v)}
              options={genderOptions}
              placeholder="Select gender"
              error={errors.fields.gender}
            />
            <DateOfBirthField
              value={{
                dobDay: formData.dobDay,
                dobMonth: formData.dobMonth,
                dobYear: formData.dobYear,
              }}
              onChange={onFieldChange as DobChangeHandler}
              error={dobError}
            />
            <TextField
              label="Nationality"
              required
              value={formData.nationality}
              onChange={(v) => onFieldChange("nationality", v)}
              error={errors.fields.nationality}
            />
            <TextField
              label="Religion"
              value={formData.religion}
              onChange={(v) => onFieldChange("religion", v)}
              error={errors.fields.religion}
              helper="Optional"
            />
            <TextField
              label="Passport No"
              required
              value={formData.passportNo}
              onChange={(v) => onFieldChange("passportNo", v)}
              error={errors.fields.passportNo}
            />
            <SelectField
              label="Marital Status"
              required
              value={formData.maritalStatus}
              onChange={(v) => onFieldChange("maritalStatus", v)}
              options={maritalOptions}
              placeholder="Select status"
              error={errors.fields.maritalStatus}
            />
            <TextField
              label="Sri Lanka Contact"
              required
              value={formData.sriLankaContact}
              onChange={(v) => onFieldChange("sriLankaContact", v)}
              error={errors.fields.sriLankaContact}
              placeholder="+94XXXXXXXXX"
            />
            <div className="space-y-1 text-sm font-semibold text-slate-800">
              <span>Home Contact</span>
              <div className="grid grid-cols-[0.35fr,1fr] gap-3">
                <label className="text-xs font-semibold text-slate-500">
                  <select
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none ${
                      errors.fields.homeContactCode
                        ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
                        : "border-slate-200"
                    }`}
                    value={formData.homeContactCode}
                    onChange={(e) => onFieldChange("homeContactCode", e.target.value)}
                  >
                    <option value="">Code</option>
                    {countryCodes.map((code) => (
                      <option key={code.value} value={code.value}>
                        {code.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  <input
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none ${
                      errors.fields.homeContactNumber
                        ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
                        : "border-slate-200"
                    }`}
                    type="tel"
                    value={formData.homeContactNumber}
                    placeholder="Enter number"
                    onChange={(e) => onFieldChange("homeContactNumber", e.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-1 text-xs font-semibold text-rose-600">
                {errors.fields.homeContactCode ? <span>{errors.fields.homeContactCode}</span> : null}
                {errors.fields.homeContactNumber ? (
                  <span>{errors.fields.homeContactNumber}</span>
                ) : null}
              </div>
            </div>
            <SelectField
              label="Home Country"
              required
              value={formData.homeCountry}
              onChange={(v) => onFieldChange("homeCountry", v)}
              options={countryOptions}
              placeholder="Select country"
              error={errors.fields.homeCountry}
            />
            <TextField
              label="Personal Email"
              required
              type="email"
              value={formData.personalEmail}
              onChange={(v) => onFieldChange("personalEmail", v)}
              error={errors.fields.personalEmail}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextAreaField
              label="Sri Lanka Residential Address"
              required
              value={formData.sriLankaAddress}
              onChange={(v) => onFieldChange("sriLankaAddress", v)}
              error={errors.fields.sriLankaAddress}
              placeholder="Street, city, postal code"
            />
            <TextAreaField
              label="Home Country Address"
              required
              value={formData.homeCountryAddress}
              onChange={(v) => onFieldChange("homeCountryAddress", v)}
              error={errors.fields.homeCountryAddress}
              placeholder="Full address in home country"
            />
          </div>
        </FormSection>
      </div>

      <div className="flow-reveal">
        <FormSection title="Emergency Contacts">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Name"
              required
              value={formData.emergencyName}
              onChange={(v) => onFieldChange("emergencyName", v)}
              error={errors.fields.emergencyName}
            />
            <TextField
              label="Relationship"
              required
              value={formData.emergencyRelationship}
              onChange={(v) => onFieldChange("emergencyRelationship", v)}
              error={errors.fields.emergencyRelationship}
            />
          </div>
          <TextField
            label="Contact No"
            required
            value={formData.emergencyContact}
            onChange={(v) => onFieldChange("emergencyContact", v)}
            error={errors.fields.emergencyContact}
          />
          <TextAreaField
            label="Address"
            required
            value={formData.emergencyAddress}
            onChange={(v) => onFieldChange("emergencyAddress", v)}
            error={errors.fields.emergencyAddress}
            placeholder="Full address of the emergency contact"
          />
        </FormSection>
      </div>

      <div className="flow-reveal">
        <FormSection title="Additional Info to be registered at EPF/ETF Financial Fund">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="Birth Place"
              required
              value={formData.birthPlace}
              onChange={(v) => onFieldChange("birthPlace", v)}
              error={errors.fields.birthPlace}
            />
            <TextField
              label="Name of Spouse"
              required={formData.maritalStatus === "Married"}
              value={formData.spouseName}
              onChange={(v) => onFieldChange("spouseName", v)}
              error={errors.fields.spouseName}
            />
            <TextField
              label="Name of the Mother"
              required
              value={formData.motherName}
              onChange={(v) => onFieldChange("motherName", v)}
              error={errors.fields.motherName}
            />
            <TextField
              label="Name of the Father"
              required
              value={formData.fatherName}
              onChange={(v) => onFieldChange("fatherName", v)}
              error={errors.fields.fatherName}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Nominees
              </h4>
              <p className="text-xs text-slate-500">Portions must total 100%</p>
            </div>
            <NomineeTable
              nominees={formData.nominees}
              onChange={onNomineeChange}
              onAdd={onAddNominee}
              onRemove={onRemoveNominee}
              errors={errors.nominees}
              relationshipOptions={relationshipOptions}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            You can nominate your spouse, children, or parents as nominees for
            your EPF/ETF claim. You may add one or more nominees, and for each
            nominee, you must provide their Identity Card (NIC) or Passport
            number along with the percentage of the fund allocated to them. If
            you nominate more than one person, the total percentage must add up
            to 100% (for example, 70% and 30%).
          </div>
        </FormSection>
      </div>

      <div className="flow-reveal flex justify-end pb-4">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Submit Information
        </button>
      </div>
    </main>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
