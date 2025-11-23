import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = await req.json();

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Proof payload is required" },
        { status: 400 }
      );
    }

    // Get auth token from headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "Authorization required" },
        { status: 401 }
      );
    }

    // Call backend to verify and link World ID
    const response = await fetch(`${EXTERNAL_API_BASE}/user/link-world-id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        proof: payload.proof,
        nullifier_hash: payload.nullifier_hash,
        merkle_root: payload.merkle_root,
        verification_level: payload.verification_level || "orb",
        action_id: action || "dopamyn-human-verification",
        signal: signal || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: "Verification failed",
      }));
      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || errorData.error || "Verification failed",
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Human verification successful",
      user: data.result,
    });
  } catch (error: any) {
    console.error("Worldcoin verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

