"use client";

import { useState, useMemo } from "react";
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
  // 🎯 100% FREE PRECISE ON-BLUR GEOCODING (No API Key Required)
  // -----------------------------------------------------------------
  const fetchExactCoordinates = async () => {
    // Agar address ya city khali hai toh fetch mat karo
    if (!locationData.streetAddress || !locationData.zone) return;

    setIsGeocoding(true);

    // Poora query banayen: "Behram Medical Center, Kohat, Khyber Pakhtunkhwa, Pakistan"
    const fullAddressQuery = `${locationData.streetAddress}, ${locationData.zone}, ${locationData.province}, ${locationData.country}`;
    const encodedQuery = encodeURIComponent(fullAddressQuery);

    try {
      // OpenStreetMap Free Engine for HD Tracking
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        // Exact location mil gayi
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        setLocationData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));
      } else {
        console.log("Street specific match missed, using general city area fallback.");
      }
    } catch (err) {
      console.error("Geocoding radar failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

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
              onBlur={fetchExactCoordinates} // 🚀 CITY CHOOSE KARKE BHI TRIGGGER KAREGA
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
            onBlur={fetchExactCoordinates} // 🔥 MAIN MAGIC: ADDRESS LIKH KAR BAHAR TAP KARO, MAP FLY KAREGA!
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
            onBlur={fetchExactCoordinates} // ⚡ ZIP CODE LIKH KAR HATOGE TAB BHI JUMP KAREGA
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
