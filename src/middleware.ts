import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Re-evaluate session status cleanly
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.user_metadata?.role;
  const { pathname } = request.nextUrl;

  // Route Definitions
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorAuth = pathname === "/doctor/login" || pathname === "/doctor/signup";
  const isPatientAuth = pathname === "/login" || pathname === "/signup";
  const isAuthPage = isDoctorAuth || isPatientAuth;

  // Case 1: Unauthenticated Users
  if (!user) {
    if (isDoctorRoute && !isDoctorAuth) {
      return NextResponse.redirect(new URL("/doctor/login", request.url));
    }
    if (isPatientRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // Case 2: Authenticated Users trying to access Auth Pages
  if (isAuthPage) {
    const redirectTarget = role === "doctor" ? "/doctor/dashboard" : "/patient";
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

  // Case 3: Role-based Isolation Enforcement
  if (role === "doctor" && isPatientRoute) {
    return NextResponse.redirect(new URL("/doctor/dashboard", request.url));
  }

  if (
    role === "patient" &&
    isDoctorRoute &&
    !pathname.startsWith("/doctor/profile/")
  ) {
    return NextResponse.redirect(new URL("/patient", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
