"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Users, Calendar, DollarSign, Clock, Star, BarChart3 } from "lucide-react";

export default function DoctorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalPatients: 0,
    avgRating: 0,
    totalReviews: 0,
    monthlyRevenue: 0,
    conversionRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
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

      const { data: clinics } = await supabase.from("clinics").select("id").eq("doctor_id", doctor.id).limit(1);
      if (clinics && clinics.length > 0) setClinicId(clinics[0].id);

      const { count: total } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id);
      const { count: completed } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id).eq("status", "completed");
      const { count: cancelled } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("doctor_id", doctor.id).eq("status", "cancelled");

      const { data: appointments } = await supabase.from("appointments").select("patient_id, clinic_id, clinics (consultation_fee)").eq("doctor_id", doctor.id).eq("status", "completed");
      const uniquePatients = new Set(appointments?.map((a: any) => a.patient_id) || []);

      const { data: reviews } = await supabase.from("reviews").select("rating").eq("doctor_id", doctor.id);
      const avgRating = reviews && reviews.length > 0 ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length : 0;

      const monthlyRevenue = appointments?.reduce((sum: number, a: any) => sum + (a.clinics?.consultation_fee || 0), 0) || 0;
      const conversionRate = total && total > 0 ? Math.round((completed || 0) / total * 100) : 0;

      setStats({
        totalAppointments: total || 0,
        completedAppointments: completed || 0,
        cancelledAppointments: cancelled || 0,
        totalPatients: uniquePatients.size,
        avgRating,
        totalReviews: reviews?.length || 0,
        monthlyRevenue,
        conversionRate,
      });

      // Monthly trend
      const { data: monthly } = await supabase.from("appointments").select("appointment_date").eq("doctor_id", doctor.id);
      if (monthly) {
        const monthMap = new Map<string, number>();
        monthly.forEach((a: any) => {
          const month = new Date(a.appointment_date).toLocaleDateString("en-US", { month: "short" });
          monthMap.set(month, (monthMap.get(month) || 0) + 1);
        });
        setMonthlyData(Array.from(monthMap.entries()).map(([month, count]) => ({ month, count })).slice(-6));
      }

      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Insights into your practice performance</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <Calendar className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <TrendingUp className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <Users className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#e6faf9" }}>
              <Star className="w-6 h-6" style={{ color: "#36d1cf" }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Appointment Status</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-gray-900">{stats.completedAppointments}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${stats.totalAppointments > 0 ? (stats.completedAppointments / stats.totalAppointments) * 100 : 0}%`, backgroundColor: "#36d1cf" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="text-sm font-medium text-gray-900">{stats.cancelledAppointments}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${stats.totalAppointments > 0 ? (stats.cancelledAppointments / stats.totalAppointments) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Monthly Trend</h3>
          {monthlyData.length > 0 ? (
            <div className="flex items-end gap-4 h-32">
              {monthlyData.map((item) => (
                <div key={item.month} className="flex flex-col items-center flex-1">
                  <div className="w-full rounded-t" style={{ height: `${Math.max(10, (item.count / Math.max(...monthlyData.map(d => d.count))) * 100)}%`, backgroundColor: "#36d1cf", minHeight: "20px" }} />
                  <span className="text-xs text-gray-500 mt-2">{item.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-400"><BarChart3 className="w-16 h-16 opacity-20" /></div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue Overview</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: "#36d1cf" }}>${stats.monthlyRevenue}</p>
            <p className="text-sm text-gray-500 mt-1">Est. Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.completedAppointments}</p>
            <p className="text-sm text-gray-500 mt-1">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.totalReviews}</p>
            <p className="text-sm text-gray-500 mt-1">Reviews</p>
          </div>
        </div>
      </div>
    </div>
  );
}
