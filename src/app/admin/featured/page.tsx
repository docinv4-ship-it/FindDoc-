"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, Star, Search, Check, X, Clock, Calendar, User, Sparkles, AlertCircle
} from "lucide-react";
import type { Database } from "@/types/database";

type FeaturedListing = Database["public"]["Tables"]["featured_listings"]["Row"] & {
  doctors: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
    profile_image_url: string | null;
  };
  subscription: {
    id: string;
    status: string;
    billing_cycle: string | null;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  expired: "bg-red-100 text-red-800",
};

export default function AdminFeaturedPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    fetchListings();
  }, [statusFilter]);

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from("featured_listings")
      .select(`
        *,
        doctors(id, full_name, email, specialization, profile_image_url),
        subscription:doctor_subscriptions(id, status, billing_cycle)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setListings(data);
    setLoading(false);
  };

  const filteredListings = listings.filter((list) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      list.doctors?.full_name?.toLowerCase().includes(q) ||
      list.doctors?.email?.toLowerCase().includes(q) ||
      list.doctors?.specialization?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === "active").length,
    inactive: listings.filter(l => l.status === "inactive").length,
    expired: listings.filter(l => l.status === "expired").length,
  };

  const handleActivate = async (listingId: string, duration: number) => {
    setActionLoading(true);
    const now = new Date();
    const expires = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    await supabase
      .from("featured_listings")
      .update({
        status: "active",
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", listingId);
    fetchListings();
    setActionLoading(false);
  };

  const handleDeactivate = async (listingId: string) => {
    setActionLoading(true);
    await supabase
      .from("featured_listings")
      .update({
        status: "inactive",
        expires_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);
    fetchListings();
    setActionLoading(false);
  };

  const handleExtend = async (listingId: string, days: number) => {
    setActionLoading(true);
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;

    const currentExpiry = listing.expires_at ? new Date(listing.expires_at) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await supabase
      .from("featured_listings")
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", listingId);
    fetchListings();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Featured Listings</h1>
          <p className="text-gray-600 mt-1">Manage featured doctor placements and visibility</p>
        </div>
        <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-800">{stats.active} active</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <Star className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Listings</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <X className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{stats.inactive + stats.expired}</p>
              <p className="text-sm text-gray-500">Inactive/Expired</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name or email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredListings.length > 0 ? (
          filteredListings.map((listing) => {
            const isExpired = listing.expires_at && new Date(listing.expires_at) < new Date();
            const daysRemaining = listing.expires_at
              ? Math.max(0, Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0;

            return (
              <div
                key={listing.id}
                className={`bg-white rounded-xl border overflow-hidden ${listing.status === "active" && !isExpired ? "border-l-4" : "border-gray-200"}`}
                style={listing.status === "active" && !isExpired ? { borderLeftColor: "#36d1cf" } : {}}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: listing.status === "active" ? "#e6faf9" : "#f3f4f6" }}>
                        {listing.doctors?.profile_image_url ? (
                          <img src={listing.doctors.profile_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-7 h-7" style={{ color: listing.status === "active" ? "#36d1cf" : "#9ca3af" }} />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {listing.doctors?.full_name}
                          {listing.status === "active" && !isExpired && (
                            <Star className="w-4 h-4 fill-current" style={{ color: "#36d1cf" }} />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">{listing.doctors?.specialization}</p>
                        <p className="text-xs text-gray-500 mt-1">{listing.doctors?.email}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[isExpired ? "expired" : listing.status]}`}>
                      {isExpired ? "expired" : listing.status}
                    </span>
                  </div>

                  {listing.status === "active" && !isExpired && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(listing.expires_at!).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {listing.subscription && (
                    <div className="mt-2 text-xs text-gray-500">
                      Subscription: <span className="font-medium">{listing.subscription.status}</span>
                      {listing.subscription.billing_cycle && ` (${listing.subscription.billing_cycle})`}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {listing.status !== "active" || isExpired ? (
                      <button
                        onClick={() => handleActivate(listing.id, 30)}
                        disabled={actionLoading}
                        className="flex-1 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ backgroundColor: "#36d1cf" }}
                      >
                        <Sparkles className="w-4 h-4" /> Activate 30 days
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleExtend(listing.id, 30)}
                          disabled={actionLoading}
                          className="flex-1 py-2 border text-sm font-medium rounded-lg disabled:opacity-50"
                          style={{ borderColor: "#36d1cf", color: "#239999" }}
                        >
                          +30 days
                        </button>
                        <button
                          onClick={() => handleDeactivate(listing.id)}
                          disabled={actionLoading}
                          className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
              <Star className="w-8 h-8" style={{ color: "#36d1cf" }} />
            </div>
            <p className="text-gray-900 font-medium">No featured listings found</p>
            <p className="text-sm text-gray-500 mt-1">Featured listings will appear here when activated</p>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-900">Featured Listing Benefits</p>
          <p className="text-sm text-blue-700 mt-1">Featured doctors appear at the top of search results, have a featured badge on their profile, and are shown in the homepage featured section.</p>
        </div>
      </div>
    </div>
  );
}
