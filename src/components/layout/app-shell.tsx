import Link from "next/link";
import { PackageCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { WorkspaceNavigation } from "./workspace-navigation";
import { WorkspaceHeader } from "./workspace-header";

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Wayline home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
        <PackageCheck aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        wayline
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string | null;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col overflow-y-auto border-r border-white/[0.07] bg-[#142b28] px-5 py-6 lg:flex">
        <div className="px-1">
          <Brand />
        </div>
        <div className="mt-12 flex items-center justify-between px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-white/35">
            Workspace
          </span>
          <span className="font-mono text-[9px] tracking-wide text-white/25">
            01—04
          </span>
        </div>
        <div className="mt-3">
          <WorkspaceNavigation />
        </div>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#c7e2aa]">
            THE WAYLINE NOTE
          </span>
          <p className="mt-2 text-xs leading-5 text-white/60">
            Good operations begin with a clear view of the road ahead.
          </p>
        </div>
        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="mb-2 flex items-center gap-2.5 px-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80">
              {userEmail?.slice(0, 1).toUpperCase() ?? "W"}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-white/80">
                Signed in
              </span>
              <span className="block max-w-40 truncate text-[10px] text-white/40">
                {userEmail}
              </span>
            </span>
          </div>
          <div className="[&_button]:text-white/55 [&_button:hover]:bg-white/[0.07] [&_button:hover]:text-white">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="lg:pl-[250px]">
        <WorkspaceHeader userEmail={userEmail} />
        <main className="min-h-[calc(100dvh-66px)]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12">
            {children}
          </div>
        </main>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-[1000] lg:hidden">
        <WorkspaceNavigation mobile />
      </div>
    </div>
  );
}
