export function formatChatTimestamp(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatFullTime(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const DOCTOR_QUICK_REPLIES = [
  "Hello! Please describe your primary symptoms in detail.",
  "When did your symptoms first start?",
  "Please upload any recent lab reports, blood tests, or prescription images.",
  "Take the prescribed medication twice daily after meals with water.",
  "If fever or pain worsens, please visit the nearest clinic emergency immediately.",
  "Your consultation session is now complete. Wishing you a swift recovery!",
];
