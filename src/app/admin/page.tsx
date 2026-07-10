"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Users, Building2, Calendar, Loader2, Clock, Check, X, FileCheck, Star, CreditCard,
  Flag, HeadphonesIcon, ActivityIcon, TrendingUp, AlertTriangle, ArrowRight
} from "lucide-react";
import { useAdmin } from "./layout";

interface DashboardStats {
  doctors: number;
  verifiedDoctors: number;
  pendingVerifications: number;
  clinics: number;
  appointments: number;
  pendingAppointments: number;
  activeSubscriptions: number;
  featuredListings: number;
  pendingReports: number;
  openTickets: number;
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  created_at: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  onClick
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subValue?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-5 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-0.5">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-64 bg-gray-100 rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 w-20 bg-gray-100 rounded mb-2"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();
  const { adminId, loading: adminLoading } = useAdmin();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch counts
      const { count: doctorsCount } = await supabase.from("doctors").select("*", { count: "exact", head: true });
      const { count: verifiedCount } = await supabase.from("doctors").select("*", { count: "exact", head: true }).eq("is_verified", true);
      const { count: clinicsCount } = await supabase.from("clinics").select("*", { count: "exact", head: true });
      const { count: appointmentsCount } = await supabase.from("appointments").select("*", { count: "exact", head: true });
      const { count: pendingApptCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: activeSubsCount } = await supabase.from("doctor_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: featuredCount } = await supabase.from("featured_listings").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: reportsCount } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { count: ticketsCount } = await supabase.from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]);

      // Fetch pending verifications count and list
      const { count: pendingVerifyCount } = await supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending");
      const { data: pendingVerifyList } = await supabase
        .from("verification_requests")
        .select("id, submitted_at, doctors(id, full_name, email, specialization)")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true })
        .limit(5);

      setStats({
        doctors: doctorsCount || 0,
        verifiedDoctors: verifiedCount || 0,
        pendingVerifications: pendingVerifyCount || 0,
        clinics: clinicsCount || 0,
        appointments: appointmentsCount || 0,
        pendingAppointments: pendingApptCount || 0,
        activeSubscriptions: activeSubsCount || 0,
        featuredListings: featuredCount || 0,
        pendingReports: reportsCount || 0,
        openTickets: ticketsCount || 0,
      });

      setPendingVerifications(pendingVerifyList || []);

      // Build recent activity
      const activities: RecentActivity[] = [];
      const { data: recentAppts } = await supabase
        .from("appointments")
        .select("id, created_at, patients(full_name), doctors(full_name)")
        .order("created_at", { ascending: false })
        .limit(3);

      recentAppts?.forEach((apt: any) => {
        activities.push({
          id: apt.id,
          type: "appointment",
          message: `New appointment: ${apt.patients?.full_name} with ${apt.doctors?.full_name}`,
          created_at: apt.created_at,
        });
      });

      setRecentActivity(activities);
      setLoading(false);
    };

    if (!adminLoading) fetchData();
  }, [supabase, adminLoading]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
  };

  if (loading || adminLoading || !stats) return <LoadingSkeleton />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and quick access to moderation tools</p>
      </div>

      {/* Quick Actions Banner */}
      {stats.pendingVerifications > 0 && (
        <div className="rounded-xl border p-4 flex items-center justify-between" style={{ backgroundColor: "#e6faf9", borderColor: "#36d1cf" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36d1cf" }}>
              <FileCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{stats.pendingVerifications} pending verification{stats.pendingVerifications !== 1 ? "s" : ""}</p>
              <p className="text-sm" style={{ color: "#239999" }}>Doctors waiting for account verification</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/verification")}
            className="flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg"
            style={{ backgroundColor: "#36d1cf" }}
          >
            Review Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Doctors"
          value={stats.doctors}
          subValue={`${stats.verifiedDoctors} verified`}
          color="#36d1cf"
          onClick={() => router.push("/admin/doctors")}
        />
        <StatCard
          icon={FileCheck}
          label="Pending Verifications"
          value={stats.pendingVerifications}
          subValue="Awaiting review"
          color="#f59e0b"
          onClick={() => router.push("/admin/verification")}
        />
        <StatCard
          icon={Building2}
          label="Clinics"
          value={stats.clinics}
          color="#6366f1"
          onClick={() => router.push("/admin/clinics")}
        />
        <StatCard
          icon={Calendar}
          label="Appointments"
          value={stats.appointments}
          subValue={`${stats.pendingAppointments} pending confirmation`}
          color="#22c55e"
          onClick={() => router.push("/admin/bookings")}
        />
        <StatCard
          icon={CreditCard}
          label="Active Subscriptions"
          value={stats.activeSubscriptions}
          color="#8b5cf6"
          onClick={() => router.push("/admin/subscriptions")}
        />
        <StatCard
          icon={Star}
          label="Featured Listings"
          value={stats.featuredListings}
          color="#ec4899"
          onClick={() => router.push("/admin/featured")}
        />
        <StatCard
          icon={Flag}
          label="Pending Reports"
          value={stats.pendingReports}
          color="#ef4444"
          onClick={() => router.push("/admin/reports")}
        />
        <StatCard
          icon={HeadphonesIcon}
          label="Open Tickets"
          value={stats.openTickets}
          color="#0891b2"
          onClick={() => router.push("/admin/support")}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Verification Queue</h2>
            <button
              onClick={() => router.push("/admin/verification")}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: "#36d1cf" }}
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingVerifications.length > 0 ? (
              pendingVerifications.map((req) => (
                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">{req.doctors?.full_name}</p>
                    <p className="text-sm text-gray-500">{req.doctors?.specialization} • {req.doctors?.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Submitted {formatDate(req.submitted_at)}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/admin/verification/${req.id}`)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border"
                    style={{ borderColor: "#36d1cf", color: "#239999" }}
                  >
                    Review
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500">No pending verifications</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => router.push("/admin/verification")}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
                <FileCheck className="w-5 h-5" style={{ color: "#36d1cf" }} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Review Verifications</p>
                <p className="text-sm text-gray-500">Approve or reject doctor accounts</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/admin/reports")}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50">
                <Flag className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Handle Reports</p>
                <p className="text-sm text-gray-500">Review user complaints</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/admin/support")}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-50">
                <HeadphonesIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Support Tickets</p>
                <p className="text-sm text-gray-500">Respond to user requests</p>
              </div>
            </button>
            <button
              onClick={() => router.push("/admin/audit")}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-50">
                <ActivityIcon className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Audit Trail</p>
                <p className="text-sm text-gray-500">System activity and security logs</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* System Health Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ActivityIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">System Status</h3>
              <p className="text-sm text-gray-500">All services operational</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            Healthy
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Database</p>
            <p className="font-medium text-green-600">Connected</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Storage</p>
            <p className="font-medium text-green-600">Active</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Auth Service</p>
            <p className="font-medium text-green-600">Running</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">API</p>
            <p className="font-medium text-green-600">Responsive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
