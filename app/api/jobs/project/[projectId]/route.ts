import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const response = await fetch(
      `${EXTERNAL_API_BASE}/jobs/project/${projectId}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (response.ok) {
      const result = await response.json();
      // The API returns { result: {...}, message: "..." }
      return NextResponse.json({
        data: result.result,
        message: result.message,
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(
      `Failed to fetch job status for project ${projectId}:`,
      error
    );
    return NextResponse.json(
      {
        error: "Failed to fetch job status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
