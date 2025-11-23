import { NextRequest, NextResponse } from "next/server";
import { buildWorldAppDeepLink } from "@/lib/miniapp-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const returnTo = searchParams.get("return_to") || "/campaigns"; // Default to /campaigns
    const isMiniApp = searchParams.get("is_miniapp") === "true";

    // Check user agent for mini app indicators
    const userAgent = request.headers.get("user-agent") || "";
    const isMiniAppFromUA = userAgent.toLowerCase().includes("worldapp") || 
                            userAgent.toLowerCase().includes("miniapp");

    const isMiniAppRequest = isMiniApp || isMiniAppFromUA;

    if (error) {
      console.error("Twitter OAuth error:", error, errorDescription);
      
      if (isMiniAppRequest) {
        // Redirect back to mini app with error
        const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
        const errorUrl = buildWorldAppDeepLink(appId, "/auth/callback", {
          error: "auth_failed",
          error_description: errorDescription || error,
        });
        return NextResponse.redirect(errorUrl);
      }
      
      return NextResponse.redirect(
        new URL(`${returnTo}?error=auth_failed`, request.url)
      );
    }

    if (!code || !state) {
      if (isMiniAppRequest) {
        const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
        const errorUrl = buildWorldAppDeepLink(appId, "/auth/callback", {
          error: "missing_params",
        });
        return NextResponse.redirect(errorUrl);
      }
      
      return NextResponse.redirect(
        new URL(`${returnTo}?error=missing_params`, request.url)
      );
    }

    if (isMiniAppRequest) {
      // Redirect back to mini app with auth params
      const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
      const callbackPath = "/auth/callback";
      const deepLink = buildWorldAppDeepLink(appId, callbackPath, {
        twitter_auth: "success",
        code,
        state,
        return_to: returnTo,
      });
      return NextResponse.redirect(deepLink);
    }

    // Regular browser redirect to client-side to complete OAuth callback
    const callbackUrl = new URL("/", request.url);
    callbackUrl.searchParams.set("twitter_auth", "success");
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    
    // Try to detect mini app from error context
    const isMiniAppRequest = request.headers.get("user-agent")?.toLowerCase().includes("worldapp");
    
    if (isMiniAppRequest) {
      const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
      const errorUrl = buildWorldAppDeepLink(appId, "/auth/callback", {
        error: "auth_error",
      });
      return NextResponse.redirect(errorUrl);
    }
    
    return NextResponse.redirect(
      new URL("/campaigns?error=auth_error", request.url)
    );
  }
}
