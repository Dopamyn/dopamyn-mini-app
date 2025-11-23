"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronLeft, ChevronRight, Eye, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// Add debounce function at the top level
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface KOL {
  author_handle: string;
  name: string;
  score: number;
  followers: number;
  smart_followers: number;
  avg_views: number;
  profile_image_url: string;
}

interface LeaderboardResponse {
  result: {
    data: KOL[];
    total: number;
    start: number;
    limit: number;
  };
  message: string;
}

const ITEMS_PER_PAGE = 50;

export default function KOLsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [kols, setKols] = useState<KOL[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<boolean | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [minCharMessage, setMinCharMessage] = useState<string>("");

  const fetchKOLs = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const start = (page - 1) * ITEMS_PER_PAGE;

      const response = await fetch(
        "https://api.dopamyn.fun/user/get-score-leaderboard",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: start,
            limit: ITEMS_PER_PAGE,
            author_handle: "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: LeaderboardResponse = await response.json();
      setKols(data.result.data);
      setTotalItems(data.result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch KOLs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchResult) {
      fetchKOLs(currentPage);
    }
  }, [currentPage, searchResult]);

  const searchAuthors = async (term: string) => {
    if (!term.trim() || term.trim().length < 4) {
      setSearchResult(null);
      setMinCharMessage(
        term.trim() ? "Please enter at least 4 characters to search" : ""
      );
      return;
    }

    setMinCharMessage("");
    setSearchLoading(true);
    try {
      const response = await fetch(
        "https://api.dopamyn.fun/user/get-score-leaderboard",
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            start: 0,
            limit: ITEMS_PER_PAGE,
            author_handle: term.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: LeaderboardResponse = await response.json();

      if (data.result.data.length > 0) {
        setKols(data.result.data);
        setTotalItems(data.result.total);
        setSearchResult(true);
      } else {
        setKols([]);
        setTotalItems(0);
        setSearchResult(null);
      }
    } catch (err) {
      console.error("Error searching authors:", err);
      setKols([]);
      setTotalItems(0);
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => searchAuthors(term), 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) {
      setSearchResult(null);
      setMinCharMessage("");
      fetchKOLs(1);
    } else if (value.trim().length < 4) {
      setMinCharMessage("Please enter at least 4 characters to search");
    } else {
      debouncedSearch(value);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResult(null);
    setCurrentPage(1);
    fetchKOLs(1);
  };

  const displayedKols = kols;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || "0";
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return "text-accent-brand";
    if (score >= 4.0) return "text-yellow-400";
    return "text-red-400";
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/landingPageBg.png')] bg-cover bg-no-repeat pt-16 md:pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-accent-brand" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-100">
                KOL Leaderboard
              </h1>
            </div>

            {/* Search Input */}
            <div className="flex flex-col gap-2 w-full sm:w-96">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={
                    isMobile
                      ? "Search username..."
                      : "Search by username (min. 4 characters)..."
                  }
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-neutral-800 border-b border-gray-700 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent-brand transition-colors text-sm sm:text-base"
                />
                {searchLoading && (
                  <div className="absolute right-24 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-brand"></div>
                  </div>
                )}
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="px-3 sm:px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    disabled={searchLoading}
                  >
                    Clear
                  </button>
                )}
              </div>
              {minCharMessage && (
                <div className="text-xs sm:text-sm text-amber-400 mt-1">
                  {minCharMessage}
                </div>
              )}
            </div>
          </div>
          <p className="text-sm sm:text-base text-gray-400 mb-4">
            Discover and join active Web3 marketing campaigns scores
          </p>
        </div>

        {/* Content */}
        <div className="">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brand"></div>
              <span className="ml-3 text-sm sm:text-base text-gray-300">
                Loading KOLs...
              </span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 font-semibold text-sm sm:text-base mb-2">
                Error Loading KOLs
              </div>
              <div className="text-gray-400 text-xs sm:text-sm mb-4">
                {error}
              </div>
              <button
                onClick={() => fetchKOLs(currentPage)}
                className="btn-primary"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-4rem)] -mx-4 sm:mx-0">
                <div className="min-w-[800px] px-4 sm:px-0">
                  <table className="w-full">
                    <thead className="bg-[#2B3C39f3] border-b border-gray-700 rounded-md sticky top-0">
                      <tr className="">
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          KOL
                        </th>
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Followers
                        </th>
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Smart Followers
                        </th>
                        <th className="px-3 sm:px-6 py-4 sm:py-6 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Avg Views
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-none">
                      {displayedKols.map((kol, index) => {
                        const rank =
                          (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                        return (
                          <tr
                            key={kol.author_handle}
                            className="hover:bg-[#2B3C3933] hover:cursor-pointer transition-colors group cursor-pointer"
                            onClick={() => {
                              router.push(`/kols/${kol.author_handle}`);
                            }}
                          >
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                              <span className="text-gray-200 border border-neutral-600 rounded-md px-2 py-1 bg-neutral-600 text-xs font-semibold">
                                {rank}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  src={kol.profile_image_url}
                                  alt={kol.name}
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-3 ring-2 ring-transparent group-hover:ring-accent-brand/50 transition-all"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "/placeholder.svg?height=40&width=40";
                                  }}
                                />
                                <div>
                                  <Link
                                    href={`/kols/${kol.author_handle}`}
                                    className="text-xs sm:text-sm font-medium text-gray-200 hover:text-accent-brand transition-colors"
                                  >
                                    {kol.name}
                                  </Link>
                                  <div className="text-xs text-gray-500">
                                    @{kol.author_handle}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 mr-1" />
                                <span
                                  className={`text-xs sm:text-sm font-semibold ${getScoreColor(
                                    kol.score
                                  )}`}
                                >
                                  {kol.score.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-[#DFFCF699] text-center">
                              {formatNumber(kol.followers)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-200 text-center">
                              {formatNumber(kol.smart_followers)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center text-xs sm:text-sm text-gray-200 justify-center">
                                <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mr-1" />
                                {formatNumber(kol.avg_views)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {!searchResult && (
                <div className="px-3 sm:px-6 py-4 border-t border-neutral-700">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-gray-400 order-2 sm:order-1">
                      Showing {startItem}-{endItem} of{" "}
                      {formatNumber(totalItems)} results
                    </div>

                    <div className="flex items-center gap-2 order-1 sm:order-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-600 rounded hover:bg-gray-700 hover:border-accent-brand/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-300"
                      >
                        <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {!isMobile && "Previous"}
                      </button>

                      <div className="flex items-center gap-1">
                        {[...Array(Math.min(isMobile ? 3 : 5, totalPages))].map(
                          (_, i) => {
                            let pageNum;
                            const maxVisible = isMobile ? 3 : 5;
                            if (totalPages <= maxVisible) {
                              pageNum = i + 1;
                            } else if (
                              currentPage <= Math.ceil(maxVisible / 2)
                            ) {
                              pageNum = i + 1;
                            } else if (
                              currentPage >=
                              totalPages - Math.floor(maxVisible / 2)
                            ) {
                              pageNum = totalPages - (maxVisible - 1) + i;
                            } else {
                              pageNum =
                                currentPage - Math.floor(maxVisible / 2) + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border rounded transition-colors ${
                                  currentPage === pageNum
                                    ? "bg-accent-brand text-gray-900 border-accent-brand"
                                    : "border-gray-600 hover:bg-gray-700 hover:border-accent-brand/50 text-gray-300"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm border border-gray-600 rounded hover:bg-gray-700 hover:border-accent-brand/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-300"
                      >
                        {!isMobile && "Next"}
                        <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
