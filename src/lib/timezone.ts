// lib/timezone.ts

export interface TimezoneOption {
  value: string;
  label: string;
}

export function getAllTimezones(): TimezoneOption[] {
  if (typeof Intl === "undefined" || typeof Intl.supportedValuesOf !== "function") {
    return [{ value: "UTC", label: "(GMT) UTC" }];
  }

  const timezones = Intl.supportedValuesOf("timeZone");

  return timezones.map((tz) => {
    try {
      // Har timezone ka exact GMT offset nikalne ke liye
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
      });
      const parts = formatter.formatToParts(new Date());
      const offset = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";

      return {
        value: tz, // Database ke liye (e.g., "Asia/Karachi")
        label: `(${offset}) ${tz.replace(/_/g, " ")}`, // Dropdown UI ke liye (e.g., "(GMT+5) Asia Karachi")
      };
    } catch {
      // Agar kisi timezone me error aye to usko softly handle kare
      return { value: tz, label: tz.replace(/_/g, " ") };
    }
  });
}

export function getTimezone(): string {
  if (typeof window === "undefined") {
    return "UTC";
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function formatTimeWithTimezone(time: string, timezone?: string): string {
  const tz = timezone || getTimezone();
  try {
    const today = new Date().toISOString().split("T")[0];
    const date = new Date(`${today}T${time}:00`);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    });
  } catch {
    return time;
  }
}

export function formatDateWithTimezone(date: string, timezone?: string): string {
  const tz = timezone || getTimezone();
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: tz,
    });
  } catch {
    return date;
  }
}

export function getBrowserTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const mins = Math.abs(offset % 60);
  const sign = offset <= 0 ? "+" : "-";
  return `UTC${sign}${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export function convertToUTC(localTime: string, localDate: string): string {
  const localDateTime = new Date(`${localDate}T${localTime}:00`);
  return localDateTime.toISOString();
}

export function getLocalTimeFromUTC(utcString: string): string {
  const date = new Date(utcString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
