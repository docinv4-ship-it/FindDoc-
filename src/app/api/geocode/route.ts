import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ClinicBook-AI-Platform/2.0"
      }
    });

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name
      });
    }

    return NextResponse.json({ error: "No coordinates found" }, { status: 404 });
  } catch (error) {
    console.error("Geocoding Error: ", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
