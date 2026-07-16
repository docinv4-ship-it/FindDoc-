"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, 
  Heart, 
  User, 
  MapPin, 
  Stethoscope, 
  Mail, 
  ShieldCheck, 
  AlertCircle 
} from "lucide-react";
import AuthGuard from "@/components/AuthGuard";

const FAVORITES_KEY = "docfind_favorites";

// ==========================================
// 🛠️ CONFIGURATION: Find Doctors ka exact path yahan set karein!
const FIND_DOCTORS_ROUTE = "/patient/search"; 
// ==========================================

function PatientFavoritesContent() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteDoctors, setFavoriteDoctors] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // Load favorites from localStorage and verify auth session
  useEffect(() => {
    const initializeFavorites = async () => {
      setLoading(true);
      setError(null);
      try {
        // Securely check active user session
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          // Fetch saved doctor IDs from localStorage
          const saved = localStorage.getItem(FAVORITES_KEY);
          if (saved) {
            try {
              const ids = JSON.parse(saved);
              setFavoriteIds(ids);
            } catch (e) {
              console.error("Error parsing local favorites:", e);
            }
          }
        } else {
          setError("No authenticated session found.");
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Failed to establish secure session connection.");
      } finally {
        setLoading(false);
      }
    };

    initializeFavorites();
  }, [supabase]);

  // Fetch complete doctors' data whenever favorite IDs change
  useEffect(() => {
    if (currentUser && favoriteIds.length > 0) {
      fetchDoctors();
    } else {
      setLoading(false);
    }
  }, [favoriteIds, currentUser]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("doctors")
        .select("id, full_name, specialization, profile_image_url, clinics (id, name, address, city, slug)")
        .in("id", favoriteIds)
        .eq("is_onboarded", true);

      if (fetchError) {
        setError("Failed to retrieve favorite doctors list.");
      } else if (data) {
        setFavoriteDoctors(data);
      }
    } catch (err) {
      console.error("Fetch doctors error:", err);
      setError("An error occurred while loading doctor listings.");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (doctorId: string) => {
    const newFavs = favoriteIds.filter((id) => id !== doctorId);
    setFavoriteIds(newFavs);
    setFavoriteDoctors((prev) => prev.filter((d) => d.id !== doctorId));
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
  };

  if (loading && favoriteDoctors.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#36d1cf" }} />
        <p className="mt-4 text-sm font-semibold text-gray-500 uppercase tracking-wider animate-pulse">
          Syncing Favorites Securely...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/patient")} className="flex items-center gap-2 bg-transparent border-0 text-left cursor-pointer">
              <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
              <span className="text-xl font-bold text-gray-900">DocFind</span>
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/patient/chats")} className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-transparent border-0 cursor-pointer">Chats</button>
              <button onClick={() => router.push("/patient/appointments")} className="text-sm font-medium text-gray-600 hover:text-gray-900 bg-transparent border-0 cursor-pointer">Appointments</button>
              {/* ✅ FIXED PATH: Redirects properly to /patient/search */}
              <button 
                onClick={() => router.push(FIND_DOCTORS_ROUTE)} 
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors hover:bg-teal-600 shadow-sm border-0 cursor-pointer" 
                style={{ backgroundColor: "#36d1cf" }}
              >
                <User className="w-4 h-4" /> Find Doctors
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Favorite Doctors</h1>
            {currentUser && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1">
                <Mail className="w-4 h-4 text-gray-400" /> {currentUser.email}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-teal-50 text-[#36d1cf] px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Secure Profile
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {favoriteDoctors.length > 0 ? (
          <div className="space-y-4">
            {favoriteDoctors.map((doctor) => {
              // Extract the single clinic safely, whether it returns an array or direct object
              const clinic = Array.isArray(doctor.clinics) ? doctor.clinics[0] : doctor.clinics;
              
              // ✅ IMPROVED LINK: Instantly loads the clinic dashboard pre-focused on this doctor!
              const profileUrl = clinic?.slug 
                ? `/clinic/${clinic.slug}?doctor=${doctor.id}` 
                : `/doctor/${doctor.id}`;

              return (
                <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-teal-50 border border-teal-100 flex-shrink-0">
                      {doctor.profile_image_url ? (
                        <img src={doctor.profile_image_url} alt={doctor.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-[#36d1cf]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{doctor.full_name}</p>
                      <p className="text-sm font-semibold" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                      {clinic && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{clinic.name}, {clinic.city}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => router.push(profileUrl)} 
                        className="px-4 py-2 text-white text-sm font-bold rounded-lg shadow-sm transition-colors hover:bg-teal-600 border-0 cursor-pointer" 
                        style={{ backgroundColor: "#36d1cf" }}
                      >
                        Book
                      </button>
                      <button 
                        onClick={() => removeFavorite(doctor.id)} 
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-0 cursor-pointer"
                        title="Remove from favorites"
                      >
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && !error && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 font-bold">No favorite doctors saved yet</p>
              <p className="text-sm text-gray-500 mt-1">Browse clinic and doctor profiles to save your preferred health specialists.</p>
              {/* ✅ FIXED PATH: Empty state action also points to FIND_DOCTORS_ROUTE */}
              <button 
                onClick={() => router.push(FIND_DOCTORS_ROUTE)} 
                className="mt-6 px-6 py-2.5 text-white font-bold text-sm rounded-xl shadow-md transition-colors hover:bg-teal-600 border-0 cursor-pointer" 
                style={{ backgroundColor: "#36d1cf" }}
              >
                Find Doctors
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function PatientFavoritesPage() {
  return (
    <AuthGuard currentPath="/patient/favorites">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
        </div>
      }>
        <PatientFavoritesContent />
      </Suspense>
    </AuthGuard>
  );
}
