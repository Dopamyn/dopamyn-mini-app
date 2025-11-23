import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.cred.buzz";

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header from the incoming request
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      console.warn("get-user API called without authorization header");
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: 401 }
      );
    }

    // Validate token format
    if (!authHeader.startsWith("Bearer ")) {
      console.warn("Invalid authorization header format");
      return NextResponse.json(
        { error: "Invalid authorization header format" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.warn("Empty token provided");
      return NextResponse.json(
        { error: "Empty token provided" },
        { status: 401 }
      );
    }

    // Forward the request to the backend API with the auth header
    const response = await fetch(`${EXTERNAL_API_BASE}/user/get-user`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("Backend API returned 401 - token may be invalid or expired");
        return NextResponse.json(
          { error: "Authentication failed - token may be invalid or expired" },
          { status: 401 }
        );
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch user data" },
      { status: error.response?.status || 500 }
    );
  }
}
