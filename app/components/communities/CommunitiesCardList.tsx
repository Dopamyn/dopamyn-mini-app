"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, Users, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  image: string;
  followers: number;
  active_quests: number;
  total_quests: number;
  rewards_distributed?: number;
  token: string;
  description?: string;
  tge_status?: string;
}

interface CommunitiesCardListProps {
  communities: Community[];
  loading: boolean;
  onLoadMore?: () => void;
}

export default function CommunitiesCardList({
  communities,
  loading,
  onLoadMore,
}: CommunitiesCardListProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCommunityRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      // Disconnect previous observer
      if (observerRef.current) observerRef.current.disconnect();

      // Create new observer
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && onLoadMore) {
            onLoadMore();
          }
        },
        { threshold: 0.1 }
      );

      // Observe the last node
      if (node) observerRef.current.observe(node);
    },
    [loading, onLoadMore]
  );

  const handleCommunityClick = (communityName: string) => {
    router.push(`/communities/${communityName}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 mt-16 md:mt-0 min-h-[calc(100vh-64px)]">
      {/* Communities Heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-light-tertiary mb-2">
          Communities
        </h1>
        <p className="text-dark-alpha-quaternary text-sm">
          Discover and join communities to participate in quests and earn
          rewards
        </p>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {communities.map((community, index) => (
          <Card
            key={community.id}
            ref={index === communities.length - 1 ? lastCommunityRef : null}
            className="group relative overflow-hidden border border-dark-quaternary bg-dark-alpha-secondary backdrop-blur-sm hover:bg-dark-secondary hover:shadow-xl hover:shadow-black/30 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => handleCommunityClick(community.name)}
          >
            <CardHeader className="relative pb-3">
              <div className="flex items-start space-x-4">
                {/* Community Avatar */}
                <div className="relative shrink-0">
                  {community.image ? (
                    <img
                      src={community.image}
                      alt={`${community.name} logo`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-dark-quaternary rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-light-tertiary">
                        {community.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Community Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {community.name || "Untitled Community"}
                    </h3>
                    {community.tge_status && (
                      <Badge
                        variant="secondary"
                        className="bg-dark-alpha-secondary text-gray-400 text-xs"
                      >
                        {community.tge_status}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-400">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{formatNumber(community.followers || 0)}+</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className=" rounded-lg p-4">
                <div className="border-t border-dark-alpha-quaternary grid grid-cols-2 gap-6 pt-4">
                  {/* Active Quests */}
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Active quests</p>
                    <p className="text-xl font-semibold text-white">
                      {community.active_quests || 0}
                      <span className="text-gray-400 text-base font-normal">
                        /{community.total_quests || 0}
                      </span>
                    </p>
                  </div>

                  {/* Rewards Distributed */}
                  <div>
                    <p className="text-sm text-gray-400 mb-1">
                      Rewards distributed
                    </p>
                    <p className="text-xl font-semibold text-white">
                      $
                      {(
                        (community.rewards_distributed || 0) / 1000
                      ).toLocaleString()}
                      K
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Loading State */}
        {loading && (
          <div className="col-span-full flex justify-center items-center py-12">
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-light-primary" />
              <p className="text-sm text-dark-alpha-quaternary">
                Loading communities...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && communities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-dark-quaternary rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-dark-alpha-quaternary" />
          </div>
          <h3 className="text-lg font-semibold text-light-tertiary mb-2">
            No communities found
          </h3>
          <p className="text-dark-alpha-quaternary max-w-md">
            Communities will appear here once they become available.
          </p>
        </div>
      )}
    </div>
  );
}
