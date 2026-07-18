"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// 🎨 PREMIUM CLEAN SAAS INTERFACE: Next.js Leaflet Marker Broken Link Fix
// Default Leaflet markers Next.js asset pipeline mein crash ho jatay hain. 
// Is liye hum yahan ek crisp dynamic SVG Marker use kar rahe hain jo pulse animation ke sath ultra-modern lagta hai.
const customRadarIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center">
          <div class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-blue-500 opacity-40"></div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#1d4ed8" stroke="white" stroke-width="1.5"/>
          </svg>
         </div>`,
  className: "custom-radar-marker",
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// ✈️ AUTOMATIC RADAR FLY-TO MODULE
// Jab bhi user coordinates badlega (dropdown se ya search se), map smooth glide karke wahan jump karega
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      // Zoom level 17 bilkul perfect street/house view level hota hai
      map.flyTo([lat, lng], 17, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

interface ClinicMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

export default function ClinicMap({ lat, lng, onPositionChange }: ClinicMapProps) {
  // Default coordinates agar state abhi empty ho (Center of Pakistan)
  const defaultLat = lat || 30.3753;
  const defaultLng = lng || 69.3451;

  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const position = marker.getLatLng();
        onPositionChange(position.lat, position.lng);
      }
    },
  };

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-10">
      <MapContainer
        center={[defaultLat, defaultLng]}
        zoom={lat && lng ? 17 : 5}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* 🌍 GOOGLE MAPS HYBRID ENGINE (SATELLITE + REAL-TIME ROADS & LABELS) */}
        {/* lyrs=y humein accurate satellite imagery + crisp hybrid geographic vectors provide karta hai */}
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={["0", "1", "2", "3"]}
          attribution='&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
          maxZoom={22}
          maxNativeZoom={20}
        />

        {/* Dynamic State Listeners */}
        <MapRecenter lat={lat} lng={lng} />

        {lat && lng && (
          <Marker
            position={[lat, lng]}
            draggable={true}
            eventHandlers={eventHandlers}
            ref={markerRef}
            icon={customRadarIcon}
          />
        )}
      </MapContainer>
    </div>
  );
}
