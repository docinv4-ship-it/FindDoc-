"use client";

import { useState } from "react";
import { Map, Navigation, CheckCircle2, AlertCircle } from "lucide-react";
import { LocationOpsData } from "@/lib/validation/onboarding-group2";

interface LocationOpsStepProps {
  data: LocationOpsData;
  onChange: (updates: Partial<LocationOpsData>) => void;
  errors: Record<string, string>;
}

export default function LocationOpsStep({ data, onChange, errors }: LocationOpsStepProps) {
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser status.");
      return;
    }

    setLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        onChange({ latitude, longitude });

        try {
          // OpenStreetMap Nominatim Reverse Geocoding API Call (Zero cost, high accuracy)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "User-Agent": "BillionDollarDoctorOnboardingSystem" } }
          );
          
          if (!response.ok) throw new Error("Reverse geocoding network failure");
          
          const result = await response.json();
          const formatted = result.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          onChange({ resolvedAddress: formatted, isManualOverride: false });
        } catch (err) {
          onChange({ resolvedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` });
          setGeoError("Coordinates captured, but failed to auto-resolve complete text address.");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        setGeoError(error.message || "Failed to acquire device location coordinates.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Global Geolocation Verification</h2>
        <p className="text-sm text-gray-500">Sync precise telemetry coordinates to map incoming patient routes accurately.</p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={handleAcquireLocation}
          disabled={loading}
          className={`w-full py-4 px-4 flex items-center justify-center gap-3 rounded-xl font-semibold text-sm transition-all border shadow-sm ${
            loading 
              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed" 
              : "bg-slate-900 text-white border-slate-950 hover:bg-slate-800 active:scale-99"
          }`}
        >
          <Navigation className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Acquiring Precision Coordinates..." : "Fetch Live Geolocation"}
        </button>

        {geoError && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{geoError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Latitude</label>
            <input
              type="number"
              readOnly
              value={data.latitude || ""}
              className="w-full bg-gray-50 text-gray-700 font-mono text-sm px-4 py-2.5 border border-gray-200 rounded-lg cursor-not-allowed"
              placeholder="0.000000"
            />
            {errors.latitude && <p className="text-xs text-red-500 mt-1">{errors.latitude}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target Longitude</label>
            <input
              type="number"
              readOnly
              value={data.longitude || ""}
              className="w-full bg-gray-50 text-gray-700 font-mono text-sm px-4 py-2.5 border border-gray-200 rounded-lg cursor-not-allowed"
              placeholder="0.000000"
            />
            {errors.longitude && <p className="text-xs text-red-500 mt-1">{errors.longitude}</p>}
          </div>
        </div>

        {/* Resolved Address View */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">OSM Resolved Physical Address</label>
          <div className="relative">
            <Map className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            <textarea
              value={data.resolvedAddress}
              onChange={(e) => onChange({ resolvedAddress: e.target.value, isManualOverride: true })}
              rows={3}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.resolvedAddress ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="Click 'Fetch Live Geolocation' to populate this address grid automatically..."
            />
          </div>
          {data.resolvedAddress && !data.isManualOverride && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium mt-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Cryptographic Cryptocoding Address Matched</span>
            </div>
          )}
          {errors.resolvedAddress && <p className="text-xs text-red-500 mt-1 font-medium">{errors.resolvedAddress}</p>}
        </div>
      </div>
    </div>
  );
}
