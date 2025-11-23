import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const referralCode = searchParams.get("referral_code");

  if (!referralCode) {
    return NextResponse.json(
      { error: "Referral code parameter is required" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/get-referral-card-info?referral_code=${referralCode}`,
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
  } catch (error) {
    console.error("Failed to get referral card info:", error);
    return NextResponse.json(
      { error: "Failed to get referral card info" },
      { status: 500 }
    );
  }
}
