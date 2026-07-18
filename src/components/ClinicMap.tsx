"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Bulletproof Production Marker Fix for Next.js SSR/Builds
const defaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ClinicMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function ClinicMap({ lat, lng, onPositionChange }: ClinicMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Phase 1: Initialize Map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 18); // Default to building zoom level

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      markerRef.current = L.marker([lat, lng], { icon: defaultIcon, draggable: true })
        .addTo(mapRef.current)
        .on("dragend", (event) => {
          const marker = event.target;
          const position = marker.getLatLng();
          onPositionChange(position.lat, position.lng);
        });
    } else {
      // Phase 2: Handle Updates Smartly
      const currentMarkerLatLng = markerRef.current ? markerRef.current.getLatLng() : null;
      
      // Map view sirf tab fly karega jab external call (Search API) se lat/lng badla ho
      if (!currentMarkerLatLng || currentMarkerLatLng.lat !== lat || currentMarkerLatLng.lng !== lng) {
        mapRef.current.setView([lat, lng], 18); // Force Deep Zoom Level 18 for Exact Pinpoint accuracy
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        }
      }
    }

    // Phase 3: Cleanup memory links on unmount
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        } catch (e) {
          console.error("Map cleanup error:", e);
        }
      }
    };
  }, [lat, lng, onPositionChange]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-[350px] z-0" />
      <div className="bg-amber-50 px-4 py-2.5 text-xs text-amber-800 border-t border-amber-100 flex items-center font-medium gap-2">
        <span>💡 <strong>Exact Setup:</strong> Agar coordinate thoda aage peeche ho, toh marker ko pakad kar exact apni shop/clinic building ke upar drop kar dein.</span>
      </div>
    </div>
  );
}
