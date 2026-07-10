"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Bell, Mail, Smartphone, Loader2, Save, Check, AlertCircle, Calendar
} from "lucide-react";

interface NotificationPreferences {
  appointment_reminders_24h: boolean;
  appointment_reminders_2h: boolean;
  new_messages_email: boolean;
  new_messages_push: boolean;
  appointment_confirmed_email: boolean;
  appointment_cancelled_email: boolean;
  marketing_emails: boolean;
}

const defaultPreferences: NotificationPreferences = {
  appointment_reminders_24h: true,
  appointment_reminders_2h: true,
  new_messages_email: true,
  new_messages_push: true,
  appointment_confirmed_email: true,
  appointment_cancelled_email: true,
  marketing_emails: false,
};

export default function NotificationPreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/doctor/login"); return; }

        const { data: existingPrefs } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", `notification_prefs_${user.id}`)
          .single();

        if (existingPrefs?.value) {
          setPreferences({ ...defaultPreferences, ...existingPrefs.value });
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: upsertError } = await supabase
        .from("platform_settings")
        .upsert({
          key: `notification_prefs_${user.id}`,
          value: preferences,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (upsertError) throw upsertError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
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
          <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="text-gray-600 mt-1">Manage how you receive notifications</p>
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

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "#36d1cf" }} /> Appointment Reminders
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">24-Hour Reminder</p>
                <p className="text-sm text-gray-500">Get notified 24 hours before your appointment</p>
              </div>
              <button
                onClick={() => handleToggle("appointment_reminders_24h")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.appointment_reminders_24h ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.appointment_reminders_24h ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">2-Hour Reminder</p>
                <p className="text-sm text-gray-500">Get notified 2 hours before your appointment</p>
              </div>
              <button
                onClick={() => handleToggle("appointment_reminders_2h")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.appointment_reminders_2h ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.appointment_reminders_2h ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: "#36d1cf" }} /> Email Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Appointment Confirmations</p>
                <p className="text-sm text-gray-500">Receive email when appointments are confirmed</p>
              </div>
              <button
                onClick={() => handleToggle("appointment_confirmed_email")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.appointment_confirmed_email ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.appointment_confirmed_email ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Appointment Cancellations</p>
                <p className="text-sm text-gray-500">Receive email when appointments are cancelled</p>
              </div>
              <button
                onClick={() => handleToggle("appointment_cancelled_email")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.appointment_cancelled_email ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.appointment_cancelled_email ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">New Messages</p>
                <p className="text-sm text-gray-500">Receive email for new chat messages</p>
              </div>
              <button
                onClick={() => handleToggle("new_messages_email")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.new_messages_email ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.new_messages_email ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Marketing Emails</p>
                <p className="text-sm text-gray-500">Receive promotional offers and updates</p>
              </div>
              <button
                onClick={() => handleToggle("marketing_emails")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.marketing_emails ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.marketing_emails ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" style={{ color: "#36d1cf" }} /> Push Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">New Messages</p>
                <p className="text-sm text-gray-500">Get push notifications for new messages</p>
              </div>
              <button
                onClick={() => handleToggle("new_messages_push")}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  preferences.new_messages_push ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    preferences.new_messages_push ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          style={{ backgroundColor: "#36d1cf" }}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
