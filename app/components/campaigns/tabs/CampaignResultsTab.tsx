"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { QuestDetails } from "@/lib/types";
import { formatNumber, truncateName, truncateTweetId } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface TaskData {
  task_id: string;
  task_type: "tweet" | "follow" | "retweet" | "quote_tweet";
  task_status: "completed" | "under_review" | "underreview" | "todo";
  found_tweet_ids: string[];
  found_tweet_ids_details: Array<{
    tweet_id: string;
    body: string | null;
    view_count: number;
    reply_count: number;
    retweet_count: number;
    like_count: number;
    update_time: string | null;
  }>;
  tx_hash: string | null;
  tokens_earned: number | null;
  user_tokens_earned?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ResultData {
  user_x_handle: string;
  name: string | null;
  followers_count: number;
  smart_followers_count: number;
  engagement_score: number;
  profile_image_url: string | null;
  tasks: TaskData[];
}

interface PaginationData {
  total: number;
  start: number;
  limit: number;
  has_more: boolean;
}

interface ApiResponse {
  results: ResultData[];
  pagination: PaginationData;
}

interface CampaignResultsTabProps {
  quest: QuestDetails;
  questId: string;
  onResultsUpdate: (results: ResultData[]) => void;
}

export default function CampaignResultsTab({
  quest,
  questId,
  onResultsUpdate,
}: CampaignResultsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiCallInProgress, setApiCallInProgress] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalKols, setTotalKols] = useState(0);
  const PAGE_SIZE = 10;
  const [resultsData, setResultsData] = useState<ResultData[]>([]);
  const [offset, setOffset] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });

  const [statusFilter, setStatusFilter] = useState<
    "completed" | "under_review" | "todo" | "all"
  >("all");

  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">(
    "all"
  );

  const [stats, setStats] = useState({
    avgFollowers: 0,
    avgSmartFollowers: 0,
    avgViews: 0,
    avgTokensEarned: 0,
  });

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (userHandle: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userHandle)) {
      newExpanded.delete(userHandle);
    } else {
      newExpanded.add(userHandle);
    }
    setExpandedRows(newExpanded);
  };

  const getUserOverallStatus = (user: ResultData) => {
    const completedTasks = user.tasks.filter(
      (task) => task.task_status === "completed"
    );
    const underReviewTasks = user.tasks.filter(
      (task) =>
        task.task_status === "under_review" ||
        task.task_status === "underreview"
    );
    const todoTasks = user.tasks.filter((task) => task.task_status === "todo");

    if (completedTasks.length === user.tasks.length) {
      return "completed";
    } else if (underReviewTasks.length > 0) {
      return "under_review";
    } else if (todoTasks.length > 0) {
      return "in_progress";
    }
    return "todo";
  };

  // Helper function to get task status for a specific task type
  const getTaskStatusForType = (user: ResultData, taskType: string) => {
    const task = user.tasks.find((t) => t.task_type === taskType);
    return task ? task.task_status : null;
  };

  // Helper function to render task status badge
  const renderTaskStatusBadge = (status: string | null, taskType: string) => {
    if (!status) {
      return (
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-500/5 text-gray-400 border border-gray-500/20 min-w-[70px] text-center">
          -
        </span>
      );
    }

    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium min-w-[70px] text-center ${
          status === "completed"
            ? "bg-green-500/10 text-green-400 border border-green-500/30"
            : status === "under_review" || status === "underreview"
            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
            : status === "todo"
            ? "bg-blue-500/10 text-light-primary border border-light-primary/30"
            : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
        }`}
      >
        {status === "completed"
          ? "✓"
          : status === "under_review" || status === "underreview"
          ? "⏳"
          : status === "todo"
          ? "📝"
          : "⏸"}
      </span>
    );
  };

  const getUserTokensEarned = (user: ResultData) => {
    return user.tasks.reduce((max, task) => {
      const earned = task.user_tokens_earned || task.tokens_earned || 0;
      return earned > max ? earned : max;
    }, 0);
  };

  // Function to generate X search URL based on quest data
  const generateXSearchUrl = () => {
    const tasks = quest.tasks || [];
    const mentionTasks = tasks.filter(
      (task) =>
        task.task_type === "tweet" &&
        (task.task_tweet_handle || task.task_tweet_cashtag)
    );

    if (mentionTasks.length === 0) {
      return null;
    }

    // Extract project/campaign identifiers from tasks
    const projectHandles = [
      ...new Set(
        mentionTasks.map((task) => task.task_tweet_handle).filter(Boolean)
      ),
    ];
    const projectNames = [
      ...new Set(
        mentionTasks.map((task) => task.task_tweet_cashtag).filter(Boolean)
      ),
    ];

    // Extract author handles from results
    const authorHandles = [
      ...new Set(resultsData.map((result) => result.user_x_handle)),
    ];

    // Build search query components
    let searchTerms: string[] = [];

    // Add project mentions (with @ and without)
    projectHandles.forEach((handle) => {
      if (handle) {
        searchTerms.push(`@${handle}`);
        searchTerms.push(handle);
      }
    });

    // Add project names/cashtags
    projectNames.forEach((name) => {
      if (name) {
        const cleanName = name.replace("$", "");
        searchTerms.push(`@${cleanName}`);
        searchTerms.push(cleanName);
      }
    });

    // Build the search query
    const projectQuery =
      searchTerms.length > 0 ? `(${searchTerms.join(" OR ")})` : "";
    const authorQuery =
      authorHandles.length > 0
        ? `(${authorHandles.map((handle) => `from:@${handle}`).join(" OR ")})`
        : "";

    if (!projectQuery || !authorQuery) {
      return null;
    }

    const searchQuery = `${projectQuery} ${authorQuery}`;
    const encodedQuery = encodeURIComponent(searchQuery);

    return `https://x.com/search?q=${encodedQuery}&src=typed_query&f=top`;
  };

  useEffect(() => {
    if (resultsData.length > 0) {
      const totalFollowers = resultsData.reduce(
        (sum, result) => sum + result.followers_count,
        0
      );
      const totalSmartFollowers = resultsData.reduce(
        (sum, result) => sum + result.smart_followers_count,
        0
      );
      const totalViews = resultsData.reduce(
        (sum, result) => sum + result.engagement_score,
        0
      );
      const totalTokensEarned = resultsData.reduce((sum, result) => {
        const userTokensEarned = result.tasks.reduce(
          (taskSum, task) =>
            taskSum + (task.user_tokens_earned || task.tokens_earned || 0),
          0
        );
        return sum + (userTokensEarned / 1e6 || 0);
      }, 0);

      setStats({
        avgFollowers: totalFollowers / resultsData.length,
        avgSmartFollowers: totalSmartFollowers / resultsData.length,
        avgViews: totalViews / resultsData.length,
        avgTokensEarned: totalTokensEarned / resultsData.length,
      });

      // Apply current sort if exists
      if (sortConfig.key && sortConfig.direction) {
        const sortedData = sortData(
          resultsData,
          sortConfig.key,
          sortConfig.direction
        );
        if (JSON.stringify(sortedData) !== JSON.stringify(resultsData)) {
          setResultsData(sortedData);
        }
      }
    }
  }, [resultsData, sortConfig]);

  const fetchQuestResults = async () => {
    if (apiCallInProgress) {
      console.log("API call already in progress, skipping");
      return;
    }

    console.log("Starting fetchQuestResults with offset:", offset);

    try {
      setApiCallInProgress(true);
      if (offset === 0) setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `/api/quests/${questId}/results?start=${offset}&limit=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch results data: ${response.statusText}`);
      }

      const responseData: { success: boolean; data: ApiResponse } =
        await response.json();

      if (!responseData?.success || !responseData?.data?.results) {
        throw new Error("Invalid data format received from server");
      }

      // Deduplicate results based on user_x_handle
      const newResults = responseData.data.results.filter(
        (newResult) =>
          !resultsData.some(
            (existingResult) =>
              existingResult.user_x_handle === newResult.user_x_handle
          )
      );

      // Handle empty results
      if (responseData.data.results.length === 0) {
        setResultsData([]);
        setHasMore(false);
        setTotalKols(0);
        return;
      }

      // Handle non-empty results
      const updatedResults = [...resultsData, ...newResults];

      // Apply current sort if exists
      if (sortConfig.key && sortConfig.direction) {
        const sortedData = sortData(
          updatedResults,
          sortConfig.key,
          sortConfig.direction
        );
        setResultsData(sortedData);
      } else {
        setResultsData(updatedResults);
        onResultsUpdate(updatedResults);
      }

      setHasMore(responseData.data.pagination.has_more);
      setTotalKols(responseData.data.pagination.total);
      setOffset((prev) => prev + PAGE_SIZE);

      console.log(
        "fetchQuestResults completed successfully. New offset:",
        offset + PAGE_SIZE,
        "Has more:",
        responseData.data.pagination.has_more
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch results data";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setApiCallInProgress(false);
    }
  };

  useEffect(() => {
    // Initial load only
    if (resultsData.length === 0 && !apiCallInProgress) {
      fetchQuestResults();
    }
  }, []); // Run only once on mount

  // Separate effect for intersection observer
  useEffect(() => {
    // Don't set up observer if we're loading, have no more data, or API call is in progress
    if (loading || !hasMore || apiCallInProgress || resultsData.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        // Only trigger if the element is intersecting AND we're not already loading
        if (first.isIntersecting && !apiCallInProgress && hasMore) {
          console.log("Intersection observer triggered - loading more results");
          fetchQuestResults();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // Only trigger when within 100px of the element
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [loading, hasMore, apiCallInProgress, resultsData.length]);

  const handleRetry = () => {
    setOffset(0);
    setError(null);
    setLoading(true);
    setApiCallInProgress(false);
    setResultsData([]);
    setHasMore(true);
  };

  const sortData = (
    data: ResultData[],
    key: string,
    direction: "asc" | "desc"
  ) => {
    return [...data].sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;

      switch (key) {
        case "followers":
          aValue = a.followers_count;
          bValue = b.followers_count;
          break;
        case "smartFollowers":
          aValue = a.smart_followers_count;
          bValue = b.smart_followers_count;
          break;
        case "avgViews":
          aValue = a.engagement_score;
          bValue = b.engagement_score;
          break;
        case "likes":
          // Get max likes across all tasks for this user
          const aLikes = a.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.like_count) || [0]
          );
          const bLikes = b.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.like_count) || [0]
          );
          aValue = Math.max(...aLikes, 0);
          bValue = Math.max(...bLikes, 0);
          break;
        case "retweets":
          // Get max retweets across all tasks for this user
          const aRetweets = a.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.retweet_count) || [0]
          );
          const bRetweets = b.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.retweet_count) || [0]
          );
          aValue = Math.max(...aRetweets, 0);
          bValue = Math.max(...bRetweets, 0);
          break;
        case "replies":
          // Get max replies across all tasks for this user
          const aReplies = a.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.reply_count) || [0]
          );
          const bReplies = b.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.reply_count) || [0]
          );
          aValue = Math.max(...aReplies, 0);
          bValue = Math.max(...bReplies, 0);
          break;
        case "views":
          // Get max views across all tasks for this user
          const aViews = a.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.view_count) || [0]
          );
          const bViews = b.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map((d) => d.view_count) || [0]
          );
          aValue = Math.max(...aViews, 0);
          bValue = Math.max(...bViews, 0);
          break;
        case "tokensEarned":
          // Sum tokens earned across all tasks for this user
          aValue = a.tasks.reduce(
            (sum, task) => sum + (task.tokens_earned || 0),
            0
          );
          bValue = b.tasks.reduce(
            (sum, task) => sum + (task.tokens_earned || 0),
            0
          );
          break;
        default:
          return 0;
      }

      return direction === "asc" ? aValue - bValue : bValue - aValue;
    });
  };

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";

    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      } else {
        direction = "asc";
      }
    }

    setSortConfig({ key, direction });

    if (direction === null) {
      setResultsData([...resultsData]);
      return;
    }

    const sortedData = sortData(resultsData, key, direction);
    setResultsData(sortedData);
  };

  if (loading && offset === 0) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-light-primary"></div>
          <p className="text-light-primary opacity-70">
            Loading results data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-lg p-6 border border-red-500/20">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-light-primary mb-2">
                Failed to Load Results Data
              </h3>
              <p className="text-sm text-light-primary/60 mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-lg bg-accent-brand text-black font-medium hover:bg-accent-brand/90 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-dark-secondary/30 text-light-primary font-medium hover:bg-[#155748]/40 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TabsContent value="campaign_results">
        <div className="mb-6 hidden md:flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>All</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  statusFilter === "all"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {resultsData.length}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                statusFilter === "completed"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>Completed</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  statusFilter === "completed"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {
                  resultsData.filter((r) =>
                    r.tasks.every((task) => task.task_status === "completed")
                  ).length
                }
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                statusFilter === "under_review"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>Under Review</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  statusFilter === "under_review"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {
                  resultsData.filter((r) =>
                    r.tasks.some(
                      (task) =>
                        task.task_status === "under_review" ||
                        task.task_status === "underreview"
                    )
                  ).length
                }
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("todo")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                statusFilter === "todo"
                  ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>Todo</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  statusFilter === "todo"
                    ? "bg-accent-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {
                  resultsData.filter((r) =>
                    r.tasks.some((task) => task.task_status === "todo")
                  ).length
                }
              </span>
            </button>
            <div className="w-px h-6 bg-dark-secondary/30 mx-2" />
            <button
              onClick={() => setPaymentFilter("all")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                paymentFilter === "all"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>All Payments</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  paymentFilter === "all"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {resultsData.length}
              </span>
            </button>
            <button
              onClick={() => setPaymentFilter("paid")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                paymentFilter === "paid"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>Paid</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  paymentFilter === "paid"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {
                  resultsData.filter((r) =>
                    r.tasks.some((task) => (task.tokens_earned || 0) > 0)
                  ).length
                }
              </span>
            </button>
            <button
              onClick={() => setPaymentFilter("unpaid")}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors ${
                paymentFilter === "unpaid"
                  ? "bg-light-primary/20 text-light-primary border border-light-primary/30"
                  : "bg-dark-secondary/10 text-light-tertiary hover:bg-dark-secondary/20 border border-dark-secondary/20"
              }`}
            >
              <span>Unpaid</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-xs ${
                  paymentFilter === "unpaid"
                    ? "bg-light-primary/10"
                    : "bg-dark-secondary/20"
                }`}
              >
                {
                  resultsData.filter((r) =>
                    r.tasks.every((task) => (task.tokens_earned || 0) === 0)
                  ).length
                }
              </span>
            </button>
          </div>

          {/* X Search Link Button */}
          {generateXSearchUrl() && (
            <button
              onClick={() => {
                const searchUrl = generateXSearchUrl();
                if (searchUrl) {
                  window.open(searchUrl, "_blank");
                }
              }}
              className="px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30"
              title="View on X (Twitter)"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on X</span>
            </button>
          )}
        </div>
        <Card className="bg-transparent border-dark-secondary/50">
          <CardContent className="pt-0">
            {/* Status Filters */}

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-light-primary mx-auto mb-4" />
                <p className="text-light-primary">Loading results data...</p>
              </div>
            ) : resultsData.length > 0 ? (
              <div className="overflow-auto min-h-[400px] max-h-[500px] sm:max-h-[600px] relative rounded-lg border border-dark-secondary/30 bg-gradient-to-br from-dark-secondary/10 to-transparent backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <Table className="w-full min-w-[700px]">
                    <TableHeader className="sticky top-0 bg-dark-primary z-10">
                      <TableRow className="border-dark-secondary/30 hover:bg-transparent">
                        <TableHead className="text-light-primary font-medium text-center py-4 w-12">
                          <div className="flex items-center justify-center gap-2"></div>
                        </TableHead>
                        <TableHead className="text-light-primary font-medium text-center py-4 hidden md:table-cell">
                          <div className="flex items-center justify-center gap-2">
                            Rank
                          </div>
                        </TableHead>
                        <TableHead className="text-light-primary font-medium text-center py-4 w-[200px]">
                          <div className="flex items-center justify-start gap-2">
                            User
                          </div>
                        </TableHead>
                        {/* Mobile: Status, Desktop: Followers */}
                        <TableHead
                          className="text-light-primary font-medium text-center py-4 cursor-pointer hover:bg-dark-secondary/20"
                          onClick={() => handleSort("followers")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className="hidden md:inline">Followers</span>
                            <span className="md:hidden">Status</span>
                            {sortConfig.key === "followers" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : sortConfig.direction === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : null
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-light-primary font-medium text-center py-4 cursor-pointer hover:bg-dark-secondary/20 hidden md:table-cell"
                          onClick={() => handleSort("smartFollowers")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Smart Followers
                            {sortConfig.key === "smartFollowers" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : sortConfig.direction === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : null
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-light-primary font-medium text-center py-4 cursor-pointer hover:bg-dark-secondary/20 hidden md:table-cell"
                          onClick={() => handleSort("avgViews")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Engagement Score
                            {sortConfig.key === "avgViews" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : sortConfig.direction === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : null
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        {/* Individual Task Status Columns */}
                        {quest.tasks?.map((questTask) => (
                          <TableHead
                            key={questTask.task_id}
                            className="text-light-primary font-medium text-center py-4 min-w-[80px]"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs text-light-primary/70">
                                {questTask.task_type.charAt(0).toUpperCase() +
                                  questTask.task_type.slice(1)}
                              </span>
                              <span className="text-xs text-light-primary/50">
                                Status
                              </span>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-light-primary font-medium text-center py-4 hidden md:table-cell">
                          <div className="flex items-center justify-center gap-2">
                            Overall Status
                          </div>
                        </TableHead>
                        <TableHead
                          className="text-light-primary font-medium text-center py-4 cursor-pointer hover:bg-dark-secondary/20 hidden md:table-cell"
                          onClick={() => handleSort("tokensEarned")}
                        >
                          <div className="flex items-center justify-center gap-2">
                            Tokens Earned
                            {sortConfig.key === "tokensEarned" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : sortConfig.direction === "desc" ? (
                                <ArrowDown className="h-4 w-4" />
                              ) : null
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsData
                        .filter((result) => {
                          // Status filter
                          if (statusFilter !== "all") {
                            if (statusFilter === "completed") {
                              // User has completed all tasks
                              if (
                                !result.tasks.every(
                                  (task) => task.task_status === "completed"
                                )
                              ) {
                                return false;
                              }
                            } else if (statusFilter === "under_review") {
                              // User has at least one task under review
                              if (
                                !result.tasks.some(
                                  (task) =>
                                    task.task_status === "under_review" ||
                                    task.task_status === "underreview"
                                )
                              ) {
                                return false;
                              }
                            } else if (statusFilter === "todo") {
                              // User has at least one todo task
                              if (
                                !result.tasks.some(
                                  (task) => task.task_status === "todo"
                                )
                              ) {
                                return false;
                              }
                            }
                          }

                          // Payment filter
                          if (paymentFilter !== "all") {
                            const userTokensEarned = result.tasks.reduce(
                              (sum, task) =>
                                sum +
                                (task.user_tokens_earned ||
                                  task.tokens_earned ||
                                  0),
                              0
                            );
                            if (
                              paymentFilter === "paid" &&
                              userTokensEarned <= 0
                            ) {
                              return false;
                            }
                            if (
                              paymentFilter === "unpaid" &&
                              userTokensEarned > 0
                            ) {
                              return false;
                            }
                          }

                          return true;
                        })
                        .map((result, index) => {
                          const isExpanded = expandedRows.has(
                            result.user_x_handle
                          );
                          const overallStatus = getUserOverallStatus(result);
                          const userTokensEarned = getUserTokensEarned(result);

                          return (
                            <>
                              {/* Main User Row */}
                              <TableRow
                                key={result.user_x_handle}
                                className="border-dark-secondary/30 group transition-all duration-200 hover:bg-dark-secondary/20"
                              >
                                {/* Expand/Collapse Button */}
                                <TableCell className="text-center py-4">
                                  <button
                                    onClick={() =>
                                      toggleRowExpansion(result.user_x_handle)
                                    }
                                    className="p-1 hover:bg-dark-secondary/30 rounded transition-colors"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-light-primary" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-light-primary" />
                                    )}
                                  </button>
                                </TableCell>

                                {/* Rank */}
                                <TableCell className="text-center py-4 hidden md:table-cell">
                                  <div className="flex items-center justify-center gap-2">
                                    {index + 1}
                                  </div>
                                </TableCell>

                                {/* User Info */}
                                <TableCell className="py-4 w-[200px]">
                                  <div className="flex items-center gap-3">
                                    <div className="relative h-8 w-8 rounded-full overflow-hidden border border-light-primary/30 group-hover:border-light-primary/50 transition-colors flex-shrink-0">
                                      {result.profile_image_url ? (
                                        <img
                                          src={result.profile_image_url}
                                          alt={result.name || "User"}
                                          className="h-8 w-8 object-cover"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            target.nextElementSibling?.classList.remove(
                                              "hidden"
                                            );
                                          }}
                                        />
                                      ) : null}
                                      {/* Fallback avatar */}
                                      <div
                                        className={`h-8 w-8 rounded-full bg-gradient-to-br from-light-primary to-light-primary/80 ${
                                          result.profile_image_url
                                            ? "hidden"
                                            : "flex"
                                        } items-center justify-center text-dark-primary text-base font-semibold`}
                                      >
                                        {result.name
                                          ?.charAt(0)
                                          ?.toUpperCase() ||
                                          result.user_x_handle
                                            ?.charAt(0)
                                            ?.toUpperCase() ||
                                          "?"}
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-light-primary group-hover:text-light-primary transition-colors truncate">
                                        {truncateName(
                                          result.name || "Unknown",
                                          15
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-light-primary opacity-80 group-hover:opacity-100 truncate">
                                          @
                                          {truncateName(
                                            result.user_x_handle,
                                            15
                                          )}
                                        </span>
                                        {/* Show followers on mobile below username */}
                                        <span className="md:hidden text-light-primary/60 text-xs flex-shrink-0">
                                          •{" "}
                                          {formatNumber(
                                            result.followers_count,
                                            1
                                          )}{" "}
                                          followers
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Mobile: Status, Desktop: Followers */}
                                <TableCell className="text-center py-4">
                                  {/* Desktop: Show followers */}
                                  <span className="hidden md:inline text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                    {formatNumber(result.followers_count, 1)}
                                  </span>
                                  {/* Mobile: Show overall status */}
                                  <div className="md:hidden flex justify-center">
                                    <span
                                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                        overallStatus === "completed"
                                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                          : overallStatus === "under_review"
                                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                          : overallStatus === "in_progress"
                                          ? "bg-blue-500/10 text-light-primary border border-light-primary"
                                          : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                      }`}
                                    >
                                      {overallStatus === "completed"
                                        ? "✓"
                                        : overallStatus === "under_review"
                                        ? "⏳"
                                        : overallStatus === "in_progress"
                                        ? "🔄"
                                        : "📝"}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Smart Followers */}
                                <TableCell className="text-center py-4 hidden md:table-cell">
                                  <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                    {formatNumber(
                                      result.smart_followers_count,
                                      1
                                    )}
                                  </span>
                                </TableCell>

                                {/* Engagement Score */}
                                <TableCell className="text-center py-4 hidden md:table-cell">
                                  <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                    {formatNumber(result.engagement_score, 0)}
                                  </span>
                                </TableCell>

                                {/* Individual Task Status Columns */}
                                {quest.tasks?.map((questTask) => (
                                  <TableCell
                                    key={questTask.task_id}
                                    className="text-center py-4 min-w-[80px]"
                                  >
                                    {renderTaskStatusBadge(
                                      getTaskStatusForType(
                                        result,
                                        questTask.task_type
                                      ),
                                      questTask.task_type
                                    )}
                                  </TableCell>
                                ))}

                                {/* Overall Status */}
                                <TableCell className="text-center py-4 hidden md:table-cell">
                                  <div className="flex justify-center">
                                    <span
                                      className={`text-sm font-semibold px-4 py-2 rounded-full min-w-[125px] ${
                                        overallStatus === "completed"
                                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                          : overallStatus === "under_review"
                                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                          : overallStatus === "in_progress"
                                          ? " text-light-primary border border-light-primary/30"
                                          : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                      }`}
                                    >
                                      {overallStatus === "completed"
                                        ? "✓ Completed"
                                        : overallStatus === "under_review"
                                        ? "⏳ Review"
                                        : overallStatus === "in_progress"
                                        ? "In Progress"
                                        : "📝 Todo"}
                                    </span>
                                  </div>
                                </TableCell>

                                {/* Tokens Earned */}
                                <TableCell className="text-center py-4 hidden md:table-cell">
                                  <div className="flex justify-center">
                                    <span
                                      className={`font-semibold text-sm px-4 py-2 rounded-full min-w-[120px] ${
                                        userTokensEarned > 0
                                          ? "bg-light-primary/10 text-light-primary border border-light-primary/30"
                                          : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                      }`}
                                    >
                                      {userTokensEarned > 0
                                        ? `💰 ${formatNumber(
                                            userTokensEarned / 1e6,
                                            2
                                          )}`
                                        : "💰 0"}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Expanded Task Details */}
                              {isExpanded && (
                                <TableRow className="border-dark-secondary/30 bg-dark-secondary/5">
                                  <TableCell
                                    colSpan={8 + (quest.tasks?.length || 0)}
                                    className="py-4"
                                  >
                                    <div className="space-y-4">
                                      <h4 className="text-sm font-medium text-light-primary">
                                        Task Details
                                      </h4>

                                      {/* Tasks Grid */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {result.tasks.map((task) => (
                                          <div
                                            key={task.task_id}
                                            className="bg-dark-secondary/10 rounded-lg p-3 border-2 border-dark-secondary/30 hover:border-dark-secondary/50 transition-colors space-y-3"
                                          >
                                            {/* Task Header */}
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-light-primary">
                                                  {task.task_type
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    task.task_type.slice(1)}
                                                </span>
                                                <span
                                                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                    task.task_status ===
                                                    "completed"
                                                      ? "bg-green-500/10 text-green-400 border border-green-500/30"
                                                      : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                                  }`}
                                                >
                                                  {task.task_status ===
                                                  "completed"
                                                    ? "✓"
                                                    : "⏸"}
                                                </span>
                                              </div>
                                              {task.tokens_earned &&
                                                task.tokens_earned > 0 && (
                                                  <span className="text-xs text-light-primary font-medium">
                                                    +
                                                    {formatNumber(
                                                      task.tokens_earned / 1e6,
                                                      2
                                                    )}
                                                  </span>
                                                )}
                                            </div>

                                            {/* Tweets Grid */}
                                            {task.found_tweet_ids.length >
                                              0 && (
                                              <div className="space-y-2">
                                                {task.found_tweet_ids.map(
                                                  (tweetId) => {
                                                    const tweetDetails =
                                                      task.found_tweet_ids_details?.find(
                                                        (detail) =>
                                                          detail.tweet_id ===
                                                          tweetId
                                                      );
                                                    return (
                                                      <div
                                                        key={tweetId}
                                                        className="bg-dark-secondary/20 rounded-lg p-2 border border-dark-secondary/40 hover:bg-dark-secondary/30 hover:border-dark-secondary/60 transition-all"
                                                      >
                                                        {/* Tweet Header */}
                                                        <div className="flex items-center justify-between mb-2">
                                                          <button
                                                            onClick={() => {
                                                              const url =
                                                                task.task_type ===
                                                                "quote_tweet"
                                                                  ? `https://x.com/i/status/${tweetId}/quotes`
                                                                  : task.task_type ===
                                                                    "retweet"
                                                                  ? `https://x.com/i/status/${tweetId}/retweets`
                                                                  : `https://x.com/i/status/${tweetId}`;
                                                              window.open(
                                                                url,
                                                                "_blank"
                                                              );
                                                            }}
                                                            className="text-light-primary hover:text-light-primary/80 text-xs flex items-center gap-1 font-mono"
                                                          >
                                                            {truncateTweetId(
                                                              tweetId
                                                            )}
                                                            <ArrowUpRight className="w-3 h-3" />
                                                          </button>
                                                        </div>

                                                        {/* Tweet Engagement Stats - Single Line */}
                                                        {tweetDetails && (
                                                          <div className="flex items-center justify-between text-xs text-light-primary/60">
                                                            <div className="flex items-center gap-1">
                                                              <span>👁</span>
                                                              <span>
                                                                {formatNumber(
                                                                  tweetDetails.view_count,
                                                                  0
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                              <span>❤️</span>
                                                              <span>
                                                                {formatNumber(
                                                                  tweetDetails.like_count,
                                                                  0
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                              <span>🔄</span>
                                                              <span>
                                                                {formatNumber(
                                                                  tweetDetails.retweet_count,
                                                                  0
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                              <span>💬</span>
                                                              <span>
                                                                {formatNumber(
                                                                  tweetDetails.reply_count,
                                                                  0
                                                                )}
                                                              </span>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  }
                                                )}
                                              </div>
                                            )}

                                            {/* Task Timestamps */}
                                            <div className="text-xs text-light-primary/40 pt-2 border-t border-dark-secondary/20">
                                              <div>
                                                Updated:{" "}
                                                {new Date(
                                                  task.updated_at
                                                ).toLocaleDateString()}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
                {hasMore && !loading && (
                  <div
                    ref={loadMoreRef}
                    className="w-full py-8 flex justify-center"
                  >
                    {apiCallInProgress ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-light-primary" />
                        <span className="text-light-primary text-sm">
                          Loading more...
                        </span>
                      </div>
                    ) : (
                      <div className="text-light-primary/50 text-sm">
                        Scroll to load more results
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-light-primary mb-4">No results found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}
