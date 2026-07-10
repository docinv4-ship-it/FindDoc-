import { createClient } from "@/lib/supabase/server";

export interface FeatureFlag {
  key: string;
  label: string;
  description: string | null;
  is_enabled: boolean;
  category: string;
  is_system: boolean;
}

const flagCache = new Map<string, { value: boolean; expires: number }>();
const CACHE_TTL = 30_000;

export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, is_enabled");

  if (error || !data) return {};

  const flags: Record<string, boolean> = {};
  for (const f of data) {
    flags[f.key] = f.is_enabled;
  }
  return flags;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const cached = flagCache.get(key);
  if (cached && Date.now() < cached.expires) return cached.value;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("is_enabled")
    .eq("key", key)
    .maybeSingle();

  const value = !error && data ? data.is_enabled : true;
  flagCache.set(key, { value, expires: Date.now() + CACHE_TTL });
  return value;
}

export function clearFlagCache(key?: string) {
  if (key) {
    flagCache.delete(key);
  } else {
    flagCache.clear();
  }
}
