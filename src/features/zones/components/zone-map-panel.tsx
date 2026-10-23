"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import type { DeliveryZone } from "../types";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ZoneMapProps = {
  zones: DeliveryZone[];
  selectedLocation: Coordinates | null;
  onLocationSelect: (location: Coordinates) => void;
  canSelectLocation?: boolean;
};

const ZoneMap = dynamic(
  () => import("./zone-map").then((module) => module.ZoneMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center bg-slate-100 text-sm text-muted">
        Loading map...
      </div>
    ),
  },
);

export function ZoneMapPanel(props: ZoneMapProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <MapPinned aria-hidden="true" size={17} className="text-brand" />
          Zone coverage map
        </div>
        <span className="text-xs text-muted">
          {props.canSelectLocation ? "Click to select a location" : "OpenStreetMap"}
        </span>
      </div>
      <div className="h-[360px] sm:h-[480px]">
        <ZoneMap {...props} />
      </div>
    </div>
  );
}
