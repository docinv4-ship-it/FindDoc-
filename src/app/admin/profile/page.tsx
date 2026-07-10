"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, Save, User, Shield, Bell, Lock, Check, AlertCircle, ChevronRight
} from "lucide-react";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<{
    email: string;
    role: string;
    permissions: Record<string, boolean>;
  } | null>(null);

  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    email: "",
    email_notifications: true,
    push_notifications: true,
    two_factor_enabled: false,
  });

  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/admin/login"); return; }

        setProfile(prev => ({ ...prev, email: user.email || "" }));

        // Get admin role
        const response = await fetch("/api/admin/auth");
        const data = await response.json();

        if (data.authorized) {
          setAdminData({
            email: user.email || "",
            role: data.role,
            permissions: data.permissions || {},
          });

          // Check for profile settings
          const { data: profileSettings } = await supabase
            .from("platform_settings")
            .select("value")
            .eq("key", `admin_profile_${user.id}`)
            .single();

          if (profileSettings?.value) {
            setProfile(prev => ({ ...prev, ...profileSettings.value }));
          }
        } else {
          router.push("/admin/login");
        }
      } catch (err) {
        console.error("Error loading admin profile:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAdmin();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: upsertError } = await supabase
        .from("platform_settings")
        .upsert({
          key: `admin_profile_${user.id}`,
          value: profile,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (upsertError) throw upsertError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile");
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
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your admin profile and preferences</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" /> Saved
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> {error}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5" style={{ color: "#36d1cf" }} />
          <h2 className="text-lg font-semibold text-gray-900">Account Info</h2>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input
                type="text"
                value={adminData?.role?.replace("_", " ") || ""}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 capitalize"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5" style={{ color: "#36d1cf" }} />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/admin/password")}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Change Password</p>
              <p className="text-sm text-gray-500">Update your password regularly for security</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <button
              onClick={() => setProfile({ ...profile, two_factor_enabled: !profile.two_factor_enabled })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                profile.two_factor_enabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  profile.two_factor_enabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5" style={{ color: "#36d1cf" }} />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive important updates via email</p>
            </div>
            <button
              onClick={() => setProfile({ ...profile, email_notifications: !profile.email_notifications })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                profile.email_notifications ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  profile.email_notifications ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Push Notifications</p>
              <p className="text-sm text-gray-500">Get real-time alerts in the browser</p>
            </div>
            <button
              onClick={() => setProfile({ ...profile, push_notifications: !profile.push_notifications })}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                profile.push_notifications ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  profile.push_notifications ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5" style={{ color: "#36d1cf" }} />
          <h2 className="text-lg font-semibold text-gray-900">Permissions</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {adminData?.permissions && Object.entries(adminData.permissions).map(([key, value]) => (
            <span
              key={key}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              }`}
            >
              {key.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 text-white font-medium rounded-lg flex items-center justify-center gap-2"
        style={{ backgroundColor: "#36d1cf" }}
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        Save Changes
      </button>
    </div>
  );
}
