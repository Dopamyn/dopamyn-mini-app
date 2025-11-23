"use client";

import { useState, useEffect } from "react";
import { Loader2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Community } from "@/app/types";
import { Quest } from "@/lib/types";
import QuestsGrid from "@/app/components/campaigns/QuestsGrid";

interface CommunityProfileClientProps {
  communityName: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};
const generateAvatar = (name: string) => {
  const initials = name.slice(0, 2).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-green-400 to-emerald-600",
    "bg-gradient-to-br from-blue-400 to-indigo-600",
    "bg-gradient-to-br from-purple-400 to-pink-600",
    "bg-gradient-to-br from-pink-400 to-rose-600",
    "bg-gradient-to-br from-yellow-400 to-orange-600",
    "bg-gradient-to-br from-indigo-400 to-purple-600",
  ];
  const colorIndex = name.length % colors.length;

  return (
    <div
      className={`w-full h-full ${colors[colorIndex]} flex items-center justify-center`}
    >
      <span className="text-white font-bold text-2xl">{initials}</span>
    </div>
  );
};
async function getCommunity(communityName: string): Promise<Community | null> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Call the communities list API with project_id
    const response = await fetch(
      `/api/communities/list?project_id=${communityName}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Return the first community from the list since we're filtering by project_id
    return data.data?.[0] || null;
  } catch (error) {
    console.error("Error fetching community:", error);
    return null;
  }
}

async function getCommunityQuests(communityName: string): Promise<Quest[]> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/quests?project_id=${communityName}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.quests || [];
  } catch (error) {
    console.error("Error fetching community quests:", error);
    return [];
  }
}

export default function CommunityProfileClient({
  communityName,
}: CommunityProfileClientProps) {
  const [community, setCommunity] = useState<Community | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [questsLoading, setQuestsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setQuestsLoading(true);

      try {
        const [communityData, questsData] = await Promise.all([
          getCommunity(communityName),
          getCommunityQuests(communityName),
        ]);

        setCommunity(communityData);
        setQuests(questsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
        setQuestsLoading(false);
      }
    };

    fetchData();
  }, [communityName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-brand-100">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg font-medium">Loading community...</span>
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary-text mb-4">
            Community Not Found
          </h1>
          <p className="text-secondary-text">
            The community you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Card Section */}
      <div className="max-w-sm mx-auto px-4 py-6 mt-16">
        <div className="rounded-xl overflow-hidden">
          {/* Content */}
          <div className="p-4">
            {/* Profile */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex-shrink-0"></div>
              <span className="font-semibold">Yellow</span>
            </div>

            {/* Survey Text */}
            <p className="text-sm text-white/60 mb-3">
              Survey: Please register on X Exchange via the following link and
              provide...{" "}
              <button className="text-white/40 hover:text-white/60">
                View more
              </button>
            </p>

            {/* Stats */}
            <div className="flex items-center gap-1 text-sm mb-2">
              <span className="font-medium">${formatNumber(1000)}</span>
              <span className="text-white/60">distributed as rewards</span>
            </div>

            {/* Campaign Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-medium">{formatNumber(12)}</span>
                <span className="text-white/60">campaigns,</span>
                <span className="font-medium">{formatNumber(57200)}</span>
                <span className="text-white/60">participants</span>
              </div>
              <div className="flex -space-x-1">
                <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                  i
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="max-w-sm mx-auto px-4 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <span className="text-sm text-gray-500">
            {quests.length} campaign{quests.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {questsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg font-medium">Loading campaigns...</span>
            </div>
          </div>
        ) : quests.length > 0 ? (
          <div className="max-w-4xl mx-auto px-4 mb-8">
            <QuestsGrid
              quests={quests}
              loading={questsLoading}
              user={null}
              isUserEligible={() => true}
              getEligibilityReason={() => null}
              openTaskModal={() => {}}
              hasUnderReviewTask={() => false}
              handleVerifyQuest={() => {}}
              verifyingQuestId={null}
              login={() => {}}
              isProcessing={false}
              openingTaskModalQuestId={null}
              hasMore={false}
              onLoadMore={() => {}}
              handleSort={() => {}}
              getSortIcon={() => null}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              No campaigns available
            </h3>
            <p className="text-gray-500 mb-4">
              This project doesn't have any active campaigns yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
