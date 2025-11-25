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
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {nominees.map((nominee, index) => (
          <NomineeRow
            key={nominee.id}
            index={index}
            nominee={nominee}
            onChange={onChange}
            onRemove={onRemove}
            disableRemove={nominees.length <= 1}
            errors={errors[nominee.id]}
            relationshipOptions={relationshipOptions}
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-4 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
        >
          + Add Another Nominee
        </button>
      </div>
    </div>
  );
}

type NomineeRowProps = {
  nominee: Nominee;
  index: number;
  onChange: (id: string, key: NomineeField, value: string) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
  errors?: Partial<Record<NomineeField, string>>;
  relationshipOptions: string[];
};

function NomineeRow({
  nominee,
  index,
  onChange,
  onRemove,
  disableRemove,
  errors,
  relationshipOptions,
}: NomineeRowProps) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Nominee {index + 1}
        </h3>
        <button
          type="button"
          onClick={() => onRemove(nominee.id)}
          disabled={disableRemove}
          className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <NomineeInput
          label="Full Name"
          placeholder="Full name"
          value={nominee.name}
          onChange={(value) => onChange(nominee.id, "name", value)}
          error={errors?.name}
        />
        
        <NomineeInput
          label="Passport/ID No"
          placeholder="ID number"
          value={nominee.passportId}
          onChange={(value) => onChange(nominee.id, "passportId", value)}
          error={errors?.passportId}
        />
        
        <div className="space-y-1">
          <label 
            htmlFor={`relationship-${nominee.id}`}
            className="block text-sm font-medium text-slate-700"
          >
            Relationship
          </label>
          <div className="relative">
            <select
              id={`relationship-${nominee.id}`}
              className={`w-full appearance-none rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none ${
                errors?.relationship
                  ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
                  : "border-slate-200"
              }`}
              value={nominee.relationship}
              onChange={(e) => onChange(nominee.id, "relationship", e.target.value)}
            >
              <option value="">Select relationship</option>
              {relationshipOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
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
      <label className="block text-sm font-medium text-slate-700">{label}</label>
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
