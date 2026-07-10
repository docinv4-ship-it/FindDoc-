import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch public reviews for a doctor
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctor_id");

  if (!doctorId) {
    return NextResponse.json({ error: "Doctor ID required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, is_verified, created_at, patients (full_name)")
    .eq("doctor_id", doctorId)
    .eq("is_verified", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data });
}

// POST - Create a new review (after verifying completed appointment)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { doctor_id, patient_id, appointment_id, rating, comment } = body;

  if (!doctor_id || !patient_id || !rating) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify patient had a completed appointment with this doctor
  const { data: appointment } = await supabase
    .from("appointments")
    .select("id")
    .eq("id", appointment_id || "")
    .eq("doctor_id", doctor_id)
    .eq("patient_id", patient_id)
    .eq("status", "completed")
    .single();

  // Check if already reviewed this specific appointment
  const { data: existingReview } = await supabase
    .from("reviews")
    .select("id")
    .eq("doctor_id", doctor_id)
    .eq("patient_id", patient_id)
    .eq("appointment_id", appointment_id || "")
    .maybeSingle();

  if (existingReview) {
    return NextResponse.json({ error: "Already reviewed" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      doctor_id,
      patient_id,
      rating,
      comment: comment || null,
      is_verified: !!appointment, // Auto-verify if from completed appointment
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: data });
}

// PATCH - Doctor can hide/show review
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { review_id, action, doctor_id } = body;

  if (!review_id || !action || !doctor_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify ownership
  const { data: review } = await supabase
    .from("reviews")
    .select("doctor_id")
    .eq("id", review_id)
    .single();

  if (!review || review.doctor_id !== doctor_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let updateData: { is_verified?: boolean } = {};

  if (action === "hide") {
    updateData.is_verified = false;
  } else if (action === "show") {
    updateData.is_verified = true;
  } else if (action === "delete") {
    const { error } = await supabase.from("reviews").delete().eq("id", review_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase
    .from("reviews")
    .update(updateData)
    .eq("id", review_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
