"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Spot } from "@/lib/types";
import { INK, ACCENT, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { COMPASS } from "./Glyphs";

// Fix default marker icons (leaflet's asset path breaks in bundlers)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const accentIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "leaflet-marker-accent",
});

L.Marker.prototype.options.icon = defaultIcon;

// Auto-fit bounds when spots change
function FitBounds({ spots }: { spots: Spot[] }) {
  const map = useMap();
  React.useEffect(() => {
    const pts = spots.filter((s) => s.lat != null && s.lng != null);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView([pts[0].lat!, pts[0].lng!], 15);
    } else {
      const bounds = L.latLngBounds(pts.map((s) => [s.lat!, s.lng!]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [spots, map]);
  return null;
}

export default function SpotMap({
  spots,
  center,
  onClose,
}: {
  spots: Spot[];
  center?: { lat: number; lng: number };
  onClose: () => void;
}) {
  const mappable = spots.filter((s) => s.lat != null && s.lng != null);
  const fallback = center ?? (mappable.length > 0
    ? { lat: mappable[0].lat!, lng: mappable[0].lng! }
    : { lat: 9.9816, lng: 76.2999 });

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      flexDirection: "column",
      background: "rgba(26,20,16,0.5)",
      backdropFilter: "blur(4px)",
    }}>
      {/* Header bar */}
      <div style={{
        background: "#B7E4FF",
        borderBottom: `3px solid ${INK}`,
        padding: "12px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 24,
            lineHeight: 1,
            color: INK,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ width: 22, height: 22, display: "inline-block" }}>{COMPASS}</span>
            Spots on map
          </div>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: INK,
            opacity: 0.6,
            marginTop: 4,
          }}>
            {mappable.length} location{mappable.length !== 1 ? "s" : ""} shown
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close map"
          style={{
            appearance: "none",
            width: 40,
            height: 40,
            border: `2.5px solid ${INK}`,
            background: "#fff",
            borderRadius: 999,
            fontSize: 18,
            cursor: "pointer",
            boxShadow: `3px 3px 0 ${INK}`,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &#10005;
        </button>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        {mappable.length === 0 ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontFamily: FONT_DISPLAY,
            fontSize: 22,
            color: INK,
            opacity: 0.5,
          }}>
            No spots with location data
          </div>
        ) : (
          <MapContainer
            center={[fallback.lat, fallback.lng]}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds spots={mappable} />
            {mappable.map((spot) => (
              <Marker
                key={spot.id}
                position={[spot.lat!, spot.lng!]}
                icon={spot.votes > 0 ? accentIcon : defaultIcon}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong style={{ fontSize: 14 }}>{spot.name}</strong>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                      {spot.cuisine.slice(0, 3).join(", ")}
                    </div>
                    {spot.area && (
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                        {spot.area}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: ACCENT,
                      marginTop: 4,
                    }}>
                      {spot.votes} vote{spot.votes !== 1 ? "s" : ""}
                      {spot.distanceM != null && (
                        <span style={{ color: "#666", fontWeight: 500, marginLeft: 6 }}>
                          {spot.distanceM >= 1000
                            ? `${(spot.distanceM / 1000).toFixed(1)} km`
                            : `${Math.round(spot.distanceM)} m`}
                        </span>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
