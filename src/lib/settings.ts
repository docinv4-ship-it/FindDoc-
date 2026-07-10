import { createClient } from "@/lib/supabase/server";

export interface PlatformSetting {
  key: string;
  value: unknown;
  description: string | null;
}

const settingsCache = new Map<string, { value: unknown; expires: number }>();
const CACHE_TTL = 30_000;

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value");

  if (error || !data) return {};

  const settings: Record<string, unknown> = {};
  for (const s of data) {
    settings[s.key] = s.value;
  }
  return settings;
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const cached = settingsCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.value as T;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const value = !error && data ? (data.value as T) : defaultValue;
  settingsCache.set(key, { value, expires: Date.now() + CACHE_TTL });
  return value;
}

export function clearSettingsCache(key?: string) {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}
