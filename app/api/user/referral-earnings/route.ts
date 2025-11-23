import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 }
      );
    }

    // Get query parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get("sort_by") || "reward_earned_desc";
    const start = searchParams.get("start") || "0";
    const limit = searchParams.get("limit") || "10";

    // Forward the request to the backend API with the auth header and parameters
    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/referral-earnings?sort_by=${sortBy}&start=${start}&limit=${limit}`,
      {
        headers: {
          Authorization: authHeader,
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
  } catch (error: any) {
    console.error("Error fetching referral earnings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch referral earnings" },
      { status: error.response?.status || 500 }
    );
  }
}



