"use client";

import { Card, CardContent } from "@/components/ui/card";
import TweetHoverLink from "@/components/TweetHoverLink";
import ProfileHoverLink from "@/components/ProfileHoverLink";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuestDetails, Quest, QuestTask, UserType } from "@/lib/types";
import { getTransactionUrl } from "@/lib/utils";
import { format } from "date-fns";
import {
  Trophy,
  Users,
  AlertTriangle,
  Gift,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getRequiredWalletForChain } from "@/lib/helper";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";
import QuestContentLab from "@/app/components/campaigns/QuestContentLab";

interface QuestDetailsTabProps {
  quest: QuestDetails;
  isUserEligible: (quest: Quest | QuestDetails) => boolean;
  getEligibilityReason: (quest: Quest | QuestDetails) => string | null;
  handleTaskStart: (taskId: string) => void;
  createTaskOnly?: (taskId: string) => Promise<void>;
  user?: UserType | null;
  questId: string;
  onQuestUpdate?: () => Promise<void>;
  onTaskStatusUpdate?: (updatedTasks: QuestTask[]) => void;
  login?: () => void;
  hasAta?: boolean | null;
}

// Enhanced Twitter Intent URL generator with better pre-filling and error handling
const getTwitterIntentUrl = (task: QuestTask, creatorHandle: string) => {
  const { task_type, task_follow_handle, task_tweet_id, target_author_handle } =
    task;

  // Use target_author_handle if available, otherwise fall back to task_follow_handle or creator handle
  const targetHandle =
    target_author_handle || task_follow_handle || creatorHandle;

  // Remove @ symbol if present in handle and ensure we have a valid handle
  const cleanHandle = targetHandle ? targetHandle.replace("@", "").trim() : "";

  switch (task_type) {
    case "follow":
      // Enhanced follow intent with better fallback
      if (!cleanHandle) {
        console.warn("No target handle found for follow task:", task);
        return "https://x.com";
      }
      return `https://x.com/intent/follow?screen_name=${cleanHandle}`;

    case "tweet":
      // Enhanced tweet intent with comprehensive pre-filling
      let tweetText = "";

      // Add cashtag if specified (with $ prefix)
      if (task.task_type === "tweet" && task.task_tweet_cashtag) {
        const cashtag = task.task_tweet_cashtag.startsWith("$")
          ? task.task_tweet_cashtag
          : `$${task.task_tweet_cashtag}`;
        tweetText += `${cashtag} `;
      }

      // Add hashtag if specified (with # prefix)
      if (task.task_type === "tweet" && task.task_tweet_hashtag) {
        const hashtag = task.task_tweet_hashtag.startsWith("#")
          ? task.task_tweet_hashtag
          : `#${task.task_tweet_hashtag}`;
        tweetText += `${hashtag} `;
      }

      // Add handle mention if specified (with @ prefix)
      if (task.task_type === "tweet" && task.task_tweet_handle) {
        const handle = task.task_tweet_handle.startsWith("@")
          ? task.task_tweet_handle
          : `@${task.task_tweet_handle}`;
        tweetText += `${handle} `;
      }

      // Add website if specified
      if (task.task_type === "tweet" && task.task_tweet_website) {
        tweetText += `${task.task_tweet_website} `;
      }

      // Add task description if specified (lowest priority)
      if (
        task.task_type === "tweet" &&
        task.task_description &&
        !task.task_tweet_handle
      ) {
        tweetText += `${task.task_description} `;
      }

      // Add target handle mention if no other specific content
      if (!tweetText.trim() && cleanHandle) {
        const handle = cleanHandle.startsWith("@")
          ? cleanHandle
          : `@${cleanHandle}`;
        tweetText += `${handle} `;
      }

      // Add some context to make tweets more engaging
      if (tweetText.trim()) {
        tweetText += "🚀";
      }

      const encodedText = encodeURIComponent(tweetText.trim());
      return `https://x.com/intent/tweet?text=${encodedText}`;

    case "retweet":
      // Enhanced retweet intent with better error handling
      if (!task_tweet_id) {
        console.warn("No tweet ID found for retweet task:", task);
        // Fallback to target profile if available
        return cleanHandle ? `https://x.com/${cleanHandle}` : "https://x.com";
      }
      return `https://x.com/intent/retweet?tweet_id=${task_tweet_id}`;

    case "reply":
      // Enhanced reply intent with pre-filled text
      if (!task_tweet_id) {
        console.warn("No tweet ID found for reply task:", task);
        return cleanHandle ? `https://x.com/${cleanHandle}` : "https://x.com";
      }

      // Pre-fill reply with engaging content
      let replyText = "Great post! ";
      if (task.task_tweet_hashtag) {
        replyText += `#${task.task_tweet_hashtag.replace("#", "")} `;
      }
      if (task.task_tweet_cashtag) {
        replyText += `$${task.task_tweet_cashtag.replace("$", "")} `;
      }
      replyText += "🚀";

      const encodedReplyText = encodeURIComponent(replyText.trim());
      return `https://x.com/intent/tweet?in_reply_to=${task_tweet_id}&text=${encodedReplyText}`;

    case "quote_tweet":
      // Enhanced quote tweet intent with better text construction
      if (!task_tweet_id) {
        console.warn("No tweet ID found for quote tweet task:", task);
        return cleanHandle
          ? `https://x.com/intent/tweet?text=@${cleanHandle}`
          : "https://x.com";
      }

      // Create engaging quote tweet text
      let quoteText = "";
      quoteText += `{Share your thoughts about this post}`;
      if (task.task_tweet_hashtag) {
        quoteText += `#${task.task_tweet_hashtag.replace("#", "")} `;
      }
      if (task.task_tweet_cashtag) {
        quoteText += `$${task.task_tweet_cashtag.replace("$", "")} `;
      }
      quoteText += "🚀";

      const encodedQuoteText = encodeURIComponent(quoteText.trim());
      return `https://x.com/intent/tweet?text=${encodedQuoteText}&url=https://x.com/i/status/${task_tweet_id}`;

    default:
      // Fallback to X home
      return "https://x.com";
  }
};

