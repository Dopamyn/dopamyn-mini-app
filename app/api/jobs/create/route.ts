import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${EXTERNAL_API_BASE}/jobs/create`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (response.ok) {
      const result = await response.json();
      // The API returns { result: {...}, message: "..." }
      // We want to return the job data with proper structure
      return NextResponse.json({
        data: result.result,
        message: result.message,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      {
        error: "Failed to create job",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
