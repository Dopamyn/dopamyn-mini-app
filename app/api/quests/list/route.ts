import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const creator = searchParams.get("creator");
    const reward_system = searchParams.get("reward_system");
    const start = searchParams.get("start");
    const limit = searchParams.get("limit");

    // Build query params
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (creator) params.append("creator", creator);
    if (reward_system) params.append("reward_system", reward_system);
    if (start) params.append("start", start);
    if (limit) params.append("limit", limit);

    const queryString = params.toString();
    const url = `${EXTERNAL_API_BASE}/quests/list_old${
      queryString ? `?${queryString}` : ""
    }`;

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
      signal: AbortSignal.timeout(60000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Failed to fetch quests:", error);
    return NextResponse.json(
      { error: "Failed to fetch quests" },
      { status: error.response?.status || 500 }
    );
  }
}
