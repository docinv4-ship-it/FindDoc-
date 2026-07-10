import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all"; // all, doctor, clinic, specialization

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  const suggestions: {
    doctors: { id: string; name: string; specialization: string; type: string }[];
    clinics: { id: string; name: string; city: string; type: string }[];
    specializations: { name: string; type: string }[];
    cities: { name: string; type: string }[];
  } = {
    doctors: [],
    clinics: [],
    specializations: [],
    cities: [],
  };

  const normalizedQuery = query.toLowerCase().trim();

  // Search doctors
  if (type === "all" || type === "doctor") {
    const { data: doctors } = await supabase
      .from("doctors")
      .select("id, full_name, specialization")
      .eq("is_onboarded", true)
      .or(`full_name.ilike.%${normalizedQuery}%,specialization.ilike.%${normalizedQuery}%`)
      .limit(5);

    if (doctors) {
      suggestions.doctors = doctors.map((d: { id: string; full_name: string; specialization: string }) => ({
        id: d.id,
        name: d.full_name,
        specialization: d.specialization,
        type: "doctor",
      }));
    }
  }

  // Search clinics
  if (type === "all" || type === "clinic") {
    const { data: clinics } = await supabase
      .from("clinics")
      .select("id, name, city")
      .eq("is_active", true)
      .or(`name.ilike.%${normalizedQuery}%,city.ilike.%${normalizedQuery}%`)
      .limit(5);

    if (clinics) {
      suggestions.clinics = clinics.map((c: { id: string; name: string; city: string }) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        type: "clinic",
      }));
    }
  }

  // Search specializations
  if (type === "all" || type === "specialization") {
    const { data: specializationsData } = await supabase
      .from("doctors")
      .select("specialization")
      .eq("is_onboarded", true)
      .ilike("specialization", `%${normalizedQuery}%`)
      .limit(10);

    if (specializationsData) {
      const uniqueSpecs = [...new Set(specializationsData.map((s: { specialization: string }) => s.specialization))].slice(0, 5) as string[];
      suggestions.specializations = uniqueSpecs.map((name: string) => ({
        name,
        type: "specialization",
      }));
    }
  }

  // Search cities
  if (type === "all" || type === "city") {
    const { data: citiesData } = await supabase
      .from("clinics")
      .select("city")
      .eq("is_active", true)
      .ilike("city", `%${normalizedQuery}%`)
      .limit(10);

    if (citiesData) {
      const uniqueCities = [...new Set(citiesData.map((c: { city: string }) => c.city))].slice(0, 5) as string[];
      suggestions.cities = uniqueCities.map((name: string) => ({
        name,
        type: "city",
      }));
    }
  }

  return NextResponse.json({ suggestions });
}
