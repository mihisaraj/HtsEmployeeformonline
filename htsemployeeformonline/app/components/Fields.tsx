"use client";

export type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  helper?: string;
};

export type DobValue = {
  dobDay: string;
  dobMonth: string;
  dobYear: string;
};

export type DobChangeHandler = (
  key: "dobDay" | "dobMonth" | "dobYear",
  value: string
) => void;

export function TextField({
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

export function TextAreaField({
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

export function SelectField({
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

export function DateOfBirthField({
  value,
  onChange,
  error,
}: {
  value: DobValue;
  onChange: DobChangeHandler;
  error?: string;
}) {
  const baseClasses =
    "w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none";
  const ringClasses = error
    ? "border-rose-300 ring-1 ring-rose-100 focus:ring-rose-100 focus:border-rose-400"
    : "border-slate-200";

  const numericChange = (
    key: "dobDay" | "dobMonth" | "dobYear",
    input: string,
    maxLength: number
  ) => {
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
