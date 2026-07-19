import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Saare strict doctor-only dashboard routes yahan hain
  const strictDoctorRoutes = [
    "/doctor/dashboard", "/doctor/agenda", "/doctor/appointments", 
    "/doctor/inbox", "/doctor/patients", "/doctor/reviews", 
    "/doctor/analytics", "/doctor/availability", "/doctor/breaks", 
    "/doctor/holidays", "/doctor/notifications", "/doctor/prescriptions", 
    "/doctor/records", "/doctor/profile-preview", "/doctor/settings", 
    "/doctor/billing", "/doctor/password"
  ];

  // Agar public profile route hai (e.g., /doctor/dr-sheraz-khan), toh bypass karo
  if (pathname.startsWith("/doctor/")) {
    const isDashboardRoute = strictDoctorRoutes.some((route) => pathname.startsWith(route));
    if (!isDashboardRoute && pathname !== "/doctor/login" && pathname !== "/doctor/signup") {
      return NextResponse.next();
    }
  }

  let response = NextResponse.next({ request });

  // Supabase SSR Client Initialize
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }));
        },
      },
    }
  );

  // Authenticated User aur unka locked role fetch karo
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role; 

  const isDoctorSpace = strictDoctorRoutes.some((route) => pathname.startsWith(route));
  const isPatientSpace = pathname.startsWith("/patient/");
  const isAuthPage = ["/login", "/signup", "/doctor/login", "/doctor/signup"].includes(pathname);
  const isRootOrPatientPublicPage = pathname === "/" || (!isDoctorSpace && !isPatientSpace && !isAuthPage);

  // ==========================================
  // CASE A: USER LOGGED IN NAHI HAI (GUEST)
  // ==========================================
  if (!user) {
    if (isDoctorSpace) return NextResponse.redirect(new URL("/doctor/login", request.url));
    if (isPatientSpace) return NextResponse.redirect(new URL("/login", request.url));
    return response;
  }

  // ==========================================
  // CASE B: USER LOGGED IN HAI (ENFORCEMENT LOCK)
  // ==========================================
  if (user) {
    // 1. Agar logged in user Auth page par jaane ki koshish kare
    if (isAuthPage) {
      return NextResponse.redirect(new URL(role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard", request.url));
    }

    // 2. DOCTOR ISOLATION LOCK: Doctor pure patient system se mukammal block hai
    if (role === "doctor") {
      // Agar doctor Home page (/) par ho, patient dashboard par ho, ya kisi public patient route par ho
      if (isRootOrPatientPublicPage || isPatientSpace) {
        return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
      }
    }

    // 3. PATIENT ISOLATION LOCK: Patient doctor dashboard mein enter nahi ho sakta
    if (role === "patient") {
      if (isDoctorSpace) {
        return NextResponse.redirect(new URL("/patient/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  // Static assets aur image routes ko chor kar sab intercept karo
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
