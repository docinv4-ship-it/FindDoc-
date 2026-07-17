"use client";

import { useId } from "react";
import { MapPin } from "lucide-react";
import { LocationData } from "@/lib/validation/onboarding-group1";

interface LocationStepProps {
  data: LocationData;
  onChange: (updates: Partial<LocationData>) => void;
  errors: Record<string, string>;
}

export default function LocationStep({ data, onChange, errors }: LocationStepProps) {
  const countryId = useId();
  const stateId = useId();
  const cityId = useId();
  const zipId = useId();
  const addrId = useId();
  const latId = useId();
  const lonId = useId();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Clinic Location</h2>
        <p className="text-sm text-gray-500">Provide the geographic address coordinates for patients to navigate.</p>
      </div>

      <div className="space-y-4">
        {/* Country & State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={countryId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Country
            </label>
            <input
              id={countryId}
              type="text"
              value={data.country}
              onChange={(e) => onChange({ country: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.country ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="United States"
            />
            {errors.country && <p className="text-xs text-red-500 mt-1 font-medium">{errors.country}</p>}
          </div>

          <div>
            <label htmlFor={stateId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              State / Province
            </label>
            <input
              id={stateId}
              type="text"
              value={data.state}
              onChange={(e) => onChange({ state: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.state ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="California"
            />
            {errors.state && <p className="text-xs text-red-500 mt-1 font-medium">{errors.state}</p>}
          </div>
        </div>

        {/* City & Postal Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={cityId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              City
            </label>
            <input
              id={cityId}
              type="text"
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.city ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="Los Angeles"
            />
            {errors.city && <p className="text-xs text-red-500 mt-1 font-medium">{errors.city}</p>}
          </div>

          <div>
            <label htmlFor={zipId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Postal / ZIP Code
            </label>
            <input
              id={zipId}
              type="text"
              value={data.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.postalCode ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="90001"
            />
            {errors.postalCode && <p className="text-xs text-red-500 mt-1 font-medium">{errors.postalCode}</p>}
          </div>
        </div>

        {/* Street Address */}
        <div>
          <label htmlFor={addrId} className="block text-sm font-semibold text-gray-700 mb-1.5">
            Street Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
            <textarea
              id={addrId}
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              rows={2}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.address ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="123 Main Street, Suite 100"
            />
          </div>
          {errors.address && <p className="text-xs text-red-500 mt-1 font-medium">{errors.address}</p>}
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor={latId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Latitude <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <input
              id={latId}
              type="text"
              value={data.latitude}
              onChange={(e) => onChange({ latitude: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.latitude ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="34.0522"
            />
            {errors.latitude && <p className="text-xs text-red-500 mt-1 font-medium">{errors.latitude}</p>}
          </div>

          <div>
            <label htmlFor={lonId} className="block text-sm font-semibold text-gray-700 mb-1.5">
              Longitude <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <input
              id={lonId}
              type="text"
              value={data.longitude}
              onChange={(e) => onChange({ longitude: e.target.value })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.longitude ? "border-red-500 focus:ring-red-200" : "border-gray-200 focus:ring-primary-500"
              }`}
              placeholder="-118.2437"
            />
            {errors.longitude && <p className="text-xs text-red-500 mt-1 font-medium">{errors.longitude}</p>}
          </div>
        </div>

        <div className="p-3 bg-gray-50 rounded-lg border border-gray-150">
          <p className="text-xs text-gray-500 leading-relaxed">
            💡 <strong>Pro Tip:</strong> Google Maps par direct location search karein, location pin par right-click karein, aur coordinates copy karke yahan paste karein. Is se dynamic route searches performant ho jati hain.
          </p>
        </div>
      </div>
    </div>
  );
}
