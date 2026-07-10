"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, Flag, Search, Filter, AlertTriangle, Check, X, Clock, User, MessageSquare,
  Eye, MoreHorizontal
} from "lucide-react";
import type { Database } from "@/types/database";

type Report = Database["public"]["Tables"]["reports"]["Row"] & {
  doctors?: { id: string; full_name: string; email: string; };
  clinics?: { id: string; name: string; };
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  investigating: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800",
};

const ENTITY_LABELS: Record<string, string> = {
  doctor: "Doctor",
  clinic: "Clinic",
  patient: "Patient",
  review: "Review",
  appointment: "Appointment",
};

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select(`
        *,
        doctors:reported_entity_id(*),
        clinics:reported_entity_id(*)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setReports(data);
    setLoading(false);
  };

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      report.reason?.toLowerCase().includes(q) ||
      report.reporter_email?.toLowerCase().includes(q) ||
      report.description?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    investigating: reports.filter(r => r.status === "investigating").length,
    resolved: reports.filter(r => r.status === "resolved").length,
  };

  const handleUpdateStatus = async (reportId: string, status: "investigating" | "resolved" | "dismissed") => {
    setActionLoading(true);
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolution_notes = resolutionNotes;
    }

    await supabase.from("reports").update(updateData).eq("id", reportId);
    fetchReports();
    setSelectedReport(null);
    setResolutionNotes("");
    setActionLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 7) return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
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
          <h1 className="text-2xl font-bold text-gray-900">Reports & Complaints</h1>
          <p className="text-gray-600 mt-1">Review and manage user reports</p>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">{stats.pending} pending review</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
          <p className="text-xs text-gray-500">Investigating</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          <p className="text-xs text-gray-500">Resolved</p>
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
              placeholder="Search reports..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedReport(report);
                setResolutionNotes(report.resolution_notes || "");
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-50">
                    <Flag className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                        {ENTITY_LABELS[report.reported_entity_type]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[report.status]}`}>
                        {report.status}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mt-1">{report.reason}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Reported by: {report.reporter_email || "Anonymous"}</span>
                      <span>{formatDate(report.created_at)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReport(report);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Eye className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100">
              <Check className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-900 font-medium">No reports found</p>
            <p className="text-sm text-gray-500 mt-1">All reports have been handled</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedReport(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Report Details</h2>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  {ENTITY_LABELS[selectedReport.reported_entity_type]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedReport.status]}`}>
                  {selectedReport.status}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Reason</p>
                <p className="text-gray-900">{selectedReport.reason}</p>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-gray-600">{selectedReport.description}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Resolution Notes</p>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about how this was resolved..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                {selectedReport.status === "pending" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedReport.id, "investigating")}
                    disabled={actionLoading}
                    className="flex-1 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                  >
                    Start Investigation
                  </button>
                )}
                {(selectedReport.status === "pending" || selectedReport.status === "investigating") && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "resolved")}
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "dismissed")}
                      disabled={actionLoading}
                      className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
