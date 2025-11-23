import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tweetId: string }> }
) {
  try {
    const { tweetId } = await params;
    if (!tweetId) {
      return NextResponse.json(
        { error: "tweetId parameter is required" },
        { status: 400 }
      );
    }

    // First, try to use Twitter's oEmbed API (works for public tweets)
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=https://twitter.com/i/status/${tweetId}&omit_script=true`;
      
      const oembedResponse = await fetch(oembedUrl, {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (oembedResponse.ok) {
        const oembedData = await oembedResponse.json();
        
        if (oembedData.html) {
          // Extract tweet text from HTML
          // We'll parse it on the server side to avoid CORS issues
          const tweetText = oembedData.html
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          
          // Extract author handle from author_name
          let authorHandle = 'unknown';
          if (oembedData.author_name) {
            const match = oembedData.author_name.match(/@(\w+)/);
            if (match && match[1]) {
              authorHandle = match[1];
            } else {
              authorHandle = oembedData.author_name.replace('@', '').trim();
            }
          }
          
          if (tweetText) {
            return NextResponse.json({
              tweet_id: tweetId,
              body: tweetText,
              author_handle: authorHandle,
            });
          }
        }
      }
    } catch (oembedError) {
      console.log("oEmbed API failed, trying backend API:", oembedError);
      // Fall through to try backend API
    }

    // Fallback: Try to fetch tweet details from backend API
    const authHeader = request.headers.get("authorization");
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(
      `${EXTERNAL_API_BASE}/tweets/${tweetId}`,
      {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(30000),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // If both fail, return a minimal response
    return NextResponse.json(
      { 
        tweet_id: tweetId,
        body: null,
        author_handle: null,
        error: "Tweet details not available"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch tweet details:", error);
    return NextResponse.json(
      {
        tweet_id: (await params).tweetId,
        body: null,
        author_handle: null,
        error: "Failed to fetch tweet details"
      },
      { status: 200 }
    );
  }
}

