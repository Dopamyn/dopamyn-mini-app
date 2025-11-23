import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const { handle } = params;

    // Fetch user data using get-user-profile endpoint
    const userResponse = await fetch(
      `${API_BASE_URL}/user/get-user-profile?handle=${handle}`
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await userResponse.json();
    const user = userData?.result;

    // Also fetch author details for name and bio
    const authorDetailsResponse = await fetch(
      `${API_BASE_URL}/user/author-handle-details?author_handle=${handle}`
    );

    let authorName = handle;
    let authorBio = "";

    if (authorDetailsResponse.ok) {
      const authorData = await authorDetailsResponse.json();
      authorName = authorData?.result?.name || handle;
      authorBio = authorData?.result?.bio || "";
    }

    // Build absolute URLs for public assets
    const baseUrl = new URL(request.url).origin;
    const blurImageUrl = `${baseUrl}/blur.png`;

    // Get the latest metrics
    const latestData = user?.chart_data?.[user.chart_data.length - 1];
    const smartFollowers = latestData?.[3] || 0;
    const mindshare = latestData?.[4] || 0;

    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "628px",
            display: "flex",
            flexDirection: "column",
            background: "#000000",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Image with Blur */}
          <img
            src={blurImageUrl}
            alt="Background"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Content Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              padding: "48px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Top Row - Profile Info */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* Profile Section */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                }}
              >
                {user?.activity_data?.profile_image ? (
                  <img
                    src={user.activity_data.profile_image}
                    style={{
                      width: "96px",
                      height: "96px",
                      borderRadius: "12px",
                      objectFit: "cover",
                    }}
                    alt="Profile"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    style={{
                      width: "96px",
                      height: "96px",
                      borderRadius: "12px",
                      background: "#00D992",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "60px",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    {authorName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h2
                    style={{
                      fontSize: "56px",
                      color: "#DFFCF6",
                      margin: 0,
                      fontWeight: "400",
                    }}
                  >
                    {authorName}
                  </h2>
                  <p
                    style={{
                      fontSize: "30px",
                      color: "#A9F0DF",
                      margin: 0,
                      marginTop: "8px",
                    }}
                  >
                    @{handle}
                  </p>
                </div>
              </div>

              {/* Stats Section */}
              <div
                style={{
                  display: "flex",
                  gap: "40px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "36px",
                      color: "#9CA3AF",
                      margin: 0,
                      marginBottom: "8px",
                    }}
                  >
                    Smart Followers
                  </h3>
                  <p
                    style={{
                      fontSize: "42px",
                      color: "white",
                      margin: 0,
                      fontWeight: "400",
                    }}
                  >
                    {formatNumber(smartFollowers)}
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "36px",
                      color: "#9CA3AF",
                      margin: 0,
                      marginBottom: "8px",
                    }}
                  >
                    Mindshare
                  </h3>
                  <p
                    style={{
                      fontSize: "42px",
                      color: "white",
                      margin: 0,
                      fontWeight: "400",
                    }}
                  >
                    {mindshare.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Middle Row - Bio */}
            {authorBio && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "16px",
                  padding: "32px 0",
                  borderTop: "2px dashed #374151",
                  borderBottom: "2px dashed #374151",
                }}
              >
                <div
                  style={{
                    fontSize: "32px",
                    color: "white",
                    margin: 0,
                    fontWeight: "400",
                    textAlign: "left",
                  }}
                >
                  {authorBio.length > 200
                    ? `${authorBio.slice(0, 200)}...`
                    : authorBio}
                </div>
              </div>
            )}

            {/* Dopamyn Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 349 348" fill="none">
                <rect width="348" height="348" rx="79" fill="#00D992" />
                <path
                  d="M271.333 86V80.5C271.333 69.7 262.333 67 257.833 67H180.833C175.633 67 171.667 71.6054 170.333 73.9082L163.352 86L150.073 109C146.265 115.596 141.728 113 139.419 109L130.181 93C128.941 90.8514 127.203 89.3211 125.333 88.2509C122.331 86.5318 118.991 86 116.833 86H90.3335C80.8335 86 77.3335 95 77.3335 99V164V172.5C77.3335 176 81.0335 183 87.8335 183H107.349H125.333V267.5C125.333 273.5 127.433 281 137.833 281H215.833C222.333 281 233.527 272 225.733 258.5L182.143 183L176.333 172.938C174.349 169.5 174.833 164 180.833 164H259.833C264.333 164 271.333 160.1 271.333 152.5V86Z"
                  fill="#060F11"
                />
              </svg>
              <span
                style={{
                  fontSize: "24px",
                  color: "#A9F0DF",
                }}
              >
                Dopamyn
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 628,
      }
    );
  } catch (error) {
    console.error("Failed to generate OG image:", error);

    // Return a fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111827",
            color: "#F9FAFB",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Dopamyn KOL Profile
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#9CA3AF",
              textAlign: "center",
            }}
          >
            Web3 KOL Marketplace
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 628,
      }
    );
  }
}
