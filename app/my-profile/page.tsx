"use client";

import EarnMini from "@/components/EarnMini";
import SelfIntegration from "@/components/SelfIntegration";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { Campaign, Quest, ReferralEntry } from "@/lib/types";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import {
  LeaderboardTable,
  LeaderboardEntry,
} from "@/app/components/LeaderboardTable";
import {
  Clock,
  Copy,
  Download,
  Loader2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UpdateWalletDialog from "../components/UpdateWalletDialog";
import { useDominantColor } from "@/hooks/useDominantColor";
import { ReferralsPanel } from "@/components/ReferralsPanel";
import { ReferralTable } from "../components/ReferralTable";
import TelegramBotJoin from "@/components/TelegramBotJoin";
import { TgIcon } from "@/public/icons/TgIcon";
import { XLogo } from "@/components/icons/x-logo";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";

export default function MyCampaigns() {
  const router = useRouter();

  const { isAuthenticated, login, isProcessing, getTwitterHandle } =
    useTwitterDatabaseSync();
  const { toast } = useToast();
  // Top-level tabs: earn rewards, campaigns, referrals, my referrals, leaderboard
  const [activeTab, setActiveTab] = useState<
    | "earn"
    | "campaigns"
    | "quests"
    | "identity"
    | "referrals"
    | "referral-earnings"
    | "leaderboard"
  >("referrals");

  // Scroll to section function
  const scrollToSection = (sectionId: string) => {
    // Immediately update the active section when clicking a tab
    setCurrentSection(sectionId);

    const element = document.getElementById(sectionId);
    if (element) {
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      const offset = 150; // Offset for sticky tabs

      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      });

      // Verify section after smooth scroll completes (smooth scroll typically takes ~500ms)
      setTimeout(() => {
        // Force a scroll event to re-evaluate the current section
        window.dispatchEvent(new Event("scroll"));
      }, 600);
    }
  };

  // Track current section based on scroll position
  const [currentSection, setCurrentSection] = useState("referrals");

  const handleTelegramJoin = async () => {
    if (!isAuthenticated) {
      // User not logged in, ask to login first
      toast({
        title: "Login Required",
        description:
          "Please login with X to get quest and campaign notifications",
        duration: 3000,
      });
      login();
      return;
    }

    // User is authenticated, get their x_handle and redirect to telegram bot
    const twitterHandle = getTwitterHandle();

    if (!twitterHandle) {
      toast({
        title: "Error",
        description:
          "Unable to get your X handle. Please try logging in again.",
        duration: 3000,
      });
      return;
    }

    try {
      // Encrypt the x_handle using the API route
      const response = await fetch("/api/encrypt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: twitterHandle }),
      });

      if (!response.ok) {
        throw new Error("Failed to encrypt handle");
      }

      const { encryptedText } = await response.json();

      // Redirect to telegram bot with encrypted handle as start parameter
      const telegramBotUrl = `https://t.me/dopamynfunbot?start=${encryptedText}`;
      window.open(telegramBotUrl, "_blank");

      toast({
        title: "Redirecting to Telegram",
        description: "Opening Telegram bot in a new tab...",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to encrypt handle:", error);
      toast({
        title: "Error",
        description: "Failed to prepare secure connection. Please try again.",
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "referrals",
        "referral-earnings",
        "leaderboard",
        // "earn",
        // "identity",
        // "campaigns",
        // "quests"
      ];

      const scrollTop = window.scrollY;
      const offset = 150; // Offset from top to trigger section change

      let currentActiveSection = sections[0]; // Default to first section

      // Find which section is currently in view by checking from bottom to top
      for (let i = sections.length - 1; i >= 0; i--) {
        const sectionId = sections[i];
        const element = document.getElementById(sectionId);
        if (element) {
          // Calculate element's position relative to the document
          const elementTop =
            element.getBoundingClientRect().top + window.scrollY;

          // If we've scrolled past this section's top (with offset), this is the active section
          if (scrollTop + offset >= elementTop) {
            currentActiveSection = sectionId;
            break;
          }
        }
      }

      setCurrentSection(currentActiveSection);
    };

    // Use requestAnimationFrame for smoother scroll tracking
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // Initial check for current section with a small delay to ensure elements are rendered
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeoutId);
    };
  }, []); // Run once on mount, scroll handler will detect sections as they appear
  const [campaignSubTab, setCampaignSubTab] = useState<"created" | "received">(
    "created"
  );
  const [campaignType, setCampaignType] = useState<"Targeted" | "Public">(
    "Targeted"
  );
  const { user } = useUser();
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const { dominantColor } = useDominantColor(
    user?.profile_image_url,
    !!user?.profile_image_url
  );

  // Separate state for open and closed campaigns
  const [openCampaigns, setOpenCampaigns] = useState<Campaign[]>([]);
  const [closedCampaigns, setClosedCampaigns] = useState<Campaign[]>([]);
  const [receivedCampaigns, setReceivedCampaigns] = useState<Campaign[]>([]);
  const [myQuests, setMyQuests] = useState<Quest[]>([]);
  const [questsLoading, setQuestsLoading] = useState(false);
  const [isSocialCardCopying, setIsSocialCardCopying] =
    useState<boolean>(false);
  const [isSocialCardDownloading, setIsSocialCardDownloading] =
    useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // Fetch campaigns data following BusinessDashboard pattern
  const fetchAllCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.x_handle) {
        throw new Error("X handle not found");
      }

      // Initialize arrays
      const openCreated: Campaign[] = [];
      const closedCreated: Campaign[] = [];
      const received: Campaign[] = [];

      // Fetch closed campaigns (same pattern as BusinessDashboard)
      try {
        const closedResponse = await fetch("/api/campaigns/get-campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner_x_handle: user.x_handle,
          }),
        });

        const data = await closedResponse.json();
        if (data?.result) {
          const closedData = data.result;
          closedData.forEach((campaign: Campaign) => {
            // Add mock analytics data
            closedCreated.push({
              ...campaign,
            });
          });
        }
      } catch (error) {
        console.error("Error fetching closed campaigns:", error);
      }

      // Fetch campaigns where user is the influencer (received campaigns)
      try {
        const receivedResponse = await fetch("/api/campaigns/get-campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            influencer_x_handle: user.x_handle,
          }),
        });

        const data = await receivedResponse.json();
        if (data?.result) {
          const receivedData = data.result;
          receivedData.forEach((campaign: Campaign) => {
            received.push({
              ...campaign,
            });
          });
        }
      } catch (error) {
        console.error("Error fetching received campaigns:", error);
      }

      // Update state
      setOpenCampaigns(openCreated);
      setClosedCampaigns(closedCreated);
      setReceivedCampaigns(received);
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to load campaigns");
      toast({
        title: "Error",
        description: "Failed to load campaigns. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsPage, setReferralsPage] = useState(0);
  const [hasMoreReferrals, setHasMoreReferrals] = useState(true);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [partialReferrals, setPartialReferrals] = useState<ReferralEntry[]>([]);
  const referralsPerPage = 10;

  // Leaderboard data
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchMyReferrals = async (page: number = 0) => {
    const token = localStorage.getItem("token") as string;
    if (!token || referralsLoading || (!hasMoreReferrals && page !== 0)) {
      return;
    }

    try {
      setReferralsLoading(true);
      const response = await fetch(
        `/api/user/referral-earnings?sort_by=reward_earned_desc&start=${
          page * referralsPerPage
        }&limit=${referralsPerPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.result?.referrals) {
        const newReferrals = data.result.referrals.map((ref: any) => ({
          x_handle: ref.x_handle,
          used_time: ref.last_used_time || ref.used_time,
          followers_count: ref.followers_count,
          smart_followers_count: ref.smart_followers_count,
          reward_earned: ref.reward_earned || 0,
          profile_image_url: ref.profile_image_url,
        }));
        const totalReferrals = data.result.total_referrals || 0;

        if (page === 0) {
          setReferrals(newReferrals);
          setPartialReferrals([]);
        } else {
          setReferrals((prev) => [...prev, ...newReferrals]);
        }

        // Calculate if there are more referrals to load
        const currentTotal =
          page === 0
            ? newReferrals.length
            : referrals.length + newReferrals.length;
        const hasMore = currentTotal < totalReferrals;
        setHasMoreReferrals(hasMore);
        setReferralsPage(page);
      }
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast({
        title: "Error",
        description: "Failed to load referrals. Please try again.",
        duration: 2000,
      });
    } finally {
      setReferralsLoading(false);
    }
  };

  // Fetch quests data
  const fetchMyQuests = async () => {
    try {
      setQuestsLoading(true);
      setError(null);

      if (!user?.x_handle) {
        throw new Error("X handle not found");
      }

      const response = await fetch(
        `/api/campaigns/list?creator=${user.x_handle}&start=0&limit=50`
      );
      const data = await response.json();

      if (data?.data) {
        setMyQuests(data.data);
      } else {
        setMyQuests([]);
      }
    } catch (err: any) {
      console.error("Error fetching quests:", err);
      setError("Failed to load quests");
      toast({
        title: "Error",
        description: "Failed to load quests. Please try again.",
      });
    } finally {
      setQuestsLoading(false);
    }
  };

  // Fetch user rank from leaderboard
  const fetchUserRank = async () => {
    try {
      if (!user?.x_handle) return;

      const response = await fetch(
        "https://api.dopamyn.fun/user/get-score-leaderboard",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: 0,
            limit: 10000, // Fetch a large number to find user's rank
            author_handle: user.x_handle,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.result?.data) {
          const userIndex = data.result.data.findIndex(
            (kol: any) => kol.author_handle === user.x_handle
          );
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user rank:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const token = localStorage.getItem("token") as string;
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        "/api/user/leaderboard?leaderboard_type=earnings&sort_by=total_earning_desc&start=0&limit=10",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.result?.leaderboard) {
        setLeaderboardData(data.result.leaderboard);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.x_handle) {
      fetchAllCampaigns();
      fetchMyReferrals();
      fetchUserRank();
      fetchLeaderboard();
      // fetchMyQuests();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-12 bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-light-primary mb-4">
            Please connect your account
          </h1>
          <p className="text-light-tertiary">
            You need to be logged in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-0 lg:px-0 py-8 pt-20 sm:pt-8">
          {/* Profile Header Skeleton */}
          <div className="bg-dark-tertiary rounded-lg p-6 mb-6 border border-dark-quaternary">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-full flex-shrink-0" />
              <div className="flex-1 flex flex-col w-full md:w-auto">
                <div className="flex flex-col gap-0.5">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <div>
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <div>
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row gap-3 w-full md:w-auto">
                <Skeleton className="h-10 flex-1 md:flex-none md:w-40" />
                <Skeleton className="h-10 flex-1 md:flex-none md:w-32" />
              </div>
            </div>
          </div>

          {/* Tab Navigation Skeleton */}
          <div className="border-b border-dark-quaternary mb-8">
            <div className="flex justify-between items-center">
              <nav className="-mb-px flex space-x-8">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </nav>
            </div>
          </div>

          {/* Earn DOPE Section Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Section - DOPE Stats and Tasks */}
            <div className="lg:col-span-2 space-y-6">
              {/* Total DOPE Earned */}
              <div className="bg-dark-secondary/20 rounded-lg p-6">
                <Skeleton className="h-5 w-32 mb-2" />{" "}
                {/* "Total DOPE earned" text */}
                <Skeleton className="h-12 w-24" /> {/* Large number */}
              </div>

              {/* Tasks for DOPE */}
              <div className="space-y-4">
                <Skeleton className="h-5 w-32" /> {/* "Tasks for DOPE" text */}
                {/* Task Items */}
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-dark-secondary/20 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-6 w-6 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />{" "}
                      {/* Progress bar */}
                    </div>
                  ))}
                </div>
              </div>

              {/* Referrals Table */}
              <div className="bg-dark-secondary/20 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-light-primary mb-4">
                  Your Referrals
                </h3>
                <div className="grid grid-cols-4 gap-4 mb-3 text-sm text-light-tertiary">
                  <div>X Handle</div>
                  <div>Used Time</div>
                  <div>Status</div>
                  <div>Remaining Action</div>
                </div>
                <div
                  className="space-y-2 max-h-[400px] overflow-y-auto"
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement;
                    if (
                      target.scrollHeight - target.scrollTop <=
                        target.clientHeight + 100 &&
                      !referralsLoading &&
                      hasMoreReferrals
                    ) {
                      fetchMyReferrals(referralsPage + 1);
                    }
                  }}
                >
                  {referrals.map((referral, i) => (
                    <div
                      key={`${referral.x_handle}-${i}`}
                      className="grid grid-cols-4 gap-4 py-3 border-t border-neutral-700 text-sm"
                    >
                      <div className="text-light-secondary">
                        @{referral.x_handle}
                      </div>
                      <div className="text-light-tertiary">
                        {new Date(referral.used_time).toLocaleDateString()}
                      </div>
                      <div className="text-light-tertiary">
                        {referral.remaining_action === "NONE"
                          ? "Complete"
                          : "Pending"}
                      </div>
                      <div className="text-light-tertiary">
                        {referral.remaining_action === "NONE"
                          ? "-"
                          : "X Follow"}
                      </div>
                    </div>
                  ))}
                  {referralsLoading && (
                    <div className="py-4 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-light-tertiary" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section - Share Referral Card */}
            <div className="lg:col-span-1">
              <div className="bg-dark-secondary/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-5 w-5" /> {/* Icon */}
                  <Skeleton className="h-5 w-48" /> {/* Title */}
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <Skeleton className="h-16 w-16 rounded-lg" /> {/* Avatar */}
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full mb-4" /> {/* Claim button */}
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-light-primary mb-2">Error</h1>
          <p className="text-light-tertiary mb-4">{error}</p>
          <button
            onClick={fetchAllCampaigns}
            className="bg-light-primary text-dark-primary px-4 py-2 rounded-lg hover:bg-light-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Combine open and closed campaigns for created campaigns display
  const allCreatedCampaigns = [...openCampaigns, ...closedCampaigns];

  // Filter campaigns based on type
  const filteredCreatedCampaigns = allCreatedCampaigns.filter((campaign) =>
    campaignType === "Targeted"
      ? campaign.campaign_type === "Targeted"
      : campaign.campaign_type !== "Targeted"
  );

  const filteredReceivedCampaigns = receivedCampaigns.filter((campaign) =>
    campaignType === "Targeted"
      ? campaign.campaign_type === "Targeted"
      : campaign.campaign_type !== "Targeted"
  );

  const handleCampaignClick = (campaignId: string) => {
    router.push(`/my-campaigns/${campaignId}`);
  };

  const copySocialCard = async () => {
    if (!user) return;

    try {
      setIsSocialCardCopying(true);

      // Generate social card using server-side API
      const params = new URLSearchParams({
        name: user.name || "Dopamyn",
        handle: user.x_handle || "dopamyn_fun",
        smartFollowers: (user.smart_followers || 0).toString(),
        rewards: (user.total_points || 0).toString(),
        profileImage: user.profile_image_url || "",
      });

      const response = await fetch(`/api/social-card?${params}`);
      if (!response.ok) throw new Error("Failed to generate social card");

      const blob = await response.blob();

      const referralUrl = `https://dopamyn.fun?referral_code=${user?.referral_code}`;

      // Create the promotional text
      const socialText = `🚀 Join me on @dopamyn_fun, where Web3 influence meets rewards! \n\n📊 Check out my stats and achievements on Dopamyn.\n\n🎁 Use my referral link to get 10 DOPE when you join and follow @dopamyn_fun\n${referralUrl}\n\nLet's build our Web3 credibility together! 🌟`;

      try {
        // Create a ClipboardItem with both text and image
        const clipboardContent = [
          new ClipboardItem({
            "text/plain": new Blob([socialText], { type: "text/plain" }),
            "image/png": blob,
          }),
        ];

        await navigator.clipboard.write(clipboardContent);
        toast({
          title: "Social card copied!",
          description:
            "Image and text copied to clipboard. You can now paste them anywhere",
          duration: 2000,
        });
      } catch (err) {
        // Fallback: Try to copy text and image separately
        try {
          await navigator.clipboard.writeText(socialText);
          const data = new ClipboardItem({
            "image/png": blob,
          });
          await navigator.clipboard.write([data]);
          toast({
            title: "Social card copied!",
            description:
              "Image and text copied to clipboard. You can now paste them anywhere",
            duration: 2000,
          });
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    } catch (error) {
      console.error("Error copying social card:", error);
      toast({
        title: "Failed to copy social card",
        description: "Please try again",
        duration: 2000,
      });
    } finally {
      setIsSocialCardCopying(false);
    }
  };

  const downloadSocialCard = async () => {
    if (!user) return;

    try {
      setIsSocialCardDownloading(true);

      // Generate social card using server-side API
      const params = new URLSearchParams({
        name: user.name || "Dopamyn",
        handle: user.x_handle || "dopamyn_fun",
        smartFollowers: (user.smart_followers || 0).toString(),
        rewards: (user.total_points || 0).toString(),
        profileImage: user.profile_image_url || "",
      });

      const response = await fetch(`/api/social-card?${params}`);
      if (!response.ok) throw new Error("Failed to generate social card");

      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `DOPE-social-card-${user?.x_handle || "user"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Social card downloaded!",
        description: "Check your downloads folder",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error downloading social card:", error);
      toast({
        title: "Failed to download social card",
        description: "Please try again",
        duration: 2000,
      });
    } finally {
      setIsSocialCardDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-primary px-4 sm:px-0 lg:px-0 py-8 pt-20">
      <div className="max-w-6xl mx-auto">
        {/* Profile Header */}
        {user && (
          <div
            className="bg-dark-tertiary rounded-lg p-4 mb-4 border border-dark-quaternary"
            style={{
              background:
                dominantColor && dominantColor !== "#000000"
                  ? (() => {
                      const hex = dominantColor as string;
                      const rgb = parseInt(hex.slice(1), 16);
                      const r = (rgb >> 16) & 255;
                      const g = (rgb >> 8) & 255;
                      const b = rgb & 255;

                      const brightness = (r + g + b) / 3;
                      const isDarkColor = brightness < 100;

                      if (isDarkColor) {
                        const lightenFactor = 1.8;
                        const lightR = Math.min(
                          255,
                          Math.round(r * lightenFactor)
                        );
                        const lightG = Math.min(
                          255,
                          Math.round(g * lightenFactor)
                        );
                        const lightB = Math.min(
                          255,
                          Math.round(b * lightenFactor)
                        );
                        const lightHex = `#${lightR
                          .toString(16)
                          .padStart(2, "0")}${lightG
                          .toString(16)
                          .padStart(2, "0")}${lightB
                          .toString(16)
                          .padStart(2, "0")}`;

                        return `radial-gradient(ellipse at center top, ${lightHex}70 0%, ${lightHex}50 25%, ${lightHex}30 40%, ${hex}20 70%, transparent 85%)`;
                      } else {
                        return `radial-gradient(ellipse at center top, ${hex}30 0%, ${hex}20 25%, ${hex}15 50%, transparent 80%)`;
                      }
                    })()
                  : undefined,
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Profile Picture and Name Row - Compact on Mobile */}
              <div className="flex items-center gap-4 flex-shrink-0">
                {/* Profile Picture with Glow Effect */}
                <div
                  className="relative flex-shrink-0"
                  style={{ padding: "12px" }}
                >
                  <div className="relative w-24 h-24">
                    {/* Profile image container with border using dominant color */}
                    <div
                      className="relative w-24 h-24 rounded-full overflow-hidden border-2"
                      style={{
                        borderColor:
                          dominantColor && dominantColor !== "#000000"
                            ? `${dominantColor}80`
                            : "rgba(255, 128, 128, 0.5)",
                        background:
                          dominantColor && dominantColor !== "#000000"
                            ? `${dominantColor}20`
                            : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      {user.profile_image_url ? (
                        <img
                          src={user.profile_image_url}
                          alt={user.name || user.x_handle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-light-primary flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-dark-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* User Information - Name and Handle */}
                <div className="flex flex-col min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-xl md:text-2xl font-bold text-light-primary truncate">
                      {user.name || user.x_handle}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <a
                        href={`https://x.com/${user.x_handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-light-tertiary truncate hover:text-light-secondary transition-colors"
                      >
                        <XLogo width={14} height={14} />@{user.x_handle}
                      </a>
                      {user?.tg_username ? (
                        <div className="flex items-center gap-1 text-sm text-blue-text">
                          <TgIcon
                            width={16}
                            height={16}
                            color="text-light-tertiary"
                          />
                          @{user.tg_username}
                        </div>
                      ) : (
                        <div
                          className={`flex items-center gap-1 text-sm text-blue-text cursor-pointer hover:text-blue-400 transition-colors ${
                            isProcessing ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          onClick={handleTelegramJoin}
                        >
                          <TgIcon
                            width={16}
                            height={16}
                            color="text-blue-text"
                          />
                          {isProcessing ? (
                            "Processing..."
                          ) : !isAuthenticated ? (
                            <>
                              <span className="">Login & Join</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">
                                Connect TG
                              </span>
                              <span className="sm:hidden">Connect TG</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons - Hidden dialogs */}
              {/* <div className="flex flex-row flex-wrap gap-3 mt-3"> */}
              {/* How to earn $DOPE dialog */}
              <Dialog>
                {/* <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none bg-transparent border-dark-alpha-quaternary text-light-secondary hover:bg-dark-quaternary hover:text-light-primary "
                      >
                        How to earn
                        <span className="text-accent-brand ml-1/2">$DOPE</span>
                      </Button>
                    </DialogTrigger> */}
                <DialogContent className="bg-dark-secondary/90 backdrop-blur-sm border-dark-secondary max-w-lg">
                  <DialogHeader className="text-center">
                    <DialogTitle className="text-light-primary text-base sm:text-lg md:text-2xl font-semibold text-center">
                      How to earn DOPE?
                    </DialogTitle>
                  </DialogHeader>

                  {/* Accordion */}
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="item-1"
                    className="mt-4"
                  >
                    {/* What is DOPE */}
                    <AccordionItem value="item-1" className="border-none">
                      <AccordionTrigger className="text-light-primary text-lg sm:text-xl">
                        What's DOPE?
                      </AccordionTrigger>
                      <AccordionContent className="text-light-secondary text-xs sm:text-sm">
                        DOPE are points you earn for posting quality content
                        that resonates with the crypto Twitter (CT) community
                        about projects that have active campaigns.
                      </AccordionContent>
                    </AccordionItem>

                    {/* How to earn DOPE */}
                    <AccordionItem value="item-2" className="border-none">
                      <AccordionTrigger className="text-light-primary text-lg sm:text-xl">
                        How to earn DOPE?
                      </AccordionTrigger>
                      <AccordionContent className="text-light-secondary text-xs sm:text-sm">
                        <ul className="list-disc list-inside space-y-2">
                          <li>
                            Post high-quality content that aligns with projects'
                            narratives.
                          </li>
                          <li>Create original, educational content.</li>
                          <li>
                            Invite your friends and earn DOPE for each invite.
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    {/* How DOPE is awarded */}
                    <AccordionItem value="item-3" className="border-none">
                      <AccordionTrigger className="text-light-primary text-lg sm:text-xl">
                        How is DOPE awarded?
                      </AccordionTrigger>
                      <AccordionContent className="text-light-secondary text-xs sm:text-sm">
                        <p>
                          Projects with active campaigns set custom narrative
                          guidelines and rules to determine how DOPE are
                          rewarded in their leaderboards.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </DialogContent>
              </Dialog>

              {/* View social card popup */}
              <Dialog
                onOpenChange={(open: boolean) => {
                  if (!open) {
                    setIsImageLoading(true);
                  }
                }}
              >
                <DialogContent className="bg-dark-primary/90 backdrop-blur-sm border-dark-secondary max-w-xl mx-0">
                  {/* Header */}
                  <div className="text-left space-y-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-light-primary">
                      Earn 10 DOPE
                    </h2>
                    <p className="text-xs sm:text-sm text-light-tertiary">
                      For every person who joins using your invite
                    </p>
                  </div>

                  {/* Social preview card */}
                  <div className="w-full">
                    <div className="w-full rounded-lg border border-dark-quaternary/30">
                      {isImageLoading && (
                        <div className="w-full h-[275px] rounded-lg bg-dark-primary p-4 flex flex-col justify-between">
                          {/* Profile Section */}
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-12 h-12 rounded-full" />{" "}
                            {/* Profile Picture */}
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" /> {/* Name */}
                              <Skeleton className="h-3 w-24" /> {/* Handle */}
                            </div>
                          </div>

                          {/* Main Text */}
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                          </div>

                          {/* Stats Section */}
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-24" />{" "}
                              {/* Smart Followers Label */}
                              <Skeleton className="h-5 w-16" />{" "}
                              {/* Followers Count */}
                            </div>
                            <div className="space-y-1">
                              <Skeleton className="h-3 w-24" />{" "}
                              {/* Rewards Label */}
                              <Skeleton className="h-5 w-16" />{" "}
                              {/* DOPE Amount */}
                            </div>
                          </div>
                        </div>
                      )}
                      <img
                        src={
                          user
                            ? `/api/social-card?${new URLSearchParams({
                                name: user.name || "Dopamyn",
                                handle: user.x_handle || "dopamyn_fun",
                                smartFollowers: (
                                  user.smart_followers || 0
                                ).toString(),
                                rewards: (user.total_points || 0).toString(),
                                profileImage: user.profile_image_url || "",
                              })}`
                            : "/api/social-card"
                        }
                        alt="Social Card Preview"
                        className={`w-full h-auto rounded-lg border border-dark-quaternary/30 shadow-lg ${
                          isImageLoading ? "hidden" : ""
                        }`}
                        style={{ aspectRatio: "1200/628" }}
                        onLoad={() => {
                          setIsImageLoading(false);
                        }}
                      />
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end mt-2">
                    <Button
                      variant="outline"
                      onClick={copySocialCard}
                      disabled={isSocialCardCopying}
                      className="text-xs sm:text-sm bg-transparent border-dark-quaternary"
                    >
                      {isSocialCardCopying ? (
                        <>
                          <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin mr-1 sm:mr-2" />
                          Copying...
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                          Copy Card
                        </>
                      )}
                    </Button>
                    <Button
                      className="text-xs sm:text-sm bg-light-primary text-dark-primary hover:bg-light-primary/90"
                      onClick={downloadSocialCard}
                      disabled={isSocialCardDownloading}
                    >
                      {isSocialCardDownloading ? (
                        <>
                          <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin mr-1 sm:mr-2" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              {/* </div> */}

              {/* Wallet Addresses */}
              <div className="flex flex-col md:flex-row gap-3 flex-1 md:items-center md:justify-end">
                <div className="flex flex-col sm:flex-row gap-2">
                  {user.evm_wallet && (
                    <div className="flex items-center gap-2 group px-3 py-2 border border-dark-alpha-quaternary rounded-lg w-full sm:w-auto">
                      <div className="w-6 h-6 rounded-full bg-[#627EEA]/10 flex items-center justify-center flex-shrink-0">
                        <img src="/eth.svg" alt="ETH" className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-light-tertiary">
                          EVM Wallet
                        </p>
                        <p className="text-sm text-light-secondary font-mono truncate">
                          {user.evm_wallet.substring(0, 3)}...
                          {user.evm_wallet.substring(
                            user.evm_wallet.length - 3
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.evm_wallet);
                          toast({
                            title: "Address copied!",
                            description:
                              "EVM wallet address copied to clipboard",
                            duration: 2000,
                          });
                        }}
                        className="p-1.5 hover:bg-dark-quaternary rounded transition-colors flex-shrink-0 self-center"
                      >
                        <Copy className="w-3.5 h-3.5 text-light-tertiary" />
                      </button>
                    </div>
                  )}
                  {user.solana_wallet && (
                    <div className="flex items-center gap-2 group px-3 py-2 border border-dark-alpha-quaternary rounded-lg w-full sm:w-auto">
                      <div className="w-6 h-6 rounded-full bg-[#9945FF]/10 flex items-center justify-center flex-shrink-0">
                        <img src="/sol.svg" alt="SOL" className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-light-tertiary">
                          Solana Wallet
                        </p>
                        <p className="text-sm text-light-secondary font-mono truncate">
                          {user.solana_wallet.substring(0, 3)}...
                          {user.solana_wallet.substring(
                            user.solana_wallet.length - 3
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.solana_wallet);
                          toast({
                            title: "Address copied!",
                            description:
                              "Solana wallet address copied to clipboard",
                            duration: 2000,
                          });
                        }}
                        className="p-1.5 hover:bg-dark-quaternary rounded transition-colors flex-shrink-0 self-center"
                      >
                        <Copy className="w-3.5 h-3.5 text-light-tertiary" />
                      </button>
                    </div>
                  )}
                </div>
                {/* Update Wallets Dialog */}
                <Dialog
                  open={isWalletDialogOpen}
                  onOpenChange={setIsWalletDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto bg-light-primary text-dark-primary hover:bg-light-secondary">
                      Update Wallets
                    </Button>
                  </DialogTrigger>
                  <UpdateWalletDialog
                    onClose={() => setIsWalletDialogOpen(false)}
                    open={isWalletDialogOpen}
                  />
                </Dialog>
                {/* Link Telegram Button */}
                {/* {!user?.tg_username && (
                  <Button
                    onClick={handleTelegramJoin}
                    disabled={isProcessing}
                    className="w-full sm:w-auto bg-light-primary text-dark-primary hover:bg-light-secondary inline-flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      "Processing..."
                    ) : !isAuthenticated ? (
                      <>
                        <TgIcon width={14} height={14} color="#000000" />
                        <span className="hidden sm:inline">
                          Login & Get Notifications
                        </span>
                        <span className="sm:hidden">Login & Join</span>
                      </>
                    ) : (
                      <>
                        <TgIcon width={14} height={14} color="#000000" />
                        <span className="hidden sm:inline">Join TG Bot</span>
                        <span className="sm:hidden">Join Bot</span>
                      </>
                    )}
                  </Button>
                )} */}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {/* {user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-dark-tertiary rounded-lg p-4 sm:p-6 border border-dark-quaternary">
              <p className="text-sm text-light-tertiary mb-1">
                Total $DOPE Earned
              </p>
              <p className="text-2xl sm:text-3xl font-semibold text-accent-brand">
                {(user.total_points ?? 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>

            <div className="bg-dark-tertiary rounded-lg p-4 sm:p-6 border border-dark-quaternary">
              <p className="text-sm text-light-tertiary mb-1">
                Total Referrals
              </p>
              <p className="text-2xl sm:text-3xl font-semibold text-light-primary">
                {user.total_referrals ?? 0}
              </p>
            </div>

            <div className="bg-dark-tertiary rounded-lg p-4 sm:p-6 border border-dark-quaternary">
              <p className="text-sm text-light-tertiary mb-1">Rank</p>
              <p className="text-2xl sm:text-3xl font-semibold text-light-primary">
                {userRank !== null ? `#${userRank.toLocaleString()}` : "-"}
              </p>
            </div>
          </div>
        )} */}

        {/* Tab Navigation - Sticky */}
        <div className="sticky top-14 border-b border-dark-quaternary mb-8 bg-dark-primary z-10 pt-4">
          <div className="flex justify-between items-center">
            <nav className="-mb-px flex space-x-8">
              {/* <button
                onClick={() => setActiveTab("earn")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "earn"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Earn DOPE
              </button> */}
              {/* <button
                onClick={() => setActiveTab("campaigns")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "campaigns"
                    ? "border-light-primary text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Campaigns
              </button> */}
              <button
                onClick={() => scrollToSection("referrals")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentSection === "referrals"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Refer & Earn
              </button>
              <button
                onClick={() => scrollToSection("referral-earnings")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentSection === "referral-earnings"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                My Referrals
              </button>
              <button
                onClick={() => scrollToSection("leaderboard")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentSection === "leaderboard"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Leaderboard
              </button>
              {/* <button
                onClick={() => setActiveTab("quests")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "quests"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                My Quests
              </button> */}
              {/* <button
                onClick={() => setActiveTab("identity")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "identity"
                    ? "border-accent-brand text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Identity
              </button> */}
            </nav>
          </div>
        </div>

        {/* Content Sections */}
        {/* Refer & Earn Section */}
        <div id="referrals" className="mb-16">
          <div className="">
            <ReferralsPanel />
          </div>
        </div>

        {/* My Referrals Section */}
        <div id="referral-earnings" className="mb-16">
          <div className="">
            <div className="bg-dark-secondary/30 rounded-lg  backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-accent-brand"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-light-primary">
                  My Referrals
                </h3>
              </div>
              <ReferralTable
                initialReferrals={referrals}
                initialPartialReferrals={partialReferrals}
                onLoadMore={async (start, limit) => {
                  const token = localStorage.getItem("token") as string;
                  if (!token) return { referrals: [], partialReferrals: [] };

                  try {
                    const response = await fetch(
                      `/api/user/referral-earnings?sort_by=reward_earned_desc&start=${start}&limit=${limit}`,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );
                    const data = await response.json();

                    if (data.result?.referrals) {
                      const transformedReferrals = data.result.referrals.map(
                        (ref: any) => ({
                          x_handle: ref.x_handle,
                          used_time: ref.last_used_time || ref.used_time,
                          followers_count: ref.followers_count,
                          smart_followers_count: ref.smart_followers_count,
                          reward_earned: ref.reward_earned || 0,
                          profile_image_url: ref.profile_image_url,
                        })
                      );
                      return {
                        referrals: transformedReferrals,
                        partialReferrals: [],
                      };
                    }
                    return { referrals: [], partialReferrals: [] };
                  } catch (error) {
                    console.error("Error loading more referrals:", error);
                    return { referrals: [], partialReferrals: [] };
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div id="leaderboard" className="mb-16">
          <div className="bg-dark-primary rounded-lg ">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-accent-brand" />
              <h2 className="text-2xl font-bold text-light-primary">
                Leaderboard
              </h2>
            </div>
            <p className="text-light-secondary mb-6">
              Top performers ranked by their total earnings from referrals and
              campaigns.
            </p>
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-accent-brand animate-spin mx-auto mb-4" />
                  <p className="text-sm text-light-tertiary">
                    Loading leaderboard...
                  </p>
                </div>
              </div>
            ) : (
              <LeaderboardTable entries={leaderboardData} />
            )}
          </div>
        </div>

        {/* Earn DOPE Section */}
        {/* <div id="earn" className="mb-16">
          <div className="">
            <EarnMini
              initialReferrals={referrals}
              initialPartialReferrals={partialReferrals}
              onLoadMore={async (start, limit) => {
                const token = localStorage.getItem("token") as string;
                if (!token) return { referrals: [], partialReferrals: [] };

                try {
                  const response = await fetch(
                    `/api/user/referral-earnings?sort_by=reward_earned_desc&start=${start}&limit=${limit}`,
                    {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    }
                  );
                  const data = await response.json();

                  if (data.result?.referrals) {
                    return {
                      referrals: data.result.referrals.map((ref: any) => ({
                        x_handle: ref.x_handle,
                        used_time: ref.last_used_time || ref.used_time,
                        followers_count: ref.followers_count,
                        smart_followers_count: ref.smart_followers_count,
                        reward_earned: ref.reward_earned || 0,
                        profile_image_url: ref.profile_image_url,
                      })),
                      partialReferrals: [],
                    };
                  }
                  return { referrals: [], partialReferrals: [] };
                } catch (error) {
                  console.error("Error loading more referrals:", error);
                  return { referrals: [], partialReferrals: [] };
                }
              }}
            />
          </div>
        </div> */}

        {/* Identity Verification Section */}
        {/* <div id="identity" className="mb-16">
          <div className="">
            <SelfIntegration />
          </div>
        </div> */}

        {/* Campaigns Section */}
        {/* <div id="campaigns" className="mb-16">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
              <div className="flex items-center bg-dark-secondary p-1 rounded-lg w-full sm:w-auto">
                <button
                  onClick={() => setCampaignSubTab("created")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    campaignSubTab === "created"
                      ? "bg-light-primary text-dark-primary shadow-sm"
                      : "text-light-tertiary hover:text-light-secondary"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span>Created</span>
                    <span className="text-xs bg-dark-primary/20 px-2 py-0.5 rounded-full">
                      {filteredCreatedCampaigns.length}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setCampaignSubTab("received")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    campaignSubTab === "received"
                      ? "bg-light-primary text-dark-primary shadow-sm"
                      : "text-light-tertiary hover:text-light-secondary"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span>Received</span>
                    <span className="text-xs bg-dark-primary/20 px-2 py-0.5 rounded-full">
                      {filteredReceivedCampaigns.length}
                    </span>
                  </div>
                </button>
              </div>

              <div className="flex items-center bg-dark-secondary p-1 rounded-lg w-full sm:w-auto">
                <button
                  onClick={() => setCampaignType("Targeted")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    campaignType === "Targeted"
                      ? "bg-light-primary text-dark-primary shadow-sm"
                      : "text-light-tertiary hover:text-light-secondary"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span>Targeted</span>
                    {campaignType === "Targeted" && (
                      <span className="text-xs bg-dark-primary/20 px-2 py-0.5 rounded-full">
                        {campaignSubTab === "created"
                          ? filteredCreatedCampaigns.length
                          : filteredReceivedCampaigns.length}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => setCampaignType("Public")}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    campaignType === "Public"
                      ? "bg-light-primary text-dark-primary shadow-sm"
                      : "text-light-tertiary hover:text-light-secondary"
                  }`}
                >
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span>Public</span>
                    {campaignType === "Public" && (
                      <span className="text-xs bg-dark-primary/20 px-2 py-0.5 rounded-full">
                        {campaignSubTab === "created"
                          ? filteredCreatedCampaigns.length
                          : filteredReceivedCampaigns.length}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {campaignSubTab === "created" && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-light-tertiary mb-4">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">
                      Campaigns feature has been removed
                    </p>
                    <p className="text-sm">
                      This functionality is no longer available
                    </p>
                  </div>
                </div>
              </div>
            )}

            {campaignSubTab === "received" && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="text-light-tertiary mb-4">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">
                      Campaigns feature has been removed
                    </p>
                    <p className="text-sm">
                      This functionality is no longer available
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div> */}

        <div id="quests" className="mb-16">
          <div className="">{/* Quests content can be added here */}</div>
        </div>
      </div>
    </div>
  );
}
