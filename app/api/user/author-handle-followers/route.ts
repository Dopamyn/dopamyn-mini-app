import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authorHandle = searchParams.get("author_handle");
  const sortBy = searchParams.get("sort_by");
  const limit = searchParams.get("limit");
  const start = searchParams.get("start");

  if (!authorHandle) {
    return NextResponse.json(
      { error: "author_handle parameter is required" },
      { status: 400 }
    );
  }

  try {
    const queryParams = new URLSearchParams({
      author_handle: authorHandle,
      ...(sortBy && { sort_by: sortBy }),
      ...(limit && { limit }),
      ...(start && { start }),
    });

    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/author-handle-followers?${queryParams}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch author handle followers:", error);
    return NextResponse.json(
      { error: "Failed to fetch author handle followers" },
      { status: 500 }
    );
  }
}
