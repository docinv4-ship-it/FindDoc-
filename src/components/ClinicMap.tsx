"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ✈️ AUTOMATIC FLY-TO (Sirf tab chalega jab Parent Component bahar se API Search/Dropdown change kare)
function MapRecenter({ lat, lng, zoomLevel }: { lat: number; lng: number, zoomLevel: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      const currentCenter = map.getCenter();
      const distance = map.distance(currentCenter, L.latLng(lat, lng));
      
      // ✅ Agar user ne drop-down ya search use ki hai (to distance bara hoga)
      if (distance > 50 || map.getZoom() !== zoomLevel) {
        map.flyTo([lat, lng], zoomLevel, { animate: true, duration: 1.5, easeLinearity: 0.25 });
      }
    }
  }, [lat, lng, zoomLevel, map]);
  return null;
}

// 📐 SIZE FIX: Fullscreen mode toggle hone par map ko resize karna (Grey Map Bug Fix)
function MapSizeListener({ isFullscreen }: { isFullscreen?: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timeout);
  }, [isFullscreen, map]);
  return null;
}

// 🎯 EVENT TRACKER: Tracks Map Dragging for Center Pin System
function MapEventsTracker({ 
  onMoveStart, 
  onMoveEnd, 
  onZoomChange 
}: { 
  onMoveStart?: () => void, 
  onMoveEnd?: (lat: number, lng: number) => void, 
  onZoomChange?: (z: number) => void 
}) {
  const map = useMapEvents({
    dragstart: () => {
      if (onMoveStart) onMoveStart(); // Pin uthegi
    },
    moveend: () => {
      const center = map.getCenter();
      if (onMoveEnd) onMoveEnd(center.lat, center.lng); // Reverse Geocode chalega
    },
    zoomend: () => {
      const center = map.getCenter();
      if (onZoomChange) onZoomChange(map.getZoom());
      if (onMoveEnd) onMoveEnd(center.lat, center.lng); // Zoom ke baad bhi address refresh karo
    }
  });
  return null;
}

interface ClinicMapProps {
  lat: number;
  lng: number;
  zoomLevel: number; 
  isFullscreen?: boolean;
  onMoveStart?: () => void;
  onMoveEnd?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
}

export default function ClinicMap({ 
  lat, 
  lng, 
  zoomLevel, 
  isFullscreen, 
  onMoveStart, 
  onMoveEnd, 
  onZoomChange 
}: ClinicMapProps) {

  // Default view setting
  const defaultLat = lat || 30.3753; 
  const defaultLng = lng || 69.3451;

  return (
    <MapContainer
      key="clinic-map-instance"
      center={[defaultLat, defaultLng]}
      zoom={zoomLevel}
      maxZoom={22}
      scrollWheelZoom={true}
      zoomControl={false} // Removed default zoom control to make UI cleaner
      className="w-full h-full min-h-[400px] z-10 bg-gray-100"
    >
      <TileLayer
        url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        subdomains={["0", "1", "2", "3"]}
        attribution='&copy; Google Maps'
        maxZoom={22}
        maxNativeZoom={20}
      />

      <MapRecenter lat={lat} lng={lng} zoomLevel={zoomLevel} />
      <MapSizeListener isFullscreen={isFullscreen} />
      
      {/* Natively track dragging */}
      <MapEventsTracker 
        onMoveStart={onMoveStart} 
        onMoveEnd={onMoveEnd} 
        onZoomChange={onZoomChange} 
      />

      {/* 🚫 MARKER REMOVED INTENTIONALLY - Replaced by pure CSS Fixed Pin in Parent */}
      
    </MapContainer>
  );
}
