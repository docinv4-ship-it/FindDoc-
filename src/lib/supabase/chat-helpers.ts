export function formatChatTimestamp(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (isYesterday) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullTime(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export const DOCTOR_QUICK_REPLIES = [
  "Hello! Please describe your symptoms in detail.",
  "When did you first notice these symptoms?",
  "Please upload any past prescriptions or lab reports.",
  "Take the prescribed medicine after meals.",
  "If the pain persists, please visit the clinic immediately.",
  "Your consultation is marked as complete. Take care!"
];
