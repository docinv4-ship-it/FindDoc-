"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo } from "react";
import {
  Flag, Plus, Search, Loader2, X, Check, AlertCircle, Trash2, ToggleLeft, ToggleRight, Shield, Tag
} from "lucide-react";

interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const CATEGORY_COLORS: Record<string, string> = {
  Booking: "#36d1cf",
  Communication: "#6366f1",
  Billing: "#8b5cf6",
  Authentication: "#f59e0b",
  System: "#6b7280",
  Notifications: "#ec4899",
  Search: "#0891b2",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#36d1cf";
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Create form state
  const [createForm, setCreateForm] = useState({
    key: "",
    label: "",
    description: "",
    category: "Booking",
    is_enabled: false,
  });
  const [creating, setCreating] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchFlags = async () => {
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (!res.ok) throw new Error("Failed to fetch flags");
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load feature flags", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(flags.map((f) => f.category));
    return ["all", ...Array.from(set).sort()];
  }, [flags]);

  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        (f.description?.toLowerCase().includes(q) ?? false) ||
        f.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [flags, categoryFilter, searchQuery]);

  const groupedFlags = useMemo(() => {
    const groups: Record<string, FeatureFlag[]> = {};
    filteredFlags.forEach((f) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    setTogglingIds((prev) => new Set(prev).add(flag.id));
    const newEnabled = !flag.is_enabled;
    // Optimistic update
    setFlags((prev) =>
      prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: newEnabled } : f))
    );
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: flag.id, is_enabled: newEnabled }),
      });
      if (!res.ok) throw new Error("Failed to update flag");
      showToast(`${flag.label} ${newEnabled ? "enabled" : "disabled"}`, "success");
    } catch (err) {
      console.error(err);
      // Revert
      setFlags((prev) =>
        prev.map((f) => (f.id === flag.id ? { ...f, is_enabled: flag.is_enabled } : f))
      );
      showToast("Failed to update flag", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(flag.id);
        return next;
      });
    }
  };

  const handleDelete = async (flag: FeatureFlag) => {
    if (!confirm(`Delete "${flag.label}"? This action cannot be undone.`)) return;
    setDeletingIds((prev) => new Set(prev).add(flag.id));
    try {
      const res = await fetch(`/api/admin/feature-flags?id=${encodeURIComponent(flag.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete flag");
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      showToast(`${flag.label} deleted`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete flag", "error");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(flag.id);
        return next;
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.key.trim() || !createForm.label.trim()) {
      showToast("Key and label are required", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: createForm.key.trim(),
          label: createForm.label.trim(),
          description: createForm.description.trim() || null,
          category: createForm.category,
          is_enabled: createForm.is_enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create flag");
      }
      const data = await res.json();
      const newFlag = data.flag ?? data;
      setFlags((prev) => [...prev, newFlag]);
      setShowCreateModal(false);
      setCreateForm({ key: "", label: "", description: "", category: "Booking", is_enabled: false });
      showToast("Feature flag created", "success");
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to create flag", "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 w-72 bg-gray-100 rounded"></div>
        </div>
        <div className="flex gap-3 animate-pulse">
          <div className="h-10 w-64 bg-gray-200 rounded-lg"></div>
          <div className="h-10 w-40 bg-gray-200 rounded-lg"></div>
          <div className="h-10 w-40 bg-gray-100 rounded-lg ml-auto"></div>
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i}>
              <div className="h-6 w-32 bg-gray-200 rounded mb-3 animate-pulse"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex justify-between mb-3">
                      <div className="h-5 w-32 bg-gray-200 rounded"></div>
                      <div className="h-6 w-10 bg-gray-100 rounded-full"></div>
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-gray-100 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-5 w-20 bg-gray-100 rounded-full"></div>
                      <div className="h-5 w-16 bg-gray-100 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Flag className="w-6 h-6" style={{ color: "#36d1cf" }} />
            Feature Flags
          </h1>
          <p className="text-gray-600 mt-1">Manage platform feature toggles and rollouts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white font-medium rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#36d1cf" }}
        >
          <Plus className="w-4 h-4" />
          Create New Flag
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Flags</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{flags.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Enabled</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#36d1cf" }}>
            {flags.filter((f) => f.is_enabled).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Disabled</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">
            {flags.filter((f) => !f.is_enabled).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">System Flags</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {flags.filter((f) => f.is_system).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search flags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{ outlineColor: "#36d1cf" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#36d1cf")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat;
            const color = cat === "all" ? "#36d1cf" : getCategoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${
                  isActive ? "text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
                style={
                  isActive
                    ? { backgroundColor: color, borderColor: color }
                    : { borderColor: "#e5e7eb" }
                }
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Flags grouped by category */}
      {groupedFlags.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Flag className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No feature flags found</p>
          <p className="text-sm text-gray-400 mt-1">
            {searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create a new flag to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedFlags.map(([category, categoryFlags]) => {
            const color = getCategoryColor(category);
            return (
              <div key={category}>
                {/* Category section header */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-2 h-6 rounded-full"
                    style={{ backgroundColor: color }}
                  ></div>
                  <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    {categoryFlags.length}
                  </span>
                </div>

                {/* Flag cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryFlags.map((flag) => {
                    const isToggling = togglingIds.has(flag.id);
                    const isDeleting = deletingIds.has(flag.id);
                    return (
                      <div
                        key={flag.id}
                        className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
                      >
                        {/* Top row: label + toggle */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{flag.label}</h3>
                            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{flag.key}</p>
                          </div>
                          <ToggleSwitch
                            checked={flag.is_enabled}
                            disabled={isToggling}
                            onToggle={() => handleToggle(flag)}
                          />
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-500 flex-1 mb-4 line-clamp-2">
                          {flag.description || "No description provided"}
                        </p>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${color}15`, color }}
                          >
                            <Tag className="w-3 h-3" />
                            {flag.category}
                          </span>
                          {flag.is_system && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              <Shield className="w-3 h-3" />
                              System
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ml-auto ${
                              flag.is_enabled
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {flag.is_enabled ? (
                              <>
                                <Check className="w-3 h-3" />
                                On
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                Off
                              </>
                            )}
                          </span>
                        </div>

                        {/* Delete button for non-system flags */}
                        {!flag.is_system && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                              onClick={() => handleDelete(flag)}
                              disabled={isDeleting}
                              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) setShowCreateModal(false);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5" style={{ color: "#36d1cf" }} />
                Create Feature Flag
              </h2>
              <button
                onClick={() => !creating && setShowCreateModal(false)}
                disabled={creating}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.key}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      key: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                    }))
                  }
                  placeholder="e.g. enable_telemedicine"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2"
                  style={{ outlineColor: "#36d1cf" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#36d1cf")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Unique identifier used in code (snake_case)</p>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, label: e.target.value }))
                  }
                  placeholder="e.g. Enable Telemedicine"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style={{ outlineColor: "#36d1cf" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#36d1cf")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="What does this flag control?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ outlineColor: "#36d1cf" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#36d1cf")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                  style={{ outlineColor: "#36d1cf" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#36d1cf")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
                >
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Enabled by default</p>
                  <p className="text-xs text-gray-400">Flag will be ON when created</p>
                </div>
                <ToggleSwitch
                  checked={createForm.is_enabled}
                  onToggle={() =>
                    setCreateForm((prev) => ({ ...prev, is_enabled: !prev.is_enabled }))
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !creating && setShowCreateModal(false)}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: "#36d1cf" }}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Flag
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-in slide-in-from-bottom-2 ${
              toast.type === "success" ? "" : ""
            }`}
            style={{
              backgroundColor: toast.type === "success" ? "#36d1cf" : "#ef4444",
            }}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onToggle,
  disabled = false,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "" : "bg-gray-300"
      }`}
      style={checked ? { backgroundColor: "#36d1cf" } : {}}
      aria-pressed={checked}
    >
      {disabled && (
        <Loader2 className="w-3 h-3 absolute left-1/2 -translate-x-1/2 text-white animate-spin" />
      )}
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
