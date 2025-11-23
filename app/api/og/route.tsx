import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Enable aggressive caching for OG images (static content)
export const revalidate = 3600; // Cache for 1 hour

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  try {
    // Get referral code from URL
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get("referral_code");
    let name = searchParams.get("name");
    let profile_image_url = searchParams.get("profile_image_url");

    // Set aggressive cache control headers for static OG images
    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600, immutable"
    );

    if (!name && !profile_image_url) {
      const userData = await fetch(
        `${API_BASE_URL}/user/get-referral-card-info?referral_code=${referralCode}`
      );
      const user = await userData.json();
      name = user.result.name;
      profile_image_url = user.result.profile_image_url;
    }

    // Create the Open Graph image
    
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "628px",
            display: "flex",
            flexDirection: "column",
            background: "#000000", // brand dark.primary
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Image */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${baseUrl}/landingPageBg.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.6,
              zIndex: 0,
            }}
          />
          {/* Content Container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              position: "relative",
              zIndex: 1,
              background: "transparent",
            }}
          >
            {/* Main Content Row */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "32px 64px",
                flex: 1,
                gap: "16px",
              }}
            >
              {/* Left Section - Text and Logo */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  flex: 1,
                }}
              >
                {/* Brand Row */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <img
                    src={`${baseUrl}/fulllogo.svg`}
                    // width={48}
                    height={48}
                    alt="Dopamyn"
                    style={{ display: "block" }}
                  />
                  {/* <span
                    style={{
                      fontSize: "32px",
                      color: "#CFCFCF", // neutral 100
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Dopamyn
                  </span> */}
                </div>
                <div
                  style={{
                    fontSize: "54px",
                    color: "#FFFFFF",
                    margin: 0,
                    fontWeight: "400",
                    textAlign: "left",
                    display: "flex",
                    flexWrap: "wrap",
                  }}
                >
                  {name} Invited you <br />
                  to join Dopamyn
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontSize: "40px",
                      color: "#F38C8C", // salmon orange
                      margin: 0,
                      fontWeight: "400",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    Create buzz on
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="#F38C8C"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    & Earn Rewards
                  </span>
                </div>
              </div>

              {/* Right Section - Profile */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {profile_image_url ? (
                  <img
                    src={profile_image_url}
                    style={{
                      width: "220px",
                      height: "220px",
                      borderRadius: "16px",
                      objectFit: "cover",
                    }}
                    alt="Profile"
                    crossOrigin={
                      profile_image_url.startsWith("http")
                        ? "anonymous"
                        : undefined
                    }
                  />
                ) : (
                  <div
                    style={{
                      width: "160px",
                      height: "160px",
                      borderRadius: "16px",
                      background: "#00D992",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "80px",
                      fontWeight: "bold",
                      color: "#000",
                    }}
                  >
                    {name?.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row - CTA */}
            <div
              style={{
                display: "flex",
                background: "#F38C8C", // support.salmon
                color: "#000000",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                width: "100%",
              }}
            >
              <p style={{ fontSize: "40px", fontWeight: "900", margin: 0 }}>
                Claim Your 10 DOPE →
              </p>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Copy the headers from the ImageResponse and add our aggressive cache headers
    const finalHeaders = new Headers(imageResponse.headers);
    finalHeaders.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600, immutable"
    );

    // Return a new Response with the same body but updated headers
    return new Response(imageResponse.body, {
      status: imageResponse.status,
      headers: finalHeaders,
    });
  } catch (error) {
    console.error("Failed to generate OG image:", error);

    // Set aggressive cache headers for the fallback image too
    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600, immutable"
    );

    // Return a fallback image aligned with brand styling
    const fallbackResponse = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000000",
            position: "relative",
            overflow: "hidden",
            padding: "40px",
          }}
        >
          {/* Background Image */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${baseUrl}/landingPageBg.png)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.6,
              zIndex: 0,
            }}
          />
          {/* Background Pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                "radial-gradient(circle at 25px 25px, rgba(243, 140, 140, 0.08) 2px, transparent 0), radial-gradient(circle at 75px 75px, rgba(243, 140, 140, 0.05) 2px, transparent 0)",
              backgroundSize: "100px 100px",
              opacity: 0.7,
            }}
          />

          {/* Glow Effects */}
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "-5%",
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle, rgba(243, 140, 140, 0.18) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-10%",
              right: "-5%",
              width: "50%",
              height: "50%",
              background:
                "radial-gradient(circle, rgba(243, 140, 140, 0.18) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "40px",
              maxWidth: "90%",
              zIndex: 1,
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                marginBottom: "8px",
                filter: "drop-shadow(0 8px 16px rgba(0, 217, 146, 0.2))",
              }}
            >
              <img
                src={`${baseUrl}/fulllogo.svg`}
                // width={48}
                height={48}
                alt="Dopamyn"
                style={{ display: "block" }}
              />
            </div>

            {/* Title */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <h1
                style={{
                  fontSize: "72px",
                  fontWeight: "800",
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.1,
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))",
                }}
              >
                Slow Growth ain't
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, #F38C8C 0%, #D67171 100%)",
                      backgroundClip: "text",
                      color: "transparent",
                      marginLeft: "12px",
                      filter:
                        "drop-shadow(0 2px 4px rgba(243, 140, 140, 0.2))",
                    }}
                  >
                    DOPE! 
                  </span>
              </h1>
              <div
                style={{
                  fontSize: "32px",
                  color: "#CFCFCF",
                  textAlign: "center",
                  margin: 0,
                  lineHeight: 1.4,
                  maxWidth: "80%",
                  opacity: 0.9,
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                Turn Your 
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="#ffffff"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Activity Into Rewards
              </div>
            </div>

            {/* Rewards Section */}
            <div
              style={{
                gap: "24px",
                padding: "40px 48px",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%)",
                borderRadius: "24px",
                border: "1px solid rgba(243, 140, 140, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div
                style={{
                  fontSize: "36px",
                  color: "#F38C8C",
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: "16px",
                  filter:
                    "drop-shadow(0 2px 4px rgba(243, 140, 140, 0.2))",
                }}
              >
               Exclusive Benefits
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "32px",
                  justifyContent: "center",
                }}
              >
                {["Early Access", "Token Rewards", "Premium Campaigns"].map(
                  (benefit, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px 28px",
                        background:
                          "rgba(243, 140, 140, 0.08)",
                        borderRadius: "16px",
                        border:
                          "1px solid rgba(243, 140, 140, 0.3)",
                        boxShadow:
                          "0 4px 12px rgba(243, 140, 140, 0.1)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #F38C8C 0%, #D67171 100%)",
                          boxShadow: "0 0 8px rgba(243, 140, 140, 0.35)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "20px",
                          color: "#F3F4F6",
                          fontWeight: "600",
                          filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                        }}
                      >
                        {benefit}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

    // Copy the headers from the fallback ImageResponse and add our aggressive cache headers
    const finalHeaders = new Headers(fallbackResponse.headers);
    finalHeaders.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600, immutable"
    );

    return new Response(fallbackResponse.body, {
      status: fallbackResponse.status,
      headers: finalHeaders,
    });
  }
}
