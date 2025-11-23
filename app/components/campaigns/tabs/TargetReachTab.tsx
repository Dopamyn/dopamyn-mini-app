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
import { formatNumber } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function TargetReachTab() {
  const { toast } = useToast();
  const params = useParams();
  const [targetReachData, setTargetReachData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiCallInProgress, setApiCallInProgress] = useState(false);
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(0);
  const [authorDetails, setAuthorDetails] = useState<any>(null);
  const [allTargetReachData, setAllTargetReachData] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalKols, setTotalKols] = useState(0);

  const fetchQuestKols = async () => {
    try {
      setApiCallInProgress(true);
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const start = currentPage * PAGE_SIZE;
      const response = await fetch(
        `/api/quests/${params.questId}/target-reach?start=${start}&limit=${PAGE_SIZE}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch target reach data: ${response.statusText}`
        );
      }

      const responseData: any = await response.json();

      if (!responseData?.success || !responseData?.data) {
        throw new Error("Invalid data format received from server");
      }

      setTargetReachData(responseData.data.handles);
      setHasMore(responseData.data.has_more);
      setTotalKols(responseData.data.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to fetch target reach data";
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
    if (!apiCallInProgress) {
      fetchQuestKols();
    }
  }, [currentPage]);

  useEffect(() => {
    fetchAuthorDetails();
  }, [targetReachData]);

  const fetchAuthorDetails = async () => {
    if (!targetReachData) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/user/alpha-details`, {
        method: "POST",
        body: JSON.stringify({
          authorHandles: targetReachData,
          start: 0, // Always start from 0 to get all users
          limit: targetReachData.length, // Get all users
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Store all data and implement client-side pagination
      setAllTargetReachData(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch author details";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setCurrentPage(0);
    setError(null);
    setLoading(true);
    setApiCallInProgress(false);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-light-primary"></div>
          <p className="text-light-primary opacity-70">
            Loading target reach data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-lg border border-red-500/20">
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
                Failed to Load Target Reach Data
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
                  className="px-4 py-2 rounded-lg bg-[#155748]/30 text-light-primary font-medium hover:bg-[#155748]/40 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
            <div className="text-xs text-light-primary/40 max-w-md">
              If the problem persists, please check your network connection or
              contact support.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <TabsContent value="target_reach">
        <Card className="bg-transparent border-[#1E2A28]/50 p-6 pt-0">
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-light-primary mx-auto mb-4" />
                <p className="text-light-primary">
                  Loading target reach data...
                </p>
              </div>
            ) : allTargetReachData ? (
              <div>
                {/* Display the target reach data in table format */}
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <div className="min-w-[800px] sm:w-full sm:p-0">
                    <Table className="w-full rounded-lg border border-[#155748]/30 overflow-hidden bg-gradient-to-br from-[#0F3F2E]/10 to-transparent backdrop-blur-sm">
                      <TableHeader>
                        <TableRow className="border-[#155748]/30 hover:bg-transparent">
                          <TableHead className="text-light-primary font-medium py-4 pl-6 w-[80px]">
                            <div className="flex items-center gap-2">Rank</div>
                          </TableHead>
                          <TableHead className="text-light-primary font-medium py-4 min-w-[200px]">
                            <div className="flex items-center gap-2">User</div>
                          </TableHead>
                          <TableHead className="text-light-primary font-medium text-center py-4 w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="hidden sm:inline">
                                Followers
                              </span>
                              <span className="sm:hidden">Flwrs</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-light-primary font-medium text-center py-4 w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="hidden sm:inline">
                                Smart Followers
                              </span>
                              <span className="sm:hidden">Smart</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-light-primary font-medium text-center py-4 w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="hidden sm:inline">
                                Avg Views (30d)
                              </span>
                              <span className="sm:hidden">Views</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-light-primary font-medium text-center py-4 w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span className="hidden sm:inline">
                                Crypto Tweets
                              </span>
                              <span className="sm:hidden">Crypto</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTargetReachData.result.map(
                          (user: any, index: number) => (
                            <TableRow
                              key={index}
                              className="border-[#155748]/30 group transition-all duration-200 hover:bg-[#0F3F2E]/20"
                            >
                              <TableCell className="text-light-primary font-medium pl-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-accent-brand opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  #{currentPage * PAGE_SIZE + index + 1}
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-4">
                                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-light-primary/30 group-hover:border-light-primary/50 transition-colors flex-shrink-0">
                                    <img
                                      src={user.profile_image_url}
                                      alt={user.name}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        target.nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                    {/* Fallback avatar */}
                                    <div className="h-full w-full rounded-full bg-gradient-to-br from-accent-brand to-[#00B377] flex items-center justify-center text-[#060F11] text-base font-semibold hidden">
                                      {user.name?.charAt(0)?.toUpperCase() ||
                                        "?"}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-light-primary group-hover:text-light-primary transition-colors truncate">
                                      {user.name || "Unknown"}
                                    </div>
                                    <div className="text-sm text-light-primary opacity-80 group-hover:opacity-100 truncate">
                                      @{user.author_handle}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                  {formatNumber(
                                    parseInt(user.followers_count || "0")
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                  {formatNumber(
                                    parseInt(user.smart_followers_count || "0")
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                  {formatNumber(
                                    parseInt(
                                      user.tweets_distribution
                                        ?.average_views_30day || "0"
                                    )
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-center py-4">
                                <span className="text-light-primary font-medium group-hover:text-light-primary transition-colors">
                                  {user.crypto_tweets_all || "0"}
                                </span>
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {/* Pagination Controls */}
                <div className="flex flex-col items-center justify-center gap-4 px-4 sm:px-6 py-6 border-t border-[#155748]/30 bg-gradient-to-br from-[#0F3F2E]/10 to-transparent">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      disabled={currentPage === 0}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        currentPage === 0
                          ? "bg-[#0F3F2E]/20 text-light-primary/30 cursor-not-allowed"
                          : "bg-[#0F3F2E]/30 text-light-primary hover:bg-[#0F3F2E]/50 active:scale-95"
                      }`}
                      aria-label="Previous page"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>

                    <div className="flex items-center justify-center min-w-[100px] h-10 px-4 rounded-full bg-[#0F3F2E]/30 text-light-primary">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{currentPage + 1}</span>
                        <span className="text-light-primary/50">/</span>
                        <span className="text-light-primary/70">
                          {Math.ceil(totalKols / PAGE_SIZE)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      disabled={!hasMore}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        !hasMore
                          ? "bg-[#0F3F2E]/20 text-light-primary/30 cursor-not-allowed"
                          : "bg-[#0F3F2E]/30 text-light-primary hover:bg-[#0F3F2E]/50 active:scale-95"
                      }`}
                      aria-label="Next page"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>

                  <div className="text-sm text-light-primary/60">
                    {currentPage * PAGE_SIZE + 1}-
                    {Math.min((currentPage + 1) * PAGE_SIZE, totalKols)} of{" "}
                    {totalKols} KOLs
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-light-primary mb-4">
                  Target reach analytics and data will be displayed here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </div>
  );
}
