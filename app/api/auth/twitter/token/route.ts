import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function POST(request: NextRequest) {
  try {
    const { code, verifier, state, referral_code } = await request.json();

    if (!code || !verifier || !state) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Verify state parameter (CSRF protection)
    // Note: In a real app, you'd store this in a secure session or database
    // For now, we'll skip this check since we're handling it client-side

    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI!;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        client_id: clientId,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier,
        scope: "tweet.read users.read offline.access",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to exchange code for tokens" },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    // console.log('tokenData', JSON.stringify(tokenData, null, 2));
    // Get user info
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,verified,affiliation,is_identity_verified,location,parody,profile_banner_url,protected,public_metrics,subscription_type,verified_followers_count,verified_type",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("User info fetch failed:", userResponse.status, errorText);
      return NextResponse.json(
        { error: "Failed to get user info" },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();
    console.log('userData', userData);
    const twitterUsername = userData.data.username.toLowerCase();
    const isVerified = userData.data.verified || false;
    
    // Extract all additional fields
    const twitterId = userData.data.id;
    const verifiedType = userData.data.verified_type || null;
    const isIdentityVerified = userData.data.is_identity_verified || false;
    const subscriptionType = userData.data.subscription_type || null;
    const location = userData.data.location || null;
    const verifiedFollowersCount = userData.data.verified_followers_count || null;
    const publicMetrics = userData.data.public_metrics || null;

    // Check if user exists in database
    let dbToken = null;
    let userExists = false;

    try {
      const checkResponse = await fetch(
        `${EXTERNAL_API_BASE}/auth/check-twitter-handle?account_handle=${twitterUsername}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.result?.token) {
          // User exists - use existing token
          dbToken = checkData.result.token;
          userExists = true;
        }
      }
    } catch (error) {
      console.error("Error checking Twitter handle:", error);
      // Continue with new user creation
    }

    // If user doesn't exist, create new user
    if (!userExists) {
      try {
        const signupResponse = await fetch(`${EXTERNAL_API_BASE}/user/create-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            x_handle: twitterUsername,
            x_id: twitterId,
            name: userData.data.name,
            profile_image_url: userData.data.profile_image_url,
            verified: isVerified,
            verified_type: verifiedType,
            is_identity_verified: isIdentityVerified,
            subscription_type: subscriptionType,
            location: location,
            verified_followers_count: verifiedFollowersCount,
            public_metrics: publicMetrics,
            referral_code_used: referral_code || "",
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (signupResponse.ok) {
          const signupData = await signupResponse.json();
          if (signupData.result?.token) {
            dbToken = signupData.result.token;
            userExists = true;
          }
          else {
            
            const checkResponse = await fetch(`${EXTERNAL_API_BASE}/auth/check-twitter-handle?account_handle=${twitterUsername}`, {
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
            });
            
            const userData = await checkResponse.json();
            
            if (userData.result?.token) {
              dbToken = userData.result.token;
              userExists = true;
            }
          }
        }
      } catch (error) {
        console.error("Error creating new user:", error);
        // Continue without token - user can still be authenticated with Twitter
      }
    }

    // Update user with all Twitter fields if user exists and we have a token
    if (dbToken && userExists) {
      try {
        await fetch(`${EXTERNAL_API_BASE}/user/update-user`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${dbToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            x_id: twitterId,
            name: userData.data.name,
            verified: isVerified,
            verified_type: verifiedType,
            is_identity_verified: isIdentityVerified,
            subscription_type: subscriptionType,
            location: location,
            verified_followers_count: verifiedFollowersCount,
            public_metrics: publicMetrics,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
      } catch (error) {
        console.error("Error updating user Twitter data:", error);
        // Don't fail the auth flow if update fails
      }
    }

    // Return both tokens and user info
    return NextResponse.json({
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      },
      user: {
        id: twitterId,
        username: userData.data.username,
        name: userData.data.name,
        profile_image_url: userData.data.profile_image_url,
        verified: isVerified,
        verified_type: verifiedType,
        is_identity_verified: isIdentityVerified,
        subscription_type: subscriptionType,
        location: location,
        verified_followers_count: verifiedFollowersCount,
        public_metrics: publicMetrics,
      },
      dbToken, // Include database token if available
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
