import { Metadata } from "next";

// Server-side metadata generation
export async function generateMetadata({
  params,
}: {
  params: { profileName: string };
}): Promise<Metadata> {
  const { profileName } = await params;
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
    process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
    "https://api.dopamyn.fun";

  try {
    // Fetch user profile data
    const userProfileResponse = await fetch(
      `${API_BASE_URL}/user/get-user-profile?handle=${profileName}`
    );

    if (!userProfileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const userProfileData = await userProfileResponse.json();

    // Fetch author details for additional info
    const authorDetailsResponse = await fetch(
      `${API_BASE_URL}/user/author-handle-details?author_handle=${profileName}`
    );

    let authorName = profileName;
    let authorBio = "";

    if (authorDetailsResponse.ok) {
      const authorData = await authorDetailsResponse.json();
      authorName = authorData?.result?.name || profileName;
      authorBio = authorData?.result?.bio || "";
    }

    // Create an optimized title
    const baseTitle = authorName;
    const titleSuffix = " | Dopamyn KOL";
    const title =
      baseTitle.length > 40
        ? `${baseTitle.substring(0, 37)}...${titleSuffix}`
        : `${baseTitle}${titleSuffix}`;

    const description =
      authorBio.length > 150
        ? `${authorBio.slice(0, 150)}...`
        : authorBio ||
        `Check out ${authorName}'s Web3 KOL profile on Dopamyn`;

    // Ensure absolute URLs for images
    const domain = process.env.NEXT_PUBLIC_APP_URL || "https://dopamyn.fun";
    const ogImageUrl = `${domain}/api/og/kol/${profileName}`;
    const pageUrl = `${domain}/kols/${profileName}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: "Dopamyn",
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${authorName}'s Dopamyn KOL Profile`,
          },
        ],
        locale: "en_US",
        type: "profile",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImageUrl],
        creator: "@dopamyn_fun",
      },
    };
  } catch (error) {
    return {
      title: "Dopamyn KOL Profile",
      description: "Web3 KOL Marketplace",
    };
  }
}
