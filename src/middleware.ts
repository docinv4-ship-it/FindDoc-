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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fallback to "patient" if role is not explicitly set (e.g., fresh Google OAuth)
  const role = user?.user_metadata?.role || (user ? "patient" : undefined);
  const { pathname } = request.nextUrl;

  const isDoctorRoute = pathname.startsWith("/doctor");
  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorAuth = pathname === "/doctor/login" || pathname === "/doctor/signup";
  const isPatientAuth = pathname === "/login" || pathname === "/signup";
  const isAuthPage = isDoctorAuth || isPatientAuth;

  if (!user) {
    if (isDoctorRoute && !isDoctorAuth) {
      return NextResponse.redirect(new URL("/doctor/login", request.url));
    }
    if (isPatientRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  if (isAuthPage) {
    const redirectTarget = role === "doctor" ? "/doctor/dashboard" : "/patient";
    return NextResponse.redirect(new URL(redirectTarget, request.url));
  }

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
