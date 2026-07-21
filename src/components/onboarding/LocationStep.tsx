"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { getGlobalCountries, getGlobalStates, getGlobalCities } from "@/lib/locations";
import { MapPin, Coins, Loader2, Globe, Building2, Map, Search, Maximize2, X, CheckCircle2, Clock } from "lucide-react";

const ClinicMap = dynamic(() => import("@/components/ClinicMap"), { ssr: false });

export interface LocationState {
  country: string;
  countryIso?: string;
  state: string;
  stateIso?: string;
  city: string;
  address: string;
  postalCode: string;
  latitude: number | string;
  longitude: number | string;
  currency?: string;
  timezone?: string;
}

// Fixed Props to match the page.tsx exact requirements
interface LocationStepProps {
  location: any;
  setLocation: React.Dispatch<React.SetStateAction<any>>;
}

const timezones = [
  "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles",
  "America/Denver", "America/Chicago", "America/New_York", "America/Caracas",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Africa/Cairo",
  "Europe/Moscow", "Asia/Dubai", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka",
  "Asia/Bangkok", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney",
  "Pacific/Noumea", "Pacific/Auckland", "UTC"
];

export default function LocationStep({ location: locationData, setLocation: setLocationData }: LocationStepProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(5); 
  const [mapSearchQuery, setMapSearchQuery] = useState("");

  // 📍 Map Tracking States
  const [tempCoords, setTempCoords] = useState({ lat: Number(locationData.latitude) || 30.3753, lng: Number(locationData.longitude) || 69.3451 });
  const [previewAddress, setPreviewAddress] = useState("");
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  // 🎯 ELON LEVEL FIX: Tracks if location is confirmed AND if card should be completely hidden
  const [isLocationConfirmed, setIsLocationConfirmed] = useState(false);
  const [isCardHidden, setIsCardHidden] = useState(false);

  // Safe Timer Ref to prevent memory leaks
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const countries = useMemo(() => getGlobalCountries(), []);
  const states = useMemo(() => locationData.countryIso ? getGlobalStates(locationData.countryIso) : [], [locationData.countryIso]);
  const cities = useMemo(() => (locationData.countryIso && locationData.stateIso) ? getGlobalCities(locationData.countryIso, locationData.stateIso) : [], [locationData.countryIso, locationData.stateIso]);

  // 🌍 HELPER: Smooth Background Geocoder for Dropdowns & Search
  const smoothMapFlight = async (query: string, targetZoom: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data?.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setMapZoom(targetZoom);
        setTempCoords({ lat, lng }); 
        resetConfirmationState();
      }
    } catch (error) {
      console.error("Flight Geocode error:", error);
    }
  };

  const resetConfirmationState = () => {
    setIsLocationConfirmed(false);
    setIsCardHidden(false);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const countryObj = countries.find((c) => c.isoCode === selectedIso);
    setLocationData({ ...locationData, country: countryObj ? countryObj.name : "", countryIso: selectedIso, currency: countryObj ? countryObj.currency : "", state: "", stateIso: "", city: "", address: "", postalCode: "" });
    if (countryObj) smoothMapFlight(countryObj.name, 5); 
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const stateObj = states.find((s) => s.isoCode === selectedIso);
    setLocationData({ ...locationData, state: stateObj ? stateObj.name : "", stateIso: selectedIso, city: "", address: "", postalCode: "" });
    if (stateObj) smoothMapFlight(`${stateObj.name}, ${locationData.country}`, 8); 
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value;
    setLocationData({ ...locationData, city: cityName, address: "", postalCode: "" });
    if (cityName) smoothMapFlight(`${cityName}, ${locationData.state}, ${locationData.country}`, 12); 
  };

  const executeSearch = async (searchQuery: string, zoomLvl: number) => {
    if (!searchQuery.trim()) return;
    setIsFetchingAddress(true);
    resetConfirmationState(); // Show card again if user is searching
    try {
      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const nominatimData = await nominatimRes.json();
      if (nominatimData?.length > 0) {
        const lat = parseFloat(nominatimData[0].lat);
        const lng = parseFloat(nominatimData[0].lon);
        setMapZoom(zoomLvl); 
        setTempCoords({ lat, lng });
        setPreviewAddress(nominatimData[0].name || nominatimData[0].display_name.split(",")[0]);
      } else {
        alert("Location not found. Try adding more details.");
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const handleFormSearchLocation = () => {
    if (!locationData.country || !locationData.city || !locationData.address) {
      alert("Please select City and enter a Street Address first.");
      return;
    }
    executeSearch(`${locationData.address}, ${locationData.city}, ${locationData.country}`, 15);
  };

  const handleMapDirectSearch = () => {
    executeSearch(`${mapSearchQuery}, ${locationData.city || ''}, ${locationData.country || ''}`.trim(), 15);
  };

  // -----------------------------------------------------------------
  // 📍 UBER STYLE DRAG & DROP LOGIC
  // -----------------------------------------------------------------
  const handleMapDragEnd = async (lat: number, lng: number) => {
    setIsMapMoving(false);
    setIsFetchingAddress(true);
    setTempCoords({ lat, lng });

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data?.address) {
        const addr = data.address;
        let exactStreet = addr.amenity || addr.shop || addr.building || addr.road || addr.neighbourhood || addr.suburb || addr.residential;
        if (!exactStreet && data.display_name) exactStreet = data.display_name.split(",")[0]; 
        const shortAddress = exactStreet ? `${exactStreet}, ${addr.city || addr.town || addr.village || addr.county || ''}`.replace(/,\s*$/, '') : data.display_name;
        setPreviewAddress(shortAddress);
      }
    } catch (err) {
      console.error("Reverse Geocoding failed:", err);
      setPreviewAddress("Coordinates selected");
    } finally {
      setIsFetchingAddress(false);
    }
  };

  // -----------------------------------------------------------------
  // ✅ CONFIRM ACTION (WITH AUTO HIDE LOGIC)
  // -----------------------------------------------------------------
  const handleConfirmLocation = () => {
    setLocationData((prev: any) => ({
      ...prev,
      latitude: tempCoords.lat,
      longitude: tempCoords.lng,
      address: previewAddress !== "Fetching address..." && previewAddress !== "Coordinates selected" 
        ? previewAddress 
        : prev.address
    }));

    // 1. Show the Green Success State Instantly
    setIsLocationConfirmed(true); 

    // 2. Clear any existing timer
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    // 3. Auto Hide the completely card after 1.2 seconds
    hideTimerRef.current = setTimeout(() => {
      setIsCardHidden(true); // Triggers the CSS transform to slide it down and fade out
      if (isFullscreen) setIsFullscreen(false);
    }, 1200);
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
            <select value={locationData.countryIso || ""} onChange={handleCountryChange} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50">
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
            <select value={locationData.stateIso || ""} onChange={handleStateChange} disabled={!locationData.countryIso} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100">
              <option value="">Select State...</option>
              {states.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">City / Zone</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={locationData.city || ""} onChange={handleCityChange} disabled={!locationData.stateIso} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100">
              <option value="">Select City...</option>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        <div className="md:col-span-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address</label>
          <input 
            type="text" 
            placeholder="e.g. Behram Medical Center" 
            value={locationData.address || ""} 
            onChange={(e) => setLocationData({ ...locationData, address: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zip Code</label>
          <input 
            type="text" 
            placeholder="e.g. 26000" 
            value={locationData.postalCode || ""} 
            onChange={(e) => setLocationData({ ...locationData, postalCode: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Time Zone</label>
          <div className="relative">
            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={locationData.timezone || "Asia/Karachi"} 
              onChange={(e) => setLocationData({ ...locationData, timezone: e.target.value })}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
            >
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <button 
            onClick={handleFormSearchLocation} 
            disabled={isFetchingAddress || !locationData.address}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingAddress ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Find
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
            <MapPin className="w-5 h-5 text-primary-600" /> Exact Location Radar
          </label>
          <div className="flex items-center gap-4">
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

        {!locationData.countryIso ? (
           <div className="w-full h-[400px] rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
              <Globe className="w-10 h-10 mb-2 opacity-50" />
              <p className="font-medium">Select Country & City to activate Radar</p>
           </div>
        ) : (
           <div className={isFullscreen 
              ? "fixed inset-0 z-[9999] bg-gray-100 flex flex-col" 
              : "w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner relative z-10"}
           >
              {isFullscreen && (
                <div className="absolute top-4 left-4 right-4 md:top-6 md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-[10000] flex gap-3 items-center pointer-events-none">
                  <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1.5 flex items-center pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-primary-500">
                    <div className="pl-3 pr-2"><Search className="w-5 h-5 text-gray-400" /></div>
                    <input 
                      type="text" 
                      placeholder="Search clinics, streets, or landmarks..." 
                      className="flex-1 w-full bg-transparent border-none outline-none text-sm font-medium py-2.5 text-gray-900"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMapDirectSearch()}
                    />
                    <button onClick={handleMapDirectSearch} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-2">
                      Find
                    </button>
                  </div>
                  <button onClick={() => setIsFullscreen(false)} className="bg-white text-gray-700 shadow-2xl border border-gray-100 p-3.5 rounded-2xl hover:bg-gray-50 flex gap-2 items-center font-bold pointer-events-auto transition-transform active:scale-95">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="flex-1 h-full w-full relative overflow-hidden">
                <ClinicMap 
                  lat={tempCoords.lat} 
                  lng={tempCoords.lng} 
                  zoomLevel={mapZoom}
                  isFullscreen={isFullscreen} 
                  onZoomChange={(newZoom) => setMapZoom(newZoom)} 
                  onMoveStart={() => {
                    setIsMapMoving(true);
                    resetConfirmationState(); // 👈 MAP TOUCH HOTE HI CARD WAPAS AYEGA
                  }}
                  onMoveEnd={handleMapDragEnd} 
                />

                {/* 📍 CENTER PIN */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] pointer-events-none flex flex-col items-center">
                  <div className={`transition-transform duration-200 ${isMapMoving ? '-translate-y-3' : 'translate-y-0'}`}>
                    <div className="relative flex items-center justify-center">
                       {!isMapMoving && <div className={`animate-ping absolute inline-flex h-10 w-10 rounded-full opacity-30 ${isLocationConfirmed ? 'bg-green-500' : 'bg-primary-500'}`}></div>}
                       <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill={isLocationConfirmed ? "#16a34a" : "#1d4ed8"} stroke="white" strokeWidth="1.5"/>
                       </svg>
                    </div>
                  </div>
                  <div className={`w-3 h-1.5 bg-black/30 rounded-[100%] blur-[2px] transition-all duration-200 ${isMapMoving ? 'scale-75 opacity-40 mt-3' : 'scale-100 opacity-80 -mt-1'}`}></div>
                </div>

                {/* ✅ BOTTOM ACTION CARD (NOW WITH COMPLETE AUTO-HIDE LOGIC) */}
                <div 
                  className={`absolute left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[500px] z-[1000] bg-white rounded-2xl shadow-2xl border transition-all duration-500 ease-in-out overflow-hidden
                  ${isCardHidden ? '-bottom-32 opacity-0 pointer-events-none scale-95' : 'bottom-4 opacity-100 scale-100'}
                  ${isLocationConfirmed ? 'border-green-400 p-3' : 'border-gray-100 p-4'}`}
                >
                  <div className="flex items-center gap-3 px-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${isLocationConfirmed ? 'bg-green-100 text-green-600' : 'bg-primary-50 text-primary-600'}`}>
                      {isFetchingAddress || isMapMoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isLocationConfirmed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 transition-colors duration-300 ${isLocationConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                        {isLocationConfirmed ? "Location Confirmed ✅" : "Map Center Address"}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {isMapMoving ? "Move map to set location..." : isFetchingAddress ? "Fetching address..." : (previewAddress || "Point selected on map")}
                      </p>
                    </div>
                  </div>

                  {/* The button itself smoothly compresses */}
                  <div className={`grid transition-all duration-300 ease-in-out ${isLocationConfirmed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100 mt-3'}`}>
                    <div className="overflow-hidden">
                      <button 
                        onClick={handleConfirmLocation}
                        disabled={isMapMoving || isFetchingAddress}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Confirm Location
                      </button>
                    </div>
                  </div>
                </div>

              </div>
           </div>
        )}
      </div>
    </div>
  );
}
