import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);
  const referralCode = searchParams.get("referral_code");

  console.log(referralCode, ": found referralCode");

  // Only modify the response for the home page
  if (pathname === "/") {
    const response = NextResponse.next();
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${request.headers.get("host")}`;

    // Set OG image URL with referral code if present
    const ogImageUrl = referralCode
      ? `${baseUrl}/api/og?referral_code=${referralCode}`
      : `${baseUrl}/api/og`;

    response.headers.set("x-og-image", ogImageUrl);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
