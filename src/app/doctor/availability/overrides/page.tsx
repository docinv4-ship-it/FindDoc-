"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, Power, Calendar, Clock, Plus, X, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Save
} from "lucide-react";

interface Override {
  id: string;
  clinic_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  reason: string | null;
  created_at: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export default function DoctorAvailabilityOverridesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [isAway, setIsAway] = useState(false);
  const [awayMessage, setAwayMessage] = useState("");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  // New override form
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newIsAvailable, setNewIsAvailable] = useState(false);
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/doctor/login"); return; }

      const { data: doctor } = await supabase.from("doctors").select("id, is_onboarded").eq("user_id", user.id).single();
      if (!doctor?.is_onboarded) { router.push("/doctor/onboarding"); return; }

      const { data: clinic } = await supabase.from("clinics").select("id").eq("doctor_id", doctor.id).single();
      if (!clinic) { router.push("/doctor/onboarding"); return; }

      setClinicId(clinic.id);

      // Fetch existing overrides
      const { data: existingOverrides } = await supabase
        .from("availability_overrides")
        .select("*")
        .eq("clinic_id", clinic.id)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (existingOverrides) setOverrides(existingOverrides);

      // Check if away mode is set
      const { data: settings } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", `clinic_away_${clinic.id}`)
        .single();

      if (settings) {
        setIsAway(settings.value?.is_away || false);
        setAwayMessage(settings.value?.message || "");
      }

      setLoading(false);
    };
    fetchData();
  }, [supabase, router]);

  const handleToggleAway = async () => {
    if (!clinicId) return;
    setSaving(true);

    try {
      const newValue = !isAway;
      await supabase.from("platform_settings").upsert({
        key: `clinic_away_${clinicId}`,
        value: { is_away: newValue, message: awayMessage, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

      setIsAway(newValue);
    } catch (err) {
      console.error("Error toggling away mode:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !newDate) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("availability_overrides")
        .insert({
          clinic_id: clinicId,
          date: newDate,
          start_time: newStartTime || null,
          end_time: newEndTime || null,
          is_available: newIsAvailable,
          reason: newReason || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setOverrides([...overrides, data].sort((a, b) => a.date.localeCompare(b.date)));
      }

      setShowModal(false);
      setNewDate("");
      setNewStartTime("");
      setNewEndTime("");
      setNewIsAvailable(false);
      setNewReason("");
    } catch (err) {
      console.error("Error adding override:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    if (!clinicId) return;

    try {
      await supabase.from("availability_overrides").delete().eq("id", id).eq("clinic_id", clinicId);
      setOverrides(overrides.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Error deleting override:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateOverride = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return overrides.find((o) => o.date === dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Availability Overrides</h1>
        <p className="text-gray-600">Set one-time availability changes, emergency closures, or away periods</p>
      </div>

      {/* Away Mode Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAway ? "bg-red-100" : "bg-green-100"}`}>
              <Power className={`w-6 h-6 ${isAway ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isAway ? "Away Mode Active" : "Currently Available"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isAway
                  ? "All online bookings are temporarily disabled"
                  : "Patients can book appointments with you"}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAway}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              isAway ? "bg-red-500" : "bg-green-500"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                isAway ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {isAway && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Away Message</label>
            <input
              type="text"
              value={awayMessage}
              onChange={(e) => setAwayMessage(e.target.value)}
              onBlur={async () => {
                if (clinicId) {
                  await supabase.from("platform_settings").upsert({
                    key: `clinic_away_${clinicId}`,
                    value: { is_away: true, message: awayMessage },
                  }, { onConflict: "key" });
                }
              }}
              placeholder="e.g., On vacation until July 10th"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">This message will be shown to patients trying to book</p>
          </div>
        )}
      </div>

      {/* Upcoming Overrides */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Overrides</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: "#36d1cf" }}
          >
            <Plus className="w-4 h-4" /> Add Override
          </button>
        </div>

        {overrides.length > 0 ? (
          <div className="space-y-3">
            {overrides.map((o) => (
              <div
                key={o.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  o.is_available ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(o.date)}</p>
                    <p className="text-sm text-gray-500">
                      {o.start_time && o.end_time
                        ? `${o.start_time} - ${o.end_time}`
                        : "All day"}
                    </p>
                    {o.reason && <p className="text-sm text-gray-500">{o.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${o.is_available ? "text-green-700" : "text-red-700"}`}>
                    {o.is_available ? "Available" : "Unavailable"}
                  </span>
                  <button
                    onClick={() => handleDeleteOverride(o.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No upcoming overrides</p>
            <p className="text-sm text-gray-400">Add one-time availability changes above</p>
          </div>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium text-gray-900 min-w-[140px] text-center">
              {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {getDaysInMonth().map((date, index) => {
            const override = date ? isDateOverride(date) : null;
            const isPast = date ? isDatePast(date) : false;
            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm relative ${
                  isPast
                    ? "text-gray-300"
                    : override
                    ? override.is_available
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                    : ""
                }`}
              >
                {date ? (
                  <>
                    <span>{date.getDate()}</span>
                    {override && !isPast && (
                      <span
                        className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                          override.is_available ? "bg-green-500" : "bg-red-500"
                        }`}
                      />
                    )}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-gray-200" />
            <span className="text-gray-500">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100" />
            <span className="text-gray-500">Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100" />
            <span className="text-gray-500">Override (Available)</span>
          </div>
        </div>
      </div>

      {/* Add Override Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Availability Override</h3>

            <form onSubmit={handleAddOverride} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              {!newStartTime && !newEndTime && (
                <p className="text-xs text-gray-500">Leave times empty for all-day override</p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewIsAvailable(false)}
                    className={`p-3 border rounded-lg text-center ${
                      !newIsAvailable ? "border-red-500 bg-red-50" : "border-gray-200"
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <span className="text-sm font-medium">Unavailable</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIsAvailable(true)}
                    className={`p-3 border rounded-lg text-center ${
                      newIsAvailable ? "border-green-500 bg-green-50" : "border-gray-200"
                    }`}
                  >
                    <Calendar className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <span className="text-sm font-medium">Available</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g., Emergency closure, Special hours"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newDate}
                  className="flex-1 py-2.5 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#36d1cf" }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
