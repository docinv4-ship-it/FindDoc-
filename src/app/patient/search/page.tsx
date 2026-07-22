"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { 
  Loader2, Search, MapPin, Stethoscope, User, Star, Calendar, 
  ShieldAlert, LogOut, SlidersHorizontal, X, Check, Plus
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

interface DoctorWithClinic extends Doctor {
  clinics: { id: string; slug?: string; name: string; address: string; city: string; consultation_fee: number }[];
  featured_listings?: { status: string; expires_at: string }[];
  calculated_distance?: number; // Added for distance filtering
}

export default function PatientSearchPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorWithClinic[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Base Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  
  // Advanced Filter States
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customTypeInput, setCustomTypeInput] = useState("");
  
  const [isDistanceEnabled, setIsDistanceEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(50); // 1 to 100km
  
  const [isPriceEnabled, setIsPriceEnabled] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(5000); // Max fee

  // Dynamic Options from DB
  const [cities, setCities] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);

  const router = useRouter();
  const pathname = usePathname();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchDataAndSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }

        let doctorsData: any[] | null = null;
        let fetchError: any = null;

        // Pipeline Fetching
        console.log("🔍 Fetching doctors...");
        const attempt1 = await supabase
          .from("doctors")
          .select(`*, clinics (id, slug, name, address, city, consultation_fee), featured_listings (status, expires_at)`)
          .eq("is_onboarded", true);

        doctorsData = attempt1.data;
        fetchError = attempt1.error;

        if (fetchError || !doctorsData || doctorsData.length === 0) {
          const attempt2 = await supabase
            .from("doctors")
            .select(`*, clinics (id, slug, name, address, city, consultation_fee)`);
          doctorsData = attempt2.data;
          fetchError = attempt2.error;
        }

        if (doctorsData && doctorsData.length > 0) {
          const normalizedDoctors: DoctorWithClinic[] = doctorsData.map((doc: any) => {
            let finalClinics = [];
            if (doc.clinics) {
              finalClinics = Array.isArray(doc.clinics) ? doc.clinics : [doc.clinics];
            } else if (doc.clinic) {
              finalClinics = Array.isArray(doc.clinic) ? doc.clinic : [doc.clinic];
            }
            return {
              ...doc,
              clinics: finalClinics,
              featured_listings: doc.featured_listings || [],
              // Fallback random distance for real-time filter testing (replace with real geo-coordinates later)
              calculated_distance: Math.floor(Math.random() * 95) + 1 
            };
          });

          const sortedDoctors = normalizedDoctors.sort((a, b) => {
            const aFeatured = a.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
            const bFeatured = b.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
            if (aFeatured && !bFeatured) return -1;
            if (!aFeatured && bFeatured) return 1;
            return (a.full_name || "").localeCompare(b.full_name || "");
          });

          setDoctors(sortedDoctors);

          const citySet = new Set<string>();
          const specSet = new Set<string>();
          normalizedDoctors.forEach((doc) => {
            if (doc.specialization) specSet.add(doc.specialization);
            doc.clinics?.forEach((clinic) => {
              if (clinic?.city) citySet.add(clinic.city);
            });
          });
          setCities(Array.from(citySet).sort());
          setSpecializations(Array.from(specSet).sort());
        } else {
          setDoctors([]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndSession();
  }, []);

  // Close filter panel when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      router.replace("/");
    } catch (err) {
      console.error("Logout error:", err);
      setLoading(false);
    }
  };

  const handleProtectedAction = (targetPath: string) => {
    if (!user) setIsAuthModalOpen(true);
    else router.push(targetPath);
  };

  const toggleSpecialization = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const addCustomType = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTypeInput.trim() && !selectedTypes.includes(customTypeInput.trim())) {
      setSelectedTypes(prev => [...prev, customTypeInput.trim()]);
      if (!specializations.includes(customTypeInput.trim())) {
        setSpecializations(prev => [...prev, customTypeInput.trim()]);
      }
      setCustomTypeInput("");
    }
  };

  // Real-time Active Filters Count (Admitad Style)
  const activeFiltersCount = 
    (selectedTypes.length > 0 ? 1 : 0) + 
    (isDistanceEnabled ? 1 : 0) + 
    (isPriceEnabled ? 1 : 0) +
    (selectedCity !== "all" ? 1 : 0);

  // Real-time Filtering Engine
  const filteredDoctors = doctors.filter((doc) => {
    const fullName = doc.full_name || "";
    const primaryClinic = doc.clinics?.[0];
    const docFee = primaryClinic?.consultation_fee || 0;
    const docDistance = doc.calculated_distance || 0;

    const matchesSearch = !searchQuery || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (doc.specialization && doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCity = selectedCity === "all" || 
      (doc.clinics && doc.clinics.some((clinic) => clinic?.city?.toLowerCase() === selectedCity.toLowerCase()));

    const matchesTypes = selectedTypes.length === 0 || 
      (doc.specialization && selectedTypes.some(t => doc.specialization?.toLowerCase().includes(t.toLowerCase())));

    const matchesPrice = !isPriceEnabled || docFee <= maxPrice;
    const matchesDistance = !isDistanceEnabled || docDistance <= maxDistance;

    return matchesSearch && matchesCity && matchesTypes && matchesPrice && matchesDistance;
  });

  const isDoctorFeatured = (doc: DoctorWithClinic) => {
    return doc.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#36d1cf]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-12">
      {/* Dynamic Responsive Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
              <Stethoscope className="w-8 h-8 text-[#36d1cf]" />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => router.push("/patient")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] bg-transparent border-0 cursor-pointer">Home</button>
              <button onClick={() => router.push("/patient/search")} className="text-sm font-semibold text-[#36d1cf] border-b-2 border-[#36d1cf] pb-1 bg-transparent border-0 cursor-pointer">Find Doctors</button>
              <button onClick={() => handleProtectedAction("/patient/favorites")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] bg-transparent border-0 cursor-pointer">Favorites</button>
              <button onClick={() => handleProtectedAction("/patient/appointments")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] bg-transparent border-0 cursor-pointer">Appointments</button>

              {user ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push("/patient/profile")} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-xl transition-all border-0 cursor-pointer">
                    <User className="w-4 h-4 text-gray-500" /> {user.email?.split("@")[0]}
                  </button>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl bg-transparent border-0 cursor-pointer" title="Logout">
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="px-4 py-2 text-sm font-bold text-white bg-[#36d1cf] hover:bg-[#2eb3b1] rounded-xl transition-all border-0 cursor-pointer shadow-sm">
                  Sign In / Register
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {!user && (
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 animate-fade-in">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-bold tracking-tight">Guest Mode. Booking requests require session authentication.</p>
            </div>
            <button onClick={() => setIsAuthModalOpen(true)} className="text-xs font-black bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 transition-all border-0 cursor-pointer whitespace-nowrap">
              Unlock Full Access
            </button>
          </div>
        )}

        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Search Specialists</h1>
          <p className="text-sm md:text-base text-gray-600">Filter through our onboarded elite clinicians globally</p>
        </div>

        {/* 🚀 Next Gen Floating Filters Box */}
        <div className="relative mb-6 md:mb-8 z-30" ref={filterPanelRef}>
          <div className="bg-white rounded-2xl border border-gray-200 p-2 pl-4 shadow-sm flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Search doctors, symptoms, or keywords..." 
              className="flex-1 bg-transparent py-2.5 outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400"
            />
            
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)} 
                className="py-1 outline-none text-sm font-medium bg-transparent cursor-pointer text-gray-700"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button 
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all border ${isFilterPanelOpen ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#36d1cf] text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* 🔽 Expandable Floating Filter Panel (Does NOT push UI down) */}
          {isFilterPanelOpen && (
            <div className="absolute top-[calc(100%+8px)] right-0 w-full sm:w-[400px] bg-white rounded-2xl border border-gray-200 shadow-xl p-5 origin-top-right animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  Advanced Filters
                  {activeFiltersCount > 0 && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">{activeFiltersCount} active</span>}
                </h3>
                <button onClick={() => setIsFilterPanelOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Doctor Types (Dynamic Pills + Custom Add) */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Doctor Type / Specialization</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {specializations.slice(0, 8).map(spec => (
                    <button 
                      key={spec}
                      onClick={() => toggleSpecialization(spec)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${selectedTypes.includes(spec) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                      {spec} {selectedTypes.includes(spec) && <Check className="w-3 h-3 inline ml-1" />}
                    </button>
                  ))}
                </div>
                {/* Custom Type Input */}
                <form onSubmit={addCustomType} className="flex gap-2">
                  <input 
                    type="text" 
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    placeholder="Add custom e.g., Surgeon..." 
                    className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#36d1cf]"
                  />
                  <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </form>
              </div>

              {/* Distance Slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDistanceEnabled} 
                      onChange={(e) => setIsDistanceEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#36d1cf] focus:ring-[#36d1cf]"
                    />
                    Max Distance
                  </label>
                  <span className={`text-xs font-bold ${isDistanceEnabled ? 'text-[#36d1cf]' : 'text-gray-400'}`}>
                    {maxDistance} km
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" max="100" 
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
                  disabled={!isDistanceEnabled}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isDistanceEnabled ? 'bg-gray-200 accent-[#36d1cf]' : 'bg-gray-100 accent-gray-300 opacity-50 cursor-not-allowed'}`}
                />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                  <span>1 km</span>
                  <span>100 km</span>
                </div>
              </div>

              {/* Price Slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isPriceEnabled} 
                      onChange={(e) => setIsPriceEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#36d1cf] focus:ring-[#36d1cf]"
                    />
                    Consultation Fee
                  </label>
                  <span className={`text-xs font-bold ${isPriceEnabled ? 'text-[#36d1cf]' : 'text-gray-400'}`}>
                    Upto Rs. {maxPrice}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="500" max="15000" step="500"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  disabled={!isPriceEnabled}
                  className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isPriceEnabled ? 'bg-gray-200 accent-[#36d1cf]' : 'bg-gray-100 accent-gray-300 opacity-50 cursor-not-allowed'}`}
                />
                <div className="flex justify-between mt-1 text-[10px] text-gray-400 font-medium">
                  <span>Rs. 500</span>
                  <span>Rs. 15k+</span>
                </div>
              </div>

              <button 
                onClick={() => setIsFilterPanelOpen(false)}
                className="w-full bg-gray-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
              >
                Apply Filters & Close
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs md:text-sm text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{filteredDoctors.length}</strong> matching results
          </p>
        </div>

        {/* Doctor Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
            {filteredDoctors.map((doctor) => {
              const primaryClinic = doctor.clinics?.[0];
              const featured = isDoctorFeatured(doctor);
              const targetSlug = primaryClinic?.slug || primaryClinic?.id || doctor.id;

              return (
                <div key={doctor.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#36d1cf]/50 hover:shadow-lg transition-all relative flex flex-col justify-between group">
                  {featured && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full text-white flex items-center gap-1 shadow-sm" style={{ backgroundColor: "#36d1cf" }}>
                        <Star className="w-3 h-3 fill-current" />Featured
                      </span>
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 border border-gray-100 group-hover:scale-105 transition-transform" style={{ backgroundColor: featured ? "#f0fdfc" : "#f8fafc" }}>
                        {doctor.profile_image_url ? (
                          <img src={doctor.profile_image_url} alt={doctor.full_name || ""} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          <User className="w-8 h-8" style={{ color: featured ? "#36d1cf" : "#94a3b8" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-bold text-gray-900 truncate text-[17px]">{doctor.full_name}</h3>
                        <p className="text-[13px] font-semibold mt-0.5" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                      </div>
                    </div>

                    {primaryClinic && (
                      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</span>
                          <span className="text-[13px] font-semibold text-gray-900 truncate">{doctor.calculated_distance} km away</span>
                        </div>
                        <div className="flex flex-col gap-0.5 pl-3 border-l border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fee</span>
                          <span className="text-[13px] font-bold text-gray-900">Rs. {primaryClinic.consultation_fee}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-5 pt-2">
                    <button 
                      onClick={() => handleProtectedAction(`/clinic/${targetSlug}`)} 
                      className="w-full py-2.5 text-white font-bold rounded-xl transition-all text-[13px] shadow-sm hover:shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
                      style={{ backgroundColor: "#36d1cf" }}
                    >
                      Book Appointment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center relative z-10">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-bold mb-1">No doctors found</p>
            <p className="text-gray-500 font-medium text-sm">Try adjusting your filters or search keywords.</p>
          </div>
        )}
      </main>

      {/* Synchronized Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 pb-safe">
        <button onClick={() => router.push("/patient")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <HomeIcon className="w-5 h-5" color={pathname === "/patient" ? "#36d1cf" : "#9ca3af"} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }}>Home</span>
        </button>

        <button onClick={() => router.push("/patient/search")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Search className="w-5 h-5" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }}>Find</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/appointments")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Calendar className="w-5 h-5" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }}>Bookings</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/profile")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <User className="w-5 h-5" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }}>Profile</span>
        </button>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} redirectPath="/patient/search" />
    </div>
  );
}

function HomeIcon({ className, color }: { className?: string; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
