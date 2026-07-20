import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Header from "@/components/patient/Header";
import BottomNav from "@/components/patient/BottomNav";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component write restriction handled via Middleware
          }
        },
      },
    }
  );

  // 1. Current logged-in Auth User check
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 2. Safe query: maybeSingle() never throws error if record is creating/syncing
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // 3. Red Banner Fallback: Show smooth loading screen until profile exists
    if (!patient) {
      return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
          <div className="h-8 w-8 rounded-full border-2 border-teal-500/20 border-t-teal-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600 animate-pulse">Setting up your profile...</p>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col antialiased">
      <Header />
      <main className="flex-1 max-w-xl w-full mx-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
