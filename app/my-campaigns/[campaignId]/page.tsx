"use client";

import FollowersOverview from "@/app/components/FollowersOverview";
import MindshareVisualization from "@/app/components/MindshareVisualization";
import { ActivityChart } from "@/app/components/ProfileCharts";
import { MindshareResponse, UserProfileResponse } from "@/app/types";
import { XLogo } from "@/components/icons/x-logo";
import ResearchHub from "@/components/ResearchHub";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { Campaign } from "@/lib/types";
import { truncateAddress } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Clock, Coins, Wallet } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type TimePeriod = "30d" | "7d" | "1d";

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mindshareData, setMindshareData] = useState<MindshareResponse | null>(
    null
  );
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<TimePeriod>("30d");
  const [activityData, setActivityData] = useState<
    UserProfileResponse["result"]["activity_data"] | null
  >(null);

  useEffect(() => {
    const fetchCampaignDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/campaigns/get-campaigns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ campaign_id: params.campaignId }),
        }).then((res) => res.json());

        if (response.data?.result?.[0]) {
          setCampaign(response.data.result[0]);
        } else {
          setError("Campaign not found");
        }
      } catch (err) {
        setError("Failed to load campaign details");
        console.error("Error fetching campaign:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignDetails();
  }, [params.campaignId]);

  useEffect(() => {
    const fetchMindshare = async () => {
      if (!campaign) return;

      try {
        setLoading(true);
        const handle = (
          campaign.project_handle ||
          campaign.target_x_handle ||
          campaign.owner_x_handle
        )
          .replace("@", "")
          .toLowerCase();
        const response = await fetch(
          `/api/mindshare?project_name=${handle}&limit=100&period=${selectedTimePeriod}`
        ).then((res) => res.json());
        setMindshareData(response.data);
      } catch (err) {
        console.error(
          `Error fetching mindshare for ${selectedTimePeriod}:`,
          err
        );
        setMindshareData(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchActivityData = async () => {
      try {
        const handle = campaign?.influencer_x_handle?.replace("@", "");
        if (!handle) return;

        const response = await fetch(
          `/api/user/get-user-profile?handle=${handle}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(30000),
          }
        );
        const data = await response.json();
        if (data.result?.activity_data) {
          setActivityData(data.result.activity_data);
        }
      } catch (error) {
        console.error("Error fetching activity data:", error);
      }
    };

    if (campaign) {
      fetchMindshare();
      fetchActivityData();
    }
  }, [campaign, selectedTimePeriod]);

  if (loading) {
    return <CampaignSkeleton />;
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-gray-400">{error || "Campaign not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Campaign Header */}
        <Card className="bg-gray-800 border-gray-700 mb-8 p-6 pt-0">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3">
                <h1 className="text-3xl font-bold text-gray-100">
                  {campaign.campaign_name}
                </h1>
                <div className="flex items-center gap-2 text-gray-400">
                  <XLogo className="w-4 h-4" />
                  <span>Creator: @{campaign.owner_x_handle}</span>
                </div>
                {campaign.influencer_x_handle && (
                  <div className="flex items-center gap-2 text-gray-400 mt-2">
                    <XLogo className="w-4 h-4" />
                    <span className="text-accent-brand">
                      Influencer: {campaign.influencer_x_handle}
                    </span>
                  </div>
                )}
                <p className="text-gray-300 text-lg max-w-2xl">
                  {campaign.description}
                </p>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    campaign.status === "Ongoing"
                      ? "bg-accent-brand/10 text-accent-brand border border-accent-brand/20"
                      : campaign.status === "Upcoming"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                      : campaign.status === "Completed"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                  }`}
                >
                  {campaign.status}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Campaign Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Token Details */}
          <Card className="bg-gray-800 border-gray-700 hover:border-accent-brand/50 transition-all duration-200 hover:shadow-lg hover:shadow-accent-brand/10 p-6 pt-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent-brand/10">
                  <Coins className="w-5 h-5 text-accent-brand" />
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Token Details
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Token</span>
                  <span className="font-medium text-gray-100">
                    {campaign.payment_token}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount</span>
                  <span className="font-medium text-gray-100">
                    {campaign.amount}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Chain</span>
                  <span className="font-medium text-gray-100">
                    {campaign.chain}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Campaign Timeline */}
          <Card className="bg-gray-800 border-gray-700 hover:border-accent-brand/50 transition-all duration-200 hover:shadow-lg hover:shadow-accent-brand/10 p-6 pt-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent-brand/10">
                  <Clock className="w-5 h-5 text-accent-brand" />
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Timeline
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Offer Status</span>
                  <span className="font-medium text-gray-100">
                    {campaign.status === "Completed"
                      ? "Fulfilled"
                      : formatDistanceToNow(new Date(campaign.offer_end_date), {
                          addSuffix: true,
                        })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Type</span>
                  <span className="font-medium text-gray-100">
                    {campaign.campaign_type}
                  </span>
                </div>
                {campaign.counter && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Counter</span>
                    <span className="font-medium text-gray-100">
                      {campaign.counter}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Wallet Information */}
          <Card className="bg-gray-800 border-gray-700 hover:border-accent-brand/50 transition-all duration-200 hover:shadow-lg hover:shadow-accent-brand/10 p-6 pt-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent-brand/10">
                  <Wallet className="w-5 h-5 text-accent-brand" />
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Wallet Information
                </h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 block mb-1">
                    Project Wallet
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-100 break-all bg-gray-700/50 p-2 rounded block flex-1">
                      {truncateAddress(campaign.project_wallet)}
                    </span>
                    <CopyButton text={campaign.project_wallet} />
                  </div>
                </div>
                {campaign.influencer_wallet && (
                  <div>
                    <span className="text-gray-400 block mb-1">
                      Influencer Wallet
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-100 break-all bg-gray-700/50 p-2 rounded block flex-1">
                        {truncateAddress(campaign.influencer_wallet)}
                      </span>
                      <CopyButton text={campaign.influencer_wallet} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Target Account Analytics */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-6">
            Target Account Analytics
          </h2>

          {/* Followers Overview */}
          {campaign?.influencer_x_handle && (
            <div className="mb-8">
              <FollowersOverview
                authorHandle={campaign.influencer_x_handle.replace("@", "")}
              />
            </div>
          )}

          {/* Activity Heatmap */}
          {activityData && (
            <Card className="bg-gray-800 border-gray-700 mb-8 p-6 pt-0">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-100 mb-4">
                  Activity Heatmap
                </h3>
                <ActivityChart activityData={activityData} />
              </div>
            </Card>
          )}

          {/* Mindshare Visualization */}
          <Card className="bg-gray-800 border-gray-700 p-6 pt-0">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-100">
                  Project Mindshare
                </h3>
                <ToggleGroup
                  type="single"
                  value={selectedTimePeriod}
                  onValueChange={(value) =>
                    value && setSelectedTimePeriod(value as TimePeriod)
                  }
                  className="bg-gray-700 rounded-lg p-1"
                >
                  <ToggleGroupItem
                    value="30d"
                    className="data-[state=on]:bg-accent-brand data-[state=on]:text-gray-900 px-3 py-1 rounded"
                  >
                    30D
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="7d"
                    className="data-[state=on]:bg-accent-brand data-[state=on]:text-gray-900 px-3 py-1 rounded"
                  >
                    7D
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="1d"
                    className="data-[state=on]:bg-accent-brand data-[state=on]:text-gray-900 px-3 py-1 rounded"
                  >
                    24H
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {loading ? (
                <div className="w-full h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brand"></div>
                </div>
              ) : mindshareData?.result?.mindshare_data &&
                mindshareData.result.mindshare_data.length > 0 ? (
                <MindshareVisualization
                  data={mindshareData.result.mindshare_data}
                  projectName={campaignId}
                  projectHandle={
                    campaign.project_handle ||
                    campaign.target_x_handle ||
                    campaign.owner_x_handle
                  }
                />
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No mindshare data available for{" "}
                  {selectedTimePeriod === "1d" ? "24H" : selectedTimePeriod}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Research Hub and Content Labs */}
      <ResearchHub
        authorHandle={
          campaign?.project_handle
            ? campaign.project_handle.replace("@", "").toLowerCase()
            : campaign?.target_x_handle
            ? campaign.target_x_handle.replace("@", "").toLowerCase()
            : campaign?.owner_x_handle?.replace("@", "").toLowerCase()
        }
        paymentToken={campaign?.target_token_symbol}
        targetXHandle={campaign?.target_x_handle}
      />
    </div>
  );
}

// Loading Skeleton Component
function CampaignSkeleton() {
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gray-800 border-gray-700 mb-8 p-6 pt-0">
          <div className="p-6">
            <Skeleton className="h-8 w-3/4 mb-4 bg-gray-700" />
            <Skeleton className="h-4 w-1/2 mb-6 bg-gray-700" />
            <Skeleton className="h-24 w-full bg-gray-700" />
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800 border-gray-700 p-6 pt-0">
              <div className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4 bg-gray-700" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-1/3 bg-gray-700" />
                      <Skeleton className="h-4 w-1/3 bg-gray-700" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
