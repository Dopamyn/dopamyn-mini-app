import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Missing refresh_token parameter" },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

    // Refresh the access token
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token refresh failed:", tokenResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();

    // Return the refreshed tokens
    return NextResponse.json({
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token, // Use new refresh token if provided, otherwise keep old one
        expires_at: Date.now() + tokenData.expires_in * 1000,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
