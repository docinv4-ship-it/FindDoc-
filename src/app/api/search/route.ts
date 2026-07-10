import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";
  const specialization = searchParams.get("specialization") || "";
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = parseInt(searchParams.get("offset") || "0");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient();

  // Use the ranked search function (featured > verified > onboarded > name match)
  const { data, error } = await supabase.rpc("search_doctors", {
    p_query: query,
    p_city: city,
    p_specialization: specialization,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  // Get total count for pagination (run a second query without limit/offset)
  const { data: countData } = await supabase.rpc("search_doctors", {
    p_query: query,
    p_city: city,
    p_specialization: specialization,
    p_limit: 1000,
    p_offset: 0,
  });

  return NextResponse.json({ results: data || [], total: countData?.length || 0 });
}
