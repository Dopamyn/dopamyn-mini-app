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

export default function MyCampaigns() {
  const router = useRouter();
  const { isAuthenticated } = useTwitterAuth();
  const { toast } = useToast();
  // Top-level tabs: earn rewards vs manage campaigns vs my quests
  const [activeTab, setActiveTab] = useState<
    "earn" | "campaigns" | "quests" | "identity"
  >("earn");
  const [campaignSubTab, setCampaignSubTab] = useState<"created" | "received">(
    "created"
  );
  const [campaignType, setCampaignType] = useState<"Targeted" | "Public">(
    "Targeted"
  );
  const { user } = useUser();
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

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

  // Fetch campaigns data - campaigns feature has been removed
  const fetchAllCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.x_handle) {
        throw new Error("X handle not found");
      }

      // Campaigns feature has been removed, so we just set empty arrays
      setOpenCampaigns([]);
      setClosedCampaigns([]);
      setReceivedCampaigns([]);

      console.log("Campaigns feature has been removed - setting empty arrays");
    } catch (err: any) {
      console.error("Error in fetchAllCampaigns:", err);
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
        `/api/quests/list?creator=${user.x_handle}&start=0&limit=50`
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

  useEffect(() => {
    if (isAuthenticated && user?.x_handle) {
      fetchAllCampaigns();
      fetchMyReferrals();
      // fetchMyQuests();
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-light-primary mb-4">
            Please connect your account
          </h1>
          <p className="text-light-tertiary">
            You need to be logged in to view your campaigns.
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
          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start mb-6">
            <div className="flex flex-col gap-4 sm:gap-8 w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Skeleton className="w-16 sm:w-20 h-16 sm:h-20 rounded-lg" />
                <div className="flex flex-col gap-1 sm:gap-2 items-center sm:items-start">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
            <div className="w-full lg:w-60 flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
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
    <div className="min-h-screen bg-dark-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-0 lg:px-0 py-8 pt-20 sm:pt-8">
        {/* Profile Header */}
        {user && (
          <div className="flex flex-col lg:flex-row justify-between gap-6 items-start mb-6">
            {/* Profile info section */}
            <div className="flex flex-col gap-4 sm:gap-8 w-full">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative">
                  <img
                    src={user.profile_image_url || "/demoUser.png"}
                    alt={user.name || user.x_handle}
                    className="w-16 sm:w-20 h-16 sm:h-20 rounded-[8px] object-cover border-2 border-light-primary/30"
                  />
                  <span className="absolute -top-2 -right-2 w-3 sm:w-4 h-3 sm:h-4 bg-light-primary border-2 border-dark-primary rounded-full" />
                </div>
                <div className="flex flex-col gap-1 sm:gap-2 items-center sm:items-start text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-bold text-light-primary">
                    {user.name || user.x_handle}
                  </h2>
                  <p className="text-sm sm:text-base text-light-tertiary">
                    @{user.x_handle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
                {/* About DOPE dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-sm sm:text-base bg-transparent border-dark-quaternary text-light-tertiary hover:bg-dark-quaternary hover:text-light-primary"
                    >
                      How to earn
                      <span className="text-accent-primary"> $DOPE</span>
                    </Button>
                  </DialogTrigger>
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
                              Post high-quality content that aligns with
                              projects' narratives.
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
                <Dialog
                  open={isWalletDialogOpen}
                  onOpenChange={setIsWalletDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-sm sm:text-base bg-transparent border-dark-quaternary text-light-tertiary hover:bg-dark-quaternary hover:text-light-primary"
                    >
                      Update Wallets
                    </Button>
                  </DialogTrigger>
                  <UpdateWalletDialog
                    onClose={() => setIsWalletDialogOpen(false)}
                    open={isWalletDialogOpen}
                  />
                </Dialog>

                {/* View social card popup */}
                <Dialog
                  onOpenChange={(open: boolean) => {
                    if (!open) {
                      setIsImageLoading(true);
                    }
                  }}
                >
                  {/* <DialogTrigger asChild>
                    <Button className="text-sm sm:text-base bg-light-primary text-dark-primary hover:bg-light-primary/90 font-semibold">
                      View social card
                    </Button>
                  </DialogTrigger> */}

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
              </div>
            </div>

            {/* Wallets section */}
            <div className="w-full lg:w-60 flex flex-col gap-2 items-center lg:items-start">
              {user.evm_wallet && (
                <div className="flex items-center justify-between w-full max-w-sm lg:max-w-none p-2 rounded-lg bg-dark-secondary/50 border border-dark-quaternary">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#627EEA]/10 flex items-center justify-center">
                      <img src="/eth.svg" alt="ETH" className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-light-tertiary">EVM Wallet</p>
                      <p className="text-sm text-light-secondary font-mono">
                        {user.evm_wallet.substring(0, 6)}...
                        {user.evm_wallet.substring(user.evm_wallet.length - 4)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.evm_wallet);
                      toast({
                        title: "Address copied!",
                        description: "EVM wallet address copied to clipboard",
                        duration: 2000,
                      });
                    }}
                    className="p-2 hover:bg-dark-quaternary rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-light-tertiary" />
                  </button>
                </div>
              )}

              {user.solana_wallet && (
                <div className="flex items-center justify-between w-full max-w-sm lg:max-w-none p-2 rounded-lg bg-dark-secondary/50 border border-dark-quaternary">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#9945FF]/10 flex items-center justify-center">
                      <img src="/sol.svg" alt="SOL" className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-light-tertiary">
                        Solana Wallet
                      </p>
                      <p className="text-sm text-light-secondary font-mono">
                        {user.solana_wallet.substring(0, 6)}...
                        {user.solana_wallet.substring(
                          user.solana_wallet.length - 4
                        )}
                      </p>
                    </div>
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
                    className="p-2 hover:bg-dark-quaternary rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-light-tertiary" />
                  </button>
                </div>
              )}

              {/* {user.celo_wallet && (
                <div className="flex items-center justify-between w-full max-w-sm lg:max-w-none p-2 rounded-lg bg-dark-secondary/50 border border-dark-quaternary">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FCFF52]/10 flex items-center justify-center">
                      <img src="/celo.svg" alt="CELO" className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-light-tertiary">Celo Wallet</p>
                      <p className="text-sm text-light-secondary font-mono">
                        {user.celo_wallet.substring(0, 6)}...
                        {user.celo_wallet.substring(
                          user.celo_wallet.length - 4
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.celo_wallet);
                      toast({
                        title: "Address copied!",
                        description: "Celo wallet address copied to clipboard",
                        duration: 2000,
                      });
                    }}
                    className="p-2 hover:bg-dark-quaternary rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-light-tertiary" />
                  </button>
                </div>
              )} */}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-dark-quaternary mb-8">
          <div className="flex justify-between items-center">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("earn")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "earn"
                    ? "border-light-primary text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Earn DOPE
              </button>
              <button
                onClick={() => setActiveTab("campaigns")}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "campaigns"
                    ? "border-light-primary text-light-primary"
                    : "border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary"
                }`}
              >
                Campaigns
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

        {/* Earn Tab Content */}
        {activeTab === "earn" && (
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
        )}

        {/* Identity Verification Tab Content */}
        {activeTab === "identity" && (
          <div className="">
            <SelfIntegration />
          </div>
        )}

        {/* Campaigns Management */}
        {activeTab === "campaigns" && (
          <div className="space-y-6">
            {/* Campaign Sub-navigation */}
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

              {/* Campaign Type Toggle */}
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

            {/* Created Campaigns Content */}
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

            {/* Received Campaigns Content */}
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
        )}
      </div>
    </div>
  );
}
