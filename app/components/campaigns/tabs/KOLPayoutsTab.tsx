"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCompactNumber } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface KOLPayoutsTabProps {}

interface PayoutSummary {
  total_task_ids: number;
  total_users: number;
  total_tokens_earned: number;
  completed_tasks: number;
  pending_tasks: number;
}

interface UserQuestTask {
  name: string;
  profile_image_url: string;
  user_x_handle: string;
  followers_count: number;
  smart_followers_count: number;
  engagement_score: number;
  task_status: string;
  created_at: string;
  updated_at: string;
  tx_hash: string | null;
  tokens_earned: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    summary: PayoutSummary;
    user_quest_tasks: UserQuestTask[];
    has_more: boolean;
  };
  message: string;
}

interface PayoutData {
  summary: PayoutSummary;
  user_quest_tasks: UserQuestTask[];
  has_more: boolean;
}

export default function KOLPayoutsTab() {
  const params = useParams();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("payment_status");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(0);
  const [apiCallInProgress, setApiCallInProgress] = useState(false);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        setApiCallInProgress(true);
        setLoading(true);
        setError(null);

        // Get the token from localStorage
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const start = currentPage * PAGE_SIZE;
        const response = await fetch(
          `/api/quests/${params.questId}/payouts?start=${start}&limit=${PAGE_SIZE}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch payouts: ${response.statusText}`);
        }

        const responseData: ApiResponse = await response.json();

        // Validate the response data structure
        if (
          !responseData?.success ||
          !responseData?.data?.summary ||
          !responseData?.data?.user_quest_tasks
        ) {
          throw new Error("Invalid data format received from server");
        }

        setPayouts(responseData.data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch payouts";
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

    if (!apiCallInProgress) {
      fetchPayouts();
    }
  }, [params.questId, currentPage]);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        {/* Skeleton Filters */}
        {/* <div className="bg-gradient-to-br from-[#0F3F2E]/30 to-[#0F3F2E]/10 rounded-lg p-6 mb-8 border border-[#155748]/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((section) => (
              <div key={section} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-brand animate-pulse"></div>
                  <div className="h-4 bg-[#155748]/30 rounded animate-pulse w-24"></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((btn) => (
                    <div
                      key={btn}
                      className="h-8 bg-[#155748]/30 rounded animate-pulse w-24"
                    ></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Skeleton Table */}
        <div className="rounded-md border border-[#155748]/30">
          <div className="p-4">
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-8 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
                  <div
                    key={col}
                    className="h-4 bg-[#155748]/30 rounded animate-pulse"
                  ></div>
                ))}
              </div>
              {/* Table Rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="grid grid-cols-8 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
                    <div
                      key={col}
                      className="h-10 bg-[#155748]/20 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#155748]/30">
          <div className="h-4 bg-[#155748]/30 rounded animate-pulse w-48"></div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-[#155748]/30 rounded animate-pulse w-20"></div>
            <div className="h-8 bg-[#155748]/30 rounded animate-pulse w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setCurrentPage(0);
    setError(null);
    setLoading(true);
    setApiCallInProgress(false);
  };

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
              <h3 className="text-lg font-medium text-[#DFFCF6] mb-2">
                Failed to Load KOL Data
              </h3>
              <p className="text-sm text-[#DFFCF6]/60 mb-4">{error}</p>
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
                  className="px-4 py-2 rounded-lg bg-[#155748]/30 text-[#DFFCF6] font-medium hover:bg-[#155748]/40 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
            <div className="text-xs text-[#DFFCF6]/40 max-w-md">
              If the problem persists, please check your network connection or
              contact support.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  return (
    <div className="p-4 space-y-6">
      {payouts?.summary && payouts?.user_quest_tasks && (
        <>
          {/* Filters */}
          {/* <div className="bg-gradient-to-br from-[#0F3F2E]/30 to-[#0F3F2E]/10 rounded-lg p-6 mb-8 border border-[#155748]/20 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-brand"></div>
                  <div className="text-[#DFFCF6] text-sm font-medium">
                    Task Status
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "completed", "under_review", "pending", "todo"].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => setTaskStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                          taskStatusFilter === status
                            ? "bg-accent-brand text-black shadow-lg shadow-accent-brand/20 scale-105 hover:scale-105"
                            : "bg-[#155748]/20 text-[#DFFCF6] hover:bg-[#155748]/40 hover:scale-105"
                        }`}
                      >
                        {status === "all"
                          ? "All Tasks"
                          : status.replace("_", " ").toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-brand"></div>
                  <div className="text-[#DFFCF6] text-sm font-medium">
                    Payment Status
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", "paid", "pending"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setPaymentStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        paymentStatusFilter === status
                          ? "bg-accent-brand text-black shadow-lg shadow-accent-brand/20 scale-105 hover:scale-105"
                          : "bg-[#155748]/20 text-[#DFFCF6] hover:bg-[#155748]/40 hover:scale-105"
                      }`}
                    >
                      {status === "all" ? "All Payments" : status.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div> */}

          {/* Users Table */}
          <div className="rounded-lg border border-[#155748]/30 overflow-hidden bg-gradient-to-br from-[#0F3F2E]/10 to-transparent backdrop-blur-sm">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-[#155748]/30 hover:bg-transparent">
                  <TableHead className="text-[#DFFCF6] font-medium py-4 pl-6">
                    <div className="flex items-center gap-2">Rank</div>
                  </TableHead>
                  <TableHead className="text-[#DFFCF6] font-medium py-4">
                    <div className="flex items-center gap-2">User</div>
                  </TableHead>
                  <TableHead className="text-[#DFFCF6] font-medium text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      Followers
                    </div>
                  </TableHead>
                  <TableHead className="text-[#DFFCF6] font-medium text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      Smart Followers
                    </div>
                  </TableHead>
                  <TableHead className="text-[#DFFCF6] font-medium text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      Average Views
                    </div>
                  </TableHead>
                  <TableHead className="text-[#DFFCF6] font-medium text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      Task Status
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[#DFFCF6] font-medium text-right py-4 cursor-pointer group"
                    onClick={() => handleSort("payment_status")}
                  >
                    <div className="flex items-center justify-end gap-2 group-hover:text-accent-brand transition-colors">
                      Payment Status
                      {sortField === "payment_status" && (
                        <span className="text-accent-brand ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-[#DFFCF6] font-medium text-center py-4 pr-6 cursor-pointer group"
                    onClick={() => handleSort("updated")}
                  >
                    <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand transition-colors">
                      Payment Date
                      {sortField === "updated" && (
                        <span className="text-accent-brand ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  if (loading) {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-brand"></div>
                            <p className="text-[#DFFCF6] opacity-70">
                              Loading KOL data...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (!payouts?.user_quest_tasks) {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-[#DFFCF6] opacity-70">
                            No data available.
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // Apply task status filtering
                  let filteredTasks = payouts.user_quest_tasks;
                  if (taskStatusFilter !== "all") {
                    filteredTasks = filteredTasks.filter(
                      (task) => task.task_status === taskStatusFilter
                    );
                  }

                  // Apply payment status filtering
                  if (paymentStatusFilter !== "all") {
                    filteredTasks = filteredTasks.filter((task) => {
                      const isPaid =
                        task.task_status === "completed" && task.tx_hash;
                      return paymentStatusFilter === "paid" ? isPaid : !isPaid;
                    });
                  }

                  // Apply sorting
                  const sortedTasks = [...filteredTasks].sort((a, b) => {
                    if (sortField === "tokens_earned") {
                      return sortDirection === "asc"
                        ? a.tokens_earned - b.tokens_earned
                        : b.tokens_earned - a.tokens_earned;
                    } else if (sortField === "status") {
                      return sortDirection === "asc"
                        ? a.task_status.localeCompare(b.task_status)
                        : b.task_status.localeCompare(a.task_status);
                    } else if (sortField === "payment_status") {
                      const aIsPaid =
                        a.task_status === "completed" && a.tx_hash;
                      const bIsPaid =
                        b.task_status === "completed" && b.tx_hash;
                      if (aIsPaid === bIsPaid) {
                        // If payment status is the same, sort by updated date
                        const aDate = new Date(a.updated_at).getTime();
                        const bDate = new Date(b.updated_at).getTime();
                        return sortDirection === "asc"
                          ? aDate - bDate
                          : bDate - aDate;
                      }
                      return sortDirection === "asc"
                        ? aIsPaid
                          ? 1
                          : -1
                        : aIsPaid
                        ? -1
                        : 1;
                    } else {
                      const aDate = new Date(a.updated_at).getTime();
                      const bDate = new Date(b.updated_at).getTime();
                      return sortDirection === "asc"
                        ? aDate - bDate
                        : bDate - aDate;
                    }
                  });

                  // No need for pagination here since we're using backend pagination
                  const paginatedTasks = sortedTasks;

                  if (paginatedTasks.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-[#DFFCF6] opacity-70">
                            {currentPage === 0
                              ? "No users found for this quest."
                              : "No users found on this page."}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return paginatedTasks.map((task, index) => (
                    <TableRow
                      key={index}
                      className={`border-[#155748]/30 group transition-all duration-200 ${
                        task.task_status === "completed"
                          ? "bg-gradient-to-r from-[#0F3F2E]/20 to-[#044d39]/10 hover:from-[#0F3F2E]/30 hover:to-[#044d39]/20"
                          : "hover:bg-[#0F3F2E]/20"
                      }`}
                    >
                      <TableCell className="text-[#DFFCF6] font-medium pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-accent-brand opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          #{currentPage * PAGE_SIZE + index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-accent-brand/30 group-hover:border-accent-brand/50 transition-colors">
                            <Image
                              src={task.profile_image_url}
                              alt={task.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                target.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent-brand to-[#00B377] flex items-center justify-center text-[#060F11] text-base font-semibold">
                              {task.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-[#DFFCF6] group-hover:text-accent-brand transition-colors">
                              {task.name}
                            </div>
                            <div className="text-sm text-accent-brand opacity-80 group-hover:opacity-100">
                              @{task.user_x_handle}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <span className="text-[#DFFCF6] font-medium group-hover:text-accent-brand transition-colors">
                          {formatCompactNumber(task.followers_count)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <span className="text-[#DFFCF6] font-medium group-hover:text-accent-brand transition-colors">
                          {formatCompactNumber(task.smart_followers_count)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <span className="text-[#DFFCF6] font-medium group-hover:text-accent-brand transition-colors">
                          {formatCompactNumber(task.engagement_score)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium px-3 py-1 ${
                            task.task_status === "completed"
                              ? "bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20"
                              : task.task_status === "under_review"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:bg-yellow-500/20"
                              : "bg-gray-500/10 text-gray-400 border-gray-500/20 group-hover:bg-gray-500/20"
                          } transition-colors`}
                        >
                          {task.task_status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        {task.task_status === "completed" && task.tx_hash ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-[#66E2C1] font-medium group-hover:text-accent-brand transition-colors">
                              {task.tokens_earned / 1e6} PAID
                            </span>
                            {task.tx_hash && (
                              <a
                                href={`https://basescan.org/tx/${task.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent-brand opacity-80 hover:opacity-100 transition-all"
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
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium px-3 py-1 ${
                                task.task_status === "completed"
                                  ? "bg-green-500/10 text-green-400 border-green-500/20 group-hover:bg-green-500/20"
                                  : task.task_status === "under_review"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 group-hover:bg-yellow-500/20"
                                  : "bg-gray-500/10 text-gray-400 border-gray-500/20 group-hover:bg-gray-500/20"
                              } transition-colors`}
                            >
                              {task.task_status === "completed"
                                ? `${task.tokens_earned / 1e6} PENDING`
                                : task.task_status
                                    .replace("_", " ")
                                    .toUpperCase()}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-4 pr-6">
                        <span className="text-xs text-[#DFFCF6]/60 group-hover:text-[#DFFCF6] transition-colors">
                          {task.task_status === "completed"
                            ? formatDate(task.updated_at)
                            : "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-t border-[#155748]/30 bg-gradient-to-br from-[#0F3F2E]/10 to-transparent">
            <div className="flex items-center text-sm text-[#DFFCF6]/80 mb-4 sm:mb-0">
              <div className="flex items-center gap-2">
                Showing {currentPage * PAGE_SIZE + 1} to{" "}
                {currentPage * PAGE_SIZE + payouts.user_quest_tasks.length}{" "}
                entries
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  currentPage === 0
                    ? "bg-[#0F3F2E]/20 text-[#DFFCF6]/30 cursor-not-allowed"
                    : "bg-[#0F3F2E]/20 text-[#DFFCF6] hover:bg-[#0F3F2E]/40 hover:scale-105"
                }`}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
                disabled={!payouts.has_more}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  !payouts.has_more
                    ? "bg-[#0F3F2E]/20 text-[#DFFCF6]/30 cursor-not-allowed"
                    : "bg-[#0F3F2E]/20 text-[#DFFCF6] hover:bg-[#0F3F2E]/40 hover:scale-105"
                }`}
              >
                Next
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
