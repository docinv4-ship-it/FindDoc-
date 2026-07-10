"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2, ScrollText, Search, Filter, User, Calendar, Clock, Download, ChevronLeft, ChevronRight
} from "lucide-react";
import type { Database } from "@/types/database";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

const ACTION_COLORS: Record<string, string> = {
  approve: "text-green-600 bg-green-50",
  reject: "text-red-600 bg-red-50",
  update: "text-blue-600 bg-blue-50",
  delete: "text-red-600 bg-red-50",
  create: "text-green-600 bg-green-50",
  suspend: "text-yellow-600 bg-yellow-50",
  activate: "text-green-600 bg-green-50",
  deactivate: "text-gray-600 bg-gray-50",
};

function AuditLogPageContent() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSize = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/audit?limit=${pageSize}&offset=${(page - 1) * pageSize}&${actionFilter !== "all" ? `action=eq.${actionFilter}` : ""}&${entityFilter !== "all" ? `entity_type=eq.${entityFilter}` : ""}`);
    const data = await response.json();
    if (data.logs) {
      setLogs(data.logs);
      setTotalCount(Math.max(data.logs.length, totalCount));
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    return (
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const exportData = () => {
    const json = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getActionColor = (action: string) => {
    const baseAction = action.split("_")[0];
    return ACTION_COLORS[baseAction] || "text-gray-600 bg-gray-50";
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
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
          <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600 mt-1">Track all admin actions and system changes</p>
        </div>
        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
        >
          <Download className="w-4 h-4" /> Export JSON
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action or entity..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Actions</option>
            <option value="verification_approved">Approve Verification</option>
            <option value="verification_rejected">Reject Verification</option>
            <option value="activate">Activate</option>
            <option value="suspend">Suspend</option>
            <option value="update">Update</option>
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Entities</option>
            <option value="verification_request">Verification Request</option>
            <option value="doctor">Doctor</option>
            <option value="subscription">Subscription</option>
            <option value="featured_listing">Featured Listing</option>
            <option value="report">Report</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-xs text-gray-500">Total Actions</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{filteredLogs.filter(l => l.action.includes("approve") || l.action.includes("activate")).length}</p>
          <p className="text-xs text-gray-500">Approvals</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{filteredLogs.filter(l => l.action.includes("reject") || l.action.includes("suspend")).length}</p>
          <p className="text-xs text-gray-500">Rejections</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{filteredLogs.filter(l => l.action.includes("review")).length}</p>
          <p className="text-xs text-gray-500">Reviews</p>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{log.admin_id?.substring(0, 8) || "System"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-xs text-gray-400 ml-1">{log.entity_id.substring(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">{log.ip_address || "-"}</td>
                    <td className="px-4 py-4">
                      <button className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#e6faf9", color: "#239999" }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Showing {filteredLogs.length} of {totalCount} records</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-sm font-medium">{page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={filteredLogs.length < pageSize}
            className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Audit Log Details</h2>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                ×
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Action</p>
                  <p className="font-medium text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-gray-500">Entity Type</p>
                  <p className="font-medium text-gray-900">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Entity ID</p>
                  <p className="font-medium text-gray-900 font-mono text-xs">{selectedLog.entity_id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Timestamp</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IP Address</p>
                  <p className="font-medium text-gray-900">{selectedLog.ip_address || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Admin ID</p>
                  <p className="font-medium text-gray-900 font-mono text-xs">{selectedLog.admin_id || "System"}</p>
                </div>
              </div>

              {selectedLog.before_data && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Before</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                    {formatValue(selectedLog.before_data)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">After</p>
                  <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                    {formatValue(selectedLog.after_data)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <AuditLogPageContent />
  );
}
