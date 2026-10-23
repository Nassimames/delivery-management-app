"use client";

import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";

const routeNames: Record<string, string> = {
  "/": "Overview",
  "/zones": "Delivery zones",
  "/products": "Products",
  "/orders": "Orders",
};

export function WorkspaceHeader({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const title = routeNames[pathname] ?? "Workspace";

  return (
    <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-border/80 bg-[#f8f9f6]/90 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="flex items-center gap-2.5 text-xs">
        <span className="hidden font-medium text-muted sm:inline">
          WAYLINE
        </span>
        <ChevronRight
          aria-hidden="true"
          size={13}
          className="hidden text-slate-300 sm:block"
        />
        <span className="font-semibold text-ink">{title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden max-w-48 truncate text-xs text-muted sm:inline">
          {userEmail}
        </span>
        <details className="group relative">
          <summary
            aria-label="Open account menu"
            className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full border border-[#d5e1d4] bg-[#eaf3eb] text-xs font-semibold text-brand transition hover:ring-4 hover:ring-brand/10 [&::-webkit-details-marker]:hidden"
          >
            {userEmail?.slice(0, 1).toUpperCase() ?? "W"}
          </summary>
          <div className="absolute right-0 top-11 w-56 rounded-xl border border-border bg-white p-3 shadow-panel">
            <p className="mb-2 truncate px-2 text-xs text-muted">{userEmail}</p>
            <LogoutButton />
          </div>
        </details>
      </div>
    </header>
  );
}
