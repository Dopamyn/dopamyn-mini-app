"use client";

import {
  ChevronDown,
  Eye,
  Hash,
  Heart,
  MessageCircle,
  Repeat2,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../lib/constants";
import type { TopTweetsResponse, Tweet } from "../types";

// Debounce helper
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

interface SmartFeedProps {
  authorHandle?: string;
}

type Interval = "1day" | "7day" | "30day";
type SortBy =
  | "view_count_desc"
  | "like_count_desc"
  | "retweet_count_desc"
  | "reply_count_desc"
  | "tweet_create_time_desc";

const intervalOptions = [
  { value: "1day" as Interval, label: "24H" },
  { value: "7day" as Interval, label: "7D" },
  { value: "30day" as Interval, label: "30D" },
];

const sortOptions = [
  { value: "view_count_desc" as SortBy, label: "Top Views" },
  { value: "like_count_desc" as SortBy, label: "Most Liked" },
  { value: "retweet_count_desc" as SortBy, label: "Most Shared" },
  { value: "reply_count_desc" as SortBy, label: "Most Discussed" },
  { value: "tweet_create_time_asc" as SortBy, label: "Most Recent" },
];

export default function SmartFeed({
  authorHandle = "eliz883",
}: SmartFeedProps) {
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("7day");
  const [sortBy, setSortBy] = useState<SortBy>("view_count_desc");
  const [expandedTweets, setExpandedTweets] = useState<Set<string>>(new Set());
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false); // Use ref to track loading state
  const LIMIT = 20;

  const fetchTweets = async (attempt = 0, loadMore = false) => {
    // Check loading lock
    if (loadingRef.current) {
      return;
    }

    // Set loading locks
    loadingRef.current = true;
    if (!loadMore) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/user/get-top-tweets?author_handle=${authorHandle}&interval=${interval}&sort_by=${sortBy}&limit=${LIMIT}&offset=${offset}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = (await response.json()) as TopTweetsResponse;
        if (data.result && Array.isArray(data.result)) {
          const sanitizedTweets = data.result.map((tweet) => ({
            ...tweet,
            view_count: tweet.view_count || 0,
            like_count: tweet.like_count || 0,
            quote_count: tweet.quote_count || 0,
            reply_count: tweet.reply_count || 0,
            retweet_count: tweet.retweet_count || 0,
            sentiment: tweet.sentiment,
            tweet_category: tweet.tweet_category || null,
          }));

          if (loadMore) {
            setTweets((prev) => [...prev, ...sanitizedTweets]);
          } else {
            setTweets(sanitizedTweets);
          }

          setHasMore(sanitizedTweets.length === LIMIT);
          setRetryCount(0);
        } else {
          throw new Error("Invalid response format");
        }
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to fetch tweets (attempt ${attempt + 1}):`, error);

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        setRetryCount(attempt + 1);
        setError(`Retrying... (${attempt + 1}/${MAX_RETRIES})`);

        setTimeout(() => {
          fetchTweets(attempt + 1, loadMore);
        }, delay);
        return;
      }

      setError("Failed to fetch tweets");
      setRetryCount(0);
    } finally {
      loadingRef.current = false; // Release loading lock
      setLoading(false);
    }
  };

  // Debounced version of loadMore
  const debouncedLoadMore = useCallback(
    debounce(() => {
      if (hasMore && !loadingRef.current) {
        setOffset((prev) => prev + LIMIT);
        fetchTweets(0, true);
      }
    }, 300),
    [hasMore]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMore) {
          debouncedLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [debouncedLoadMore, hasMore]);

  useEffect(() => {
    // Reset state when filters change
    loadingRef.current = false; // Reset loading lock
    setOffset(0);
    setTweets([]);
    setHasMore(true);
    fetchTweets();
  }, [interval, sortBy, authorHandle]);

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) {
      return "0";
    }

    const numValue = Number(num);
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  const formatDate = (dateString: string): string => {
    try {
      // Create a date object from UTC string
      const date = new Date(dateString + "Z"); // Append 'Z' to ensure UTC parsing
      if (isNaN(date.getTime())) {
        return "now";
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

      if (diffHours < 24) {
        return diffHours === 1 ? "1h" : `${diffHours}h`;
      }
      if (diffDays === 1) return "1d";
      if (diffDays < 7) return `${diffDays}d`;
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w`;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use system timezone
      });
    } catch (error) {
      return "now";
    }
  };

  const getSentimentIcon = (sentiment: number | null) => {
    if (sentiment === null || sentiment === undefined) return null;
    if (sentiment > 0.1)
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (sentiment < -0.1)
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    return null;
  };

  const extractTokens = (text: string): string[] => {
    if (!text || typeof text !== "string") return [];
    const tokenRegex = /\$[A-Z]{2,10}/g;
    return text.match(tokenRegex) || [];
  };

  const highlightTokens = (text: string) => {
    if (!text || typeof text !== "string") return text;

    const tokens = extractTokens(text);
    if (tokens.length === 0) return text;

    const parts = [];
    let lastIndex = 0;

    tokens.forEach((token) => {
      const index = text.indexOf(token, lastIndex);
      if (index !== -1) {
        // Add text before token
        if (index > lastIndex) {
          parts.push(text.substring(lastIndex, index));
        }
        // Add highlighted token
        parts.push(
          <span
            key={`${token}-${index}`}
            className="text-blue-600 font-semibold"
          >
            {token}
          </span>
        );
        lastIndex = index + token.length;
      }
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 1 ? parts : text;
  };

  const getDisplayHandle = (handle: string) => {
    if (!handle) return "unknown";
    return handle.startsWith("@") ? handle.slice(1) : handle;
  };

  const toggleTweetExpansion = (tweetId: string) => {
    const newExpanded = new Set(expandedTweets);
    if (newExpanded.has(tweetId)) {
      newExpanded.delete(tweetId);
    } else {
      newExpanded.add(tweetId);
    }
    setExpandedTweets(newExpanded);
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  };

  const getSortLabel = () => {
    return sortOptions.find((option) => option.value === sortBy)?.label;
  };

  const likeTweet = (tweetId: string) => {
    window.open(
      `https://twitter.com/intent/like?tweet_id=${tweetId}`,
      "_blank"
    );
  };

  const replyTweet = (tweetId: string) => {
    window.open(
      `https://twitter.com/intent/tweet?in_reply_to=${tweetId}`,
      "_blank"
    );
  };

  const retweetTweet = (tweetId: string) => {
    window.open(
      `https://twitter.com/intent/retweet?tweet_id=${tweetId}`,
      "_blank"
    );
  };

  return (
    <div className="card-trendsage h-full bg-neutral-900 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-brand" />
          <h2 className="text-lg font-semibold text-gray-100">Smart Feed</h2>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
          {/* Interval Filter */}
          <div className="flex bg-gray-700 rounded-lg p-1 w-full md:w-auto">
            {intervalOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setInterval(value)}
                className={`flex-1 md:flex-initial px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                  interval === value
                    ? "bg-accent-brand text-gray-900"
                    : "text-gray-300 hover:text-accent-brand hover:bg-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full md:w-auto">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center justify-between w-full md:w-auto gap-1 px-3 py-1 text-xs bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:text-accent-brand hover:border-accent-brand/50 transition-colors"
            >
              {getSortLabel()}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-full md:min-w-[150px]">
                {sortOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSortBy(value);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors ${
                      sortBy === value
                        ? "text-accent-brand bg-gray-700"
                        : "text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error handling */}
      {error && retryCount === 0 && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <p className="text-red-400 text-[10px] sm:text-xs">{error}</p>
        </div>
      )}

      {/* Retry status */}
      {retryCount > 0 && (
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <p className="text-yellow-400 text-[10px] sm:text-xs">{error}</p>
        </div>
      )}

      {/* Loading state for initial load */}
      {loading && tweets.length === 0 && (
        <div className="space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="border border-gray-700 rounded-lg p-3 sm:p-4 animate-pulse"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1.5 sm:space-y-2">
                  <div className="h-3 sm:h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-2 sm:h-3 bg-gray-700 rounded w-1/2"></div>
                  <div className="h-2 sm:h-3 bg-gray-700 rounded w-1/4"></div>
                  <div className="flex gap-2 sm:gap-3 mt-2 sm:mt-3">
                    <div className="h-2 bg-gray-700 rounded w-8 sm:w-12"></div>
                    <div className="h-2 bg-gray-700 rounded w-8 sm:w-12"></div>
                    <div className="h-2 bg-gray-700 rounded w-8 sm:w-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tweet list */}
      <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto custom-scrollbar relative">
        {tweets.map((tweet, index) => {
          const isExpanded = expandedTweets.has(tweet.tweet_id);
          const shouldTruncate = tweet.body.length > 200;
          const displayText =
            isExpanded || !shouldTruncate
              ? tweet.body
              : truncateText(tweet.body);

          return (
            <div
              key={`${tweet.tweet_id}-${index}`}
              className="border border-gray-700 rounded-lg p-3 sm:p-4 hover:border-accent-brand/30 transition-colors"
            >
              {/* Tweet header */}
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                <img
                  src={tweet.profile_image_url}
                  alt={`@${tweet.author_handle}`}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ring-2 ring-transparent hover:ring-accent-brand/50 transition-all"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=40&width=40";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <span className="font-medium text-gray-100 text-xs sm:text-sm truncate">
                      {getDisplayHandle(tweet.author_handle)}
                    </span>
                    {tweet.sentiment !== null &&
                      getSentimentIcon(tweet.sentiment)}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-400">
                    {formatDate(tweet.tweet_create_time)}
                  </div>
                </div>
              </div>

              {/* Tweet content */}
              <div className="mb-2 sm:mb-3">
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap">
                  {highlightTokens(displayText)}
                </p>
                {shouldTruncate && (
                  <button
                    onClick={() => toggleTweetExpansion(tweet.tweet_id)}
                    className="text-accent-brand text-[10px] sm:text-xs hover:text-[#00C484] transition-colors mt-1"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {/* Tweet category */}
              {tweet.tweet_category && (
                <div className="mb-2 sm:mb-3">
                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-accent-brand/20 text-accent-brand border border-accent-brand/30">
                    <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {tweet.tweet_category}
                  </span>
                </div>
              )}

              {/* Tweet metrics */}
              <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-400">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{formatNumber(tweet.view_count)}</span>
                </div>
                <button
                  className="flex items-center gap-1 sm:gap-1.5 hover:text-red-500 transition-colors group"
                  onClick={() => likeTweet(tweet.tweet_id)}
                >
                  <Heart className="w-3 h-3 sm:w-4 sm:h-4 group-hover:fill-red-500 transition-colors" />
                  <span>{formatNumber(tweet.like_count)}</span>
                </button>
                <button
                  className="flex items-center gap-1 sm:gap-1.5 hover:text-blue-500 transition-colors group"
                  onClick={() => replyTweet(tweet.tweet_id)}
                >
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 group-hover:fill-blue-500 transition-colors" />
                  <span>{formatNumber(tweet.reply_count)}</span>
                </button>
                <button
                  className="flex items-center gap-1 sm:gap-1.5 hover:text-green-500 transition-colors group"
                  onClick={() => retweetTweet(tweet.tweet_id)}
                >
                  <Repeat2 className="w-3 h-3 sm:w-4 sm:h-4 transition-colors" />
                  <span>{formatNumber(tweet.retweet_count)}</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Intersection Observer Target */}
        <div ref={observerTarget} className="h-4" aria-hidden="true" />

        {/* Loading indicator at bottom */}
        {loading && tweets.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 py-3 sm:py-4 bg-gradient-to-t from-gray-900 to-transparent">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="inline-block h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-accent-brand border-t-transparent"></div>
              <span className="text-xs sm:text-sm text-gray-400">
                Loading more tweets...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading && tweets.length === 0 && (
        <div className="text-center py-6 sm:py-8">
          <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-400 text-xs sm:text-sm">
            No tweets found for this time period
          </p>
        </div>
      )}
    </div>
  );
}
