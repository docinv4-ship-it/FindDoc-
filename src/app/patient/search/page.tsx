"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search, MapPin, Stethoscope, User, Star, Calendar, Bell, ShieldAlert, LogOut } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

interface DoctorWithClinic extends Doctor {
  clinics: { id: string; name: string; address: string; city: string; consultation_fee: number }[];
  featured_listings?: { status: string; expires_at: string }[];
}

export default function PatientSearchPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorWithClinic[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("all");
  const [cities, setCities] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchDataAndSession = async () => {
      try {
        // 1. Fetch Safe Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }

        let doctorsData: any[] | null = null;
        let fetchError: any = null;

        // --- SELF-HEALING ARCHITECTURE PIPELINE ---
        
        // Attempt 1: Full Query (All Relations + Onboarded Filter)
        const attempt1 = await supabase
          .from("doctors")
          .select(`*, clinics (id, name, address, city, consultation_fee), featured_listings (status, expires_at)`)
          .eq("is_onboarded", true);
        
        doctorsData = attempt1.data;
        fetchError = attempt1.error;

        // Attempt 2: Fallback without "is_onboarded" filter (in case column name differs)
        if (fetchError || !doctorsData) {
          console.warn("Fallback Level 1: Retrying without 'is_onboarded' constraint...");
          const attempt2 = await supabase
            .from("doctors")
            .select(`*, clinics (id, name, address, city, consultation_fee), featured_listings (status, expires_at)`);
          
          doctorsData = attempt2.data;
          fetchError = attempt2.error;
        }

        // Attempt 3: Fallback without "featured_listings" relation (in case table doesn't exist yet)
        if (fetchError || !doctorsData) {
          console.warn("Fallback Level 2: Retrying without 'featured_listings' relationship...");
          const attempt3 = await supabase
            .from("doctors")
            .select(`*, clinics (id, name, address, city, consultation_fee)`);
          
          doctorsData = attempt3.data;
          fetchError = attempt3.error;
        }

        // Attempt 4: Fallback to singular 'clinic' relation (in case schema names are singular)
        if (fetchError || !doctorsData) {
          console.warn("Fallback Level 3: Trying singular 'clinic' join...");
          const attempt4 = await supabase
            .from("doctors")
            .select(`*, clinic (id, name, address, city, consultation_fee)`);
          
          if (attempt4.data) {
            doctorsData = attempt4.data.map((doc: any) => ({
              ...doc,
              clinics: doc.clinic ? (Array.isArray(doc.clinic) ? doc.clinic : [doc.clinic]) : []
            }));
          }
          fetchError = attempt4.error;
        }

        // Attempt 5: Bare Minimum Fetch (Guarantees doctor rendering even if relations fail)
        if (fetchError || !doctorsData) {
          console.warn("Fallback Level 4: Executing raw bare-minimum doctor fetch...");
          const attempt5 = await supabase.from("doctors").select(`*`);
          doctorsData = attempt5.data;
          fetchError = attempt5.error;
        }

        // 2. Normalization to prevent front-end crashes (clinics is guaranteed to be an array)
        if (doctorsData) {
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
              featured_listings: doc.featured_listings || []
            };
          });

          // Sort by featured listings first
          const sortedDoctors = normalizedDoctors.sort((a, b) => {
            const aFeatured = a.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
            const bFeatured = b.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
            if (aFeatured && !bFeatured) return -1;
            if (!aFeatured && bFeatured) return 1;
            return (a.full_name || "").localeCompare(b.full_name || "");
          });

          setDoctors(sortedDoctors);

          // Populate filters safely
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
          console.error("All doctor queries failed in self-healing pipeline:", fetchError);
        }
      } catch (err) {
        console.error("Critical System error on fetching patient dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDataAndSession();
  }, [supabase]);

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
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      router.push(targetPath);
    }
  };

  // Safe lowercased robust filters
  const filteredDoctors = doctors.filter((doc) => {
    const fullName = doc.full_name || "";
    const specialization = doc.specialization || "";
    
    const matchesSearch = !searchQuery || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      specialization.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesSpec = selectedSpecialization === "all" || 
      specialization === selectedSpecialization;
      
    const matchesCity = selectedCity === "all" || 
      (doc.clinics && doc.clinics.some((clinic) => clinic?.city?.toLowerCase() === selectedCity.toLowerCase()));
      
    return matchesSearch && matchesSpec && matchesCity;
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
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => router.push("/patient")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Home</button>
              <button onClick={() => router.push("/patient/search")} className="text-sm font-semibold text-[#36d1cf] transition-colors border-b-2 border-[#36d1cf] pb-1 bg-transparent border-0 cursor-pointer">Find Doctors</button>
              <button onClick={() => handleProtectedAction("/patient/favorites")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Favorites</button>
              <button onClick={() => handleProtectedAction("/patient/chats")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Chats</button>
              <button onClick={() => handleProtectedAction("/patient/appointments")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors bg-transparent border-0 cursor-pointer">Appointments</button>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => router.push("/patient/profile")} className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-xl transition-all border-0 cursor-pointer">
                    <User className="w-4 h-4 text-gray-500" /> {user.email?.split("@")[0]}
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors bg-transparent border-0 cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#36d1cf] hover:bg-[#2eb3b1] rounded-xl transition-all border-0 cursor-pointer shadow-sm"
                >
                  Sign In / Register
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {/* Dynamic Warning Alert for Guest Users */}
        {!user && (
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 animate-fade-in">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-bold tracking-tight">You are currently in Guest Mode. Search is active, but scheduling booking requests requires session authentication.</p>
            </div>
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs font-black bg-amber-600 text-white px-4 py-2 rounded-xl hover:bg-amber-700 active:scale-95 transition-all border-0 cursor-pointer whitespace-nowrap"
            >
              Unlock Full Access
            </button>
          </div>
        )}

        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Search Specialists</h1>
          <p className="text-sm md:text-base text-gray-600">Filter through our onboarded elite clinicians globally</p>
        </div>

        {/* Filters Box */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 md:mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search by name or specialization..." 
                className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#36d1cf] focus:ring-offset-0 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <MapPin className="w-5 h-5 text-gray-400" />
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)} 
                className="w-full py-1 focus:outline-none text-sm bg-transparent border-0 cursor-pointer"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <Stethoscope className="w-5 h-5 text-gray-400" />
              <select 
                value={selectedSpecialization} 
                onChange={(e) => setSelectedSpecialization(e.target.value)} 
                className="w-full py-1 focus:outline-none text-sm bg-transparent border-0 cursor-pointer"
              >
                <option value="all">All Specializations</option>
                {specializations.map((spec) => (<option key={spec} value={spec}>{spec}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs md:text-sm text-gray-500">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""} found</p>
        </div>

        {/* Doctor Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredDoctors.map((doctor) => {
              const primaryClinic = doctor.clinics?.[0];
              const featured = isDoctorFeatured(doctor);
              return (
                <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative flex flex-col justify-between">
                  {featured && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full text-white flex items-center gap-0.5" style={{ backgroundColor: "#36d1cf" }}>
                        <Star className="w-3 h-3 fill-current" />Featured
                      </span>
                    </div>
                  )}
                  <div className="p-5 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: featured ? "#e6faf9" : "#f3f4f6" }}>
                        {doctor.profile_image_url ? (
                          <img src={doctor.profile_image_url} alt={doctor.full_name || ""} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-7 h-7 md:w-8 md:h-8" style={{ color: featured ? "#36d1cf" : "#9ca3af" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-base md:text-lg">{doctor.full_name}</h3>
                        <p className="text-xs md:text-sm font-medium" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                      </div>
                    </div>

                    {primaryClinic && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-semibold text-gray-900 truncate">{primaryClinic.name}</p>
                            <p className="text-[11px] md:text-xs text-gray-500 truncate">{primaryClinic.address}, {primaryClinic.city}</p>
                          </div>
                        </div>
                        {primaryClinic.consultation_fee && (
                          <div className="flex items-center gap-2 text-xs md:text-sm">
                            <span className="text-gray-500">Fee:</span>
                            <span className="font-bold text-gray-900">${primaryClinic.consultation_fee}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-5 pb-5 pt-1">
                    <button 
                      onClick={() => handleProtectedAction(`/doctor/${doctor.id}`)} 
                      className="w-full py-2.5 text-white font-semibold rounded-lg transition-all text-sm shadow-sm hover:brightness-105 active:scale-[0.98] border-0 cursor-pointer"
                      style={{ backgroundColor: "#36d1cf" }}
                    >
                      View Profile & Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium text-sm">No doctors matching search criteria</p>
          </div>
        )}
      </main>

      {/* Synchronized Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => router.push("/patient")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <HomeIcon className="w-5 h-5" color={pathname === "/patient" ? "#36d1cf" : "#9ca3af"} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }}>Home</span>
        </button>

        <button onClick={() => router.push("/patient/search")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <Search className="w-5 h-5" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname === "/patient/search" ? "#36d1cf" : "#9ca3af" }}>Find</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/appointments")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <Calendar className="w-5 h-5" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }}>Bookings</span>
        </button>

        <button onClick={() => handleProtectedAction("/patient/profile")} className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
          <User className="w-5 h-5" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-bold" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }}>Profile</span>
        </button>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} redirectPath="/patient" />
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
