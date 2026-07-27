import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine type
    let attachmentType = "document";
    if (file.type.startsWith("image/")) attachmentType = "image";
    else if (file.type.startsWith("audio/")) attachmentType = "audio";

    // Prepare unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `chat-attachments/${fileName}`;

    // Upload to Supabase Storage (Make sure a bucket named 'chat_files' exists)
    const { data, error } = await supabase.storage
      .from('chat_files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('chat_files').getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      name: file.name,
      attachment_type: attachmentType
    });

  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
