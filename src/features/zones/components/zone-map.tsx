"use client";

import { Fragment, useEffect } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
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

const zoneIcon = L.divIcon({
  className: "zone-map-marker",
  html: '<span class="zone-map-marker__dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapClickHandler({
  onLocationSelect,
  enabled,
}: {
  onLocationSelect: (location: Coordinates) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onLocationSelect({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    },
  });

  return null;
}

function FitZones({ zones }: { zones: DeliveryZone[] }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (zones.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(
      zones.map((zone) => [zone.center_latitude, zone.center_longitude]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
  }, [map, zones]);

  return null;
}

export function ZoneMap({
  zones,
  selectedLocation,
  onLocationSelect,
  canSelectLocation = false,
}: ZoneMapProps) {
  return (
    <MapContainer
      center={[51.505, -0.09]}
      zoom={canSelectLocation ? 5 : 4}
      scrollWheelZoom
      className={`h-full min-h-[360px] w-full ${canSelectLocation ? "cursor-crosshair" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler
        enabled={canSelectLocation}
        onLocationSelect={onLocationSelect}
      />
      <FitZones zones={zones} />
      {zones.map((zone) => (
        <Fragment key={zone.id}>
          <Marker
            key={`${zone.id}-marker`}
            position={[zone.center_latitude, zone.center_longitude]}
            icon={zoneIcon}
            title={zone.name}
          />
          <Circle
            key={`${zone.id}-circle`}
            center={[zone.center_latitude, zone.center_longitude]}
            radius={zone.radius_km * 1000}
            pathOptions={{
              color: "#286457",
              fillColor: "#83aa91",
              fillOpacity: 0.12,
              weight: 2,
            }}
          />
        </Fragment>
      ))}
      {selectedLocation ? (
        <Marker
          position={[selectedLocation.latitude, selectedLocation.longitude]}
          icon={zoneIcon}
          title="Selected zone center"
        />
      ) : null}
    </MapContainer>
  );
}
