import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, url, userAgent, context } = body;

    console.error("[Client Error]", {
      timestamp: new Date().toISOString(),
      message,
      stack: stack?.split("\n").slice(0, 3).join("\n"),
      url,
      userAgent: userAgent?.substring(0, 100),
      context,
    });

    return NextResponse.json({ logged: true });
  } catch {
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}
