"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Loader2, HeadphonesIcon, Search, Filter, MessageSquare, Send, Clock, Check, User, AlertTriangle
} from "lucide-react";
import type { Database } from "@/types/database";

type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"] & {
  messages?: Database["public"]["Tables"]["support_ticket_messages"]["Row"][];
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting: "bg-yellow-100 text-yellow-800",
  resolved: "bg-gray-100 text-gray-600",
  closed: "bg-gray-100 text-gray-500",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-gray-500",
  normal: "text-blue-500",
  high: "text-orange-500",
  urgent: "text-red-500",
};

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    let query = supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setTickets(data);
    setLoading(false);
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ticket.subject?.toLowerCase().includes(q) ||
      ticket.requester_name?.toLowerCase().includes(q) ||
      ticket.requester_email?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    waiting: tickets.filter(t => t.status === "waiting").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  const openTicketDetail = async (ticket: SupportTicket) => {
    const { data: messages } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setSelectedTicket({ ...ticket, messages: messages || [] });
  };

  const handleUpdateStatus = async (ticketId: string, status: "in_progress" | "waiting" | "resolved" | "closed") => {
    setActionLoading(true);
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
    await supabase.from("support_tickets").update(updateData).eq("id", ticketId);
    fetchTickets();
    // Update local state
    if (selectedTicket) {
      setSelectedTicket({ ...selectedTicket, ...updateData, status } as SupportTicket);
    }
    setActionLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setActionLoading(true);

    await supabase.from("support_ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_type: "admin",
      message: newMessage.trim(),
    });

    // Update ticket status to waiting
    await supabase.from("support_tickets").update({
      status: "waiting",
      updated_at: new Date().toISOString(),
    }).eq("id", selectedTicket.id);

    setNewMessage("");
    openTicketDetail(selectedTicket);
    fetchTickets();
    setActionLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">Manage user support requests</p>
        </div>
        {stats.open > 0 && (
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">{stats.open} open</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.open}</p>
          <p className="text-xs text-gray-500">Open</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.waiting}</p>
          <p className="text-xs text-gray-500">Waiting</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{stats.resolved}</p>
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
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length > 0 ? (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => openTicketDetail(ticket)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-2">{ticket.subject}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{ticket.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>{ticket.requester_name}</span>
                    <span>{ticket.requester_email}</span>
                    <span>{formatDate(ticket.created_at)}</span>
                  </div>
                </div>
                <MessageSquare className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#e6faf9" }}>
              <Check className="w-8 h-8" style={{ color: "#36d1cf" }} />
            </div>
            <p className="text-gray-900 font-medium">No support tickets</p>
            <p className="text-sm text-gray-500 mt-1">All tickets have been handled</p>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedTicket.status]}`}>
                    {selectedTicket.status.replace("_", " ")}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mt-1">{selectedTicket.subject}</h2>
                <p className="text-sm text-gray-500">
                  {selectedTicket.requester_name} ({selectedTicket.requester_email})
                </p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Messages */}
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Original message</p>
                  <p className="text-gray-900">{selectedTicket.message}</p>
                </div>
                {selectedTicket.messages?.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${msg.sender_type === "admin" ? "ml-8 bg-blue-50" : "mr-8 bg-gray-50"}`}
                  >
                    <p className="text-xs text-gray-500 mb-1">
                      {msg.sender_type === "admin" ? "Admin" : "User"} • {formatDate(msg.created_at)}
                    </p>
                    <p className="text-gray-900">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 space-y-3">
              {/* Status buttons */}
              <div className="flex gap-2">
                {selectedTicket.status === "open" && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "in_progress")}
                    disabled={actionLoading}
                    className="flex-1 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
                  >
                    Start Working
                  </button>
                )}
                {(selectedTicket.status === "open" || selectedTicket.status === "in_progress" || selectedTicket.status === "waiting") && (
                  <button
                    onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
              </div>

              {/* Reply form */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !newMessage.trim()}
                  className="px-4 py-2 text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: "#36d1cf" }}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
