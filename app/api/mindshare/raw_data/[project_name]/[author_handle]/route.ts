import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(
  request: NextRequest,
  { params }: { params: { project_name: string; author_handle: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";

    // Construct the query string
    const queryParams = new URLSearchParams({
      period,
      limit,
      offset,
    }).toString();

    // Forward the request to the backend API
    const url = `${EXTERNAL_API_BASE}/mindshare/raw_data/${params.project_name}/${params.author_handle}?${queryParams}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch mindshare raw data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch mindshare raw data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