// Helper function to check if quest is eligible for starting tasks
const isQuestEligibleForTasks = (quest: Quest | QuestDetails) => {
  // Check if quest is active
  if (quest.status !== "active") return false;

  // Check if quest has ended
  const now = new Date();
  const nowISO = now.toISOString().slice(0, 19);
  if (quest.end_date < nowISO) return false;

  // Check if quest is full
  if (quest.total_claimed && quest.total_users_to_reward) {
    if (quest.total_claimed >= quest.total_users_to_reward) return false;
  }

  return true;
};

export default function QuestDetailsTab({
  quest,
  isUserEligible,
  getEligibilityReason,
  handleTaskStart,
  createTaskOnly,
  user,
  questId,
  onQuestUpdate,
  onTaskStatusUpdate,
  login,
  hasAta,
}: QuestDetailsTabProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isDistributing, setIsDistributing] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  // Optimistic: mark tasks as under_review immediately after click
  const [optimisticUnderReview, setOptimisticUnderReview] = useState<
    Set<string>
  >(new Set());
  const [verifyingTaskIds, setVerifyingTaskIds] = useState<Set<string>>(
    new Set()
  );
  const [underReviewTimers, setUnderReviewTimers] = useState<{
    [key: string]: NodeJS.Timeout;
  }>({});
  const [timerCountdowns, setTimerCountdowns] = useState<{
    [key: string]: number;
  }>({});
  const [lastVerificationResponse, setLastVerificationResponse] = useState<{
    all_tasks_completed?: boolean;
    verification_results?: any[];
    user_tx_hash?: string;
    user_tokens_earned?: number;
  } | null>(null);
  const [contentLabOpen, setContentLabOpen] = useState<boolean>(false);
  const [selectedTaskForContentLab, setSelectedTaskForContentLab] =
    useState<QuestTask | null>(null);

  // Function to handle raffle distribution
  const handleRaffleDistribution = async () => {
    if (!user?.is_admin) {
      toast({
        title: "Access Denied",
        description: "Only admins can distribute raffle rewards.",
        variant: "destructive",
      });
      return;
    }

    setIsDistributing(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `/api/quests/verification/quest/${questId}/raffle-distribute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to distribute raffle rewards"
        );
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: "Raffle rewards have been distributed successfully!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error distributing raffle rewards:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to distribute raffle rewards",
        variant: "destructive",
      });
    } finally {
      setIsDistributing(false);
    }
  };

  // Function to handle task verification
  // Effect to handle countdown timers
  useEffect(() => {
    // Initialize countdown for each task under review
    optimisticUnderReview.forEach((taskId) => {
      if (!timerCountdowns[taskId]) {
        // Find the task to determine its type and set appropriate countdown
        const task = quest.tasks?.find((t) => t.task_id === taskId);
        const initialCountdown = task?.task_type === "follow" ? 120 : 30; // 2 minutes for follow, 30 seconds for others
        setTimerCountdowns((prev) => ({
          ...prev,
          [taskId]: initialCountdown,
        }));
      }
    });

    // Update countdowns every second
    const interval = setInterval(() => {
      setTimerCountdowns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((taskId) => {
          if (next[taskId] > 0) {
            next[taskId] = next[taskId] - 1;
          }
        });
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      // Clear all timers on component unmount
      Object.values(underReviewTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [underReviewTimers, optimisticUnderReview]);

  const handleTaskVerification = useCallback(
    async (taskId: string) => {
      try {
        // Add task to verifying set for loading state
        setVerifyingTaskIds((prev) => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Non-blocking pre-check for Solana airdrop readiness if user has a Solana wallet
        if (user?.solana_wallet) {
          try {
            const solInfoRes = await fetch(
              `/api/solana/wallet-info?address=${encodeURIComponent(
                user.solana_wallet
              )}`
            );
            if (solInfoRes.ok) {
              const solInfo = await solInfoRes.json();
              const needsFunds =
                typeof solInfo?.balanceSol === "number" &&
                solInfo.balanceSol < 0.04;
              const missingUsdcAta = solInfo?.hasUsdcAta === false;
              if (needsFunds || missingUsdcAta) {
                const parts: string[] = [];
                if (needsFunds) parts.push("at least 0.002 SOL");
                if (missingUsdcAta) parts.push("a USDC token account (ATA)");
                // toast({
                //   title: "Solana wallet not ready for USDC airdrops",
                //   description: `Your Solana wallet may need ${parts.join(
                //     " and "
                //   )} to receive the airdrop. This won't block verification, but please top up to claim successfully.`,
                // });
              }
            }
          } catch (e) {
            // Silent fail; don't block verification on pre-check issues
          }
        }

        // Use verify endpoint which verifies all tasks
        const response = await fetch(
          `/api/quests/verification/quest/${encodeURIComponent(
            questId
          )}/verify`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ user_handle: user?.x_handle }),
          }
        );

        const data = await response.json();
        if (!response.ok || data?.success === false) {
          throw new Error(data?.error || "Verification failed");
        }

        // Only show toast if verification was manually triggered (not from timer)
        if (!underReviewTimers[taskId]) {
          toast({
            title: "Verification Done",
            description: "Your tasks status is updated",
            variant: "default",
          });
        }

        // Check tasks that were under review and show appropriate toast messages
        const underReviewTaskIds = Array.from(optimisticUnderReview);

        interface VerificationResult {
          task_id: string;
          task_type: string;
          status: string;
          verified: boolean;
          message: string;
          details: {
            target_handle?: string | null;
            tweet_id?: string | null;
            verification_source?: string | null;
            api_response?: any;
          };
        }

        if (data?.data?.verification_results) {
          // Add a small delay between toasts for better UX
          data.data.verification_results.forEach(
            (result: VerificationResult, index: number) => {
              if (underReviewTaskIds.includes(result.task_id)) {
                // Get task description for more informative toast
                const taskDescription = (() => {
                  switch (result.task_type) {
                    case "follow":
                      return result.details.target_handle
                        ? `Follow @${result.details.target_handle}`
                        : "Follow task";
                    case "tweet":
                      return "Tweet task";
                    case "retweet":
                      return "Retweet task";
                    case "reply":
                      return "Reply task";
                    case "quote_tweet":
                      return "Quote tweet task";
                    default:
                      return "Task";
                  }
                })();

                // Delay each toast by 1000ms * index for better visibility
                setTimeout(() => {
                  if (result.status === "completed") {
                    toast({
                      title: `${taskDescription} Completed`,
                      description:
                        result.message ||
                        "Your task has been verified and marked as completed! 🎉",
                      variant: "default",
                    });
                  } else if (result.status === "todo") {
                    toast({
                      title: `${taskDescription} Not Found`,
                      description:
                        result.message ||
                        "We couldn't verify your task. Please try again.",
                      variant: "destructive",
                    });
                  }
                }, index * 1000); // 1000ms delay between each toast
              }
            }
          );
        }
        // Store the verification response
        setLastVerificationResponse({
          all_tasks_completed: data?.data?.all_tasks_completed,
          verification_results: data?.data?.verification_results,
          user_tx_hash: data?.data?.user_tx_hash,
          user_tokens_earned: data?.data?.user_tokens_earned,
        });

        // Update task statuses from verify API response
        if (onTaskStatusUpdate && data?.data?.verification_results) {
          onTaskStatusUpdate(data?.data?.verification_results);
        }

        // Clear all states since we've verified all tasks
        setOptimisticUnderReview(new Set());
        Object.entries(underReviewTimers).forEach(([_, timer]) => {
          clearTimeout(timer);
        });
        setUnderReviewTimers({});
        setTimerCountdowns({});
      } catch (error: any) {
        console.error("Task verification error:", error);
        toast({
          title: "Verification Failed",
          description:
            error.message || "Failed to verify tasks. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Clear all verifying states since we've attempted to verify all tasks
        setVerifyingTaskIds(new Set());
      }
    },
    [questId, user?.x_handle, toast, onTaskStatusUpdate, underReviewTimers]
  );

  // Comprehensive function to get task action button (similar to TaskDetailsModal)
  const getTaskActionButton = (task: QuestTask) => {
    // Only show action buttons for todo, rejected, or tasks without user_status
    if (
      (optimisticUnderReview.has(task.task_id)
        ? "under_review"
        : task.user_status) !== "todo" &&
      (optimisticUnderReview.has(task.task_id)
        ? "under_review"
        : task.user_status) !== "rejected" &&
      (optimisticUnderReview.has(task.task_id)
        ? "under_review"
        : task.user_status)
    ) {
      return null;
    }

    // Check if quest has ended first (highest priority)
    if (
      (() => {
        const now = new Date();
        const nowISO = now.toISOString().slice(0, 19);
        return quest.end_date < nowISO;
      })()
    ) {
      return (
        <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between px-2 py-1 cursor-not-allowed opacity-60">
          Quest Ended
          <AlertTriangle className="w-4 h-4 ml-1" />
        </div>
      );
    }

    // For Content Lab tasks (tweet, reply, quote_tweet), skip user checks
    // Content Lab will handle authentication internally
    const isContentLabTask =
      task.task_type === "tweet" ||
      task.task_type === "reply" ||
      task.task_type === "quote_tweet";

    // if (!isContentLabTask) {
    // For non-Content Lab tasks, check user authentication and eligibility
    // Check if user is not logged in (second priority)
    if (!user) {
      return (
        <div className="space-y-1">
          <Button
            size="sm"
            className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
            onClick={(e) => {
              e.stopPropagation();
              login?.();
            }}
          >
            Login
          </Button>
        </div>
      );
    }

    // Check if user is not eligible (third priority)
    if (!isUserEligible(quest)) {
      const eligibilityReason = getEligibilityReason(quest);
      return (
        <div className="space-y-1">
          <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between  px-2 py-1 cursor-not-allowed opacity-60">
            Not eligible
            <AlertTriangle className="w-4 h-4 ml-1" />
          </div>
          {eligibilityReason && (
            <div className="text-xs text-red-400/80 max-w-[150px] leading-tight">
              {eligibilityReason}
            </div>
          )}
        </div>
      );
    }
    // }

    // Check other quest conditions
    if (!isQuestEligibleForTasks(quest)) {
      return (
        <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between  px-2 py-1 cursor-not-allowed opacity-60">
          {quest.status !== "active" ? "Quest Inactive" : "Quest Full"}
          <AlertTriangle className="w-4 h-4 ml-1" />
        </div>
      );
    }

    // All conditions met - show start/retry button
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          className={`inline-flex items-center justify-between  px-2 py-1 rounded-sm font-medium text-xs cursor-pointer transition-all duration-200 hover:scale-105 ${
            (optimisticUnderReview.has(task.task_id)
              ? "under_review"
              : task.user_status) === "rejected"
              ? "bg-dark-alpha-tertiary text-light-primary border-light-primary border-2 hover:bg-dark-alpha-quaternary"
              : "bg-light-primary hover:bg-light-secondary text-black"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            // For tweet, reply, and quote_tweet tasks, open content lab immediately
            // No need to check user or make any API calls - Content Lab will handle auth
            if (
              task.task_type === "tweet" ||
              task.task_type === "reply" ||
              task.task_type === "quote_tweet"
            ) {
              setSelectedTaskForContentLab(task);
              setContentLabOpen(true);
              return;
            }

            // For follow and retweet, use the original flow
            // handleTaskStart will create the task and open the Twitter URL
            handleTaskStart(task.task_id);

            // Optimistically mark under_review
            setOptimisticUnderReview((prev) => {
              const next = new Set(prev);
              next.add(task.task_id);
              return next;
            });

            // Set up timer for automatic verification (2 min for follow tasks, 30 sec for others)
            const verificationDelay =
              task.task_type === "follow" ? 30000 : 30000;
            const timer = setTimeout(() => {
              handleTaskVerification(task.task_id);
            }, verificationDelay);

            // Store the timer reference
            setUnderReviewTimers((prev) => ({
              ...prev,
              [task.task_id]: timer,
            }));
          }}
        >
          <span>
            {(optimisticUnderReview.has(task.task_id)
              ? "under_review"
              : task.user_status) === "rejected"
              ? "Retry"
              : task.task_type === "tweet"
              ? "Tweet"
              : task.task_type === "follow"
              ? "Follow"
              : task.task_type === "reply"
              ? "Reply"
              : task.task_type === "quote_tweet"
              ? "Quote"
              : "Retweet"}
          </span>
        </button>
        {/* <span className="text-xs text-light-primary/60 max-w-[150px] text-right leading-tight">
          {task.user_status === "rejected"
            ? "Will redirect to X to retry"
            : task.task_type === "follow"
            ? "Will redirect to X to follow account"
            : task.task_type === "tweet"
            ? "Will redirect to X with pre-filled tweet"
            : task.task_type === "reply"
            ? "Will redirect to X to reply to tweet"
            : task.task_type === "quote_tweet"
            ? "Will redirect to X to quote tweet"
            : "Will redirect to X to retweet"}
        </span> */}
      </div>
    );
  };
  return (
    <div className="space-y-8">
      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-light-primary" />
          <h2 className="text-xl font-semibold">
            Tasks to Complete ({quest.tasks?.length || 0})
          </h2>
        </div>

        <div className="space-y-3">
          {quest.tasks?.map((task, index) => {
            const responseTx = (lastVerificationResponse as any)?.user_tx_hash;
            const hasAnyTx =
              Boolean(responseTx) ||
              Boolean((quest as any)?.user_tx_hash) ||
              (Array.isArray(quest.tasks)
                ? quest.tasks.some((t) => !!t.user_tx_hash)
                : false);
            const firstTxHash =
              responseTx ||
              (quest as any)?.user_tx_hash ||
              (Array.isArray(quest.tasks)
                ? quest.tasks.find((t) => !!t.user_tx_hash)?.user_tx_hash
                : undefined);
            // Get actual tokens earned from the first completed task
            const taskWithTokens = quest.tasks?.find(
              (t) => t.user_tokens_earned && t.user_tokens_earned > 0
            );
            const responseTokens =
              (lastVerificationResponse as any)?.user_tokens_earned || 0;
            const questLevelTokens = (quest as any)?.user_tokens_earned || 0;
            const actualTokensEarned =
              responseTokens > 0
                ? responseTokens
                : questLevelTokens > 0
                ? questLevelTokens
                : taskWithTokens?.user_tokens_earned || 0;

            // Fallback to calculated amount if no actual tokens earned is available
            const perUserReward =
              actualTokensEarned > 0
                ? actualTokensEarned / 1e6 // Convert from wei to tokens
                : quest.total_users_to_reward && quest.total_users_to_reward > 0
                ? quest.reward_pool / quest.total_users_to_reward
                : 0;
            return (
              <Card
                key={task.task_id}
                className={`bg-dark-secondary border-dark-quaternary p-4 ${
                  task.user_status === "completed" ? "" : ""
                }`}
              >
                <CardContent className="p-0">
                  <div
                    className={`${
                      isMobile
                        ? "flex gap-3 justify-between"
                        : "flex items-center justify-between"
                    }`}
                  >
                    {/* Task Info Section */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-white flex-1 text-sm">
                        {task.task_type === "follow" &&
                          task.task_follow_handle && (
                            <span>
                              Follow{" "}
                              <ProfileHoverLink
                                handle={task.task_follow_handle}
                                className="text-light-primary hover:underline"
                              >
                                @{task.task_follow_handle}
                              </ProfileHoverLink>{" "}
                              on X
                            </span>
                          )}
                        {task.task_type === "tweet" && (
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const plural =
                                task.task_count && task.task_count > 1;
                              const countLabel = task.task_count
                                ? `${task.task_count} tweet${plural ? "s" : ""}`
                                : "a tweet";
                              if (task.task_tweet_hashtag) {
                                return (
                                  <span>
                                    Write {countLabel} with #
                                    {task.task_tweet_hashtag.replace(/^#/, "")}.{" "}
                                    Follow the guidelines below.
                                  </span>
                                );
                              }
                              if (task.task_tweet_cashtag) {
                                return (
                                  <span>
                                    Write {countLabel} with $
                                    {task.task_tweet_cashtag.replace(/^\$/, "")}
                                    . Follow the guidelines below.
                                  </span>
                                );
                              }
                              if (task.task_tweet_handle) {
                                return (
                                  <span>
                                    Write {countLabel} mentioning{" "}
                                    <ProfileHoverLink
                                      handle={task.task_tweet_handle}
                                      className="text-light-primary hover:underline"
                                    >
                                      @{task.task_tweet_handle}
                                    </ProfileHoverLink>
                                    . Follow the guidelines below.
                                  </span>
                                );
                              }
                              if (task.task_tweet_website) {
                                return (
                                  <span>
                                    Write {countLabel} about the website below.
                                    Follow the guidelines below.
                                  </span>
                                );
                              }
                              return (
                                <span>
                                  Write {countLabel}. Follow the guidelines
                                  below.
                                </span>
                              );
                            })()}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {task.task_tweet_handle && (
                                <ProfileHoverLink
                                  handle={task.task_tweet_handle}
                                  className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-dark-alpha-quaternary hover:underline"
                                >
                                  @{task.task_tweet_handle}
                                </ProfileHoverLink>
                              )}
                              {task.task_tweet_hashtag && (
                                <span className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-dark-alpha-quaternary">
                                  #{task.task_tweet_hashtag.replace(/^#/, "")}
                                </span>
                              )}
                              {task.task_tweet_cashtag && (
                                <span className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-dark-alpha-quaternary">
                                  ${task.task_tweet_cashtag.replace(/^\$/, "")}
                                </span>
                              )}
                              {task.task_tweet_website && (
                                <a
                                  href={task.task_tweet_website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-dark-alpha-quaternary hover:underline"
                                >
                                  {task.task_tweet_website}
                                </a>
                              )}
                              {task.task_count && task.task_count > 1 && (
                                <span className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-dark-alpha-quaternary">
                                  {task.task_count} times
                                </span>
                              )}
                              {task.task_image_required && (
                                <span className="px-2 py-0.5 rounded-full bg-dark-alpha-tertiary text-light-primary border border-light-primary/40">
                                  with image
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {task.task_type === "retweet" && task.task_tweet_id && (
                          <span>
                            Retweet the{" "}
                            <TweetHoverLink
                              url={`https://x.com/i/status/${task.task_tweet_id}`}
                              className="text-light-primary hover:underline"
                            >
                              Tweet
                            </TweetHoverLink>
                          </span>
                        )}
                        {task.task_type === "reply" && task.task_tweet_id && (
                          <span>
                            Reply to the{" "}
                            <TweetHoverLink
                              url={`https://x.com/i/status/${task.task_tweet_id}`}
                              className="text-light-primary hover:underline"
                            >
                              Tweet
                            </TweetHoverLink>
                          </span>
                        )}
                        {task.task_type === "quote_tweet" &&
                          task.task_tweet_id && (
                            <span>
                              Quote the{" "}
                              <TweetHoverLink
                                url={`https://x.com/i/status/${task.task_tweet_id}`}
                                className="text-light-primary hover:underline"
                              >
                                Tweet
                              </TweetHoverLink>
                            </span>
                          )}
                        {/* Fallback for unknown task types or missing data */}
                        {!task.task_type ||
                          (task.task_type !== "follow" &&
                            task.task_type !== "tweet" &&
                            task.task_type !== "retweet" &&
                            task.task_type !== "reply" &&
                            task.task_type !== "quote_tweet" && (
                              <span>
                                {task.task_type
                                  ? `Complete ${task.task_type} task`
                                  : "Complete task"}
                              </span>
                            ))}
                      </div>
                    </div>

                    {/* Status and Action Section */}
                    <div
                      className={`flex flex-row  ${
                        isMobile ? "items-center justify-end " : "items-end"
                      }`}
                    >
                      {/* Status Message */}
                      {(task.user_status === "completed" ||
                        (!quest.is_raffle &&
                          (quest.user_progress?.all_tasks_completed ||
                            lastVerificationResponse?.all_tasks_completed ||
                            ((quest.tasks || []).some(
                              (t) => t.user_status === "missingATA"
                            ) &&
                              hasAta === true)) &&
                          !hasAnyTx)) &&
                        !(!quest.is_raffle && user && !user.evm_wallet) &&
                        !(
                          quest.is_raffle &&
                          quest.user_progress?.all_tasks_completed &&
                          !user?.evm_wallet
                        ) &&
                        (hasAnyTx ? (
                          <div
                            className={`bg-dark-primary text-green-text border-success bg-green-bg border font-medium text-xs flex items-center gap-2 ${
                              isMobile
                                ? "w-full px-2 py-1 rounded-lg"
                                : "rounded-sm px-2 py-1"
                            } cursor-pointer`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const hash = firstTxHash || "";
                              const transactionUrl = getTransactionUrl(
                                quest.chain || "",
                                hash
                              );
                              window.open(transactionUrl, "_blank");
                            }}
                          >
                            <svg
                              className="w-4 h-4 text-green-text"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {`Earned $${perUserReward.toFixed(2)}`}
                          </div>
                        ) : !quest.is_raffle &&
                          (quest.user_progress?.all_tasks_completed ||
                            lastVerificationResponse?.all_tasks_completed ||
                            // If backend flagged ATA missing but client has created ATA, allow claim
                            ((quest.tasks || []).some(
                              (t) => t.user_status === "missingATA"
                            ) &&
                              hasAta === true)) &&
                          !hasAnyTx ? (
                          (() => {
                            const eligibleForClaim =
                              isQuestEligibleForTasks(quest);
                            if (!eligibleForClaim) {
                              return (
                                <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between px-2 py-1 cursor-not-allowed opacity-60">
                                  {quest.status !== "active"
                                    ? "Quest Ended"
                                    : "Rewards Exhausted"}
                                  <AlertTriangle className="w-4 h-4 ml-1" />
                                </div>
                              );
                            }
                            // Check if user has required wallet for claiming
                            const requiredWallet = getRequiredWalletForChain(
                              quest.chain || ""
                            );
                            const needsWallet =
                              requiredWallet && !user?.[requiredWallet];

                            if (needsWallet) {
                              const walletType =
                                requiredWallet === "evm_wallet"
                                  ? "EVM"
                                  : "Solana";
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsWalletDialogOpen(true);
                                        }}
                                        className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
                                      >
                                        Add {walletType} Wallet
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        This quest requires a {walletType}{" "}
                                        wallet to claim rewards
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            }

                            return (
                              <Button
                                size="sm"
                                className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskVerification(task.task_id);
                                }}
                              >
                                Claim
                                <ArrowUpRight className="w-4 h-4 ml-1" />
                              </Button>
                            );
                          })()
                        ) : (
                          <div
                            className={`bg-neutral-800 text-green-text border-success border font-medium text-xs flex items-center gap-2 ${
                              isMobile
                                ? "w-full px-3 py-2 rounded-lg"
                                : "rounded-sm px-2 py-1"
                            }`}
                          >
                            <svg
                              className="w-4 h-4 text-green-text"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Done
                          </div>
                        ))}
                      {((optimisticUnderReview.has(task.task_id) &&
                        task.user_status !== "completed") ||
                        task.user_status === "under_review") && (
                        <div
                          className={`bg-dark-alpha-tertiary text-yellow-text border-yellow-text border-2 font-medium text-xs flex items-center gap-2 ${
                            isMobile
                              ? "w-full px-2 py-1 rounded-lg"
                              : "rounded-sm px-2 py-1"
                          }`}
                        >
                          <svg
                            className="w-4 h-4 text-yellow-text"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Under Review{" "}
                          {timerCountdowns[task.task_id] > 0 &&
                            `(${timerCountdowns[task.task_id]}s)`}
                        </div>
                      )}
                      {task.user_status === "rejected" && (
                        <div
                          className={`bg-neutral-800 text-light-tertiary border-light-tertiary font-medium text-xs flex items-center gap-2 ${
                            isMobile
                              ? "w-full px-3 py-2 rounded-lg"
                              : "rounded-sm px-2 py-1"
                          }`}
                        >
                          <svg
                            className="w-4 h-4 text-light-tertiary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                          </svg>
                          {isMobile
                            ? "Entry not found, try again"
                            : "We couldn't find your entry, please try again"}
                        </div>
                      )}

                      {/* Action and Verification Buttons */}
                      <div
                        className={`flex  items-center ${
                          isMobile ? "justify-end " : "justify-end"
                        }`}
                      >
                        {/* Action Button */}
                        {(() => {
                          const requiredWallet = getRequiredWalletForChain(
                            quest.chain || ""
                          );
                          const hasRequiredWallet = requiredWallet 
                            ? !!user?.[requiredWallet]
                            : true; // If no required wallet, assume user has it
                          
                          // Show Add Wallet button for non-raffle quests when user is logged in but has no wallet
                          if (!quest.is_raffle && user && !hasRequiredWallet) {
                            const walletType =
                              requiredWallet === "evm_wallet"
                                ? "EVM"
                                : "Solana";
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setIsWalletDialogOpen(true)
                                      }
                                      className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
                                    >
                                      Add {walletType} Wallet
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      This quest requires a {walletType} wallet
                                      to participate
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          // Show Add Wallet button for raffle quests when all tasks completed but no wallet
                          if (
                            quest.is_raffle &&
                            quest.user_progress?.all_tasks_completed &&
                            !hasRequiredWallet
                          ) {
                            const walletType =
                              requiredWallet === "evm_wallet"
                                ? "EVM"
                                : "Solana";
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setIsWalletDialogOpen(true)
                                      }
                                      className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
                                    >
                                      Add {walletType} Wallet
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      This quest requires a {walletType} wallet
                                      to participate
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          const effectiveStatus = optimisticUnderReview.has(
                            task.task_id
                          )
                            ? "under_review"
                            : task.user_status;
                          const canShowActions =
                            (quest.chain !== "solana" || hasAta === true) &&
                            (effectiveStatus === "todo" ||
                              effectiveStatus === "rejected" ||
                              !effectiveStatus);
                          return (
                            canShowActions && (
                              <div className="flex gap-1">
                                {getTaskActionButton(task)}
                              </div>
                            )
                          );
                        })()}

                        {/* Verification Button - shown except when completed or has tx hash */}
                        {(quest.chain !== "solana" || hasAta === true) &&
                          quest.status === "active" &&
                          task.user_status !== "completed" &&
                          !task.user_tx_hash && (
                            <button
                              onClick={() =>
                                handleTaskVerification(task.task_id)
                              }
                              disabled={verifyingTaskIds.has(task.task_id)}
                              className={`ml-2 inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                                verifyingTaskIds.has(task.task_id)
                                  ? "bg-yellow-bg/50 cursor-not-allowed"
                                  : "bg-yellow-bg hover:bg-yellow-bg border-yellow-text hover:border-yellow-text"
                              }`}
                              title="Verify task completion"
                            >
                              {verifyingTaskIds.has(task.task_id) ? (
                                <div className="w-4 h-4 border-2 border-yellow-text border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4 text-yellow-text hover:text-yellow-text" />
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* LLM Verification Message Section - shown when task fails verification */}
                  {(() => {
                    // Find the verification result for this task from lastVerificationResponse (from verification API)
                    const verificationResult =
                      lastVerificationResponse?.verification_results?.find(
                        (vr: any) => vr.task_id === task.task_id
                      );

                    // Check multiple sources for LLM message, in priority order:
                    // 1. Direct on task (from quest details API)
                    // 2. In verification_data (from quest details API)
                    // 3. From verification API response
                    // 4. From old verification_result format
                    const llmMessage =
                      (task as any).llm_verification_message ||
                      (task as any).verification_data
                        ?.llm_verification_message ||
                      (task as any).verification_data?.verification_details
                        ?.llm_verification_message ||
                      verificationResult?.llm_verification_message ||
                      task.verification_result?.llm_verification_message;

                    // Show LLM message when:
                    // 1. Task status is "todo" or "rejected" (not verified)
                    // 2. LLM verification message exists
                    // 3. Task is not under review
                    const shouldShowLLMMessage =
                      (task.user_status === "todo" ||
                        task.user_status === "rejected") &&
                      !optimisticUnderReview.has(task.task_id) &&
                      llmMessage;

                    if (!shouldShowLLMMessage) return null;

                    return (
                      <div className="mt-3 pt-3 border-t border-red-500/30">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <div className="text-xs font-medium text-red-400/90">
                              Verification Issue
                            </div>
                          </div>
                          <div className="text-xs text-red-300/70 leading-relaxed pl-6">
                            {llmMessage}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Guidelines Section */}
                  {task.task_description && (
                    <div className="mt-3 pt-3 border-t border-dark-quaternary">
                      <div className="text-sm">
                        <div className="text-light-primary/80 mb-2 font-medium">
                          Guidelines
                        </div>
                        <div className="text-light-primary/60 leading-relaxed">
                          {task.task_description}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Verification Details Section */}
                  {task.user_status === "completed" &&
                    task.verification_result && (
                      <div className="mt-3 pt-3 border-t border-dark-quaternary">
                        <div className="text-sm">
                          <div className="text-light-primary/80 mb-2 font-medium">
                            Verification Details
                          </div>
                          {task.verification_result?.message && (
                            <div className="text-light-primary/70 mb-2">
                              {task.verification_result.message}
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-light-primary/70">
                            {task.verification_result?.details?.cashtag && (
                              <div>
                                <span className="text-light-primary/50">
                                  Cashtag:{" "}
                                </span>
                                <span className="text-light-primary">
                                  {task.verification_result.details.cashtag}
                                </span>
                              </div>
                            )}
                            {task.verification_result?.details?.hashtag && (
                              <div>
                                <span className="text-light-primary/50">
                                  Hashtag:{" "}
                                </span>
                                <span className="text-light-primary">
                                  {task.verification_result.details.hashtag}
                                </span>
                              </div>
                            )}
                            {task.verification_result?.details
                              ?.handle_mention && (
                              <div>
                                <span className="text-light-primary/50">
                                  Handle:{" "}
                                </span>
                                <span className="text-light-primary">
                                  @
                                  {
                                    task.verification_result.details
                                      .handle_mention
                                  }
                                </span>
                              </div>
                            )}
                            {typeof task.verification_result?.details
                              ?.required_count === "number" && (
                              <div>
                                <span className="text-light-primary/50">
                                  Tweets Found:{" "}
                                </span>
                                <span className="text-light-primary">
                                  {task.verification_result.details
                                    .found_tweet_ids?.length || 0}{" "}
                                  of{" "}
                                  {
                                    task.verification_result.details
                                      .required_count
                                  }
                                </span>
                              </div>
                            )}
                            {task.verification_result?.details
                              ?.verification_source && (
                              <div>
                                <span className="text-light-primary/50">
                                  Source:{" "}
                                </span>
                                <span className="text-light-primary capitalize">
                                  {
                                    task.verification_result.details
                                      .verification_source
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          {task.verification_result?.details?.found_tweet_ids
                            ?.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-light-primary/50 mb-1">
                                Found Tweets:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {task.verification_result.details.found_tweet_ids.map(
                                  (tid: string, idx: number) => (
                                    <a
                                      key={idx}
                                      href={`https://x.com/i/status/${tid}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-light-primary underline hover:text-light-secondary"
                                    >
                                      {tid}
                                    </a>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Wallet Dialog */}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <UpdateWalletDialog
          onClose={() => setIsWalletDialogOpen(false)}
          open={isWalletDialogOpen}
        />
      </Dialog>

      {/* Content Lab Dialog */}
      <Dialog open={contentLabOpen} onOpenChange={setContentLabOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-dark-primary border-dark-quaternary p-0">
          <DialogTitle className="sr-only">Content Lab</DialogTitle>
          {selectedTaskForContentLab && (
            <QuestContentLab
              task={selectedTaskForContentLab}
              questCreatorHandle={quest.creator_x_handle}
              onPost={async (content: string) => {
                // Close the dialog first
                setContentLabOpen(false);

                try {
                  // Create the task without opening a URL (Content Lab handles the URL)
                  if (createTaskOnly) {
                    await createTaskOnly(selectedTaskForContentLab.task_id);
                  } else {
                    // Fallback if createTaskOnly not provided
                    throw new Error("createTaskOnly function not available");
                  }

                  // Optimistically mark under_review
                  setOptimisticUnderReview((prev) => {
                    const next = new Set(prev);
                    next.add(selectedTaskForContentLab.task_id);
                    return next;
                  });

                  // Set up timer for automatic verification
                  const verificationDelay = 30000; // 30 seconds
                  const timer = setTimeout(() => {
                    handleTaskVerification(selectedTaskForContentLab.task_id);
                  }, verificationDelay);

                  // Store the timer reference
                  setUnderReviewTimers((prev) => ({
                    ...prev,
                    [selectedTaskForContentLab.task_id]: timer,
                  }));

                  // Build Twitter intent URL with the generated content
                  const task = selectedTaskForContentLab;
                  let twitterUrl = "";

                  if (task.task_type === "tweet") {
                    // Build tweet URL with the user's content
                    twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
                      content
                    )}`;
                  } else if (task.task_type === "reply") {
                    // Build reply URL
                    if (task.task_tweet_id) {
                      twitterUrl = `https://x.com/intent/tweet?in_reply_to=${
                        task.task_tweet_id
                      }&text=${encodeURIComponent(content)}`;
                    } else {
                      // Fallback if no tweet_id
                      twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
                        content
                      )}`;
                    }
                  } else if (task.task_type === "quote_tweet") {
                    // Build quote tweet URL
                    if (task.task_tweet_id) {
                      twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
                        content
                      )}&url=https://x.com/i/status/${task.task_tweet_id}`;
                    } else {
                      // Fallback if no tweet_id
                      twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
                        content
                      )}`;
                    }
                  }

                  // Open Twitter with the generated content (only one popup now)
                  if (twitterUrl) {
                    // Small delay to ensure dialog closes smoothly before opening new window
                    setTimeout(() => {
                      window.open(twitterUrl, "_blank");
                    }, 100);
                  }
                } catch (error) {
                  console.error("Error posting content:", error);
                  toast({
                    title: "Error",
                    description: "Failed to start task. Please try again.",
                    variant: "destructive",
                  });
                }

                // Clear selected task
                setSelectedTaskForContentLab(null);
              }}
              onClose={() => {
                setContentLabOpen(false);
                setSelectedTaskForContentLab(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
