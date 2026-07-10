"use client";

import { useState, useEffect } from "react";
import { Activity, Loader2, Filter, Clock, User, Calendar } from "lucide-react";

interface EventItem {
  id: string;
  event_type: string;
  actor_type: string | null;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const eventColors: Record<string, string> = {
  booking_created: "bg-blue-100 text-blue-700",
  booking_confirmed: "bg-green-100 text-green-700",
  booking_cancelled: "bg-red-100 text-red-700",
  booking_rescheduled: "bg-yellow-100 text-yellow-700",
  appointment_completed: "bg-green-100 text-green-700",
  no_show_marked: "bg-orange-100 text-orange-700",
  review_submitted: "bg-purple-100 text-purple-700",
  doctor_verified: "bg-primary-100 text-primary-700",
  subscription_changed: "bg-indigo-100 text-indigo-700",
  featured_activated: "bg-yellow-100 text-yellow-700",
  featured_expired: "bg-gray-100 text-gray-700",
};

const eventTypes = [
  "booking_created", "booking_confirmed", "booking_cancelled", "booking_rescheduled",
  "appointment_completed", "no_show_marked", "review_submitted", "doctor_verified",
  "subscription_changed", "featured_activated", "featured_expired",
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter) params.set("event_type", filter);
      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events || []);
      setLoading(false);
    };
    fetchEvents();
  }, [filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Log</h1>
          <p className="text-gray-600 text-sm mt-1">Real-time event tracking for all platform activities</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All events</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600">No events found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3">
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${eventColors[event.event_type] || "bg-gray-100 text-gray-700"}`}>
                {event.event_type.replace(/_/g, " ")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {event.actor_type && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {event.actor_type}
                    </span>
                  )}
                  {event.target_type && (
                    <span>Target: {event.target_type}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
