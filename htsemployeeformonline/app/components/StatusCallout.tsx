"use client";

import { StatusState } from "../types/status";

export function StatusCallout({ status }: { status: StatusState }) {
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
