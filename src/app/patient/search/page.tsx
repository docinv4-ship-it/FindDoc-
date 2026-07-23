"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

interface DoctorWithClinic extends Doctor {
  clinics: { id: string; slug?: string; name: string; address: string; city: string; consultation_fee: number }[];
  featured_listings?: { status: string; expires_at: string }[];
  calculated_distance?: number;
}

export default function PatientSearchPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorWithClinic[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // --- Real-time Filter States ---
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isDistanceEnabled, setIsDistanceEnabled] = useState(false);
  const [maxDistance, setMaxDistance] = useState<number>(10); 
  
  const [isPriceEnabled, setIsPriceEnabled] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(2500); 

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const router = useRouter();
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // --- 1. Fetch Real Data ---
  useEffect(() => {
    const fetchDataAndSession = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }

        let doctorsData: any[] | null = null;
        
        console.log("🔍 Fetching doctors...");
        const { data, error } = await supabase
          .from("doctors")
          .select(`*, clinics (id, slug, name, address, city, consultation_fee), featured_listings (status, expires_at)`)
          .eq("is_onboarded", true);

        if (!error && data) {
          doctorsData = data;
        } else {
          // Fallback if is_onboarded is not strictly used
          const fallback = await supabase.from("doctors").select(`*, clinics (id, slug, name, address, city, consultation_fee)`);
          doctorsData = fallback.data;
        }

        if (doctorsData && doctorsData.length > 0) {
          const normalizedDoctors: DoctorWithClinic[] = doctorsData.map((doc: any) => {
            let finalClinics = [];
            if (doc.clinics) {
              finalClinics = Array.isArray(doc.clinics) ? doc.clinics : [doc.clinics];
            }
            return {
              ...doc,
              clinics: finalClinics,
              featured_listings: doc.featured_listings || [],
              calculated_distance: Math.floor(Math.random() * 95) + 1 // Simulated distance for UI testing
            };
          });

          setDoctors(normalizedDoctors);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndSession();
  }, []);

  // --- 2. Outside Click Handler for Filter Panel ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node) &&
        filterBtnRef.current && !filterBtnRef.current.contains(event.target as Node)
      ) {
        setIsFilterPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 3. Filter Engine ---
  const filteredDoctors = doctors.filter((doc) => {
    const fullName = doc.full_name || "";
    const docType = doc.specialization || "";
    const primaryClinic = doc.clinics?.[0];
    const docFee = primaryClinic?.consultation_fee || 0;
    const docDistance = doc.calculated_distance || 0;

    // Search
    const matchesSearch = !searchQuery || 
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      docType.toLowerCase().includes(searchQuery.toLowerCase());

    // Distance
    const matchesDist = !isDistanceEnabled || docDistance <= maxDistance;

    // Price
    const matchesPrice = !isPriceEnabled || docFee <= maxPrice;

    return matchesSearch && matchesDist && matchesPrice;
  });

  // Calculate active filters badge count
  let activeCount = 0;
  if (isDistanceEnabled) activeCount++;
  if (isPriceEnabled) activeCount++;

  const handleProtectedAction = (targetPath: string) => {
    if (!user) setIsAuthModalOpen(true);
    else router.push(targetPath);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'white' }}>
        <h2 style={{ color: '#06b6d4', fontFamily: 'system-ui' }}>Loading Doctors...</h2>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --cyan: #06b6d4;
          --cyan-dark: #0891b2;
          --slate-50: #f8fafc;
          --slate-100: #f1f5f9;
          --slate-200: #e2e8f0;
          --slate-400: #94a3b8;
          --slate-500: #64748b;
          --slate-600: #475569;
          --slate-800: #1e293b;
          --slate-900: #0f172a;
          --danger: #ef4444;
        }

        .next-gen-wrapper {
          background: white;
          color: var(--slate-900);
          min-height: 100vh;
          padding-bottom: 80px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .sticky-header {
          position: sticky;
          top: 0;
          z-index: 40;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--slate-200);
          padding: 20px 20px 12px;
        }

        .search-bar {
          display: flex;
          gap: 10px;
          position: relative;
        }

        .search-input {
          flex: 1;
          height: 52px;
          background: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: 16px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-input:focus-within {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .filter-btn {
          width: 52px;
          height: 52px;
          background: var(--slate-50);
          border: 1px solid var(--slate-200);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--slate-600);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .filter-btn:hover, .filter-btn.active {
          background: var(--slate-200);
        }

        .filter-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--danger);
          color: white;
          font-size: 10px;
          font-weight: 800;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .filter-panel {
          position: absolute;
          top: 65px;
          right: 0;
          width: calc(100vw - 40px);
          max-width: 320px;
          background: white;
          border: 1px solid var(--slate-200);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.15);
          z-index: 50;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .filter-group { margin-bottom: 20px; }
        .filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .filter-label { font-size: 14px; font-weight: 700; color: var(--slate-800); }
        .filter-val { font-size: 13px; font-weight: 600; color: var(--cyan); }

        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--slate-200); transition: .3s; border-radius: 24px;
        }
        .toggle-slider:before {
          position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
          background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        input:checked + .toggle-slider { background-color: var(--cyan); }
        input:checked + .toggle-slider:before { transform: translateX(20px); }

        .range-slider {
          -webkit-appearance: none; width: 100%; height: 6px; background: var(--slate-200);
          border-radius: 4px; outline: none; transition: opacity 0.2s;
        }
        .range-slider.disabled { opacity: 0.4; pointer-events: none; }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 20px; height: 20px;
          border-radius: 50%; background: white; border: 2px solid var(--cyan);
          cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }

        .apply-btn {
          width: 100%; background: var(--slate-900); color: white; padding: 14px;
          border-radius: 14px; font-weight: 700; font-size: 15px; border: none;
          cursor: pointer; transition: all 0.2s; margin-top: 10px;
        }
        .apply-btn:hover { background: var(--slate-800); }

        .results-header { padding: 0 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; margin-top: 16px; }
        .doctor-container { padding: 0 20px; display: flex; flex-direction: column; gap: 16px; }
        
        .doctor-card {
          background: white; border-radius: 22px; padding: 18px; border: 1px solid var(--slate-200);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.03); transition: all 0.3s; animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .doctor-card:hover { box-shadow: 0 8px 25px -5px rgba(0,0,0,0.08); border-color: var(--cyan); }
        
        .avatar {
          width: 72px; height: 72px; background: #cffafe; border: 1px solid #a5f3fc;
          border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; overflow: hidden;
        }
        .rating {
          background: #fefce8; border: 1px solid #fde047; color: #854d0e; padding: 4px 10px;
          border-radius: 8px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 4px;
        }
        .book-btn {
          background: var(--cyan); color: white; padding: 12px 20px; border-radius: 14px;
          font-weight: 600; font-size: 14px; text-decoration: none; display: inline-flex;
          align-items: center; gap: 6px; transition: all 0.2s; border: none; cursor: pointer;
        }
        .book-btn:hover { background: var(--cyan-dark); }
        .empty-state { text-align: center; padding: 40px 20px; color: var(--slate-500); font-weight: 500; }
      `}} />

      <div className="next-gen-wrapper">
        
        {/* Sticky Header */}
        <div className="sticky-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>Find Doctors</h1>
          </div>
          
          <div className="search-bar">
            <div className="search-input">
              🔍
              <input 
                type="text" 
                placeholder="Search symptoms or doctors..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: '500' }}
              />
            </div>
            <button 
              className={`filter-btn ${isFilterPanelOpen ? 'active' : ''}`} 
              ref={filterBtnRef}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            >
              ⚙️
              {activeCount > 0 && (
                <div className="filter-badge" style={{ display: 'flex' }}>
                  {activeCount}
                </div>
              )}
            </button>

            {/* Smart Dropdown Filter Panel */}
            {isFilterPanelOpen && (
              <div className="filter-panel" ref={filterPanelRef} style={{ display: 'block' }}>
                
                {/* Distance Toggle & Slider */}
                <div className="filter-group">
                  <div className="filter-header">
                    <div>
                      <span className="filter-label">Max Distance</span>
                      {isDistanceEnabled && (
                        <span className="filter-val" style={{ marginLeft: '8px' }}>{maxDistance} km</span>
                      )}
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={isDistanceEnabled}
                        onChange={(e) => setIsDistanceEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <input 
                    type="range" 
                    className={`range-slider ${!isDistanceEnabled ? 'disabled' : ''}`} 
                    min="1" max="100" 
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    disabled={!isDistanceEnabled}
                  />
                </div>

                {/* Price Toggle & Slider */}
                <div className="filter-group">
                  <div className="filter-header">
                    <div>
                      <span className="filter-label">Max Fee</span>
                      {isPriceEnabled && (
                         <span className="filter-val" style={{ marginLeft: '8px' }}>Rs. {maxPrice}</span>
                      )}
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={isPriceEnabled}
                        onChange={(e) => setIsPriceEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <input 
                    type="range" 
                    className={`range-slider ${!isPriceEnabled ? 'disabled' : ''}`} 
                    min="500" max="15000" step="100" 
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    disabled={!isPriceEnabled}
                  />
                </div>

                <button className="apply-btn" onClick={() => setIsFilterPanelOpen(false)}>
                  Apply Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="results-header">
          <span style={{ fontSize: '13px', color: 'var(--slate-500)', fontWeight: '600' }}>
            Showing {filteredDoctors.length} doctors
          </span>
          <span style={{ fontSize: '13px', color: 'var(--cyan)', fontWeight: '700', cursor: 'pointer' }}>
            Nearest ⚙️
          </span>
        </div>

        <div className="doctor-container">
          {filteredDoctors.length === 0 ? (
            <div className="empty-state">
              No doctors found matching your criteria.<br />
              <span style={{ fontSize: '12px', marginTop: '8px', display: 'block' }}>Try adjusting filters or distance.</span>
            </div>
          ) : (
            filteredDoctors.map(doc => {
              const primaryClinic = doc.clinics?.[0];
              const clinicName = primaryClinic?.name || "Independent Clinic";
              const fee = primaryClinic?.consultation_fee || 0;
              const targetSlug = primaryClinic?.slug || primaryClinic?.id || doc.id;
              
              // Fallback Data
              const exp = doc.experience_years || 5; 
              const rating = 4.8; 

              return (
                <div key={doc.id} className="doctor-card">
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div className="avatar">
                      {doc.profile_image_url ? (
                        <img src={doc.profile_image_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        "👨‍⚕️"
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontWeight: '800', fontSize: '16px' }}>{doc.full_name}</h3>
                          <p style={{ color: 'var(--cyan)', fontWeight: '700', fontSize: '13px', marginTop: '2px' }}>{doc.specialization}</p>
                        </div>
                        <div className="rating">⭐ {rating}</div>
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--slate-500)', lineHeight: '1.6', fontWeight: '500' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span style={{ color: 'var(--slate-800)', fontWeight: '700' }}>📍 {doc.calculated_distance} km</span> • {clinicName}
                        </div>
                        <div>{exp} Years Exp. • <strong style={{ color: 'var(--slate-900)' }}>Rs. {fee}</strong></div>
                      </div>
                    </div>
                  </div>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--slate-100)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', padding: '10px', borderRadius: '12px' }}>📅</div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Available</div>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--slate-800)' }}>Available Today</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleProtectedAction(`/clinic/${targetSlug}`)}
                      className="book-btn"
                    >
                      Book <span style={{ fontSize: '16px', marginLeft: '2px' }}>→</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} redirectPath="/patient/search" />
    </>
  );
}
