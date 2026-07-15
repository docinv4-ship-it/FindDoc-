"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Search, MapPin, Stethoscope, User, Star, Home, Calendar, Bell, Heart, MessageSquare } from "lucide-react";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

interface DoctorWithClinic extends Doctor {
  clinics: { id: string; name: string; address: string; city: string; consultation_fee: number }[];
  featured_listings?: { status: string; expires_at: string }[];
}

export default function PatientSearchPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorWithClinic[]>([]);
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
    const fetchData = async () => {
      const { data: doctorsData, error } = await supabase
        .from("doctors")
        .select(`*, clinics (id, name, address, city, consultation_fee), featured_listings (status, expires_at)`)
        .eq("is_onboarded", true)
        .order("full_name", { ascending: true });

      if (!error && doctorsData) {
        const sortedDoctors = (doctorsData as DoctorWithClinic[]).sort((a, b) => {
          const aFeatured = a.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
          const bFeatured = b.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
          if (aFeatured && !bFeatured) return -1;
          if (!aFeatured && bFeatured) return 1;
          return (a.full_name || "").localeCompare(b.full_name || "");
        });
        setDoctors(sortedDoctors);
        
        const citySet = new Set<string>();
        const specSet = new Set<string>();
        doctorsData.forEach((doc: DoctorWithClinic) => {
          if (doc.specialization) specSet.add(doc.specialization);
          doc.clinics?.forEach((clinic: { city: string }) => {
            if (clinic.city) citySet.add(clinic.city);
          });
        });
        setCities(Array.from(citySet).sort());
        setSpecializations(Array.from(specSet).sort());
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch = !searchQuery || doc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = selectedSpecialization === "all" || doc.specialization === selectedSpecialization;
    const matchesCity = selectedCity === "all" || doc.clinics?.some((clinic) => clinic.city === selectedCity);
    return matchesSearch && matchesSpec && matchesCity;
  });

  const isDoctorFeatured = (doc: DoctorWithClinic) => {
    return doc.featured_listings?.some(f => f.status === "active" && new Date(f.expires_at) > new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
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
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </div>
            {/* Desktop Navigation (Added All Missing Navigation Buttons Here) */}
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => router.push("/")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Home</button>
              <button onClick={() => router.push("/patient")} className="text-sm font-semibold text-[#36d1cf] transition-colors border-b-2 border-[#36d1cf] pb-1">Find Doctors</button>
              <button onClick={() => router.push("/patient/favorites")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Favorites</button>
              <button onClick={() => router.push("/patient/chats")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Chats</button>
              <button onClick={() => router.push("/patient/appointments")} className="text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">Appointments</button>
              <button onClick={() => router.push("/patient/profile")} className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#36d1cf] transition-colors">
                <User className="w-4 h-4" /> Account
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Find Your Doctor</h1>
          <p className="text-sm md:text-base text-gray-600">Search for doctors by name, specialization, or location</p>
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
                className="w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 text-sm"
                style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
              />
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <MapPin className="w-5 h-5 text-gray-400" />
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)} 
                className="w-full py-1 focus:outline-none text-sm bg-transparent"
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
                className="w-full py-1 focus:outline-none text-sm bg-transparent"
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

        {/* Doctor Grid (Responsive Cards) */}
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

                  {/* Stable Button with fixed color on ALL devices */}
                  <div className="px-5 pb-5 pt-1">
                    <button 
                      onClick={() => router.push(`/doctor/${doctor.id}`)} 
                      className="w-full py-2.5 text-white font-semibold rounded-lg transition-all text-sm shadow-sm hover:brightness-105 active:scale-[0.98]"
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
            <p className="text-gray-600 font-medium text-sm">No doctors found</p>
          </div>
        )}
      </main>

      {/* Synchronized Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => router.push("/")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Home className="w-5 h-5" style={{ color: pathname === "/" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname === "/" ? "#36d1cf" : "#9ca3af" }}>Home</span>
        </button>

        <button onClick={() => router.push("/patient")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Search className="w-5 h-5" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname === "/patient" ? "#36d1cf" : "#9ca3af" }}>Find</span>
        </button>

        <button onClick={() => router.push("/patient/appointments")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Calendar className="w-5 h-5" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/appointments") ? "#36d1cf" : "#9ca3af" }}>Bookings</span>
        </button>

        <button onClick={() => router.push("/patient/notifications")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <Bell className="w-5 h-5" style={{ color: pathname?.includes("/notifications") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/notifications") ? "#36d1cf" : "#9ca3af" }}>Alerts</span>
        </button>

        <button onClick={() => router.push("/patient/profile")} className="flex flex-col items-center gap-1 bg-transparent border-0">
          <User className="w-5 h-5" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }} />
          <span className="text-[10px] font-medium" style={{ color: pathname?.includes("/profile") ? "#36d1cf" : "#9ca3af" }}>Profile</span>
        </button>
      </div>
    </div>
  );
}
