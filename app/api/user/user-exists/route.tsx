import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const xHandle = searchParams.get("x_handle");

    if (!xHandle) {
      return NextResponse.json(
        { error: "X handle is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/user-exists?x_handle=${xHandle}`
    ).then((res) => res.json());
    const data = response.data;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error checking user existence:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check user existence" },
      { status: error.response?.status || 500 }
    );
  }
}
