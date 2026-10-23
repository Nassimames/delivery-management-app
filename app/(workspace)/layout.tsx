import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LoadingState } from "@/components/ui/async-states";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";

async function AuthenticatedWorkspace({ children }: { children: ReactNode }) {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return <AppShell userEmail={data.user.email ?? null}>{children}</AppShell>;
}

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingState title="Loading your workspace" />}>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}
