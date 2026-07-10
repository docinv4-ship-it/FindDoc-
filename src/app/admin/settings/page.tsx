"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2, Settings, Save, Check, Globe, Bell, Shield, RotateCcw,
  CreditCard, Clock, AlertTriangle, MessageSquare, Database, Plus, X
} from "lucide-react";

interface SettingEntry {
  value: unknown;
  description: string | null;
}

const SETTING_GROUPS = [
  {
    id: "general",
    label: "General",
    icon: Globe,
    keys: ["platform_name", "support_email", "support_phone", "maintenance_message", "maintenance_mode"],
  },
  {
    id: "booking",
    label: "Booking Rules",
    icon: Clock,
    keys: ["booking_min_notice_hours", "booking_max_advance_days", "cancellation_cutoff_hours", "max_appointments_per_day", "default_slot_duration", "default_booking_mode"],
  },
  {
    id: "billing",
    label: "Billing & Featured",
    icon: CreditCard,
    keys: ["trial_days", "featured_duration_days", "featured_price_monthly", "featured_price_yearly"],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    keys: ["reminder_hours_before", "notification_email_enabled", "notification_push_enabled", "notification_sms_enabled"],
  },
  {
    id: "security",
    label: "Security & Limits",
    icon: Shield,
    keys: ["otp_expiry_minutes", "session_timeout_minutes", "rate_limit_api_per_minute", "max_file_upload_mb", "registration_enabled"],
  },
];

function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseValue(raw: string, original: unknown): unknown {
  if (typeof original === "boolean") return raw === "true";
  if (typeof original === "number") {
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }
  if (Array.isArray(original)) return raw.split(",").map(s => s.trim()).filter(Boolean);
  return raw;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, SettingEntry>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setSettings(data.settings || {});
      const edits: Record<string, string> = {};
      for (const [key, entry] of Object.entries(data.settings || {})) {
        const e = entry as SettingEntry;
        edits[key] = formatValue(e.value);
      }
      setEditValues(edits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updates: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(settings)) {
        const raw = editValues[key] ?? "";
        const parsed = parseValue(raw, entry.value);
        if (formatValue(parsed) !== formatValue(entry.value)) {
          updates[key] = parsed;
        }
      }
      if (Object.keys(updates).length === 0) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        setSaving(false);
        return;
      }
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save settings");
      }
      await fetchSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm("Reset all settings to their current database values? Unsaved changes will be lost.")) return;
    await fetchSettings();
  };

  const handleAddSetting = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newKey.trim(),
          value: newValue.trim(),
          description: newDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add setting");
      }
      setNewKey("");
      setNewValue("");
      setNewDesc("");
      setShowAddForm(false);
      await fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add setting");
    }
    setSaving(false);
  };

  const renderInput = (key: string, entry: SettingEntry) => {
    const value = entry.value;
    const editVal = editValues[key] ?? "";

    if (typeof value === "boolean") {
      return (
        <select
          value={editVal}
          onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
        >
          <option value="true">Yes / Enabled</option>
          <option value="false">No / Disabled</option>
        </select>
      );
    }

    if (key === "default_booking_mode") {
      return (
        <select
          value={editVal}
          onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
        >
          <option value="auto">Auto Confirm</option>
          <option value="manual">Manual Approval</option>
        </select>
      );
    }

    return (
      <input
        type={typeof value === "number" ? "number" : "text"}
        value={editVal}
        onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties}
      />
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#36d1cf" }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-600 mt-1">Configure global platform settings stored in the database</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <div className="flex items-center gap-2" style={{ color: "#36d1cf" }}><Check className="w-5 h-5" /> Saved</div>}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} Add Setting
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Setting</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. max_booking_per_week" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input type="text" value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="e.g. 50" className="w-full px-4 py-2.5 border border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="e.g. Max bookings per week" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "#36d1cf" } as React.CSSProperties} />
            </div>
          </div>
          <button onClick={handleAddSetting} disabled={saving || !newKey.trim()} className="mt-4 flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Setting
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {SETTING_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const groupSettings = group.keys.filter(k => settings[k]);
          if (groupSettings.length === 0) return null;
          return (
            <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GroupIcon className="w-5 h-5" style={{ color: "#36d1cf" }} /> {group.label}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {groupSettings.map((key) => {
                  const entry = settings[key];
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                      </label>
                      {renderInput(key, entry)}
                      {entry.description && <p className="text-xs text-gray-500 mt-1">{entry.description}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Uncategorized settings */}
        {Object.keys(settings).filter(k => !SETTING_GROUPS.some(g => g.keys.includes(k))).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: "#36d1cf" }} /> Other Settings
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(settings).filter(([k]) => !SETTING_GROUPS.some(g => g.keys.includes(k))).map(([key, entry]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                  {renderInput(key, entry)}
                  {entry.description && <p className="text-xs text-gray-500 mt-1">{entry.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-white font-medium rounded-lg disabled:opacity-50" style={{ backgroundColor: "#36d1cf" }}>
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Settings
          </button>
          <button type="button" onClick={handleReset} className="flex items-center gap-2 px-4 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </form>
    </div>
  );
}
