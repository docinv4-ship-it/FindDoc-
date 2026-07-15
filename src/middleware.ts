import { NextResponse, type NextRequest } from "next/server";
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

  // 🔥 If it starts with /doctor/ but is NOT an explicit dashboard route (e.g. patients viewing doctor profiles)
  // We bypass rate limiting and session updates to make the profile view super fast.
  if (pathname.startsWith("/doctor/")) {
    const isStrictDashboardRoute = strictPortalRoutes.some((route) => pathname.startsWith(route));
    if (!isStrictDashboardRoute) {
      return NextResponse.next(); // Clean Next.js bypass
    }
  }

  // Apply rate limiting
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Pass control to Supabase Session update
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
