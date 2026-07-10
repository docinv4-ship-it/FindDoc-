import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const memoryStore = new Map<string, { count: number; resetTime: number }>();

const rateLimits: Record<string, RateLimitConfig> = {
  "/api/otp/send": { windowMs: 60 * 1000, maxRequests: 3 },
  "/api/otp/verify": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  "/api/book": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/messages": { windowMs: 60 * 1000, maxRequests: 30 },
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (realIp) return realIp;
  return "unknown";
}

export function checkRateLimit(request: NextRequest): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  const config = rateLimits[pathname];
  if (!config) return null;

  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const entry = memoryStore.get(key);
  if (entry) {
    if (now < entry.resetTime) {
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(config.maxRequests),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil(entry.resetTime / 1000)),
            },
          }
        );
      }
      entry.count++;
    } else {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
    }
  } else {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
  }

  if (now % 60000 < 1000) {
    for (const [k, v] of memoryStore.entries()) {
      if (now > v.resetTime) memoryStore.delete(k);
    }
  }

  return null;
}

export function getRateLimitHeaders(request: NextRequest): Record<string, string> {
  const pathname = request.nextUrl.pathname;
  const config = rateLimits[pathname];
  if (!config) return {};

  const ip = getClientIp(request);
  const key = `${ip}:${pathname}`;
  const entry = memoryStore.get(key);

  return {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(Math.max(0, config.maxRequests - (entry?.count || 1))),
    "X-RateLimit-Reset": String(Math.ceil((entry?.resetTime || Date.now() + config.windowMs) / 1000)),
  };
}
