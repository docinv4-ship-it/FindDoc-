import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `chat-attachments/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("chat-attachments")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      return NextResponse.json({ error: `Storage upload failed: ${error.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("chat-attachments")
      .getPublicUrl(filePath);

    let attachmentType: "image" | "pdf" | "document" = "document";
    if (file.type.startsWith("image/")) attachmentType = "image";
    else if (file.type === "application/pdf") attachmentType = "pdf";

    return NextResponse.json({
      url: publicUrlData.publicUrl,
      attachment_type: attachmentType,
      name: file.name,
      size: file.size,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
