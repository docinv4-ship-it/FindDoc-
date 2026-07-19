"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// ==========================================
// 🛠️ CONFIGURATION: Find Doctors Route
const FIND_DOCTORS_ROUTE = "/patient/search"; 
// ==========================================

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  status: "pending" | "confirmed" | "cancelled";
  clinics: {
    name: string;
    address: string;
    city: string;
  } | null;
  doctors: {
    full_name: string;
    specialization: string;
    avatar_url?: string;
  } | null;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  avatar_url?: string;
  rating?: number;
  reviews_count?: number;
}

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [topDoctors, setTopDoctors] = useState<Doctor[]>([]);

  const supabase = createClient();

  useEffect(() => {
    // Inject Phosphor Icons to match exact UI requested
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@phosphor-icons/web";
    script.async = true;
    document.head.appendChild(script);

    const getDashboardData = async () => {
      try {
        // 1. User Session Check
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login"); 
          return;
        }
        setUser(session.user);
        const patientId = session.user.id;
        const todayStr = new Date().toISOString().split("T")[0];

        // 2. Fetch NEXT Upcoming Appointment (Real Data)
        const { data: appData, error: appError } = await supabase
          .from("appointments") 
          .select(`
            id, date, start_time, status,
            clinics (name, address, city),
            doctors (full_name, specialization, avatar_url)
          `)
          .eq("patient_id", patientId)
          .gte("date", todayStr)
          .neq("status", "cancelled")
          .order("date", { ascending: true })
          .limit(1);

        if (appError) throw appError;

        if (appData && appData.length > 0) {
          const rawApp = appData[0];
          setUpcomingAppointment({
            id: rawApp.id,
            date: rawApp.date,
            start_time: rawApp.start_time,
            status: rawApp.status,
            clinics: Array.isArray(rawApp.clinics) ? rawApp.clinics[0] : rawApp.clinics,
            doctors: Array.isArray(rawApp.doctors) ? rawApp.doctors[0] : rawApp.doctors,
          });
        }

        // 3. Fetch Top Rated Doctors for the horizontal scroll (Real Data)
        const { data: docsData, error: docsError } = await supabase
          .from("doctors")
          .select("id, full_name, specialization, avatar_url") // Assuming these exist
          .limit(5);
        
        if (!docsError && docsData) {
          setTopDoctors(docsData);
        }

      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    getDashboardData();

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [router, supabase]);

  // Date Formatter Helper (e.g. "2023-10-25" -> "Oct 25")
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Time Formatter Helper (e.g. "14:30" -> "02:30 PM")
  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#059669" }} />
      </div>
    );
  }

  // Fallback for user name extraction
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Patient";

  return (
    <>
      {/* EXACT CSS STYLES PROVIDED FOR PREMIUM UI */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
            --primary: #059669;
            --primary-light: #d1fae5;
            --primary-dark: #047857;
            --bg-color: #f9fafb;
            --surface: #ffffff;
            --text-main: #111827;
            --text-muted: #6b7280;
            --border: #e5e7eb;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        .premium-ui-body {
            background-color: #e5e7eb;
            display: flex;
            justify-content: center;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
        }

        .premium-ui-body * {
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        }

        .app-container {
            width: 100%;
            max-width: 414px;
            background-color: var(--bg-color);
            min-height: 100vh;
            position: relative;
            padding-bottom: 90px;
            box-shadow: var(--shadow-lg);
            overflow-x: hidden;
        }

        .header {
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            padding: 30px 24px 70px 24px;
            border-bottom-left-radius: 32px;
            border-bottom-right-radius: 32px;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .user-info h3 { font-size: 14px; font-weight: 500; color: rgba(255, 255, 255, 0.8); margin-bottom: 4px; margin-top: 0; }
        .user-info h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; margin: 0; }

        .profile-pic {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            object-fit: cover;
        }

        .search-wrapper { margin-top: -30px; padding: 0 24px; }
        .search-bar {
            background: var(--surface);
            border-radius: 16px;
            height: 60px;
            display: flex;
            align-items: center;
            padding: 0 20px;
            box-shadow: var(--shadow-md);
        }

        .search-bar i { font-size: 20px; color: var(--text-muted); }
        .search-bar input {
            border: none; outline: none; width: 100%; margin-left: 12px;
            font-size: 15px; color: var(--text-main); background: transparent;
        }
        .search-bar input::placeholder { color: #9ca3af; }

        .filter-btn {
            background: var(--primary-light);
            color: var(--primary-dark);
            border: none; width: 36px; height: 36px;
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            font-size: 20px; cursor: pointer;
        }

        .content { padding: 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-header h2 { font-size: 18px; font-weight: 700; color: var(--text-main); margin: 0; }
        .section-header a { font-size: 14px; color: var(--primary); text-decoration: none; font-weight: 600; cursor: pointer;}

        .appointment-card {
            background: var(--surface); border-radius: 20px; padding: 20px;
            box-shadow: var(--shadow-sm); border: 1px solid var(--border); margin-bottom: 30px;
        }
        .appt-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;
        }
        .appt-badge {
            background: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600;
            padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px;
        }
        .appt-doctor { display: flex; align-items: center; gap: 16px; }
        .appt-doctor img { width: 56px; height: 56px; border-radius: 16px; object-fit: cover; }
        .appt-info h4 { font-size: 16px; color: var(--text-main); margin: 0 0 4px 0; }
        .appt-info p { font-size: 13px; color: var(--text-muted); margin: 0; }

        .categories-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px; }
        .category-item { display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; cursor: pointer;}
        .category-icon {
            width: 60px; height: 60px; background: var(--surface); border-radius: 18px;
            display: flex; justify-content: center; align-items: center; font-size: 28px;
            color: var(--primary); box-shadow: var(--shadow-sm); border: 1px solid var(--border);
            transition: all 0.2s ease;
        }
        .category-item:hover .category-icon { background: var(--primary); color: white; transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .category-item span { font-size: 12px; font-weight: 600; color: var(--text-main); }

        .horizontal-scroll {
            display: flex; overflow-x: auto; gap: 16px; padding-bottom: 10px;
            scrollbar-width: none; -ms-overflow-style: none;
        }
        .horizontal-scroll::-webkit-scrollbar { display: none; }
        .doctor-card {
            min-width: 160px; background: var(--surface); border-radius: 20px; padding: 16px;
            box-shadow: var(--shadow-sm); border: 1px solid var(--border); text-align: center;
            scroll-snap-align: start;
        }
        .doctor-card img {
            width: 72px; height: 72px; border-radius: 50%; object-fit: cover;
            margin: 0 auto 12px auto; border: 3px solid var(--primary-light);
        }
        .doctor-card h4 { font-size: 15px; color: var(--text-main); margin: 0 0 4px 0; }
        .doctor-card p { font-size: 12px; color: var(--text-muted); margin: 0 0 12px 0; }
        .rating {
            display: flex; align-items: center; justify-content: center; gap: 4px;
            font-size: 13px; font-weight: 600; color: var(--text-main); margin-bottom: 16px;
        }
        .rating i { color: #f59e0b; }
        .btn-book {
            display: block; background: var(--primary-light); color: var(--primary-dark);
            padding: 10px 0; border-radius: 12px; font-size: 13px; font-weight: 600;
            text-decoration: none; transition: all 0.2s ease; cursor: pointer; border: none; width: 100%;
        }
        .btn-book:hover { background: var(--primary); color: white; }

        .promo-banner {
            background: linear-gradient(to right, #2563eb, #3b82f6); border-radius: 20px;
            padding: 20px; color: white; display: flex; justify-content: space-between;
            align-items: center; margin-top: 30px; box-shadow: var(--shadow-md);
        }
        .promo-text h3 { font-size: 16px; margin: 0 0 4px 0; }
        .promo-text p { font-size: 13px; opacity: 0.9; margin: 0; }
        .promo-btn {
            background: white; color: #2563eb; padding: 8px 16px; border-radius: 10px;
            font-size: 12px; font-weight: 700; text-decoration: none; cursor: pointer;
        }

        .bottom-nav {
            position: absolute; bottom: 0; left: 0; width: 100%; height: 75px;
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            display: flex; justify-content: space-around; align-items: center;
            border-top: 1px solid var(--border);
        }
        .nav-item {
            display: flex; flex-direction: column; align-items: center; gap: 4px;
            color: var(--text-muted); text-decoration: none; font-size: 11px; font-weight: 500; cursor: pointer;
        }
        .nav-item i { font-size: 24px; }
        .nav-item.active { color: var(--primary); }
        .nav-item.active i { font-weight: bold; }
      `}} />

      <div className="premium-ui-body">
        <div className="app-container">
          
          {/* Header (Real Data) */}
          <div className="header">
            <div className="user-info">
              <h3>Good Morning,</h3>
              <h1>{firstName}</h1>
            </div>
            <img 
              src={user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"} 
              alt="User Profile" 
              className="profile-pic" 
            />
          </div>

          {/* Search Box */}
          <div className="search-wrapper">
            <div className="search-bar" onClick={() => router.push(FIND_DOCTORS_ROUTE)}>
              <i className="ph ph-magnifying-glass"></i>
              <input type="text" placeholder="Search doctors, clinics..." readOnly />
              <button className="filter-btn">
                <i className="ph ph-sliders-horizontal"></i>
              </button>
            </div>
          </div>

          <div className="content">
            
            {/* Upcoming Schedule (Real Data from appointments table) */}
            <div className="section-header">
              <h2>Upcoming Schedule</h2>
              <a onClick={() => router.push("/patient/appointments")}>See All</a>
            </div>

            {upcomingAppointment ? (
              <div className="appointment-card">
                <div className="appt-header">
                  <div className="appt-badge">
                    <i className="ph-fill ph-clock"></i> 
                    {formatDate(upcomingAppointment.date)}, {formatTime(upcomingAppointment.start_time)}
                  </div>
                  <i className="ph ph-dots-three-vertical" style={{ color: 'var(--text-muted)', fontSize: '24px' }}></i>
                </div>
                
                <div className="appt-doctor">
                  <img 
                    src={upcomingAppointment.doctors?.avatar_url || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80"} 
                    alt="Doctor" 
                  />
                  <div className="appt-info">
                    <h4>{upcomingAppointment.doctors?.full_name || "Doctor"}</h4>
                    <p>{upcomingAppointment.doctors?.specialization || "Specialist"} • {upcomingAppointment.clinics?.name || "Clinic"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="appointment-card" style={{ textAlign: "center", padding: "30px 20px" }}>
                <i className="ph ph-calendar-blank" style={{ fontSize: "32px", color: "var(--border)", marginBottom: "8px" }}></i>
                <div className="appt-info">
                  <h4>No upcoming bookings</h4>
                  <p>You don't have any schedules yet.</p>
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="section-header">
              <h2>Specialities</h2>
              <a onClick={() => router.push(FIND_DOCTORS_ROUTE)}>See All</a>
            </div>

            <div className="categories-grid">
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Cardiologist`)}>
                <div className="category-icon"><i className="ph ph-heartbeat"></i></div>
                <span>Cardio</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Dentist`)}>
                <div className="category-icon"><i className="ph ph-tooth"></i></div>
                <span>Dentist</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Eye`)}>
                <div className="category-icon"><i className="ph ph-eye"></i></div>
                <span>Eye</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Neurologist`)}>
                <div className="category-icon"><i className="ph ph-brain"></i></div>
                <span>Neuro</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Orthopedic`)}>
                <div className="category-icon"><i className="ph ph-bone"></i></div>
                <span>Ortho</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=Pediatrician`)}>
                <div className="category-icon"><i className="ph ph-baby"></i></div>
                <span>Pedia</span>
              </a>
              <a className="category-item" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}?spec=General`)}>
                <div className="category-icon"><i className="ph ph-bandaids"></i></div>
                <span>General</span>
              </a>
              <a className="category-item" onClick={() => router.push(FIND_DOCTORS_ROUTE)}>
                <div className="category-icon"><i className="ph ph-squares-four"></i></div>
                <span>More</span>
              </a>
            </div>

            {/* Top Rated Doctors (Real Data from doctors table) */}
            <div className="section-header">
              <h2>Top Rated Doctors</h2>
              <a onClick={() => router.push(FIND_DOCTORS_ROUTE)}>See All</a>
            </div>

            <div className="horizontal-scroll">
              {topDoctors.length > 0 ? (
                topDoctors.map((doc, idx) => (
                  <div className="doctor-card" key={doc.id}>
                    <img 
                      src={doc.avatar_url || `https://images.unsplash.com/photo-${1537368910025 + idx}?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80`} 
                      alt={doc.full_name} 
                    />
                    <h4>{doc.full_name}</h4>
                    <p>{doc.specialization}</p>
                    <div className="rating">
                      <i className="ph-fill ph-star"></i> {doc.rating || "4.8"} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({doc.reviews_count || "98"})</span>
                    </div>
                    <button className="btn-book" onClick={() => router.push(`${FIND_DOCTORS_ROUTE}/${doc.id}`)}>
                      Book Visit
                    </button>
                  </div>
                ))
              ) : (
                <div className="doctor-card" style={{ minWidth: "100%" }}>
                  <p style={{ marginTop: "10px" }}>No doctors found.</p>
                </div>
              )}
            </div>

            {/* Promo Banner */}
            <div className="promo-banner">
              <div className="promo-text">
                <h3>Get 20% Off</h3>
                <p>On your first consultation</p>
              </div>
              <a className="promo-btn">Claim Now</a>
            </div>

          </div>

          {/* Bottom Navigation */}
          <div className="bottom-nav">
            <a className="nav-item active" onClick={() => router.push("/patient")}>
              <i className="ph-fill ph-house"></i>
              <span>Home</span>
            </a>
            <a className="nav-item" onClick={() => router.push("/patient/appointments")}>
              <i className="ph ph-calendar-blank"></i>
              <span>Schedule</span>
            </a>
            <a className="nav-item" onClick={() => router.push("/patient/chats")}>
              <i className="ph ph-chat-circle-dots"></i>
              <span>Messages</span>
            </a>
            <a className="nav-item" onClick={() => router.push("/patient/profile")}>
              <i className="ph ph-user"></i>
              <span>Profile</span>
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
