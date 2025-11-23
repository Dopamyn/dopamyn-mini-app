import ScrollToTop from "@/components/ScrollToTop";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import KOLProfileHeader from "../../../components/KOLProfileHeader";
import KOLSearch from "../../../components/KOLSearch";
import MarketCapDistribution from "../../components/MarketCapDistribution";
import { ProfileCharts } from "../../components/ProfileCharts";
import SmartFeed from "../../components/SmartFeed";
import TokenOverview from "../../components/TokenOverview";
import type {
  AuthorDetailsResponse,
  ChartDataPoint,
  ProfileData,
  UserProfileResponse,
} from "../../types";

async function fetchUserProfile(
  authorHandle: string,
  attempt = 0
): Promise<UserProfileResponse | null> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(
      `${baseUrl}/api/user/get-user-profile?handle=${authorHandle}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }
    );

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return (await response.json()) as UserProfileResponse;
      }
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.log(
      `User profile API fetch failed (attempt ${attempt + 1}):`,
      error
    );

    // Retry logic
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchUserProfile(authorHandle, attempt + 1);
    }
  }
  return null;
}

async function fetchAuthorDetails(
  authorHandle: string,
  attempt = 0
): Promise<AuthorDetailsResponse | null> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(
      `${baseUrl}/api/user/author-handle-details?author_handle=${authorHandle}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }
    );

    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return (await response.json()) as AuthorDetailsResponse;
      }
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.log(
      `Author details API fetch failed (attempt ${attempt + 1}):`,
      error
    );

    // Retry logic
    if (attempt < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchAuthorDetails(authorHandle, attempt + 1);
    }
  }
  return null;
}

async function getProfileData(authorHandle: string): Promise<{
  profile: ProfileData;
  chartData: ChartDataPoint[];
  activityData: UserProfileResponse["result"]["activity_data"];
} | null> {
  try {
    // Make parallel API calls but handle them separately
    const userProfileData = await fetchUserProfile(authorHandle);

    // If user profile data is not available, we can't show anything meaningful
    if (!userProfileData?.result) {
      return null;
    }

    // Process chart data which we know exists since userProfileData.result exists
    const chartData = userProfileData.result.chart_data.map(
      ([date, label, followers, smartFollowers, mindshare]) => ({
        date,
        label,
        followers_count: followers,
        smart_followers_count: smartFollowers,
        mindshare,
      })
    );

    // Try to get author details but don't fail if unavailable
    let authorDetailsData = null;
    try {
      authorDetailsData = await fetchAuthorDetails(authorHandle);
    } catch (error) {
      // Continue without author details
    }

    // Get the latest metrics from chart data or use defaults
    const latestMetrics =
      chartData.length > 0
        ? chartData[chartData.length - 1]
        : {
            followers_count: 0,
            smart_followers_count: 0,
            mindshare: 0,
          };

    // Create profile with fallbacks for author details
    const profile: ProfileData = {
      name:
        authorDetailsData && authorDetailsData.result
          ? authorDetailsData.result.name
          : authorHandle,
      author_handle: authorHandle,
      bio:
        authorDetailsData && authorDetailsData.result
          ? authorDetailsData.result.bio
          : "",
      profile_image_url: userProfileData.result.activity_data.profile_image,
      followers_count: latestMetrics.followers_count,
      smart_followers_count: latestMetrics.smart_followers_count,
      mindshare: latestMetrics.mindshare,
      account_created_at:
        authorDetailsData && authorDetailsData.result
          ? authorDetailsData.result.account_created_at
          : undefined,
    };

    return {
      profile,
      chartData,
      activityData: userProfileData.result.activity_data,
    };
  } catch (error) {
    console.log("API fetch failed for profile:", authorHandle, error);
    return null;
  }
}

function formatAccountCreatedDate(dateString?: string): string {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = Math.floor(diffDays / 365);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffYears > 0) {
      return `Joined ${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
    } else if (diffMonths > 0) {
      return `Joined ${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    } else {
      return `Joined ${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
  } catch (error) {
    return "";
  }
}

// Server-side metadata generation
export async function generateMetadata({
  params,
}: {
  params: { profileName: string };
}): Promise<Metadata> {
  const { profileName } = params;
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

export default async function ProfilePage({
  params,
}: {
  params: { profileName: string };
}) {
  const { profileName } = await params;

  if (!profileName) {
    redirect("/kols/eliz883");
  }

  const data = await getProfileData(profileName);

  if (!data) {
    notFound();
  }

  const { profile, chartData, activityData } = data;
  const accountCreatedText = formatAccountCreatedDate(
    profile.account_created_at
  );

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="flex flex-col lg:flex-row items-start w-full">
        {/* Main Content */}
        <div className="flex-1 py-4 lg:py-8 px-4 lg:pl-12 lg:pr-4 w-full">
          <div className="max-w-4xl mx-auto">
            {/* Search Bar */}
            <KOLSearch />

            {/* Profile Header */}
            <KOLProfileHeader
              profile={profile}
              accountCreatedText={accountCreatedText}
            />

            {/* Chart Cards */}
            <ProfileCharts
              chartData={chartData}
              activityData={activityData}
              authorHandle={profile.author_handle}
            />

            {/* Market Cap Distribution */}
            <div className="mt-6 lg:mt-8">
              <MarketCapDistribution authorHandle={profile.author_handle} />
            </div>

            {/* Token Overview Section */}
            <div className="mt-6 lg:mt-8">
              <TokenOverview authorHandle={profile.author_handle} />
            </div>
          </div>
        </div>

        {/* Smart Feed Sidebar */}
        <div className="w-full lg:w-[480px] py-4 lg:py-8 px-4 lg:pr-12 lg:h-[calc(100vh-4rem)] lg:sticky lg:top-16">
          <div className="h-full lg:overflow-y-auto relative">
            <SmartFeed authorHandle={profile.author_handle} />
            <ScrollToTop />
          </div>
        </div>
      </div>
      {/* Global scroll to top for mobile */}
      <ScrollToTop />
    </div>
  );
}
