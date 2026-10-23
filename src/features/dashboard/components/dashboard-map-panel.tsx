"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import type { DeliveryZone } from "@/features/zones/types";

const ZoneMap = dynamic(
  () => import("@/features/zones/components/zone-map").then((mod) => mod.ZoneMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-[#f0f3ee] text-sm text-muted">
        Preparing the coverage map...
      </div>
    ),
  },
);

export function DashboardMapPanel({ zones }: { zones: DeliveryZone[] }) {
  return (
    <div className="relative h-[290px] sm:h-[360px]">
      <ZoneMap
        zones={zones}
        selectedLocation={null}
        onLocationSelect={() => undefined}
      />
      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-center gap-2 rounded-lg border border-white/70 bg-white/95 px-3 py-2 text-xs font-medium text-ink shadow-panel backdrop-blur">
        <MapPinned aria-hidden="true" size={14} className="text-brand" />
        {zones.length} active {zones.length === 1 ? "zone" : "zones"}
        <span className="mx-0.5 h-3 border-l border-border" />
        <span className="size-2 rounded-full bg-brand" />
        Coverage radius
      </div>
    </div>
  );
}
