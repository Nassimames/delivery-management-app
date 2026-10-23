"use client";

import { useState, type FormEvent } from "react";
import { CircleHelp, MapPin, MapPinned, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ZoneMapPanel } from "./zone-map-panel";
import type { DeliveryZone } from "../types";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ZonesManagerProps = {
  initialZones: DeliveryZone[];
  initialError: string | null;
  userId: string;
};

export function ZonesManager({
  initialZones,
  initialError,
  userId,
}: ZonesManagerProps) {
  const [zones, setZones] = useState(initialZones);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState("5");
  const [selectedLocation, setSelectedLocation] =
    useState<Coordinates | null>(null);
  const [nameError, setNameError] = useState("");
  const [radiusError, setRadiusError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError("");
    setRadiusError("");
    setSubmitError("");
    setSuccessMessage("");

    const cleanName = name.trim();
    const radiusValue = Number(radius);
    let valid = true;

    if (!cleanName) {
      setNameError("Enter a zone name.");
      valid = false;
    } else if (cleanName.length > 120) {
      setNameError("Zone names must be 120 characters or fewer.");
      valid = false;
    }

    if (!radius.trim() || !Number.isFinite(radiusValue) || radiusValue <= 0) {
      setRadiusError("Enter a radius greater than 0 km.");
      valid = false;
    } else if (radiusValue > 999999.999) {
      setRadiusError("Radius is too large.");
      valid = false;
    }

    if (!selectedLocation) {
      setSubmitError("Click the map to select the zone center.");
      valid = false;
    } else if (
      !Number.isFinite(selectedLocation.latitude) ||
      !Number.isFinite(selectedLocation.longitude) ||
      selectedLocation.latitude < -90 ||
      selectedLocation.latitude > 90 ||
      selectedLocation.longitude < -180 ||
      selectedLocation.longitude > 180
    ) {
      setSubmitError("Choose a valid location on the map.");
      valid = false;
    }

    if (!valid || !selectedLocation) {
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("delivery_zones")
        .insert({
          user_id: userId,
          name: cleanName,
          center_latitude: Number(selectedLocation.latitude.toFixed(6)),
          center_longitude: Number(selectedLocation.longitude.toFixed(6)),
          radius_km: Number(radiusValue.toFixed(3)),
        })
        .select(
          "id, user_id, name, center_latitude, center_longitude, radius_km, created_at, updated_at",
        )
        .single();

      if (error) {
        setSubmitError(`Couldn't save this zone: ${error.message}`);
        return;
      }

      if (!data) {
        setSubmitError("The zone was saved, but its details could not be loaded.");
        return;
      }

      const createdZone: DeliveryZone = {
        ...data,
        center_latitude: Number(data.center_latitude),
        center_longitude: Number(data.center_longitude),
        radius_km: Number(data.radius_km),
      };

      setZones((current) => [createdZone, ...current]);
      setName("");
      setRadius("5");
      setSelectedLocation(null);
      setSuccessMessage(`${createdZone.name} was added successfully.`);
    } catch {
      setSubmitError("Couldn't save this zone. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(zone: DeliveryZone) {
    const confirmed = window.confirm(
      `Delete "${zone.name}"? Any products assigned to this zone will also be unassigned.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("delivery_zones")
        .delete()
        .eq("id", zone.id)
        .eq("user_id", userId);

      if (error) {
        setSubmitError(`Couldn't delete this zone: ${error.message}`);
        return;
      }

      setZones((current) => current.filter((item) => item.id !== zone.id));
      setSuccessMessage(`${zone.name} was deleted.`);
    } catch {
      setSubmitError("Couldn't delete this zone. Check your connection and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-[34px]">
            Delivery zones
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Define the areas your operation can serve and see their coverage on
            the map.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted">
          <MapPinned aria-hidden="true" size={14} className="text-brand" />
          {zones.length} {zones.length === 1 ? "zone" : "zones"}
        </span>
      </div>

      {initialError ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
        >
          Could not load delivery zones: {initialError}
        </div>
      ) : null}
      {successMessage ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </p>
      ) : null}
      {submitError ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
        >
          {submitError}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <ZoneMapPanel
          zones={zones}
          selectedLocation={selectedLocation}
          onLocationSelect={(location) => {
            setSelectedLocation(location);
            setSubmitError("");
            setSuccessMessage("");
          }}
          canSelectLocation
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand/8 text-brand">
                  <Plus aria-hidden="true" size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    Create a zone
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Click the map to set its center.
                  </p>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleCreate} noValidate className="space-y-4 p-5">
              <Input
                id="zone-name"
                name="name"
                label="Zone name"
                placeholder="e.g. Central district"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={nameError}
                required
              />
              <Input
                id="zone-radius"
                name="radius"
                label="Delivery radius (km)"
                type="number"
                min="0.001"
                step="0.001"
                inputMode="decimal"
                value={radius}
                onChange={(event) => setRadius(event.target.value)}
                error={radiusError}
                required
              />
              <div className="rounded-lg border border-border bg-canvas px-3 py-2.5">
                <div className="flex items-start gap-2 text-xs leading-5 text-muted">
                  {selectedLocation ? (
                    <MapPin
                      aria-hidden="true"
                      size={15}
                      className="mt-0.5 shrink-0 text-brand"
                    />
                  ) : (
                    <CircleHelp
                      aria-hidden="true"
                      size={15}
                      className="mt-0.5 shrink-0"
                    />
                  )}
                  <span>
                    {selectedLocation
                      ? `Center: ${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`
                      : "No center selected. Click any location on the map."}
                  </span>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                <Plus aria-hidden="true" size={16} />
                {submitting ? "Saving zone..." : "Add delivery zone"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink">Your zones</h2>
              <p className="mt-1 text-xs text-muted">
                {zones.length
                  ? "Coverage areas in your workspace."
                  : "Your created zones will appear here."}
              </p>
            </CardHeader>
            {zones.length === 0 ? (
              <div className="px-5 py-7 text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-100 text-muted">
                  <MapPinned aria-hidden="true" size={19} />
                </span>
                <p className="mt-3 text-sm font-medium text-ink">
                  No delivery zones yet
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Add your first zone to define a delivery coverage area.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {zones.map((zone) => (
                  <li
                    key={zone.id}
                    className="flex items-start justify-between gap-3 px-5 py-4"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/8 text-brand">
                        <MapPin aria-hidden="true" size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {zone.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {zone.radius_km} km radius
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-muted">
                          {Number(zone.center_latitude).toFixed(4)},{" "}
                          {Number(zone.center_longitude).toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(zone)}
                      aria-label={`Delete ${zone.name}`}
                      title="Delete zone"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-rose-50 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
