"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateSignup, type AuthFieldErrors } from "@/lib/validations/auth";
import { PasswordField } from "./password-field";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateSignup(email, password, confirmPassword);
    setErrors(validationErrors);
    setFormError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: new URL("/auth/callback", window.location.origin)
            .toString(),
        },
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      setConfirmationPending(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmationPending) {
    return (
      <div
        role="status"
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900"
      >
        <p className="font-medium">Check your inbox to confirm your email.</p>
        <p className="mt-1">
          We sent a confirmation link to <strong>{email.trim()}</strong>. Follow
          it to finish setting up your account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800"
        >
          {formError}
        </p>
      ) : null}
      <Input
        id="email"
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        autoCapitalize="none"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <PasswordField
        id="confirm-password"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={errors.confirmPassword}
      />
      <p className="-mt-2 text-xs text-muted">Use at least 8 characters.</p>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
