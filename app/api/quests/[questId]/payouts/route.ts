import { NextRequest, NextResponse } from "next/server";

// const EXTERNAL_API_BASE =
//   process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
//   process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
//   "https://api.dopamyn.fun";

const EXTERNAL_API_BASE = "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    const { questId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get("start") || "0";
    const limit = searchParams.get("limit") || "50";

    const url = `${EXTERNAL_API_BASE}/quests/${questId}/payouts?start=${start}&limit=${limit}`;

    // Get Authorization header from the request
    const authHeader = request.headers.get("authorization");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch quest payouts:", error);
    return NextResponse.json(
      { error: "Failed to fetch quest payouts" },
      { status: 500 }
    );
  }
}
