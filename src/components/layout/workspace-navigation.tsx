"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  Package,
} from "lucide-react";

export const workspaceNavigationItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/zones", label: "Delivery zones", icon: MapPinned },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ClipboardList },
];

export function WorkspaceNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "Mobile navigation" : "Main navigation"}
      className={
        mobile
          ? "grid grid-cols-4 border-t border-border/70 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur-xl"
          : "space-y-1"
      }
    >
      {workspaceNavigationItems.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${
                    active ? "text-brand" : "text-muted hover:text-ink"
                  }`
                : `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-white/[0.11] text-white"
                      : "text-white/55 hover:bg-white/[0.06] hover:text-white/90"
                  }`
            }
          >
            <Icon
              aria-hidden="true"
              size={mobile ? 19 : 17}
              strokeWidth={active ? 2 : 1.8}
              className={!mobile && active ? "text-[#c7e2aa]" : undefined}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
