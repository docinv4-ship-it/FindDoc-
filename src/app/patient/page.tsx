"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Search, MapPin, Stethoscope, Calendar, User, Star } from "lucide-react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: doctorsData, error } = await supabase.from("doctors").select(`*, clinics (id, name, address, city, consultation_fee), featured_listings (status, expires_at)`).eq("is_onboarded", true).order("full_name", { ascending: true });
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </div>
            <nav className="flex items-center gap-4">
              <button onClick={() => router.push("/patient/favorites")} className="text-sm text-gray-600 hover:text-gray-900">Favorites</button>
              <button onClick={() => router.push("/patient/chats")} className="text-sm text-gray-600 hover:text-gray-900">Chats</button>
              <button onClick={() => router.push("/patient/appointments")} className="text-sm text-gray-600 hover:text-gray-900">Appointments</button>
              <button onClick={() => router.push("/patient/reviews")} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"><Star className="w-4 h-4" />Reviews</button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Doctor</h1>
          <p className="text-gray-600">Search for doctors by name, specialization, or location</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or specialization..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="all">All Cities</option>
                {cities.map((city) => (<option key={city} value={city}>{city}</option>))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gray-400" />
              <select value={selectedSpecialization} onChange={(e) => setSelectedSpecialization(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="all">All Specializations</option>
                {specializations.map((spec) => (<option key={spec} value={spec}>{spec}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">{filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""} found</p>
        </div>

        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => {
              const primaryClinic = doctor.clinics?.[0];
              const featured = isDoctorFeatured(doctor);
              return (
                <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative">
                  {featured && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2 py-1 text-xs font-medium rounded-full text-white flex items-center gap-1" style={{ backgroundColor: "#36d1cf" }}>
                        <Star className="w-3 h-3 fill-current" />Featured
                      </span>
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: featured ? "#e6faf9" : "#f3f4f6" }}>
                        {doctor.profile_image_url ? (
                          <img src={doctor.profile_image_url} alt={doctor.full_name || ""} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <User className="w-8 h-8" style={{ color: featured ? "#36d1cf" : "#9ca3af" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{doctor.full_name}</h3>
                        <p className="text-sm font-medium" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                      </div>
                    </div>

                    {primaryClinic && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{primaryClinic.name}</p>
                            <p className="text-xs text-gray-500">{primaryClinic.address}, {primaryClinic.city}</p>
                          </div>
                        </div>
                        {primaryClinic.consultation_fee && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gray-600">Consultation Fee:</span>
                            <span className="text-sm font-semibold text-primary-600">${primaryClinic.consultation_fee}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ✅ Ab ye click par user ko perfect route "/patient/doctor/ID" par bhejey ga bina kisi 404 error ke */}
                    <button onClick={() => router.push(`/patient/doctor/${doctor.id}`)} className="mt-4 w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors">
                      View Profile & Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No doctors found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
