"use client";

import { Nominee, NomineeField } from "../types/form";

type NomineeTableProps = {
  nominees: Nominee[];
  onChange: (id: string, key: NomineeField, value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
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
  const gridCols = "grid-cols-[1.4fr,1fr,1fr,0.7fr,0.5fr]";
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300">
      <div className="min-w-[760px]">
        <div
          className={`grid items-center ${gridCols} bg-blue-700 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white`}
        >
          <span>Full Name</span>
          <span>ID / Passport No</span>
          <span>Relationship</span>
          <span>Portion (%)</span>
          <span />
        </div>
        <div className="divide-y divide-slate-200">
          {nominees.map((nominee) => (
            <NomineeRow
              key={nominee.id}
              nominee={nominee}
              onChange={onChange}
              onRemove={onRemove}
              disableRemove={nominees.length <= 1}
              errors={errors[nominee.id]}
              relationshipOptions={relationshipOptions}
              gridCols={gridCols}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          + Add Nominee
        </button>
      </div>
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
  gridCols: string;
};

function NomineeRow({
  nominee,
  onChange,
  onRemove,
  disableRemove,
  errors,
  relationshipOptions,
  gridCols,
}: NomineeRowProps) {
  return (
    <div className={`grid items-center gap-3 px-3 py-2 ${gridCols}`}>
      <NomineeInput
        label="Full Name"
        placeholder="Full name"
        value={nominee.name}
        onChange={(value) => onChange(nominee.id, "name", value)}
        error={errors?.name}
        compact
      />
      <NomineeInput
        label="Passport/ID No"
        placeholder="ID number"
        value={nominee.passportId}
        onChange={(value) => onChange(nominee.id, "passportId", value)}
        error={errors?.passportId}
        compact
      />
      <div className="space-y-1">
        <label className="sr-only" htmlFor={`relationship-${nominee.id}`}>
          Relationship
        </label>
        <select
          id={`relationship-${nominee.id}`}
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
        compact
      />
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onRemove(nominee.id)}
          disabled={disableRemove}
          className="text-xs font-semibold text-rose-600 disabled:opacity-40"
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
  compact = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  compact?: boolean;
}) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";
  return (
    <div className="space-y-1">
      <label className="sr-only">{label}</label>
      <input
        className={`${baseClasses} ${ringClasses}`}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && !compact ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
