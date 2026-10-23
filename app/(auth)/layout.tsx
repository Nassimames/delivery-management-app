import { Suspense, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/async-states";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function RedirectAuthenticatedUsers({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Unable to verify the Supabase session:", error);
  }

  if (data.user) {
    redirect("/");
  }

  return children;
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState title="Loading sign-in" />}>
      <RedirectAuthenticatedUsers>{children}</RedirectAuthenticatedUsers>
    </Suspense>
  );
}
