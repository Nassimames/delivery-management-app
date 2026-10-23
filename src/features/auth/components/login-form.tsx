"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateLogin, type AuthFieldErrors } from "@/lib/validations/auth";
import { PasswordField } from "./password-field";

type LoginFormProps = {
  notice?: string;
  message?: string;
};

export function LoginForm({ message, notice }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateLogin(email, password);
    setErrors(validationErrors);
    setFormError("");

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError("Email or password is incorrect. Please try again.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setFormError("We couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm leading-5 text-emerald-800"
        >
          {notice}
        </p>
      ) : null}
      {message ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-5 text-rose-800"
        >
          {message}
        </p>
      ) : null}
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-xs leading-5 text-muted">
        Having trouble signing in? Check your email and password, then try again.
      </p>
      <p className="text-center text-sm text-muted">
        New to Wayline?{" "}
        <Link
          href="/signup"
          className="font-medium text-brand hover:text-brand-hover"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
