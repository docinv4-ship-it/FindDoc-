import { NextRequest, NextResponse } from "next/server";
import { generateAvailableSlots } from "@/lib/slots/generator";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");
    const date = searchParams.get("date");

    if (!clinicId || !date) return NextResponse.json({ error: "clinic_id and date are required" }, { status: 400 });

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(date);
    if (requestDate < today) return NextResponse.json({ error: "Cannot query slots for past dates" }, { status: 400 });

    const result = await generateAvailableSlots(clinicId, date);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ slots: result.slots });
  } catch (error) {
    console.error("Slots API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
