import { ZonesManager } from "@/features/zones/components/zones-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DeliveryZone } from "@/features/zones/types";
import { connection } from "next/server";

export default async function ZonesPage() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("delivery_zones")
    .select(
      "id, user_id, name, center_latitude, center_longitude, radius_km, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const zones: DeliveryZone[] = (data ?? []).map((zone) => ({
    ...zone,
    center_latitude: Number(zone.center_latitude),
    center_longitude: Number(zone.center_longitude),
    radius_km: Number(zone.radius_km),
  }));

  return (
    <ZonesManager
      initialZones={zones}
      initialError={error?.message ?? null}
      userId={user.id}
    />
  );
}
