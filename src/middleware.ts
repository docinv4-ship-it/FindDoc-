import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of protected doctor portal routes
  const strictPortalRoutes = [
    "/doctor/dashboard",
    "/doctor/agenda",
    "/doctor/appointments",
    "/doctor/inbox",
    "/doctor/patients",
    "/doctor/reviews",
    "/doctor/analytics",
    "/doctor/availability",
    "/doctor/breaks",
    "/doctor/holidays",
    "/doctor/notifications",
    "/doctor/prescriptions",
    "/doctor/records",
    "/doctor/profile-preview",
    "/doctor/settings",
    "/doctor/billing",
    "/doctor/password",
    "/doctor/login",
    "/doctor/signup"
  ];

  // 🔥 100% FIXED: If it starts with /doctor/ but is NOT an explicit portal route (like a patient viewing /doctor/e51001ce-...), 
  // bypass rate limit and session update middleware entirely!
  if (pathname.startsWith("/doctor/")) {
    const isStrictDashboardRoute = strictPortalRoutes.some((route) => pathname.startsWith(route));
    if (!isStrictDashboardRoute) {
      return; // Dynamic profile page directly bypasses the auth/middleware check
    }
  }

  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
