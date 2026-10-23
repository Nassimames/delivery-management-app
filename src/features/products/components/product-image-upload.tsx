"use client";

import { ImagePlus, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo } from "react";

type ProductImageUploadProps = {
  id: string;
  file: File | null;
  currentImageUrl: string | null;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
  error: string;
  required: boolean;
};

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateProductImage(file: File) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "Image must be 3 MB or smaller.";
  }
  if (file.size === 0) {
    return "This image file is empty.";
  }
  return "";
}

export function ProductImageUpload({
  id,
  file,
  currentImageUrl,
  onChange,
  onError,
  error,
  required,
}: ProductImageUploadProps) {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : currentImageUrl),
    [file, currentImageUrl],
  );

  useEffect(() => {
    if (!file || !previewUrl || previewUrl === currentImageUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [currentImageUrl, file, previewUrl]);

  return (
    <div className="space-y-2 sm:col-span-2">
      <span className="block text-sm font-medium text-ink">
        Product image {required ? <span className="text-danger">*</span> : null}
      </span>
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-slate-50/70 p-4 sm:flex-row sm:items-center">
        <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white text-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={file ? "Selected product image preview" : "Current product image"}
              fill
              sizes="112px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <ImagePlus aria-hidden="true" size={25} strokeWidth={1.6} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">
            {file ? file.name : currentImageUrl ? "Current image" : "Add a product image"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            JPEG, PNG, or WebP. Maximum file size: 3 MB.
            {!required && currentImageUrl && !file
              ? " Leave empty to keep the current image."
              : ""}
          </p>
          {file ? (
            <p className="mt-1 text-xs tabular-nums text-muted">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-canvas focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand"
            >
              {currentImageUrl || file ? (
                <RefreshCw aria-hidden="true" size={14} />
              ) : (
                <ImagePlus aria-hidden="true" size={14} />
              )}
              {currentImageUrl || file ? "Choose another" : "Choose image"}
            </label>
            {file && !required ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  onError("");
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-white hover:text-ink"
              >
                <X aria-hidden="true" size={14} />
                Keep current
              </button>
            ) : null}
          </div>
          <input
            id={id}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0] ?? null;
              event.currentTarget.value = "";
              if (!nextFile) {
                return;
              }

              const validationError = validateProductImage(nextFile);
              if (validationError) {
                onChange(null);
                onError(validationError);
                return;
              }

              onError("");
              onChange(nextFile);
            }}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
