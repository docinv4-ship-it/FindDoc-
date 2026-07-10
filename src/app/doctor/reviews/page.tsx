"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, Star, User, Eye, EyeOff } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  patients: { full_name: string } | null;
}

export default function DoctorReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ average: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }
      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor) { router.push("/doctor/signup"); return; }
      if (!doctor.is_onboarded) { router.push("/doctor/onboarding"); return; }

      const { data: reviewsData } = await supabase.from("reviews").select("id, rating, comment, is_verified, created_at, patients (full_name)").eq("doctor_id", doctor.id).order("created_at", { ascending: false });
      if (reviewsData) {
        setReviews(reviewsData);
        const total = reviewsData.length;
        const sum = reviewsData.reduce((acc: number, r: Review) => acc + r.rating, 0);
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviewsData.forEach((r: Review) => { breakdown[r.rating as keyof typeof breakdown]++; });
        setStats({ average: total > 0 ? sum / total : 0, total, breakdown });
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleToggleVisibility = async (reviewId: string, currentVerified: boolean) => {
    await supabase.from("reviews").update({ is_verified: !currentVerified }).eq("id", reviewId);
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, is_verified: !currentVerified } : r));
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`w-4 h-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
      ))}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">Manage patient reviews and ratings</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center">
            <div className="text-5xl font-bold" style={{ color: "#36d1cf" }}>{stats.average.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-1 mt-2">{renderStars(Math.round(stats.average))}</div>
            <p className="text-sm text-gray-500 mt-2">{stats.total} review{stats.total !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-gray-900 mb-4">Rating Breakdown</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-8">{rating} star</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${stats.total > 0 ? (stats.breakdown[rating as keyof typeof stats.breakdown] / stats.total) * 100 : 0}%`, backgroundColor: "#36d1cf" }} />
                </div>
                <span className="text-sm text-gray-500 w-8">{stats.breakdown[rating as keyof typeof stats.breakdown]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {reviews.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                      <User className="w-5 h-5" style={{ color: "#36d1cf" }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{review.patients?.full_name || "Anonymous"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.is_verified && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>Verified</span>}
                    <button onClick={() => handleToggleVisibility(review.id, review.is_verified)} className={`p-2 rounded-lg transition-colors ${review.is_verified ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500" : ""}`} style={!review.is_verified ? { backgroundColor: "#e6faf9", color: "#36d1cf" } : {}}>
                      {review.is_verified ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {review.comment && <p className="text-gray-600 mt-3 text-sm">{review.comment}</p>}
                {!review.is_verified && <p className="text-xs text-gray-400 mt-2">Hidden from public profile</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reviews yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
