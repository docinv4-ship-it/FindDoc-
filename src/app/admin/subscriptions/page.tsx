"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, CreditCard, Search, Filter, Check, X, Clock, AlertTriangle, RefreshCw,
  User, ChevronDown, Download
} from "lucide-react";
import type { Database } from "@/types/database";

type DoctorSubscription = Database["public"]["Tables"]["doctor_subscriptions"]["Row"] & {
  doctors: {
    id: string;
    full_name: string;
    email: string;
    specialization: string;
  };
  subscription_plans: {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  past_due: "bg-red-100 text-red-800",
  grace: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-gray-100 text-gray-800",
  expired: "bg-gray-100 text-gray-600",
};

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<DoctorSubscription[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSub, setSelectedSub] = useState<DoctorSubscription | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    let query = supabase
      .from("doctor_subscriptions")
      .select(`
        *,
        doctors(id, full_name, email, specialization),
        subscription_plans(id, name, slug, price_monthly, price_yearly)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setSubscriptions(data);
    setLoading(false);
  };

  const filteredSubs = subscriptions.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sub.doctors?.full_name?.toLowerCase().includes(q) ||
      sub.doctors?.email?.toLowerCase().includes(q) ||
      sub.subscription_plans?.name?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === "active").length,
    trial: subscriptions.filter(s => s.status === "trial").length,
    grace: subscriptions.filter(s => s.status === "grace").length,
    pastDue: subscriptions.filter(s => s.status === "past_due").length,
    cancelled: subscriptions.filter(s => s.status === "cancelled").length,
  };

  const handleExtendTrial = async (subId: string, days: number) => {
    setActionLoading(true);
    const newEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await supabase
      .from("doctor_subscriptions")
      .update({
        trial_ends_at: newEndDate.toISOString(),
        status: "trial",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subId);
    fetchSubscriptions();
    setSelectedSub(null);
    setActionLoading(false);
  };

  const handleActivate = async (subId: string) => {
    setActionLoading(true);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await supabase
      .from("doctor_subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", subId);
    fetchSubscriptions();
    setSelectedSub(null);
    setActionLoading(false);
  };

  const handleSuspend = async (subId: string) => {
    setActionLoading(true);
    await supabase
      .from("doctor_subscriptions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subId);
    fetchSubscriptions();
    setSelectedSub(null);
    setActionLoading(false);
  };

  const exportData = () => {
    const csv = [
      ["Doctor", "Email", "Plan", "Status", "Cycle", "Period End", "Trial End"].join(","),
      ...filteredSubs.map(s => [
        s.doctors?.full_name,
        s.doctors?.email,
        s.subscription_plans?.name || "Trial",
        s.status,
        s.billing_cycle || "N/A",
        s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "N/A",
        s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString() : "N/A",
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-1">Manage doctor subscriptions and billing</p>
        </div>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.trial}</p>
          <p className="text-xs text-gray-500">Trial</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.grace}</p>
          <p className="text-xs text-gray-500">Grace Period</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.pastDue}</p>
          <p className="text-xs text-gray-500">Past Due</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{stats.cancelled}</p>
          <p className="text-xs text-gray-500">Cancelled</p>
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
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="grace">Grace Period</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                          <User className="w-5 h-5" style={{ color: "#36d1cf" }} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{sub.doctors?.full_name}</p>
                          <p className="text-sm text-gray-500">{sub.doctors?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">{sub.subscription_plans?.name || "Trial"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {sub.billing_cycle ? (sub.billing_cycle === "monthly" ? "Monthly" : "Yearly") : "—"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {sub.status === "trial" && sub.trial_ends_at
                        ? new Date(sub.trial_ends_at).toLocaleDateString()
                        : sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {sub.status === "trial" && (
                          <button
                            onClick={() => handleExtendTrial(sub.id, 7)}
                            className="text-xs px-2 py-1 rounded border text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            +7 days
                          </button>
                        )}
                        {sub.status !== "active" && sub.status !== "trial" && (
                          <button
                            onClick={() => handleActivate(sub.id)}
                            className="text-xs px-2 py-1 rounded border text-green-600 border-green-200 hover:bg-green-50"
                          >
                            Activate
                          </button>
                        )}
                        {sub.status === "active" && (
                          <button
                            onClick={() => handleSuspend(sub.id)}
                            className="text-xs px-2 py-1 rounded border text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: "#e6faf9", color: "#239999" }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedSub(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Subscription Details</h2>
              <button onClick={() => setSelectedSub(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-10 h-10 p-2 rounded-lg" style={{ backgroundColor: "#e6faf9", color: "#36d1cf" }} />
                <div>
                  <p className="font-medium text-gray-900">{selectedSub.doctors?.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedSub.doctors?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Plan</p>
                  <p className="font-medium text-gray-900">{selectedSub.subscription_plans?.name || "Trial"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selectedSub.status]}`}>
                    {selectedSub.status}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500">Billing Cycle</p>
                  <p className="font-medium text-gray-900">{selectedSub.billing_cycle || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">External ID</p>
                  <p className="font-medium text-gray-900 text-xs">{selectedSub.external_subscription_id || "N/A"}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 flex gap-2">
                {selectedSub.status === "trial" && (
                  <button onClick={() => { handleExtendTrial(selectedSub.id, 7); }} disabled={actionLoading} className="flex-1 py-2 border rounded-lg text-sm font-medium text-blue-600 border-blue-200 disabled:opacity-50">Extend Trial +7d</button>
                )}
                {selectedSub.status !== "active" && (
                  <button onClick={() => { handleActivate(selectedSub.id); }} disabled={actionLoading} className="flex-1 py-2 border rounded-lg text-sm font-medium text-green-600 border-green-200 disabled:opacity-50">Activate</button>
                )}
                {selectedSub.status === "active" && (
                  <button onClick={() => { handleSuspend(selectedSub.id); }} disabled={actionLoading} className="flex-1 py-2 border rounded-lg text-sm font-medium text-red-600 border-red-200 disabled:opacity-50">Suspend</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
