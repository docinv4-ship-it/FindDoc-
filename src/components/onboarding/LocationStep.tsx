"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { getGlobalCountries, getGlobalStates, getGlobalCities } from "@/lib/locations";
import { MapPin, Coins, Loader2, Globe, Building2, Map, Search, Maximize2, X } from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false); // 📱 Fullscreen Mode State

  const countries = useMemo(() => getGlobalCountries(), []);
  const states = useMemo(() => locationData.countryIso ? getGlobalStates(locationData.countryIso) : [], [locationData.countryIso]);
  const cities = useMemo(() => (locationData.countryIso && locationData.provinceIso) ? getGlobalCities(locationData.countryIso, locationData.provinceIso) : [], [locationData.countryIso, locationData.provinceIso]);

  // -----------------------------------------------------------------
  // 🔍 FORWARD GEOCODING (Search Button -> Pin Drop)
  // -----------------------------------------------------------------
  const handleSearchLocation = async () => {
    if (!locationData.country || !locationData.zone || !locationData.streetAddress) {
      alert("Please select City and enter a Street Address first.");
      return;
    }

    setIsGeocoding(true);
    const fullAddressQuery = `${locationData.streetAddress}, ${locationData.zone}, ${locationData.province}, ${locationData.country}`;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddressQuery)}&limit=1`);
      const data = await response.json();

      if (data && data.length > 0) {
        setLocationData((prev) => ({
          ...prev,
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        }));
      } else {
        alert("Exact street not found. Please try zooming and clicking on the map manually.");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // -----------------------------------------------------------------
  // 📍 REVERSE GEOCODING (Map Click -> Form Auto Fill)
  // -----------------------------------------------------------------
  const handleMapTap = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      // Set pin instantly for good UX
      setLocationData((prev) => ({ ...prev, latitude: lat, longitude: lng }));

      // Fetch Address data
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();

      if (data && data.address) {
        const address = data.address;
        // Construct the best possible street address from reverse geocoding
        const newStreet = address.road || address.neighbourhood || address.suburb || address.village || locationData.streetAddress;
        const newZip = address.postcode || locationData.zipCode;
        
        setLocationData((prev) => ({
          ...prev,
          streetAddress: newStreet,
          zipCode: newZip,
          // Ensure City and State lock to map's data if available (optional, but good for accuracy)
        }));
      }
    } catch (err) {
      console.error("Reverse Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Clean State Handlers (Zero-State lock logic)
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const countryObj = countries.find((c) => c.isoCode === selectedIso);
    setLocationData({
      ...locationData,
      country: countryObj ? countryObj.name : "",
      countryIso: selectedIso,
      currency: countryObj ? countryObj.currency : "",
      province: "", provinceIso: "", zone: "", streetAddress: "", latitude: 0, longitude: 0 // Reset everything
    });
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const stateObj = states.find((s) => s.isoCode === selectedIso);
    setLocationData({
      ...locationData,
      province: stateObj ? stateObj.name : "",
      provinceIso: selectedIso,
      zone: "", streetAddress: "", latitude: 0, longitude: 0
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6 relative">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-600" /> Clinic Location & Accuracy Radar
        </h2>
        <p className="text-gray-500 text-sm">Select your details manually or pinpoint exactly on the map.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country</label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={locationData.countryIso} onChange={handleCountryChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50">
              <option value="">Select a Country...</option>
              {countries.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Billing Currency</label>
          <div className="relative">
            <Coins className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input readOnly type="text" value={locationData.currency ? `${locationData.currency} (Auto-Locked)` : "Select Country First"} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 cursor-not-allowed" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">State / Province</label>
          <div className="relative">
            <Map className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={locationData.provinceIso} onChange={handleStateChange} disabled={!locationData.countryIso} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100">
              <option value="">Select State...</option>
              {states.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / Zone</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={locationData.zone} onChange={(e) => setLocationData({ ...locationData, zone: e.target.value })} disabled={!locationData.provinceIso} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100">
              <option value="">Select City...</option>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Street Address & Search Button (NO MORE ON-BLUR) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        <div className="md:col-span-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address</label>
          <input 
            type="text" 
            placeholder="e.g. Near Cadet College" 
            value={locationData.streetAddress} 
            onChange={(e) => setLocationData({ ...locationData, streetAddress: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zip Code</label>
          <input 
            type="text" 
            placeholder="e.g. 26000" 
            value={locationData.zipCode} 
            onChange={(e) => setLocationData({ ...locationData, zipCode: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:col-span-3">
          {/* 🔥 EXPLICIT SEARCH BUTTON */}
          <button 
            onClick={handleSearchLocation} 
            disabled={isGeocoding || !locationData.streetAddress}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeocoding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Find on Map
          </button>
        </div>
      </div>

      {/* Map Radar Layout - Zero State Protected */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
            <MapPin className="w-5 h-5 text-primary-600" /> Exact Location Radar
          </label>
          <div className="flex items-center gap-4">
             {isGeocoding && (
                <span className="text-[12px] text-primary-600 flex items-center gap-1.5 font-bold bg-primary-50 px-3 py-1 rounded-full animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing Coordinates...
                </span>
             )}
             {/* 📺 FULL SCREEN EXPAND BUTTON */}
             {locationData.countryIso && (
                <button 
                  onClick={() => setIsFullscreen(true)}
                  className="text-xs bg-primary-50 text-primary-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary-100 transition"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Expand Map
                </button>
             )}
          </div>
        </div>

        {/* Dynamic Wrapper: Normal View vs Fullscreen View */}
        {!locationData.countryIso ? (
           <div className="w-full h-[400px] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
              <Globe className="w-10 h-10 mb-2 opacity-50" />
              <p className="font-medium">Select Country & City to activate Radar</p>
           </div>
        ) : (
           <div className={isFullscreen 
              ? "fixed inset-0 z-[9999] bg-white flex flex-col p-4 md:p-8 shadow-2xl" 
              : "w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-10"}
           >
              {/* Fullscreen Header */}
              {isFullscreen && (
                <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div>
                    <h3 className="font-bold text-lg">Select Exact Location</h3>
                    <p className="text-sm text-gray-500">Tap anywhere on the map to drop the pin and auto-fill address.</p>
                  </div>
                  <button onClick={() => setIsFullscreen(false)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 flex gap-2 items-center font-bold">
                    <X className="w-5 h-5" /> Close Map
                  </button>
                </div>
              )}
              
              <div className="flex-1 rounded-xl overflow-hidden">
                <ClinicMap 
                  lat={locationData.latitude} 
                  lng={locationData.longitude} 
                  onPositionChange={(newLat, newLng) => setLocationData(prev => ({ ...prev, latitude: newLat, longitude: newLng }))} 
                  onMapClick={handleMapTap} 
                />
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
