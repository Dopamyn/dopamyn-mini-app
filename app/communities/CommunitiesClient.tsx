"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { Community } from "@/app/types";
import CommunitiesCardList from "@/app/components/communities/CommunitiesCardList";

async function getCommunities(
  page: number = 1,
  per_page: number = 10
): Promise<{ communities: Community[]; total: number }> {
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("per_page", per_page.toString());
    params.append("sort_by", "project_handle");
    params.append("sort_order", "asc");

    const queryString = params.toString();
    const url = `/api/communities/list${queryString ? `?${queryString}` : ""}`;

    // Get token from localStorage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    const data = await response.json();

    // Handle API response
    const communities = data.data || [];
    const total = data.total || communities.length;

    return {
      communities: communities,
      total: total,
    };
  } catch (error) {
    console.error("Error fetching communities:", error);
    return { communities: [], total: 0 };
  }
}

export default function CommunitiesClient() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { user, refreshUser } = useUser();
  const { login, isProcessing } = useTwitterDatabaseSync();

  const COMMUNITIES_PER_PAGE = 10;

  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      setHasMore(true);

      const result = await getCommunities(1, COMMUNITIES_PER_PAGE);

      setCommunities(result.communities);
      setHasMore(result.communities.length === COMMUNITIES_PER_PAGE);
      setLoading(false);
    };

    fetchCommunities();
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = currentPage + 1;

    const result = await getCommunities(nextPage, COMMUNITIES_PER_PAGE);

    if (result.communities.length > 0) {
      setCommunities((prev) => [...prev, ...result.communities]);
      setCurrentPage(nextPage);
      setHasMore(result.communities.length === COMMUNITIES_PER_PAGE);
    } else {
      setHasMore(false);
    }
  }, [loading, hasMore, currentPage]);

  return (
    <div>
      <CommunitiesCardList
        communities={communities}
        loading={loading}
        onLoadMore={loadMore}
      />
    </div>
  );
}
