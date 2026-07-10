"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Phone, Globe, Star, Calendar, User, Shield } from "lucide-react";

export default function DoctorProfilePreviewPage() {
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<{
    id: string;
    full_name: string;
    specialization: string;
    profile_image_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
    whatsapp_number: string | null;
    website_url: string | null;
    license_number: string | null;
    is_verified: boolean;
  } | null>(null);
  const [clinic, setClinic] = useState<{
    id: string;
    name: string;
    slug: string | null;
    address: string;
    city: string;
    phone: string | null;
    consultation_fee: number;
    logo_url: string | null;
  } | null>(null);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctorData } = await supabase.from("doctors").select("id, full_name, specialization, profile_image_url, facebook_url, instagram_url, linkedin_url, whatsapp_number, website_url, license_number, is_verified").eq("user_id", user.id).single();
      if (doctorData) {
        setDoctor(doctorData);
        const { data: clinicData } = await supabase.from("clinics").select("id, name, slug, address, city, phone, consultation_fee, logo_url").eq("doctor_id", doctorData.id).single();
        if (clinicData) setClinic(clinicData);
        const { data: reviews } = await supabase.from("reviews").select("rating").eq("doctor_id", doctorData.id).eq("is_verified", true);
        if (reviews && reviews.length > 0) {
          setAvgRating(reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length);
          setTotalReviews(reviews.length);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  if (!doctor) return <div className="text-center py-12 text-gray-500">Doctor profile not found</div>;

  const profileUrl = clinic?.slug ? `${window.location.origin}/clinic/${clinic.slug}` : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Preview</h1>
        <p className="text-sm text-gray-500 mt-1">See how patients view your public profile</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r" style={{ background: "linear-gradient(135deg, #36d1cf 0%, #239999 100%)" }} />

        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-xl bg-white border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
              {doctor.profile_image_url ? (
                <img src={doctor.profile_image_url} alt={doctor.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{doctor.full_name}</h2>
                {doctor.is_verified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                    <Shield className="w-3 h-3" />Verified
                  </span>
                )}
              </div>
              <p className="text-gray-600">{doctor.specialization}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            {avgRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({totalReviews} reviews)</span>
              </div>
            )}
          </div>

          {profileUrl && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Public Profile URL</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-900 flex-1 truncate">{profileUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(profileUrl)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
                  <Globe className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {clinic && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Clinic Information</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">{clinic.name}</p>
                <p className="text-sm text-gray-600">{clinic.address}, {clinic.city}</p>
              </div>
            </div>
            {clinic.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{clinic.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">${clinic.consultation_fee} consultation fee</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Contact & Social</h3>
        <div className="space-y-3">
          {doctor.whatsapp_number && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">{doctor.whatsapp_number}</span>
            </div>
          )}
          {(doctor.facebook_url || doctor.instagram_url || doctor.linkedin_url || doctor.website_url) && (
            <div className="flex items-center gap-3 flex-wrap mt-4">
              {doctor.website_url && (
                <a href={doctor.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {doctor.facebook_url && (
                <a href={doctor.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                  <Globe className="w-4 h-4" /> Facebook
                </a>
              )}
              {doctor.instagram_url && (
                <a href={doctor.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                  <Globe className="w-4 h-4" /> Instagram
                </a>
              )}
              {doctor.linkedin_url && (
                <a href={doctor.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                  <Globe className="w-4 h-4" /> LinkedIn
                </a>
              )}
            </div>
          )}
          {!doctor.whatsapp_number && !doctor.facebook_url && !doctor.instagram_url && !doctor.linkedin_url && !doctor.website_url && (
            <p className="text-gray-500 text-sm">No social links added yet. Add them in Settings.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Verification Status</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: doctor.is_verified ? "#e6faf9" : "#fef3c7" }}>
            <Shield className="w-5 h-5" style={{ color: doctor.is_verified ? "#36d1cf" : "#ca8a04" }} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{doctor.is_verified ? "Verified Doctor" : "Pending Verification"}</p>
            <p className="text-sm text-gray-500">
              {doctor.is_verified ? "Your profile has been verified by the platform" : "Submit your credentials for verification in Settings"}
            </p>
          </div>
        </div>
        {doctor.license_number && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">License Number: <span className="font-medium text-gray-900">{doctor.license_number}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
