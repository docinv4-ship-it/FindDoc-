const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const optionalEnvVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "PADDLE_VENDOR_ID",
  "PADDLE_VENDOR_AUTH_CODE",
  "PADDLE_PUBLIC_KEY",
];

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  present: string[];
  optional: Record<string, boolean>;
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const present: string[] = [];
  const optional: Record<string, boolean> = {};

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    } else {
      present.push(envVar);
    }
  }

  for (const envVar of optionalEnvVars) {
    optional[envVar] = !!process.env[envVar];
  }

  return {
    valid: missing.length === 0,
    missing,
    present,
    optional,
  };
}

export function getEnvStatus(): {
  hasDatabase: boolean;
  hasAuth: boolean;
  hasStorage: boolean;
  hasBilling: boolean;
} {
  return {
    hasDatabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    hasAuth: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasStorage: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    hasBilling: !!(
      process.env.PADDLE_VENDOR_ID &&
      process.env.PADDLE_VENDOR_AUTH_CODE
    ),
  };
}

if (typeof window === "undefined") {
  const result = validateEnv();
  if (!result.valid) {
    console.error("Missing required environment variables:", result.missing);
  }
}
