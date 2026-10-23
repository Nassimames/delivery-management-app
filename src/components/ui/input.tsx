"use client";

import type { InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
};

export function Input({
  className = "",
  error,
  id,
  label,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`min-h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none placeholder:text-muted/70 focus:border-brand focus:ring-3 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-canvas ${error ? "border-danger focus:border-danger focus:ring-danger/10" : ""} ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
