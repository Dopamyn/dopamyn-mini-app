import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get("search_term");
  const category = searchParams.get("category");
  const limit = searchParams.get("limit") || "10";
  const start = searchParams.get("start") || "0";

  if (!searchTerm && !category) {
    return NextResponse.json(
      { error: "Either search_term or category parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Build the query string
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append("search_term", searchTerm);
    if (category) queryParams.append("category", category);
    queryParams.append("limit", limit);
    queryParams.append("start", start);

    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/search-authors?${queryParams.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to search authors:", error);
    return NextResponse.json(
      { error: "Failed to search authors" },
      { status: 500 }
    );
  }
}
