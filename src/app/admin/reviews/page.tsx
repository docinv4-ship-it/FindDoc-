"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Star, User, Eye, EyeOff, Trash2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;
  created_at: string;
  doctor_id: string;
  doctors: { full_name: string } | null;
  patients: { full_name: string } | null;
}

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, hidden: 0, avgRating: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: reviewsData } = await supabase.from("reviews").select("id, rating, comment, is_verified, created_at, doctor_id, doctors (full_name), patients (full_name)").order("created_at", { ascending: false });
      if (reviewsData) {
        setReviews(reviewsData);
        const total = reviewsData.length;
        const verified = reviewsData.filter((r: Review) => r.is_verified).length;
        const hidden = total - verified;
        const avgRating = total > 0 ? reviewsData.reduce((sum: number, r: Review) => sum + r.rating, 0) / total : 0;
        setStats({ total, verified, hidden, avgRating });
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleToggleVisibility = async (reviewId: string, currentVerified: boolean) => {
    await supabase.from("reviews").update({ is_verified: !currentVerified }).eq("id", reviewId);
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, is_verified: !currentVerified } : r));
    setStats((prev) => ({
      ...prev,
      verified: currentVerified ? prev.verified - 1 : prev.verified + 1,
      hidden: currentVerified ? prev.hidden + 1 : prev.hidden - 1,
    }));
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    await supabase.from("reviews").delete().eq("id", reviewId);
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setStats((prev) => ({ ...prev, total: prev.total - 1 }));
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
        <h1 className="text-2xl font-bold text-gray-900">Reviews Moderation</h1>
        <p className="text-gray-600 mt-1">Manage and moderate patient reviews</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Verified</p>
          <p className="text-2xl font-bold" style={{ color: "#36d1cf" }}>{stats.verified}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Hidden</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.hidden}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Avg Rating</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
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
                      <p className="text-sm text-gray-500">Doctor: {review.doctors?.full_name || "N/A"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.rating)}
                        <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.is_verified ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>Verified</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Hidden</span>
                    )}
                    <button onClick={() => handleToggleVisibility(review.id, review.is_verified)} className={`p-2 rounded-lg transition-colors ${review.is_verified ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500" : ""}`} style={!review.is_verified ? { backgroundColor: "#e6faf9", color: "#36d1cf" } : {}}>
                      {review.is_verified ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(review.id)} className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {review.comment && <p className="text-gray-600 mt-3 text-sm ml-13">{review.comment}</p>}
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
