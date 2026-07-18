"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { getGlobalCountries, getGlobalStates, getGlobalCities } from "@/lib/locations";
import { MapPin, Coins, Loader2, Globe, Building2, Map, Search } from "lucide-react";

const ClinicMap = dynamic(() => import("@/components/ClinicMap"), { ssr: false });

export interface LocationState {
  country: string;
  countryIso: string;
  province: string;
  provinceIso: string;
  zone: string;
  streetAddress: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  currency: string;
}

interface LocationStepProps {
  locationData: LocationState;
  setLocationData: React.Dispatch<React.SetStateAction<LocationState>>;
}

export default function LocationStep({ locationData, setLocationData }: LocationStepProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Load countries
  const countries = useMemo(() => getGlobalCountries(), []);

  // Compute states dynamically
  const states = useMemo(() => {
    return locationData.countryIso ? getGlobalStates(locationData.countryIso) : [];
  }, [locationData.countryIso]);

  // Compute cities dynamically
  const cities = useMemo(() => {
    return (locationData.countryIso && locationData.provinceIso) 
      ? getGlobalCities(locationData.countryIso, locationData.provinceIso) 
      : [];
  }, [locationData.countryIso, locationData.provinceIso]);

  // -----------------------------------------------------------------
  // 🎯 FUTURE-PROOF ENGINE: 100% AUTOMATIC BACKGROUND RADAR SYNC
  // -----------------------------------------------------------------
  useEffect(() => {
    // Build array of text to search dynamically
    const addressParts = [
      locationData.streetAddress,
      locationData.zone,
      locationData.province,
      locationData.country
    ].filter(Boolean);

    if (addressParts.length === 0) return;

    const fullQueryString = addressParts.join(", ");
    const tomtomApiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

    // 800ms debounce layout taake inputs aur dropdowns par smooth request jaye
    const delayDebounceFn = setTimeout(async () => {
      setIsGeocoding(true);

      const url = tomtomApiKey 
        ? `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(fullQueryString)}.json?key=${tomtomApiKey}&countrySet=${locationData.countryIso || "PK"}&limit=1`
        : `/api/geocode?address=${encodeURIComponent(fullQueryString)}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const { lat, lon } = data.results[0].position;
          setLocationData(prev => {
            if (prev.latitude === lat && prev.longitude === lon) return prev;
            return { ...prev, latitude: lat, longitude: lon };
          });
        } else if (data.lat && data.lng) {
          setLocationData(prev => {
            if (prev.latitude === data.lat && prev.longitude === data.lng) return prev;
            return { ...prev, latitude: data.lat, longitude: data.lng };
          });
        }
      } catch (err) {
        console.error("Auto telemetry mapping failed:", err);
      } finally {
        setIsGeocoding(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [
    locationData.streetAddress, 
    locationData.zone, 
    locationData.province, 
    locationData.country, 
    locationData.countryIso,
    setLocationData
  ]);

  // -----------------------------------------------------------------
  // 🟢 CLEAN CORRECTION HANDLERS
  // -----------------------------------------------------------------
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const countryObj = countries.find((c) => c.isoCode === selectedIso);

    if (countryObj) {
      setLocationData({
        ...locationData,
        country: countryObj.name,
        countryIso: countryObj.isoCode,
        currency: countryObj.currency,
        province: "",
        provinceIso: "",
        zone: "",
        streetAddress: "",
      });
    }
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStateIso = e.target.value;
    const stateObj = states.find((s) => s.isoCode === selectedStateIso);

    if (stateObj) {
      setLocationData({
        ...locationData,
        province: stateObj.name,
        provinceIso: stateObj.isoCode,
        zone: "",
        streetAddress: "",
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-600" /> Clinic Location & Currency
        </h2>
        <p className="text-gray-500 text-sm">Select your global location matrix to configure billing and radar systems.</p>
      </div>

      {/* Country & Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={locationData.countryIso} 
              onChange={handleCountryChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
            >
              <option value="">Select a Country...</option>
              {countries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Billing Currency</label>
          <div className="relative">
            <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              readOnly
              type="text"
              value={`${locationData.currency || "PKR"} (Auto-Locked)`} 
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* State & City */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">State / Province</label>
          <div className="relative">
            <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={locationData.provinceIso} 
              onChange={handleStateChange}
              disabled={!locationData.countryIso || states.length === 0}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100"
            >
              <option value="">Select State...</option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / Zone</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={locationData.zone} 
              onChange={(e) => setLocationData({ ...locationData, zone: e.target.value })}
              disabled={!locationData.provinceIso || cities.length === 0}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100"
            >
              <option value="">Select City...</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Street Address & Zip Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address</label>
          <input 
            type="text" 
            placeholder="e.g. Near Cadet College, Main Highway" 
            value={locationData.streetAddress} 
            onChange={(e) => setLocationData({ ...locationData, streetAddress: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zip Code</label>
          <input 
            type="text" 
            placeholder="e.g. 26000" 
            value={locationData.zipCode} 
            onChange={(e) => setLocationData({ ...locationData, zipCode: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Map Radar Layout */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
            <MapPin className="w-5 h-5 text-primary-600" /> Live Target Radar
          </label>
          {isGeocoding && (
            <span className="text-[12px] text-primary-600 flex items-center gap-1.5 font-bold bg-primary-50 px-3 py-1 rounded-full animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Fetching Real-time Map Points...
            </span>
          )}
        </div>
        <ClinicMap 
          lat={locationData.latitude} 
          lng={locationData.longitude} 
          onPositionChange={(newLat, newLng) => {
            setLocationData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
          }} 
        />
      </div>
    </div>
  );
}
