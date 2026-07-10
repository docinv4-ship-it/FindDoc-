"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Stethoscope, Calendar, Clock, Shield, MessageCircle, Star, ArrowRight, User, MapPin, Loader2 } from "lucide-react";
import type { Database } from "@/types/database";

type Doctor = Database["public"]["Tables"]["doctors"]["Row"];

interface FeaturedDoctor extends Doctor {
  clinics: { id: string; name: string; address: string; city: string; consultation_fee: number }[];
  featured_listings: { status: string; expires_at: string }[];
}

function FeaturedDoctorsSection() {
  const [doctors, setDoctors] = useState<FeaturedDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select(`*, clinics (id, name, address, city, consultation_fee), featured_listings!inner (status, expires_at)`)
        .eq("is_onboarded", true)
        .eq("featured_listings.status", "active")
        .limit(6);
      if (!error && data) {
        const filtered = (data as FeaturedDoctor[]).filter(d =>
          d.featured_listings?.some(f =>
            f.status === "active" && new Date(f.expires_at) > new Date()
          )
        );
        setDoctors(filtered);
      }
      setLoading(false);
    };
    fetchFeatured();
  }, [supabase]);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#36d1cf" }} />
        </div>
      </section>
    );
  }

  if (doctors.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
            <Star className="w-4 h-4 fill-current" /> Featured Doctors
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Top-Rated Healthcare Professionals</h2>
          <p className="text-gray-600 mt-2">Discover our featured doctors with excellent patient reviews</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => {
            const clinic = doctor.clinics?.[0];
            return (
              <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative">
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 text-xs font-medium rounded-full text-white flex items-center gap-1" style={{ backgroundColor: "#36d1cf" }}>
                    <Star className="w-3 h-3 fill-current" />Featured
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e6faf9" }}>
                      {doctor.profile_image_url ? (
                        <img src={doctor.profile_image_url} alt={doctor.full_name || ""} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User className="w-8 h-8" style={{ color: "#36d1cf" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{doctor.full_name}</h3>
                      <p className="text-sm font-medium" style={{ color: "#36d1cf" }}>{doctor.specialization}</p>
                    </div>
                  </div>
                  {clinic && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{clinic.name}</p>
                          <p className="text-xs text-gray-500">{clinic.city}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => router.push(`/doctor/${doctor.id}`)}
                    className="mt-4 w-full py-2.5 text-white font-medium rounded-lg transition-colors"
                    style={{ backgroundColor: "#36d1cf" }}
                  >
                    View Profile & Book
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-8">
          <Link href="/patient" className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "#36d1cf" }}>
            View All Doctors <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">DocFind</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/patient" className="text-gray-600 hover:text-gray-900 transition-colors">Find a Doctor</Link>
              <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors">About</Link>
              <Link href="/contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
              <Link href="/faq" className="text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/search" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">Find Doctors</Link>
              <Link href="/doctor/login" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">Doctor Login</Link>
              <Link href="/doctor/signup" className="px-5 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90" style={{ backgroundColor: "#36d1cf" }}>Join as Doctor</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f0fffe 0%, #ffffff 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                <Shield className="w-4 h-4" />
                Trusted by 10,000+ patients
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                Book Appointments with Top Doctors
                <span style={{ color: "#36d1cf" }}> Instantly</span>
              </h1>
              <p className="text-lg text-gray-600 mt-6 max-w-lg">
                Find verified doctors, check real-time availability, and book appointments in seconds. No waiting rooms, no hassle.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/patient" className="px-8 py-4 rounded-xl text-white font-semibold transition-all hover:opacity-90 text-center" style={{ backgroundColor: "#36d1cf" }}>Find a Doctor</Link>
                <Link href="/patient/appointments" className="px-8 py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold transition-all hover:bg-gray-50 text-center">My Appointments</Link>
              </div>
              <div className="mt-8 flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <User className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">500+</p>
                    <p className="text-sm text-gray-500">Verified Doctors</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <Calendar className="w-5 h-5" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">50k+</p>
                    <p className="text-sm text-gray-500">Appointments</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block relative">
              <div className="relative bg-white rounded-2xl p-8 shadow-2xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                    <Stethoscope className="w-8 h-8" style={{ color: "#36d1cf" }} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Next Available</p>
                    <p className="text-gray-500">Today at 2:30 PM</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {["Dr. Sarah Johnson - Cardiology", "Dr. Michael Chen - Dermatology", "Dr. Emily Davis - Pediatrics"].map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100">
                      <span className="text-gray-700">{doc}</span>
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>Available</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Why Choose DocFind?</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Experience healthcare booking that puts you first</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Clock, title: "Instant Booking", desc: "Book appointments in seconds with real-time availability" },
              { icon: Shield, title: "Verified Doctors", desc: "All doctors are verified and credentials checked" },
              { icon: MessageCircle, title: "Direct Chat", desc: "Chat directly with doctors before your visit" },
              { icon: Star, title: "Patient Reviews", desc: "Read real reviews from verified patients" },
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#e6faf9" }}>
                  <feature.icon className="w-7 h-7" style={{ color: "#36d1cf" }} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedDoctorsSection />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">For Doctors</h2>
              <p className="text-lg text-gray-600 mt-4">Grow your practice and manage appointments effortlessly with our powerful tools.</p>
              <ul className="mt-8 space-y-4">
                {["Smart calendar with availability management", "Direct patient chat and follow-ups", "Analytics and patient insights", "Accept both manual and auto-confirmed bookings"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#36d1cf" }}>
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/doctor/signup" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90" style={{ backgroundColor: "#36d1cf" }}>
                Join as a Doctor <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-4xl font-bold" style={{ color: "#36d1cf" }}>98%</p>
                <p className="text-gray-600 mt-2">Patient Satisfaction</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-4xl font-bold" style={{ color: "#36d1cf" }}>24/7</p>
                <p className="text-gray-600 mt-2">Online Booking</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-4xl font-bold" style={{ color: "#36d1cf" }}>2min</p>
                <p className="text-gray-600 mt-2">Avg. Booking Time</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-4xl font-bold" style={{ color: "#36d1cf" }}>100+</p>
                <p className="text-gray-600 mt-2">Specializations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: "#36d1cf" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to Book Your Appointment?</h2>
          <p className="text-xl text-white/90 mt-4">Join thousands of patients who trust DocFind for their healthcare needs.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/patient" className="px-8 py-4 bg-white rounded-lg font-semibold transition-colors hover:bg-gray-100" style={{ color: "#36d1cf" }}>Find a Doctor</Link>
            <Link href="/doctor/signup" className="px-8 py-4 border-2 border-white rounded-lg font-semibold text-white transition-colors hover:bg-white/10">Register Your Clinic</Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <Link href="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold">DocFind</span>
              </Link>
              <p className="text-gray-400">Your trusted healthcare booking platform. Find doctors, book appointments, and manage your health.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/search" className="hover:text-white transition-colors">Find a Doctor</Link></li>
                <li><Link href="/patient" className="hover:text-white transition-colors">Patient Portal</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Doctors</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/doctor/signup" className="hover:text-white transition-colors">Join as Doctor</Link></li>
                <li><Link href="/doctor/login" className="hover:text-white transition-colors">Doctor Login</Link></li>
                <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/dev-docs" className="hover:text-white transition-colors">Developer Docs</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">© 2026 DocFind. All rights reserved.</p>
            <p className="text-gray-400 text-sm">Developed by <span className="font-semibold text-white">Sheraz Khan</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
