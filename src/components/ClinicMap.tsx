"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ✈️ AUTOMATIC RADAR FLY-TO MODULE (EXTREME HD ZOOM)
function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    // Sirf tab fly kare jab actual coordinates hon (Zero-state pe nahi)
    if (lat !== 0 && lng !== 0) {
      map.flyTo([lat, lng], 20, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

// 🎯 CLICK HANDLER: Map par tap karne se coordinates parent ko bhejna
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ClinicMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void; // New prop for Tap-to-pin
}

export default function ClinicMap({ lat, lng, onPositionChange, onMapClick }: ClinicMapProps) {
  const [leafletInstance, setLeafletInstance] = useState<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        setLeafletInstance(L);
      });
    }
  }, []);

  // Default view setting (Zero State)
  const defaultLat = lat || 30.3753; // Default Pakistan Center if 0
  const defaultLng = lng || 69.3451;

  if (!leafletInstance) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-2xl bg-gray-100 flex items-center justify-center text-sm text-gray-400 font-medium animate-pulse">
        Deploying Satellite Grid...
      </div>
    );
  }

  // 🎨 PREMIUM DYNAMIC HD MARKER
  const customRadarIcon = leafletInstance.divIcon({
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

  const dragEndHandler = () => {
    const marker = markerRef.current;
    if (marker != null) {
      const position = marker.getLatLng();
      onPositionChange(position.lat, position.lng);
      // Agar drag ke baad bhi reverse geocode karwana ho to:
      if (onMapClick) onMapClick(position.lat, position.lng);
    }
  };

  return (
    <MapContainer
      key={`${defaultLat}-${defaultLng}-init`}
      center={[defaultLat, defaultLng]}
      zoom={lat !== 0 && lng !== 0 ? 20 : 5} // Zoom in only if real coordinates exist
      maxZoom={22}
      scrollWheelZoom={true}
      className="w-full h-full min-h-[400px] z-10"
    >
      <TileLayer
        url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        attribution='&copy; <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>'
        maxZoom={22}
        maxNativeZoom={20}
      />

      <MapRecenter lat={lat} lng={lng} />
      
      {/* 🟢 Inject Map Click Handler */}
      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      {/* Show marker ONLY if latitude and longitude are explicitly set */}
      {lat !== 0 && lng !== 0 && (
        <Marker
          position={[lat, lng]}
          draggable={true}
          eventHandlers={{ dragend: dragEndHandler }}
          ref={markerRef}
          icon={customRadarIcon}
        />
      )}
    </MapContainer>
  );
}
