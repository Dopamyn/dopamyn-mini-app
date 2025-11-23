"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  BarChart,
  BarChart3,
  Calendar,
  Download,
  Search,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface MindshareData {
  tweet_id: string;
  author_handle: string;
  tweet_create_time: string;
  evaluation_timestamp: string;
  body: string;
  project_name: string;
  content_quality_score: number;
  engagement_score: number;
  relevance_score: number;
  final_score: number;
  view_count: number;
  like_count: number;
  retweet_count: number;
  reply_count: number;
  rn: number;
}

interface MindshareResponse {
  result: {
    project_name: string;
    author_handle: string;
    period: string;
    limit: number;
    offset: number;
    results: MindshareData[];
  };
  message: string;
}

interface CampaignDetails {
  project_handle?: string;
  target_token_symbol?: string;
  campaign_name?: string;
}

export default function AdminResearchPage() {
  const { toast } = useToast();

  // State management
  const [projectName, setProjectName] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [period, setPeriod] = useState("30d");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  // Campaign details state
  const [campaignDetails, setCampaignDetails] = useState<CampaignDetails>({});

  // Search history
  const [searchHistory, setSearchHistory] = useState<
    Array<{
      projectName: string;
      authorHandle: string;
      period: string;
      timestamp: Date;
    }>
  >([]);

  // Data and loading states
  const [mindshareData, setMindshareData] = useState<MindshareData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalTweets: 0,
    avgContentQuality: 0,
    avgEngagement: 0,
    avgRelevance: 0,
    avgFinalScore: 0,
    totalViews: 0,
    totalLikes: 0,
    totalRetweets: 0,
    totalReplies: 0,
    scoreDistribution: {
      excellent: 0, // 4+
      good: 0, // 3-3.99
      average: 0, // 2-2.99
      poor: 0, // <2
    },
    topPerformingTweets: [] as MindshareData[],
  });

  const periods = [
    { value: "1d", label: "1 Day" },
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
  ];

  // Function to fetch campaign details
  const fetchCampaignDetails = async (projectName: string) => {
    if (!projectName.trim()) return;

    try {
      // Search for campaigns by project name
      const response = await fetch("/api/campaigns/get-campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target_x_handle: projectName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result && data.result.length > 0) {
          const campaign = data.result[0];
          setCampaignDetails({
            project_handle: campaign.project_handle || campaign.target_x_handle,
            target_token_symbol: campaign.target_token_symbol,
            campaign_name: campaign.campaign_name,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching campaign details:", error);
    }
  };

  // Function to handle X search redirect
  const handleXSearch = () => {
    if (!authorHandle.trim()) return;

    const projectHandle = campaignDetails.project_handle || projectName.trim();
    const tokenSymbol = campaignDetails.target_token_symbol || "";
    const campaignName = campaignDetails.campaign_name || "";

    let url = `https://x.com/search?q=(%40${projectHandle.trim()}%20OR%20${campaignName})%20from%3A${authorHandle.trim()}&src=typed_query&f=live`;

    if (tokenSymbol) {
      url = `https://x.com/search?q=(%40${projectHandle.trim()}%20OR%20%24${tokenSymbol}%20OR%20${campaignName})%20from%3A${authorHandle.trim()}&src=typed_query&f=live`;
    }

    window.open(url, "_blank");
  };

  const fetchMindshareData = async (isLoadMore = false) => {
    if (!projectName.trim() || !authorHandle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both project name and author handle.",
        variant: "destructive",
      });
      return;
    }

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await fetch(
        `/api/mindshare/raw_data/${encodeURIComponent(
          projectName.trim()
        )}/${encodeURIComponent(
          authorHandle.trim()
        )}?period=${period}&limit=${limit}&offset=${isLoadMore ? offset : 0}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: MindshareResponse = await response.json();

      if (isLoadMore) {
        // Append new data to existing data
        setMindshareData((prev) => [...prev, ...data.result.results]);
        setOffset((prev) => prev + limit);
        setHasMoreData(data.result.results.length === limit);
      } else {
        // Replace data for new search
        setMindshareData(data.result.results);
        setOffset(limit);
        setHasMoreData(data.result.results.length === limit);
      }

      setHasSearched(true);

      // Calculate analytics with all data
      const allData = isLoadMore
        ? [...mindshareData, ...data.result.results]
        : data.result.results;
      calculateAnalytics(allData);

      // Save to search history (only for new searches)
      if (!isLoadMore) {
        const newSearch = {
          projectName: projectName.trim(),
          authorHandle: authorHandle.trim(),
          period,
          timestamp: new Date(),
        };
        setSearchHistory((prev) => {
          const filtered = prev.filter(
            (s) =>
              !(
                s.projectName === newSearch.projectName &&
                s.authorHandle === newSearch.authorHandle &&
                s.period === newSearch.period
              )
          );
          return [newSearch, ...filtered].slice(0, 10); // Keep last 10 searches
        });

        toast({
          title: "Data Retrieved",
          description: `Found ${data.result.results.length} tweets for analysis.`,
        });
      }
    } catch (error) {
      console.error("Error fetching mindshare data:", error);
      if (!isLoadMore) {
        toast({
          title: "Error",
          description: "Failed to fetch mindshare data. Please try again.",
          variant: "destructive",
        });
        setMindshareData([]);
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  const calculateAnalytics = (data: MindshareData[]) => {
    if (data.length === 0) {
      setAnalytics({
        totalTweets: 0,
        avgContentQuality: 0,
        avgEngagement: 0,
        avgRelevance: 0,
        avgFinalScore: 0,
        totalViews: 0,
        totalLikes: 0,
        totalRetweets: 0,
        totalReplies: 0,
        scoreDistribution: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0,
        },
        topPerformingTweets: [],
      });
      return;
    }

    const totalTweets = data.length;
    const avgContentQuality =
      data.reduce((sum, item) => sum + item.content_quality_score, 0) /
      totalTweets;
    const avgEngagement =
      data.reduce((sum, item) => sum + item.engagement_score, 0) / totalTweets;
    const avgRelevance =
      data.reduce((sum, item) => sum + item.relevance_score, 0) / totalTweets;
    const avgFinalScore =
      data.reduce((sum, item) => sum + item.final_score, 0) / totalTweets;
    const totalViews = data.reduce((sum, item) => sum + item.view_count, 0);
    const totalLikes = data.reduce((sum, item) => sum + item.like_count, 0);
    const totalRetweets = data.reduce(
      (sum, item) => sum + item.retweet_count,
      0
    );
    const totalReplies = data.reduce((sum, item) => sum + item.reply_count, 0);

    // Calculate score distribution
    const scoreDistribution = {
      excellent: data.filter((item) => item.final_score >= 4).length,
      good: data.filter((item) => item.final_score >= 3 && item.final_score < 4)
        .length,
      average: data.filter(
        (item) => item.final_score >= 2 && item.final_score < 3
      ).length,
      poor: data.filter((item) => item.final_score < 2).length,
    };

    // Get top performing tweets (top 5 by final score)
    const topPerformingTweets = [...data]
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, 5);

    setAnalytics({
      totalTweets,
      avgContentQuality: Number(avgContentQuality.toFixed(2)),
      avgEngagement: Number(avgEngagement.toFixed(2)),
      avgRelevance: Number(avgRelevance.toFixed(2)),
      avgFinalScore: Number(avgFinalScore.toFixed(2)),
      totalViews,
      totalLikes,
      totalRetweets,
      totalReplies,
      scoreDistribution,
      topPerformingTweets,
    });
  };

  const handleSearch = () => {
    setOffset(0); // Reset offset when searching
    setHasMoreData(true);
    fetchMindshareData(false);

    // Fetch campaign details when searching
    fetchCampaignDetails(projectName);
  };

  // Scroll detection for lazy loading
  const handleScroll = () => {
    if (isLoadingMore || !hasMoreData || !hasSearched) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Load more when user is near bottom (within 100px)
    if (scrollTop + windowHeight >= documentHeight - 100) {
      fetchMindshareData(true);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    if (hasSearched && hasMoreData) {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [hasSearched, hasMoreData, isLoadingMore]);

  const formatDate = (dateString: string) => {
    return new Date(dateString + "Z").toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-500";
    if (score >= 3) return "text-yellow-500";
    if (score >= 2) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4) return "default";
    if (score >= 3) return "secondary";
    if (score >= 2) return "outline";
    return "destructive";
  };

  const exportToCSV = () => {
    if (mindshareData.length === 0) return;

    const headers = [
      "Tweet ID",
      "Author Handle",
      "Tweet Create Time",
      "Evaluation Timestamp",
      "Body",
      "Project Name",
      "Content Quality Score",
      "Engagement Score",
      "Relevance Score",
      "Final Score",
      "View Count",
      "Like Count",
      "Retweet Count",
      "Reply Count",
      "RN",
    ];

    const csvContent = [
      headers.join(","),
      ...mindshareData.map((tweet) =>
        [
          tweet.tweet_id,
          tweet.author_handle,
          tweet.tweet_create_time,
          tweet.evaluation_timestamp,
          `"${tweet.body.replace(/"/g, '""')}"`, // Escape quotes in tweet body
          tweet.project_name,
          tweet.content_quality_score,
          tweet.engagement_score,
          tweet.relevance_score,
          tweet.final_score,
          tweet.view_count,
          tweet.like_count,
          tweet.retweet_count,
          tweet.reply_count,
          tweet.rn,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `mindshare_data_${projectName}_${authorHandle}_${period}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Data Exported",
      description: "CSV file has been downloaded successfully.",
    });
  };

  const loadPreviousSearch = (search: (typeof searchHistory)[0]) => {
    setProjectName(search.projectName);
    setAuthorHandle(search.authorHandle);
    setPeriod(search.period);
    setOffset(0);
    setHasMoreData(true);
    // Auto-search with the loaded parameters
    setTimeout(() => fetchMindshareData(false), 100);
  };

  return (
    <div className="bg-[url('/landingPageBg.png')] bg-cover bg-no-repeat pt-20 md:pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-accent-brand" />
            Admin Research Dashboard
          </h1>
          <p className="text-gray-400">
            Search and analyze mindshare data for projects and authors
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8 bg-neutral-800/50 border-neutral-600 p-6 pt-0">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-accent-brand" />
              Search Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <Input
                  placeholder="e.g., decrypting_xyz"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-neutral-700 border-neutral-600 text-white placeholder-gray-400 focus:border-accent-brand"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Author Handle
                </label>
                <Input
                  placeholder="e.g., maintargaryen"
                  value={authorHandle}
                  onChange={(e) => setAuthorHandle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-neutral-700 border-neutral-600 text-white placeholder-gray-400 focus:border-accent-brand"
                  autoFocus
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Period
                    </label>
                    <Select
                      value={period}
                      onValueChange={setPeriod}
                      defaultValue="30d"
                    >
                      <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-700 border-neutral-600 text-white">
                        {periods.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleSearch}
                      disabled={
                        isLoading || !projectName.trim() || !authorHandle.trim()
                      }
                      className="bg-accent-brand text-black hover:bg-accent-brand/90 disabled:opacity-50 h-10 px-6"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                          Searching...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Search className="w-4 h-4" />
                          Search
                        </div>
                      )}
                    </Button>

                    <Button
                      onClick={handleXSearch}
                      disabled={!authorHandle.trim()}
                      variant="outline"
                      className="border-neutral-600 text-white hover:bg-neutral-700 disabled:opacity-50 h-10 px-4 ml-2"
                      title="Search X for this author's tweets about the project"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Dashboard */}
        {hasSearched && mindshareData.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-accent-brand" />
              Analytics Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Tweets</p>
                      <p className="text-2xl font-bold text-white">
                        {analytics.totalTweets}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Target className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">
                        Avg Content Quality
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {analytics.avgContentQuality}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Engagement</p>
                      <p className="text-2xl font-bold text-white">
                        {analytics.avgEngagement}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <BarChart className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Relevance</p>
                      <p className="text-2xl font-bold text-white">
                        {analytics.avgRelevance}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Avg Final Score</p>
                      <p className="text-2xl font-bold text-white">
                        {analytics.avgFinalScore}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardHeader>
                  <CardTitle className="text-white">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Content Quality:</span>
                      <Badge
                        variant="outline"
                        className="text-green-400 border-green-400"
                      >
                        {analytics.avgContentQuality}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Engagement Score:</span>
                      <Badge
                        variant="outline"
                        className="text-blue-400 border-blue-400"
                      >
                        {analytics.avgEngagement}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Relevance Score:</span>
                      <Badge
                        variant="outline"
                        className="text-purple-400 border-purple-400"
                      >
                        {analytics.avgRelevance}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    Engagement Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Views:</span>
                      <span className="text-white font-semibold">
                        {analytics.totalViews.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Likes:</span>
                      <span className="text-white font-semibold">
                        {analytics.totalLikes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Retweets:</span>
                      <span className="text-white font-semibold">
                        {analytics.totalRetweets.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Replies:</span>
                      <span className="text-white font-semibold">
                        {analytics.totalReplies.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
                <CardHeader>
                  <CardTitle className="text-white">
                    Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Excellent (4+):</span>
                      <Badge variant="default" className="bg-green-600">
                        {analytics.scoreDistribution.excellent}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Good (3-3.99):</span>
                      <Badge variant="secondary" className="bg-blue-600">
                        {analytics.scoreDistribution.good}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Average (2-2.99):</span>
                      <Badge
                        variant="outline"
                        className="text-yellow-400 border-yellow-400"
                      >
                        {analytics.scoreDistribution.average}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Poor (&lt;2):</span>
                      <Badge variant="destructive">
                        {analytics.scoreDistribution.poor}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && (
          <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-brand" />
                  Search Results
                  {mindshareData.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {mindshareData.length} tweets
                    </Badge>
                  )}
                </CardTitle>
                {mindshareData.length > 0 && (
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    className="border-neutral-600 text-white hover:bg-neutral-700 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : mindshareData.length > 0 ? (
                <div className="w-full">
                  <div className="border border-neutral-600 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto min-w-[1200px] scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800">
                      {/* Grid Header */}
                      <div className="grid grid-cols-12 gap-2 mb-2 px-6 py-4 bg-neutral-700/30 rounded-t-lg border-b border-neutral-600">
                        <div className="col-span-1 text-center min-w-[60px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Sr. No.
                          </span>
                        </div>
                        <div className="col-span-2 text-left min-w-[140px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Tweet ID
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[80px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Quality
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[80px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Engagement
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[80px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Relevance
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[80px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Final
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[70px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Views
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[70px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Likes
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[70px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            RTs
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[70px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Replies
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[100px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            Date
                          </span>
                        </div>
                        <div className="col-span-1 text-center min-w-[60px]">
                          <span className="text-gray-300 font-semibold text-sm">
                            RN
                          </span>
                        </div>
                      </div>

                      {/* Grid Rows */}
                      <div className="space-y-2">
                        {mindshareData.map((tweet, index) => (
                          <div
                            key={tweet.tweet_id}
                            className={`grid grid-cols-12 gap-2 p-4 rounded-lg border border-neutral-600 transition-all duration-200 hover:bg-neutral-700/30 ${
                              index % 2 === 0
                                ? "bg-neutral-800/20"
                                : "bg-neutral-800/40"
                            }`}
                          >
                            {/* Serial Number */}
                            <div className="col-span-1 flex items-center justify-center min-w-[60px]">
                              <span className="inline-flex items-center justify-center w-8 h-8 bg-neutral-700 rounded-full text-sm font-medium text-gray-300">
                                {index + 1}
                              </span>
                            </div>

                            {/* Tweet ID */}
                            <div className="col-span-2 flex items-center min-w-[140px]">
                              <div className="group relative">
                                <a
                                  href={`https://x.com/st/status/${tweet.tweet_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 cursor-pointer font-mono text-sm font-medium underline decoration-dotted hover:decoration-solid transition-all duration-200"
                                >
                                  {tweet.tweet_id}
                                </a>
                                {/* Hover Tooltip */}
                                <div className="absolute bottom-full left-0 mb-2 p-3 bg-neutral-800 border border-neutral-600 rounded-lg shadow-lg max-w-md z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  <div className="text-white text-sm mb-2">
                                    {tweet.body.length > 100
                                      ? `${tweet.body.substring(0, 100)}...`
                                      : tweet.body}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    <div>Author: @{tweet.author_handle}</div>
                                    <div>Project: {tweet.project_name}</div>
                                    <div>
                                      Created:{" "}
                                      {formatDate(tweet.tweet_create_time)}
                                    </div>
                                  </div>
                                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-800"></div>
                                </div>
                              </div>
                            </div>

                            {/* Content Quality */}
                            <div className="col-span-1 flex items-center justify-center min-w-[80px]">
                              <Badge
                                variant={getScoreBadgeVariant(
                                  tweet.content_quality_score
                                )}
                                className="font-medium text-xs"
                              >
                                {tweet.content_quality_score}
                              </Badge>
                            </div>

                            {/* Engagement Score */}
                            <div className="col-span-1 flex items-center justify-center">
                              <Badge
                                variant="outline"
                                className="text-blue-400 border-blue-400 font-medium text-xs"
                              >
                                {tweet.engagement_score}
                              </Badge>
                            </div>

                            {/* Relevance Score */}
                            <div className="col-span-1 flex items-center justify-center">
                              <Badge
                                variant="outline"
                                className="text-purple-400 border-purple-400 font-medium text-xs"
                              >
                                {tweet.relevance_score}
                              </Badge>
                            </div>

                            {/* Final Score */}
                            <div className="col-span-1 flex items-center justify-center">
                              <Badge
                                variant={getScoreBadgeVariant(
                                  tweet.final_score
                                )}
                                className="font-medium text-xs"
                              >
                                {tweet.final_score}
                              </Badge>
                            </div>

                            {/* Views */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {tweet.view_count.toLocaleString()}
                              </span>
                            </div>

                            {/* Likes */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {tweet.like_count.toLocaleString()}
                              </span>
                            </div>

                            {/* Retweets */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {tweet.retweet_count.toLocaleString()}
                              </span>
                            </div>

                            {/* Replies */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {tweet.reply_count.toLocaleString()}
                              </span>
                            </div>

                            {/* Date */}
                            <div className="col-span-1 flex items-center justify-center">
                              <span className="text-gray-400 text-xs font-medium">
                                {formatDate(tweet.tweet_create_time)}
                              </span>
                            </div>

                            {/* RN */}
                            <div className="col-span-1 flex items-center justify-center min-w-[60px]">
                              <span className="text-gray-500 text-xs font-medium">
                                {tweet.rn}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      {/* Lazy Loading Indicator */}
                      {isLoadingMore && (
                        <div className="mt-6 text-center py-4">
                          <div className="flex items-center justify-center gap-2 text-gray-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-brand"></div>
                            <span className="text-sm">
                              Loading more tweets...
                            </span>
                          </div>
                        </div>
                      )}

                      {/* End of data indicator */}
                      {!isLoadingMore &&
                        !hasMoreData &&
                        mindshareData.length > 0 && (
                          <div className="mt-6 text-center py-4 text-gray-500 text-sm">
                            No more tweets to load
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No data found</div>
                  <p className="text-sm text-gray-500">
                    Try adjusting your search parameters or check the project
                    name and author handle.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!hasSearched && !isLoading && (
          <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ready to Research
                </h3>
                <p className="text-gray-500 mb-4">
                  Enter a project name and author handle above to start
                  analyzing mindshare data.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    💡 Try searching for:{" "}
                    <code className="bg-neutral-700 px-2 py-1 rounded">
                      decrypting_xyz
                    </code>{" "}
                    /{" "}
                    <code className="bg-neutral-700 px-2 py-1 rounded">
                      maintargaryen
                    </code>
                  </p>
                  <p>📊 Available periods: 1d, 7d, 30d, 90d</p>
                  <p>🔍 Results can be exported to CSV for further analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && !hasSearched && (
          <Card className="bg-neutral-800/50 border-neutral-600 p-6 pt-0">
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent-brand mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Searching...
                </h3>
                <p className="text-gray-500">
                  Fetching mindshare data from the API...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
