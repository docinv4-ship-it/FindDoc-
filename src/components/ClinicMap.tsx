"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 15);

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
      mapRef.current.setView([lat, lng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [lat, lng, onPositionChange]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-[300px] z-0" />
      <div className="bg-sky-50 px-4 py-2.5 text-xs text-sky-700 border-t border-sky-100 flex items-center font-medium gap-2">
        <span>📍 Tip: You can drag the marker to fine-tune your exact clinic location.</span>
      </div>
    </div>
  );
}
