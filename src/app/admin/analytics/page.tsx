"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, UserCheck, Building2, Calendar, CreditCard, Star, Flag, FileCheck,
  HeadphonesIcon, Loader2, Download, TrendingUp, BarChart3, ActivityIcon,
  Clock, ChevronRight, AlertCircle, RefreshCw
} from "lucide-react";

/* ============================================================
   Types
   ============================================================ */

interface Summary {
  doctors: number;
  verifiedDoctors: number;
  patients: number;
  clinics: number;
  appointments: number;
  appointmentsByStatus: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
    no_show: number;
  };
  activeSubscriptions: number;
  trialSubscriptions: number;
  featuredListings: number;
  pendingVerifications: number;
  pendingReports: number;
  openTickets: number;
}

interface RangeInfo {
  start: string;
  end: string;
  appointmentsInRange: number;
  newDoctorsInRange: number;
  newPatientsInRange: number;
}

interface TrendPoint {
  date: string;
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  pending: number;
}

interface Specialization {
  name: string;
  count: number;
}

interface SubscriptionStatus {
  active: number;
  trial: number;
  past_due: number;
  canceled: number;
  expired: number;
  [key: string]: number;
}

interface RecentEvent {
  id: string;
  event_type: string;
  entity_type: string;
  created_at: string;
}

interface AnalyticsResponse {
  summary: Summary;
  range: RangeInfo;
  trends: TrendPoint[];
  specializations: Specialization[];
  subscriptionStatus: SubscriptionStatus;
  recentEvents: RecentEvent[];
}

type Preset = "7d" | "30d" | "90d" | "year" | "all" | "custom";

/* ============================================================
   Helpers
   ============================================================ */

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presetToRange(preset: Preset): { start: string; end: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const endStr = toISODate(end);

  switch (preset) {
    case "7d": {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start: toISODate(start), end: endStr };
    }
    case "30d": {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start: toISODate(start), end: endStr };
    }
    case "90d": {
      const start = new Date();
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      return { start: toISODate(start), end: endStr };
    }
    case "year": {
      const start = new Date(end.getFullYear(), 0, 1);
      return { start: toISODate(start), end: endStr };
    }
    case "all":
    default:
      return { start: "", end: "" };
  }
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function titleCase(s: string): string {
  return s
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ============================================================
   StatCard component (matches existing dashboard pattern)
   ============================================================ */

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
  onClick,
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
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
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

/* ============================================================
   SVG Bar Chart (appointments over time)
   ============================================================ */

function AppointmentsTrendChart({ trends }: { trends: TrendPoint[] }) {
  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxTotal = useMemo(() => {
    if (!trends.length) return 1;
    return Math.max(...trends.map((t) => t.total), 1);
  }, [trends]);

  const barWidth = trends.length > 0 ? innerW / trends.length : innerW;
  const barGap = Math.min(barWidth * 0.2, 6);
  const barW = Math.max(barWidth - barGap, 2);

  // Y-axis ticks (4 segments)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxTotal * f));

  // X-axis label thinning: show ~6-8 labels max
  const labelStep = Math.max(1, Math.ceil(trends.length / 7));

  if (!trends.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No appointment trend data for this range.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 480 }}>
        {/* Y grid + labels */}
        {yTicks.map((tick, i) => {
          const y = padding.top + innerH - (i / 4) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#94a3b8"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {trends.map((point, i) => {
          const x = padding.left + i * barWidth + barGap / 2;
          const barH = (point.total / maxTotal) * innerH;
          const y = padding.top + innerH - barH;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, point.total > 0 ? 1 : 0)}
                rx={2}
                fill="#36d1cf"
                opacity={0.9}
              >
                <title>{`${formatDateShort(point.date)}: ${point.total} appointments`}</title>
              </rect>
              {/* X-axis labels */}
              {i % labelStep === 0 && (
                <text
                  x={x + barW / 2}
                  y={padding.top + innerH + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94a3b8"
                >
                  {formatDateShort(point.date)}
                </text>
              )}
            </g>
          );
        })}

        {/* X-axis line */}
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

/* ============================================================
   SVG Horizontal Bar Chart (specialization distribution)
   ============================================================ */

