"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, FileCheck, X, Check, Search, Filter, ChevronDown, Eye, Download, Clock,
  FileText, Image, FileIcon, AlertCircle, User, Building2
} from "lucide-react";
import { useAdmin } from "../layout";
import type { Database } from "@/types/database";

type VerificationRequest = Database["public"]["Tables"]["verification_requests"]["Row"] & {
  doctors: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    specialization: string;
    profile_image_url: string | null;
  };
  verification_documents: VerificationDocument[];
};

type VerificationDocument = Database["public"]["Tables"]["verification_documents"]["Row"] & {
  signed_url?: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  resubmit: "bg-orange-100 text-orange-800",
  suspended: "bg-gray-100 text-gray-800",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  license: "Medical License",
  certificate: "Certificate",
  clinic_proof: "Clinic Proof",
  id_card: "ID Card",
  profile_photo: "Profile Photo",
  other: "Other Document",
};

function FilePreviewModal({
  doc,
  onClose
}: {
  doc: VerificationDocument;
  onClose: () => void;
}) {
  if (!doc.signed_url) return null;

  const isImage = doc.mime_type.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{DOC_TYPE_LABELS[doc.document_type]}</h3>
            <p className="text-sm text-gray-500">{doc.file_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
          {isImage ? (
            <img src={doc.signed_url} alt={doc.file_name} className="max-w-full h-auto mx-auto rounded-lg" />
          ) : (
            <div className="flex flex-col items-center py-12">
              <FileIcon className="w-20 h-20 text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">{doc.file_name}</p>
              <a
                href={doc.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2"
                style={{ backgroundColor: "#36d1cf" }}
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 w-40 bg-gray-100 rounded mb-2"></div>
              <div className="h-3 w-60 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminVerificationQueuePage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();
  const { adminId } = useAdmin();

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from("verification_requests")
      .select(`
        *,
        doctors(id, full_name, email, phone, specialization, profile_image_url),
        verification_documents(*)
      `)
      .order("submitted_at", { ascending: true });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setRequests(data);
    setLoading(false);
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.doctors?.full_name?.toLowerCase().includes(q) ||
      req.doctors?.email?.toLowerCase().includes(q) ||
      req.doctors?.phone?.toLowerCase().includes(q) ||
      req.doctors?.specialization?.toLowerCase().includes(q)
    );
  });

  const handleReview = async (requestId: string) => {
    setActionLoading(true);
    await fetch("/api/admin/audit", {
      method: "POST",
      body: JSON.stringify({
        admin_id: adminId,
        action: "review_started",
        entity_type: "verification_request",
        entity_id: requestId,
      }),
    });

    // Update status to under_review
    await supabase
      .from("verification_requests")
      .update({ status: "under_review", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    const response = await fetch(`/api/admin/verification/${requestId}`);
    const data = await response.json();
    if (data.request) {
      setSelectedRequest(data.request);
      setInternalNotes(data.request.internal_notes || "");
      setRejectionReason(data.request.rejection_reason || "");
    }
    setActionLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !adminId) return;
    setActionLoading(true);

    const response = await fetch(`/api/admin/verification/${selectedRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        internal_notes: internalNotes,
        admin_id: adminId,
      }),
    });

    if (response.ok) {
      setSelectedRequest(null);
      fetchRequests();
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminId || !rejectionReason.trim()) return;
    setActionLoading(true);

    const response = await fetch(`/api/admin/verification/${selectedRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        internal_notes: internalNotes,
        rejection_reason: rejectionReason,
        admin_id: adminId,
      }),
    });

    if (response.ok) {
      setSelectedRequest(null);
      setRejectionReason("");
      fetchRequests();
    }
    setActionLoading(false);
  };

  const handleResubmit = async () => {
    if (!selectedRequest || !adminId) return;
    setActionLoading(true);

    const response = await fetch(`/api/admin/verification/${selectedRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resubmit",
        internal_notes: internalNotes,
        rejection_reason: rejectionReason,
        admin_id: adminId,
      }),
    });

    if (response.ok) {
      setSelectedRequest(null);
      setRejectionReason("");
      fetchRequests();
    }
    setActionLoading(false);
  };

  const getDocTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
          <p className="text-gray-600 mt-1">Review and verify doctor accounts and documents</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 text-sm font-medium">
            {requests.filter(r => r.status === "pending").length} Pending
          </span>
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
              placeholder="Search by name, email, phone, or specialty..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="resubmit">Resubmit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#e6faf9" }}>
                      {req.doctors?.profile_image_url ? (
                        <img src={req.doctors.profile_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" style={{ color: "#36d1cf" }} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{req.doctors?.full_name}</h3>
                      <p className="text-sm text-gray-600">{req.doctors?.specialization}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{req.doctors?.email}</span>
                        {req.doctors?.phone && <span>{req.doctors.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                      {req.status.replace("_", " ")}
                    </span>
                    <button
                      onClick={() => handleReview(req.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: "#36d1cf" }}
                    >
                      {req.status === "pending" ? "Review" : "View Details"}
                    </button>
                  </div>
                </div>

                {/* Document thumbnails */}
                {req.verification_documents && req.verification_documents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">DOCUMENTS ({req.verification_documents.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {req.verification_documents.map((doc) => {
                        const Icon = getDocTypeIcon(doc.mime_type);
                        return (
                          <div
                            key={doc.id}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                              doc.status === "approved" ? "bg-green-50 text-green-700" :
                              doc.status === "rejected" ? "bg-red-50 text-red-700" :
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{DOC_TYPE_LABELS[doc.document_type]}</span>
                            <span className="text-gray-400">({formatFileSize(doc.file_size)})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {req.submitted_at && (
                  <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Submitted {new Date(req.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
              <Check className="w-8 h-8" style={{ color: "#36d1cf" }} />
            </div>
            <p className="text-gray-900 font-medium">No verification requests</p>
            <p className="text-sm text-gray-500 mt-1">All requests have been processed</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Verification Review</h2>
                <p className="text-sm text-gray-500">{selectedRequest.doctors?.full_name}</p>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Doctor Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#e6faf9" }}>
                  {selectedRequest.doctors?.profile_image_url ? (
                    <img src={selectedRequest.doctors.profile_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8" style={{ color: "#36d1cf" }} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{selectedRequest.doctors?.full_name}</h3>
                  <p className="text-gray-600">{selectedRequest.doctors?.specialization}</p>
                  <div className=" mt-1 text-sm text-gray-500 space-y-1">
                    <p>{selectedRequest.doctors?.email}</p>
                    {selectedRequest.doctors?.phone && <p>{selectedRequest.doctors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Documents</h4>
                <div className="space-y-2">
                  {selectedRequest.verification_documents?.map((doc) => {
                    const Icon = getDocTypeIcon(doc.mime_type);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => doc.signed_url && setPreviewDoc(doc)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-shadow ${doc.status === "approved" ? "border-green-300 bg-green-50" : doc.status === "rejected" ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-gray-900">{DOC_TYPE_LABELS[doc.document_type]}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)} • {doc.mime_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${doc.status === "approved" ? "bg-green-100 text-green-700" : doc.status === "rejected" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                            {doc.status}
                          </span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Internal Notes</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this verification (only visible to admins)..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Rejection Reason */}
              {(selectedRequest.status === "rejected" || selectedRequest.status === "resubmit") && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-5 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3 justify-between">
                <div></div>
                <div className="flex items-center gap-2">
                  {selectedRequest.status !== "approved" && selectedRequest.status !== "rejected" && (
                    <>
                      <button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt("Enter rejection reason:");
                          if (reason) {
                            setRejectionReason(reason);
                            handleReject();
                          }
                        }}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewDoc && (
        <FilePreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
