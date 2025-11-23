import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || "https://api.dopamyn.fun";

export async function POST(
  request: NextRequest,
  { params }: { params: { questId: string } }
) {
  try {
    const questId = params.questId;
    const body = await request.json();

    const url = `${EXTERNAL_API_BASE}/quests/verification/quest/${encodeURIComponent(
      questId
    )}/verify`;

    const authHeader = request.headers.get("authorization");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(40000),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Quest verification proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify quest" },
      { status: 500 }
    );
  }
}


