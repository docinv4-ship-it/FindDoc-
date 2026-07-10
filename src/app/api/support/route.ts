import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requester_type,
      requester_id,
      requester_name,
      requester_email,
      subject,
      message,
      priority,
      category,
    } = body;

    // Validation
    if (!requester_type || !["doctor", "patient", "guest"].includes(requester_type)) {
      return NextResponse.json({ error: "Invalid requester type" }, { status: 400 });
    }
    if (!requester_name || requester_name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }
    if (!requester_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requester_email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!subject || subject.trim().length < 3) {
      return NextResponse.json({ error: "Subject must be at least 3 characters" }, { status: 400 });
    }
    if (!message || message.trim().length < 10) {
      return NextResponse.json({ error: "Message must be at least 10 characters" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    // Create support ticket
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        requester_type,
        requester_id: requester_id || null,
        requester_name: requester_name.trim(),
        requester_email: requester_email.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        priority: priority || "normal",
        category: category || null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating support ticket:", error);
      return NextResponse.json({ error: "Failed to create support ticket" }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Support API error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requester_email = searchParams.get("email");
    const requester_id = searchParams.get("requester_id");
    const requester_type = searchParams.get("requester_type");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = await createClient();

    let query = supabase
      .from("support_tickets")
      .select("*, support_ticket_messages(*)")
      .order("created_at", { ascending: false });

    if (requester_id && requester_type) {
      query = query.eq("requester_id", requester_id).eq("requester_type", requester_type);
    } else if (requester_email) {
      query = query.eq("requester_email", requester_email.toLowerCase());
    } else {
      return NextResponse.json({ error: "Requester identifier required" }, { status: 400 });
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error("Error fetching tickets:", error);
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }

    return NextResponse.json({ tickets: data });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
