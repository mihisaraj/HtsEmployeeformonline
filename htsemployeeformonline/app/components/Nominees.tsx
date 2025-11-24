"use client";

import { Nominee, NomineeField } from "../types/form";

type NomineeTableProps = {
  nominees: Nominee[];
  onChange: (id: string, key: NomineeField, value: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  errors: Record<string, Partial<Record<NomineeField, string>>>;
  relationshipOptions: string[];
};

export function NomineeTable({
  nominees,
  onChange,
  onRemove,
  onAdd,
  errors,
  relationshipOptions,
}: NomineeTableProps) {
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
            relationshipOptions={relationshipOptions}
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

type NomineeRowProps = {
  nominee: Nominee;
  onChange: (id: string, key: NomineeField, value: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
  errors?: Partial<Record<NomineeField, string>>;
  relationshipOptions: string[];
};

function NomineeRow({
  nominee,
  onChange,
  onRemove,
  disableRemove,
  errors,
  relationshipOptions,
}: NomineeRowProps) {
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
          {relationshipOptions.map((option) => (
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