function SpecializationChart({ data }: { data: Specialization[] }) {
  const maxCount = useMemo(() => {
    if (!data.length) return 1;
    return Math.max(...data.map((d) => d.count), 1);
  }, [data]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No specialization data available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((spec) => {
        const pct = (spec.count / maxCount) * 100;
        return (
          <div key={spec.name} className="flex items-center gap-3">
            <div className="w-32 sm:w-40 text-sm text-gray-700 truncate flex-shrink-0" title={spec.name}>
              {spec.name}
            </div>
            <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${pct}%`, backgroundColor: "#36d1cf" }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                {spec.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Subscription Status Distribution (donut-ish horizontal stacked bar)
   ============================================================ */

function SubscriptionStatusChart({ status }: { status: SubscriptionStatus }) {
  const segments = useMemo(() => {
    const colors: Record<string, string> = {
      active: "#22c55e",
      trial: "#36d1cf",
      past_due: "#f59e0b",
      canceled: "#94a3b8",
      expired: "#ef4444",
    };
    const labels: Record<string, string> = {
      active: "Active",
      trial: "Trial",
      past_due: "Past Due",
      canceled: "Canceled",
      expired: "Expired",
    };
    return Object.keys(status)
      .filter((k) => status[k] > 0)
      .map((k) => ({
        key: k,
        label: labels[k] || titleCase(k),
        value: status[k],
        color: colors[k] || "#94a3b8",
      }));
  }, [status]);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No subscription data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="flex h-8 w-full rounded-lg overflow-hidden">
        {segments.map((s) => (
          <div
            key={s.key}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            className="h-full transition-all"
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-gray-600">{s.label}</span>
            <span className="text-sm font-semibold text-gray-900 ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Loading Skeleton
   ============================================================ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-72 bg-gray-100 rounded"></div>
      </div>

      {/* Filter skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 w-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(11)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 w-20 bg-gray-100 rounded mb-2"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-56 w-full bg-gray-100 rounded"></div>
        </div>
        <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-7 w-full bg-gray-100 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Main Page
   ============================================================ */

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsResponse | null>(null);

  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const buildQuery = useCallback((p: Preset, cStart: string, cEnd: string): string => {
    if (p === "all") {
      return "/api/admin/analytics";
    }
    if (p === "custom") {
      const params = new URLSearchParams();
      if (cStart) params.set("start_date", cStart);
      if (cEnd) params.set("end_date", cEnd);
      const qs = params.toString();
      return qs ? `/api/admin/analytics?${qs}` : "/api/admin/analytics";
    }
    const { start, end } = presetToRange(p);
    const params = new URLSearchParams();
    if (start) params.set("start_date", start);
    if (end) params.set("end_date", end);
    return `/api/admin/analytics?${params.toString()}`;
  }, []);

  const fetchData = useCallback(
    async (p: Preset, cStart: string, cEnd: string) => {
      setLoading(true);
      setError(null);
      try {
        const url = buildQuery(p, cStart, cEnd);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const json: AnalyticsResponse = await res.json();
        setData(json);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load analytics";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchData(preset, customStart, customEnd);
  }, [preset, customStart, customEnd, fetchData]);

  const handlePresetClick = (p: Preset) => {
    setPreset(p);
    // Clear custom inputs when switching to a preset
    setCustomStart("");
    setCustomEnd("");
  };

  const handleCustomApply = () => {
    if (customStart || customEnd) {
      setPreset("custom");
    }
  };

  const handleRefresh = () => {
    fetchData(preset, customStart, customEnd);
  };

  /* ---------- CSV Export ---------- */
  const handleExportCSV = () => {
    if (!data) return;
    const s = data.summary;

    const rows: string[] = [];
    rows.push("Metric,Value");

    rows.push(`Total Doctors,${s.doctors}`);
    rows.push(`Verified Doctors,${s.verifiedDoctors}`);
    rows.push(`Patients,${s.patients}`);
    rows.push(`Clinics,${s.clinics}`);
    rows.push(`Total Appointments,${s.appointments}`);
    rows.push(`Appointments - Pending,${s.appointmentsByStatus?.pending ?? 0}`);
    rows.push(`Appointments - Confirmed,${s.appointmentsByStatus?.confirmed ?? 0}`);
    rows.push(`Appointments - Cancelled,${s.appointmentsByStatus?.cancelled ?? 0}`);
    rows.push(`Appointments - Completed,${s.appointmentsByStatus?.completed ?? 0}`);
    rows.push(`Appointments - No Show,${s.appointmentsByStatus?.no_show ?? 0}`);
    rows.push(`Active Subscriptions,${s.activeSubscriptions}`);
    rows.push(`Trial Subscriptions,${s.trialSubscriptions}`);
    rows.push(`Featured Listings,${s.featuredListings}`);
    rows.push(`Pending Verifications,${s.pendingVerifications}`);
    rows.push(`Pending Reports,${s.pendingReports}`);
    rows.push(`Open Tickets,${s.openTickets}`);

    rows.push("");
    rows.push("Range Metric,Value");
    rows.push(`Range Start,${data.range?.start ?? ""}`);
    rows.push(`Range End,${data.range?.end ?? ""}`);
    rows.push(`Appointments In Range,${data.range?.appointmentsInRange ?? 0}`);
    rows.push(`New Doctors In Range,${data.range?.newDoctorsInRange ?? 0}`);
    rows.push(`New Patients In Range,${data.range?.newPatientsInRange ?? 0}`);

    rows.push("");
    rows.push("Specialization,Count");
    (data.specializations || []).forEach((spec) => {
      rows.push(`"${spec.name.replace(/"/g, '""')}",${spec.count}`);
    });

    rows.push("");
    rows.push("Subscription Status,Count");
    if (data.subscriptionStatus) {
      Object.entries(data.subscriptionStatus).forEach(([key, val]) => {
        rows.push(`${titleCase(key)},${val}`);
      });
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-export-${toISODate(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------- Render ---------- */

  if (loading && !data) return <LoadingSkeleton />;

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform-wide analytics and trends</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-gray-900 font-medium mb-1">Unable to load analytics</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg"
            style={{ backgroundColor: "#36d1cf" }}
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <LoadingSkeleton />;

  const s = data.summary;
  const rangeLabel =
    preset === "all"
      ? "All time"
      : preset === "custom"
      ? `${data.range?.start || "Start"} → ${data.range?.end || "End"}`
      : `${data.range?.start || "—"} → ${data.range?.end || "—"}`;

  const presetButtons: { key: Preset; label: string }[] = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
    { key: "year", label: "This year" },
    { key: "all", label: "All time" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform-wide analytics and trends</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: "#36d1cf" }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Date Range:</span>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presetButtons.map((btn) => {
              const active = preset === btn.key;
              return (
                <button
                  key={btn.key}
                  onClick={() => handlePresetClick(btn.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                    active
                      ? "text-white border-transparent"
                      : "text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                  style={active ? { backgroundColor: "#36d1cf" } : {}}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center gap-2 lg:ml-auto">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Custom start date"
            />
            <span className="text-gray-400 text-sm">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Custom end date"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customStart && !customEnd}
              className="px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Active range display */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500">Showing data for:</span>
          <span className="font-medium text-gray-900">{rangeLabel}</span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            {data.range?.appointmentsInRange ?? 0} appointments,{" "}
            {data.range?.newDoctorsInRange ?? 0} new doctors,{" "}
            {data.range?.newPatientsInRange ?? 0} new patients in range
          </span>
        </div>
      </div>

      {/* Error banner (non-blocking, e.g. on refresh) */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Showing last successful data. Last refresh failed: {error}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Doctors"
          value={s.doctors}
          subValue={`${s.verifiedDoctors} verified`}
          color="#36d1cf"
          onClick={() => router.push("/admin/doctors")}
        />
        <StatCard
          icon={UserCheck}
          label="Verified Doctors"
          value={s.verifiedDoctors}
          subValue={s.doctors > 0 ? `${Math.round((s.verifiedDoctors / s.doctors) * 100)}% of total` : undefined}
          color="#22c55e"
          onClick={() => router.push("/admin/doctors")}
        />
        <StatCard
          icon={Users}
          label="Patients"
          value={s.patients}
          color="#6366f1"
        />
        <StatCard
          icon={Building2}
          label="Clinics"
          value={s.clinics}
          color="#0891b2"
          onClick={() => router.push("/admin/clinics")}
        />
        <StatCard
          icon={Calendar}
          label="Appointments"
          value={s.appointments}
          subValue={
            s.appointmentsByStatus
              ? `${s.appointmentsByStatus.pending ?? 0} pending • ${s.appointmentsByStatus.confirmed ?? 0} confirmed`
              : undefined
          }
          color="#f59e0b"
          onClick={() => router.push("/admin/bookings")}
        />
        <StatCard
          icon={CreditCard}
          label="Active Subscriptions"
          value={s.activeSubscriptions}
          subValue={s.trialSubscriptions > 0 ? `${s.trialSubscriptions} on trial` : undefined}
          color="#8b5cf6"
          onClick={() => router.push("/admin/subscriptions")}
        />
        <StatCard
          icon={CreditCard}
          label="Trial Subscriptions"
          value={s.trialSubscriptions}
          color="#0ea5e9"
          onClick={() => router.push("/admin/subscriptions")}
        />
        <StatCard
          icon={Star}
          label="Featured Listings"
          value={s.featuredListings}
          color="#ec4899"
          onClick={() => router.push("/admin/featured")}
        />
        <StatCard
          icon={FileCheck}
          label="Pending Verifications"
          value={s.pendingVerifications}
          subValue="Awaiting review"
          color="#f97316"
          onClick={() => router.push("/admin/verification")}
        />
        <StatCard
          icon={Flag}
          label="Pending Reports"
          value={s.pendingReports}
          color="#ef4444"
          onClick={() => router.push("/admin/reports")}
        />
        <StatCard
          icon={HeadphonesIcon}
          label="Open Tickets"
          value={s.openTickets}
          color="#0891b2"
          onClick={() => router.push("/admin/support")}
        />
      </div>

      {/* Appointments by Status breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: "#36d1cf" }} />
          Appointments by Status
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { key: "pending", label: "Pending", color: "#f59e0b" },
            { key: "confirmed", label: "Confirmed", color: "#22c55e" },
            { key: "cancelled", label: "Cancelled", color: "#ef4444" },
            { key: "completed", label: "Completed", color: "#36d1cf" },
            { key: "no_show", label: "No Show", color: "#94a3b8" },
          ].map((item) => {
            const count = s.appointmentsByStatus?.[item.key as keyof typeof s.appointmentsByStatus] ?? 0;
            const pct = s.appointments > 0 ? Math.round((count / s.appointments) * 100) : 0;
            return (
              <div key={item.key} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{pct}% of total</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts: Trends + Specializations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: "#36d1cf" }} />
              Appointments Over Time
            </h3>
            <span className="text-xs text-gray-400">{data.trends?.length ?? 0} days</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-56">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <AppointmentsTrendChart trends={data.trends || []} />
          )}
        </div>

        {/* Specialization Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" style={{ color: "#36d1cf" }} />
              Top Specializations
            </h3>
            <span className="text-xs text-gray-400">Top 10</span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-7 w-full bg-gray-100 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : (
            <SpecializationChart data={data.specializations || []} />
          )}
        </div>
      </div>

      {/* Subscription Status Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" style={{ color: "#36d1cf" }} />
          Subscription Status Distribution
        </h3>
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-full bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <SubscriptionStatusChart status={data.subscriptionStatus || { active: 0, trial: 0 }} />
        )}
      </div>

      {/* Recent System Events */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" style={{ color: "#36d1cf" }} />
            Recent System Events
          </h3>
          <button
            onClick={() => router.push("/admin/events")}
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: "#36d1cf" }}
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))
          ) : (data.recentEvents || []).length > 0 ? (
            (data.recentEvents || []).map((evt) => (
              <div key={evt.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#e6faf9" }}
                >
                  <ActivityIcon className="w-4 h-4" style={{ color: "#36d1cf" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {titleCase(evt.event_type)}
                    {evt.entity_type && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        on {titleCase(evt.entity_type)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelative(evt.created_at)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ActivityIcon className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500">No recent events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
