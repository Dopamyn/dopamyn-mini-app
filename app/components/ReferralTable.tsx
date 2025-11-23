import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReferralEntry } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ArrowUpDown, ExternalLink, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ReferralTableProps {
  initialReferrals?: ReferralEntry[];
  initialPartialReferrals?: ReferralEntry[];
  onLoadMore?: (
    start: number,
    limit: number
  ) => Promise<{
    referrals: ReferralEntry[];
    partialReferrals: ReferralEntry[];
  }>;
}

type SortConfig = {
  key: keyof ReferralEntry;
  direction: "asc" | "desc";
};

export function ReferralTable({
  initialReferrals = [],
  initialPartialReferrals = [],
  onLoadMore,
}: ReferralTableProps) {
  const [referrals, setReferrals] = useState<ReferralEntry[]>(initialReferrals);
  const [partialReferrals, setPartialReferrals] = useState<ReferralEntry[]>(
    initialPartialReferrals
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "reward_earned",
    direction: "desc",
  });

  // Helper function to transform API response to ReferralEntry
  const transformApiResponse = useCallback(
    (apiReferral: any): ReferralEntry => {
      return {
        x_handle: apiReferral.x_handle,
        used_time: apiReferral.last_used_time || apiReferral.used_time,
        followers_count: apiReferral.followers_count,
        smart_followers_count: apiReferral.smart_followers_count,
        reward_earned: apiReferral.reward_earned || 0,
        profile_image_url: apiReferral.profile_image_url,
        remaining_action: apiReferral.remaining_action,
      };
    },
    []
  );

  // Helper function to get sort_by parameter for API
  const getSortByParam = useCallback((config: SortConfig): string => {
    const sortKeyMap: Record<string, string> = {
      reward_earned: "reward_earned",
      used_time: "last_used_time",
      followers_count: "followers_count",
      smart_followers_count: "smart_followers_count",
      x_handle: "x_handle",
    };
    const apiKey = sortKeyMap[config.key] || config.key;
    return `${apiKey}_${config.direction}`;
  }, []);

  // Fetch referrals from API
  const fetchReferrals = useCallback(
    async (start: number, limit: number, sortBy?: string) => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const sortParam = sortBy || getSortByParam(sortConfig);
        const response = await fetch(
          `/api/user/referral-earnings?sort_by=${sortParam}&start=${start}&limit=${limit}`,
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
        if (data?.result?.referrals) {
          const transformedReferrals =
            data.result.referrals.map(transformApiResponse);
          return {
            referrals: transformedReferrals,
            partialReferrals: [],
            total: data.result.total_referrals || 0,
          };
        }
        return { referrals: [], partialReferrals: [], total: 0 };
      } catch (error) {
        console.error("Error fetching referrals:", error);
        return { referrals: [], partialReferrals: [], total: 0 };
      }
    },
    [transformApiResponse, getSortByParam, sortConfig]
  );

  const isInitialMount = useRef(true);

  // Initial fetch on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Only fetch if no initial data provided
      if (initialReferrals.length === 0) {
        setIsInitialLoading(true);
        try {
          const result = await fetchReferrals(0, 10);
          setReferrals(result.referrals);
          setPartialReferrals(result.partialReferrals);
          setHasMore(result.referrals.length >= 10);
        } catch (error) {
          console.error("Error loading initial referrals:", error);
        } finally {
          setIsInitialLoading(false);
        }
      }
    };
    loadInitialData();
    isInitialMount.current = false;
  }, []); // Only run on mount

  // Refetch when sort changes (if using API and not initial mount)
  useEffect(() => {
    if (
      !isInitialMount.current &&
      initialReferrals.length === 0 &&
      referrals.length > 0
    ) {
      const refetchWithSort = async () => {
        setIsLoading(true);
        try {
          // Reset and fetch from beginning with new sort
          const result = await fetchReferrals(0, 10);
          setReferrals(result.referrals);
          setPartialReferrals(result.partialReferrals);
          setHasMore(result.referrals.length >= 10);
        } catch (error) {
          console.error("Error refetching referrals with new sort:", error);
        } finally {
          setIsLoading(false);
        }
      };
      refetchWithSort();
    }
  }, [
    sortConfig.key,
    sortConfig.direction,
    initialReferrals.length,
    fetchReferrals,
  ]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && !isInitialLoading && hasMore) {
        const loadMore = async () => {
          setIsLoading(true);
          try {
            let result;
            if (onLoadMore) {
              // Use provided onLoadMore callback (backward compatibility)
              result = await onLoadMore(referrals.length, 10);
            } else {
              // Use API directly
              result = await fetchReferrals(referrals.length, 10);
            }

            if (
              result.referrals.length === 0 &&
              result.partialReferrals.length === 0
            ) {
              setHasMore(false);
            } else {
              setReferrals((prev) => [...prev, ...result.referrals]);
              setPartialReferrals((prev) => [
                ...prev,
                ...result.partialReferrals,
              ]);
            }
          } catch (error) {
            console.error("Error loading more referrals:", error);
          } finally {
            setIsLoading(false);
          }
        };
        loadMore();
      }
    },
    [
      isLoading,
      isInitialLoading,
      hasMore,
      onLoadMore,
      referrals.length,
      fetchReferrals,
    ]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  // Initialize with initial data when provided
  useEffect(() => {
    if (initialReferrals.length > 0) {
      setReferrals(initialReferrals);
      setPartialReferrals(initialPartialReferrals);
    }
  }, [initialReferrals, initialPartialReferrals]);

  // Combine completed and partial referrals
  // Note: If using API, sorting is handled server-side, but we keep client-side sorting as fallback
  const allReferrals = useMemo(() => {
    const combined = [...referrals, ...partialReferrals];

    // If using API and we have data, return as-is (server-side sorted)
    // Otherwise, sort client-side
    if (initialReferrals.length === 0 && combined.length > 0) {
      // API data is already sorted, but we can apply additional client-side sorting if needed
      return combined;
    }

    // Client-side sorting for backward compatibility
    return combined.sort((a, b) => {
      if (sortConfig.key === "used_time") {
        const dateA = new Date(a.used_time).getTime();
        const dateB = new Date(b.used_time).getTime();
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      // Handle numeric fields
      if (
        sortConfig.key === "followers_count" ||
        sortConfig.key === "smart_followers_count" ||
        sortConfig.key === "reward_earned"
      ) {
        const valueA = a[sortConfig.key] || 0;
        const valueB = b[sortConfig.key] || 0;
        return sortConfig.direction === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      // Handle string fields
      const valueA = a[sortConfig.key];
      const valueB = b[sortConfig.key];
      if (valueA == null || valueB == null) return 0;
      if (valueA < valueB) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [
    referrals,
    partialReferrals,
    sortConfig.key,
    sortConfig.direction,
    initialReferrals.length,
  ]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    if (!isValid(date)) return "Invalid date";
    return format(date, "MMM d, yyyy");
  }, []);

  const handleSort = useCallback((key: SortConfig["key"]) => {
    setSortConfig((current) => {
      const newDirection =
        current.key === key && current.direction === "asc" ? "desc" : "asc";
      return {
        key,
        direction: newDirection,
      };
    });
  }, []);

  if (allReferrals.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ExternalLink className="w-12 h-12 text-light-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-light-primary mb-2">
            No Referrals Yet
          </h3>
          <p className="text-sm text-light-tertiary">
            Share your referral link to start earning rewards
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {(isLoading || isInitialLoading) && allReferrals.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-light-primary">
            <Loader2 className="w-6 h-6 animate-spin text-accent-brand" />
            <span className="text-lg font-medium">Loading referrals...</span>
          </div>
        </div>
      )}
      <Table
        className={
          (isLoading || isInitialLoading) && allReferrals.length === 0
            ? "opacity-50 pointer-events-none"
            : ""
        }
      >
        <TableHeader>
          <TableRow className="border-dark-quaternary hover:bg-dark-secondary/30">
            <TableHead className="text-light-primary font-semibold w-12">
              #
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("x_handle")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-brand">
                <span>X Handle</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("followers_count")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Followers</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("smart_followers_count")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Smart Followers</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("used_time")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Last Used Time</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("reward_earned")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Reward Earned</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allReferrals.map((referral, index) => (
            <TableRow
              key={referral.x_handle + index}
              className="border-dark-quaternary hover:bg-dark-secondary/30"
            >
              <TableCell className="text-center">
                <span className="text-sm text-light-tertiary font-medium">
                  {index + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-dark-quaternary flex items-center justify-center text-xs font-semibold uppercase text-light-primary">
                    {referral.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={referral.profile_image_url}
                        alt={referral.x_handle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      referral.x_handle
                        ?.replace("@", "")
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <a
                    href={`https://x.com/${referral.x_handle?.replace(
                      "@",
                      ""
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-light-primary hover:text-accent-brand transition-colors flex items-center gap-2"
                  >
                    {referral.x_handle}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary font-medium">
                  {formatNumber(referral.followers_count || 0)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary font-medium">
                  {formatNumber(referral.smart_followers_count || 0)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary">
                  {formatDate(referral.used_time)}
                </span>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center">
                  <span
                    className={`font-semibold text-sm px-4 py-2 rounded-full min-w-[100px] ${
                      referral.reward_earned > 0
                        ? "bg-light-primary/10 text-light-primary border border-light-primary/30"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                    }`}
                  >
                    {referral.reward_earned > 0
                      ? `💰 ${formatNumber(referral.reward_earned)}`
                      : "💰 0"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Infinite Scroll Loading */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex items-center justify-center py-4"
        >
          {isLoading && (
            <Loader2 className="w-6 h-6 animate-spin text-accent-brand" />
          )}
        </div>
      )}
    </div>
  );
}
