import type { DeliveryZone } from "@/features/zones/types";

const EARTH_RADIUS_KM = 6371.0088;

export function distanceBetweenCoordinatesKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle =
    2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, haversine))));

  return EARTH_RADIUS_KM * centralAngle;
}

export function findNearestCoveringZone(
  latitude: number,
  longitude: number,
  zones: DeliveryZone[],
) {
  return zones
    .map((zone) => ({
      zone,
      distanceKm: distanceBetweenCoordinatesKm(
        latitude,
        longitude,
        zone.center_latitude,
        zone.center_longitude,
      ),
    }))
    .filter(({ zone, distanceKm }) => distanceKm <= zone.radius_km)
    .sort(
      (a, b) =>
        a.distanceKm - b.distanceKm || a.zone.id.localeCompare(b.zone.id),
    )[0];
}
