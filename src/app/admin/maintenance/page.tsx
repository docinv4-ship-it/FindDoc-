"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, AlertTriangle, Save, Check, Power, Calendar, Clock, Bell
} from "lucide-react";

export default function MaintenanceModePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState({
    enabled: false,
    message: "System is under maintenance. Please try again later.",
    scheduledStart: "",
    scheduledEnd: "",
    allowAdminAccess: true,
    notifyUsers: true,
  });
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const loadMaintenanceSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/admin/login"); return; }

        // Check admin authorization
        const response = await fetch("/api/admin/auth");
        const data = await response.json();
        if (!data.authorized) {
          router.push("/admin/login");
          return;
        }

        // Load maintenance settings
        const settingsResponse = await fetch("/api/maintenance");
        const settingsData = await settingsResponse.json();

        if (settingsData) {
          setMaintenanceData({
            enabled: settingsData.enabled || false,
            message: settingsData.message || "System is under maintenance. Please try again later.",
            scheduledStart: settingsData.scheduledStart || "",
            scheduledEnd: settingsData.scheduledEnd || "",
            allowAdminAccess: true,
            notifyUsers: true,
          });
        }
      } catch (err) {
        console.error("Error loading maintenance settings:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMaintenanceSettings();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maintenanceData),
      });

      const data = await response.json();
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Error saving maintenance settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Mode</h1>
          <p className="text-gray-600 mt-1">Control platform maintenance and emergency closures</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" /> Saved
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl p-4 flex items-start gap-4 ${
        maintenanceData.enabled ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
      }`}>
        <Power className={`w-6 h-6 ${maintenanceData.enabled ? "text-red-600" : "text-green-600"}`} />
        <div className="flex-1">
          <p className={`font-semibold ${maintenanceData.enabled ? "text-red-900" : "text-green-900"}`}>
            {maintenanceData.enabled ? "Maintenance Mode is Active" : "System is Operating Normally"}
          </p>
          <p className={`text-sm ${maintenanceData.enabled ? "text-red-700" : "text-green-700"}`}>
            {maintenanceData.enabled
              ? "All user access is currently disabled"
              : "All features are available to users"}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              maintenanceData.enabled ? "bg-red-100" : "bg-green-100"
            }`}>
              <Power className={`w-6 h-6 ${maintenanceData.enabled ? "text-red-600" : "text-green-600"}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enable Maintenance Mode</h2>
              <p className="text-sm text-gray-500">Temporarily disable all user access to the platform</p>
            </div>
          </div>
          <button
            onClick={() => setMaintenanceData({
              ...maintenanceData,
              enabled: !maintenanceData.enabled,
            })}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              maintenanceData.enabled ? "bg-red-500" : "bg-green-500"
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                maintenanceData.enabled ? "translate-x-9" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maintenance Message
          </label>
          <textarea
            value={maintenanceData.message}
            onChange={(e) => setMaintenanceData({ ...maintenanceData, message: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="Enter a message to show users during maintenance"
          />
          <p className="text-xs text-gray-500 mt-1">This message will be displayed to all users trying to access the platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" /> Scheduled Start
            </label>
            <input
              type="datetime-local"
              value={maintenanceData.scheduledStart}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, scheduledStart: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Auto-enable at this time</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" /> Scheduled End
            </label>
            <input
              type="datetime-local"
              value={maintenanceData.scheduledEnd}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, scheduledEnd: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Optional: Auto-disable at this time</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Allow Admin Access</p>
              <p className="text-sm text-gray-500">Admins can still access the dashboard during maintenance</p>
            </div>
            <button
              onClick={() => setMaintenanceData({
                ...maintenanceData,
                allowAdminAccess: !maintenanceData.allowAdminAccess,
              })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                maintenanceData.allowAdminAccess ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  maintenanceData.allowAdminAccess ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Notify Users</p>
              <p className="text-sm text-gray-500">Send email notification to affected users</p>
            </div>
            <button
              onClick={() => setMaintenanceData({
                ...maintenanceData,
                notifyUsers: !maintenanceData.notifyUsers,
              })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                maintenanceData.notifyUsers ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  maintenanceData.notifyUsers ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Warning */}
      {maintenanceData.enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Warning: Maintenance Mode Active</p>
            <p className="text-sm text-amber-700 mt-1">
              All users will see the maintenance message. Make sure to disable maintenance mode when done.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 text-white font-medium rounded-lg flex items-center justify-center gap-2 ${
          maintenanceData.enabled ? "bg-red-500 hover:bg-red-600" : ""
        }`}
        style={maintenanceData.enabled ? {} : { backgroundColor: "#36d1cf" }}
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        {maintenanceData.enabled ? "Save & Keep Maintenance Active" : "Save Settings"}
      </button>
    </div>
  );
}
