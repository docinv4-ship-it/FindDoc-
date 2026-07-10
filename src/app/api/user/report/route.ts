import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reporter_type,
      reporter_id,
      reporter_email,
      reported_entity_type,
      reported_entity_id,
      reason,
      description,
    } = body;

    if (!reporter_type || !["doctor", "patient", "guest"].includes(reporter_type)) {
      return NextResponse.json({ error: "Valid reporter type is required" }, { status: 400 });
    }

    if (!reported_entity_type || !["doctor", "clinic", "patient", "review", "appointment"].includes(reported_entity_type)) {
      return NextResponse.json({ error: "Valid entity type is required" }, { status: 400 });
    }

    if (!reported_entity_id) {
      return NextResponse.json({ error: "Entity ID is required" }, { status: 400 });
    }

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // Create report
    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        reporter_type,
        reporter_id: reporter_id || null,
        reporter_email: reporter_email || null,
        reported_entity_type,
        reported_entity_id,
        reason: reason.trim(),
        description: description?.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating report:", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ report, message: "Report submitted successfully" });
  } catch (error) {
    console.error("Report API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reporter_id = searchParams.get("reporter_id");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    let query = supabase.from("reports").select("*").order("created_at", { ascending: false });

    if (reporter_id) {
      query = query.eq("reporter_id", reporter_id);
    }

    if (status && ["pending", "investigating", "resolved", "dismissed"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
    }

    return NextResponse.json({ reports: data });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
