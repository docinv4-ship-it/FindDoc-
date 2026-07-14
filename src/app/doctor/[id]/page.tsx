"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function DoctorRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params?.id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient();

  useEffect(() => {
    const redirectToClinic = async () => {
      if (!doctorId) return;
      
      // Doctor ki active clinic ka slug fetch karein
      const { data, error } = await supabase
        .from("clinics")
        .select("slug")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!error && data?.slug) {
        // Direct naye clinic slug par redirect karein
        router.replace(`/clinic/${data.slug}`);
      } else {
        // Agar clinic nahi milti toh fallback to search
        router.replace("/patient");
      }
    };

    redirectToClinic();
  }, [doctorId, router, supabase]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: "#36d1cf" }} />
      <p className="text-gray-600 font-medium">Loading profile...</p>
    </div>
  );
}
