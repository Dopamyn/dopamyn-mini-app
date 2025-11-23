import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountHandle = searchParams.get("account_handle");

    if (!accountHandle) {
      return NextResponse.json(
        { error: "Account handle is required" },
        { status: 400 }
      );
    }

    // Forward the request to the backend API
    const response = await fetch(
      `${EXTERNAL_API_BASE}/auth/check-twitter-handle?account_handle=${accountHandle}`,
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
  } catch (error: any) {
    console.error("Error checking Twitter handle:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check Twitter handle" },
      { status: error.response?.status || 500 }
    );
  }
}
