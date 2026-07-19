import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. All secure doctor portal endpoints
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

  // ⚡ FAST EDGE BYPASS: Allow patients/public to view public doctor directory/profiles seamlessly
  if (pathname.startsWith("/doctor/")) {
    const isStrictDashboardRoute = strictPortalRoutes.some((route) => pathname.startsWith(route));
    if (!isStrictDashboardRoute) {
      return NextResponse.next();
    }
  }

  // 2. Distributed Rate Limiting Protection
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // 3. Initialize Server-Side Supabase Client (Handles Cookie Hydration & Session Persistence)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // Securely retrieve user and structural metadata role directly via Supabase Auth Engine
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role; 

  // Structural Application Routing Flags
  const isDoctorDashboard = strictPortalRoutes.some((route) => pathname.startsWith(route)) && 
                            !["/doctor/login", "/doctor/signup"].includes(pathname);
  
  const isPatientDashboard = pathname.startsWith("/patient/");
  const isAuthPage = ["/login", "/signup", "/doctor/login", "/doctor/signup"].includes(pathname);

  // =========================================================================
  // 🛡️ THE IRON-CLAD ACCESS CONTROL RULES
  // =========================================================================

  // CRITICAL CHECK A: Unauthenticated Users trying to breach secure perimeters
  if (!user) {
    if (isDoctorDashboard) {
      return NextResponse.redirect(new URL("/doctor/login", request.url));
    }
    if (isPatientDashboard) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // CRITICAL CHECK B: Authenticated Users (Enforcing Zero Cross-Over Leakage)
  if (user) {
    // Prevent logged-in users from hitting Auth/Landing onboarding screens
    if (isAuthPage) {
      if (role === "doctor") {
        return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/patient/dashboard", request.url));
      }
    }

    // Border Patrol: Doctors are strictly blacklisted from entering Patient routes
    if (isPatientDashboard && role !== "patient") {
      if (role === "doctor") {
        return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
      }
      // Fail-Safe fallback if role is completely missing or corrupted
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Border Patrol: Patients are strictly blacklisted from entering Doctor routes
    if (isDoctorDashboard && role !== "doctor") {
      if (role === "patient") {
        return NextResponse.redirect(new URL("/patient/dashboard", request.url));
      }
      // Fail-Safe fallback if role is completely missing or corrupted
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static network assets:
     * - _next/static (static chunks)
     * - _next/image (image optimization pipeline)
     * - favicon.ico (system favicon)
     * - Inline image extensions (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
