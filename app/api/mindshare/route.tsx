import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get("project_name");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const period = searchParams.get("period");

    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Construct the query string
    const queryParams = new URLSearchParams({
      project_name: projectName,
      ...(limit && { limit }),
      ...(offset && { offset }),
      ...(period && { period }),
    }).toString();

    // Forward the request to the backend API
    const response = await fetch(
      `${EXTERNAL_API_BASE}/mindshare?${queryParams}`,
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
    console.error("Error fetching mindshare data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch mindshare data" },
      { status: error.response?.status || 500 }
    );
  }
}
