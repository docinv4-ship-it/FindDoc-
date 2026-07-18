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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(5); 
  const [mapSearchQuery, setMapSearchQuery] = useState(""); // 🚀 Fullscreen Search State

  const countries = useMemo(() => getGlobalCountries(), []);
  const states = useMemo(() => locationData.countryIso ? getGlobalStates(locationData.countryIso) : [], [locationData.countryIso]);
  const cities = useMemo(() => (locationData.countryIso && locationData.provinceIso) ? getGlobalCities(locationData.countryIso, locationData.provinceIso) : [], [locationData.countryIso, locationData.provinceIso]);

  // 🌍 HELPER: Background Geocoder to move map step-by-step smoothly
  const smoothMapFlight = async (query: string, zoomLevel: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data?.length > 0) {
        setMapZoom(zoomLevel);
        setLocationData(prev => ({ 
          ...prev, 
          latitude: parseFloat(data[0].lat), 
          longitude: parseFloat(data[0].lon) 
        }));
      }
    } catch (error) {
      console.error("Flight Geocode error:", error);
    }
  };

  // -----------------------------------------------------------------
  // 🔍 DROPDOWN HANDLERS
  // -----------------------------------------------------------------
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const countryObj = countries.find((c) => c.isoCode === selectedIso);
    
    setLocationData({
      ...locationData,
      country: countryObj ? countryObj.name : "",
      countryIso: selectedIso,
      currency: countryObj ? countryObj.currency : "",
      province: "", provinceIso: "", zone: "", streetAddress: "", zipCode: ""
    });

    if (countryObj) smoothMapFlight(countryObj.name, 5);
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIso = e.target.value;
    const stateObj = states.find((s) => s.isoCode === selectedIso);
    
    setLocationData({
      ...locationData,
      province: stateObj ? stateObj.name : "",
      provinceIso: selectedIso,
      zone: "", streetAddress: "", zipCode: ""
    });

    if (stateObj) smoothMapFlight(`${stateObj.name}, ${locationData.country}`, 7);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityName = e.target.value;
    setLocationData({ ...locationData, zone: cityName, streetAddress: "", zipCode: "" });
    
    if (cityName) smoothMapFlight(`${cityName}, ${locationData.province}, ${locationData.country}`, 13);
  };

  // -----------------------------------------------------------------
  // 🔍 FORM INLINE SEARCH LOGIC
  // -----------------------------------------------------------------
  const handleFormSearchLocation = async () => {
    if (!locationData.country || !locationData.zone || !locationData.streetAddress) {
      alert("Please select City and enter a Street Address first.");
      return;
    }

    setIsGeocoding(true);
    const searchQuery = `${locationData.streetAddress}, ${locationData.zone}, ${locationData.country}`;
    
    try {
      const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=1`);
      const photonData = await photonRes.json();

      if (photonData.features?.length > 0) {
        const [lon, lat] = photonData.features[0].geometry.coordinates;
        setMapZoom(18);
        setLocationData(prev => ({ ...prev, latitude: lat, longitude: lon }));
        setIsGeocoding(false);
        return;
      }

      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const nominatimData = await nominatimRes.json();

      if (nominatimData?.length > 0) {
        setMapZoom(18);
        setLocationData(prev => ({ 
          ...prev, 
          latitude: parseFloat(nominatimData[0].lat), 
          longitude: parseFloat(nominatimData[0].lon) 
        }));
        setIsGeocoding(false);
        return;
      }

      alert("Exact building not found. Please tap your location manually on the map.");
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // -----------------------------------------------------------------
  // 🚀 FULLSCREEN MAP SEARCH LOGIC (NEW)
  // -----------------------------------------------------------------
  const handleMapDirectSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setIsGeocoding(true);
    try {
      const contextQuery = `${mapSearchQuery}, ${locationData.zone || ''}, ${locationData.country || ''}`.trim();
      const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(contextQuery)}&limit=1`);
      const nominatimData = await nominatimRes.json();

      if (nominatimData?.length > 0) {
        const lat = parseFloat(nominatimData[0].lat);
        const lon = parseFloat(nominatimData[0].lon);
        
        setMapZoom(18);
        setLocationData(prev => ({ 
          ...prev, 
          latitude: lat, 
          longitude: lon,
          // Background address update
          streetAddress: nominatimData[0].name || prev.streetAddress
        }));
      } else {
        alert("Location not found. Try adding more details.");
      }
    } catch (err) {
      console.error("Direct Search failed:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // -----------------------------------------------------------------
  // 📍 REVERSE GEOCODING (Map Tap -> Smart Auto Fill)
  // -----------------------------------------------------------------
  const handleMapTap = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      setMapZoom(18);
      setLocationData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();

      if (data?.address) {
        const addr = data.address;
        let exactStreet = addr.amenity || addr.shop || addr.building || addr.road || addr.neighbourhood || addr.suburb || addr.residential;
        
        if (!exactStreet && data.display_name) {
          exactStreet = data.display_name.split(",")[0]; 
        }

        setLocationData((prev) => ({
          ...prev,
          streetAddress: exactStreet || prev.streetAddress,
          zipCode: addr.postcode || prev.zipCode
        }));
      }
    } catch (err) {
      console.error("Reverse Geocoding failed:", err);
    } finally {
      setIsGeocoding(false);
    }
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
            <select value={locationData.zone} onChange={handleCityChange} disabled={!locationData.provinceIso} className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 bg-gray-50/50 disabled:bg-gray-100">
              <option value="">Select City...</option>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        <div className="md:col-span-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address</label>
          <input 
            type="text" 
            placeholder="e.g. Behram Medical Center" 
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
          <button 
            onClick={handleFormSearchLocation} 
            disabled={isGeocoding || !locationData.streetAddress}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeocoding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Find on Map
          </button>
        </div>
      </div>

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
                  
                  {/* 🚀 Floating Search Bar (Google Maps Style) */}
                  <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1.5 flex items-center pointer-events-auto transition-all focus-within:ring-2 focus-within:ring-primary-500">
                    <div className="pl-3 pr-2">
                      {isGeocoding ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin" /> : <Search className="w-5 h-5 text-gray-400" />}
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search clinics, streets, or landmarks..." 
                      className="flex-1 w-full bg-transparent border-none outline-none text-sm font-medium py-2.5 text-gray-900"
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMapDirectSearch()}
                    />
                    <button 
                      onClick={handleMapDirectSearch}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors ml-2"
                    >
                      Find
                    </button>
                  </div>

                  {/* ❌ Close Button */}
                  <button 
                    onClick={() => setIsFullscreen(false)} 
                    className="bg-white text-gray-700 shadow-2xl border border-gray-100 p-3.5 rounded-2xl hover:bg-gray-50 flex gap-2 items-center font-bold pointer-events-auto transition-transform active:scale-95"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <div className="flex-1 h-full w-full">
                <ClinicMap 
                  lat={locationData.latitude} 
                  lng={locationData.longitude} 
                  zoomLevel={mapZoom}
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
