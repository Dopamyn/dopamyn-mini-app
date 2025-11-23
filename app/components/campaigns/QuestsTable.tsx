"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Quest, QuestTask } from "@/lib/types";
import { getTransactionUrl } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Frown,
  Loader2,
  Trophy,
  Gift,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRequiredWalletForChain } from "@/lib/helper";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";

// Countdown timer component for raffle quests
const RaffleCountdown = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      // Use the same time logic as the existing getTimeRemaining function
      const offset = new Date().getTimezoneOffset();
      const now = new Date();
      const end = new Date(endDate);

      // Ensure both dates are treated as UTC for accurate comparison
      const nowUTC = now.getTime() + offset * 60 * 1000;
      const endUTC = end.getTime(); // endDate is already UTC

      const diff = endUTC - nowUTC;

      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }

      const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
      const days = Math.floor(
        (diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
      );
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (months > 0) {
        setTimeLeft(`${months}m ${days}d`);
      } else if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <div className="flex items-center gap-1 text-xs text-orange-400">
      <Timer className="w-3 h-3" />
      <span className="font-mono">{timeLeft}</span>
    </div>
  );
};

interface QuestsTableProps {
  quests: Quest[];
  loading: boolean;
  user: any;
  isUserEligible: (quest: Quest) => boolean;
  getEligibilityReason: (quest: Quest) => string | null;
  openTaskModal: (quest: Quest) => void;
  hasUnderReviewTask: (quest: Quest) => boolean;
  handleVerifyQuest: (quest: Quest) => void;
  verifyingQuestId: string | null;
  login: () => void;
  isProcessing: boolean;
  // New loading states for different actions
  openingTaskModalQuestId: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  handleSort: (
    key: "reward_amount" | "claimed_by" | "time_left" | null
  ) => void;
  getSortIcon: (
    key: "reward_amount" | "claimed_by" | "time_left" | null
  ) => React.ReactNode;
}

// Task type configuration for icons and colors
const taskTypeConfig: Record<
  QuestTask["task_type"],
  {
    icon: any;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  follow: {
    icon: null,
    label: "Follow",
    color: "text-light-primary",
    bgColor: "bg-accent-primary",
    borderColor: "border-accent-secondary",
  },
  tweet: {
    icon: null,
    label: "Tweet",
    color: "text-yellow-text",
    bgColor: "bg-accent-primary",
    borderColor: "border-accent-secondary",
  },
  retweet: {
    icon: null,
    label: "Retweet",
    color: "text-light-primary",
    bgColor: "bg-accent-primary",
    borderColor: "border-accent-secondary",
  },
  reply: {
    icon: null,
    label: "Reply",
    color: "text-accent-tertiary",
    bgColor: "bg-accent-primary",
    borderColor: "border-accent-secondary",
  },
  quote_tweet: {
    icon: null,
    label: "Quote",
    color: "text-light-primary",
    bgColor: "bg-accent-primary",
    borderColor: "border-accent-secondary",
  },
};

// Get time remaining helper
const getTimeRemaining = (endDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date();
  const end = new Date(endDate);

  // Ensure both dates are treated as UTC for accurate comparison
  const nowUTC = now.getTime() + offset * 60 * 1000;
  const endUTC = end.getTime(); // endDate is already UTC

  const diff = endUTC - nowUTC;

  if (diff <= 0) return "Ended";

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor(
    (diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
  );
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (months > 0) return `${months}m ${days}d`;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// Get time until start helper
const getTimeUntilStart = (startDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date();
  const start = new Date(startDate);
  const diff = start.getTime() - (now.getTime() + offset * 60 * 1000);

  if (diff <= 0) return null; // Already started

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor(
    (diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24)
  );
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (months > 0) return `${months}m ${days}d`;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

// Check if quest has started
const hasQuestStarted = (startDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date().getTime() + offset * 60 * 1000;
  const start = new Date(startDate).getTime();
  return now >= start;
};

// Helper function to generate task description
const generateTaskDescription = (tasks: QuestTask[], creatorHandle: string) => {
  if (!tasks || tasks.length === 0) return "No tasks";

  const primaryTask = tasks[0];
  const taskType = primaryTask.task_type;

  let description = "";

  switch (taskType) {
    case "follow":
      description = `Follow @${
        primaryTask.task_follow_handle || creatorHandle
      }`;
      break;
    case "tweet":
      // Check if this is an image-required tweet first
      if (primaryTask.task_image_required && primaryTask.task_description) {
        description = `Tweet with image: ${primaryTask.task_description.substring(
          0,
          50
        )}${primaryTask.task_description.length > 50 ? "..." : ""}`;
      } else if (
        primaryTask.task_type === "tweet" &&
        primaryTask.task_tweet_hashtag
      ) {
        description = `Tweet with #${primaryTask.task_tweet_hashtag}`;
        if (primaryTask.task_description) {
          description += ` about ${primaryTask.task_description}`;
        }
      } else if (
        primaryTask.task_type === "tweet" &&
        primaryTask.task_tweet_cashtag
      ) {
        description = `Tweet with $${primaryTask.task_tweet_cashtag}`;
        if (primaryTask.task_description) {
          description += ` about ${primaryTask.task_description}`;
        }
      } else if (
        primaryTask.task_type === "tweet" &&
        primaryTask.task_tweet_handle
      ) {
        description = `Tweet mentioning @${primaryTask.task_tweet_handle}`;
        if (primaryTask.task_description) {
          description += ` about ${primaryTask.task_description}`;
        }
      } else if (
        primaryTask.task_type === "tweet" &&
        primaryTask.task_tweet_website
      ) {
        description = `Tweet with ${primaryTask.task_tweet_website}`;
        if (primaryTask.task_description) {
          description += ` about ${primaryTask.task_description}`;
        }
      } else {
        description = "Create a Tweet";
      }
      break;
    case "reply":
      description = `Reply to tweet`;
      break;
    case "quote_tweet":
      description = `Quote tweet`;
      break;
    case "retweet":
      description = `Retweet`;
      break;
    default:
      description = "Complete task";
  }

  // Add +1, +2 indicators if there are multiple tasks
  if (tasks.length > 1) {
    description += ` +${tasks.length - 1}`;
  }

  return description;
};

// Generate avatar with initials
const generateAvatar = (handle: string) => {
  const initials = handle.slice(0, 2).toUpperCase();
  const colors = [
    "bg-gradient-to-br from-green-text to-light-primary",
    "bg-gradient-to-br from-light-primary to-accent-tertiary",
    "bg-gradient-to-br from-accent-tertiary to-accent-quaternary",
    "bg-gradient-to-br from-light-primary to-accent-secondary",
    "bg-gradient-to-br from-yellow-text to-light-primary",
    "bg-gradient-to-br from-accent-secondary to-accent-tertiary",
  ];
  const colorIndex = handle.length % colors.length;

  return (
    <div
      className={`w-10 h-10 rounded-lg ${colors[colorIndex]} flex items-center justify-center shadow-lg`}
    >
      <span className="text-white font-bold text-sm">{initials}</span>
    </div>
  );
};

const getQuestStatusBadge = (
  quest: Quest,
  user: any,
  isUserEligible: (quest: Quest) => boolean,
  getEligibilityReason: (quest: Quest) => string | null,
  hasUnderReviewTask: (quest: Quest) => boolean,
  openTaskModal: (quest: Quest) => void,
  handleVerifyQuest: (quest: Quest) => void,
  verifyingQuestId: string | null,
  openingTaskModalQuestId: string | null,
  isMobile: boolean = false
) => {
  // Check if quest has started first
  if (quest.start_date && !hasQuestStarted(quest.start_date)) {
    const timeUntilStart = getTimeUntilStart(quest.start_date);
    return (
      <Badge
        className={`bg-dark-secondary text-light-primary border-neutral-200 hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] h-7 rounded-md px-3"
        }`}
      >
        {isMobile ? `Starts ${timeUntilStart}` : `Starts in ${timeUntilStart}`}
        <AlertCircle className="w-4 h-4 ml-1" />
      </Badge>
    );
  }

  // Condition 1: User is not eligible
  if (!isUserEligible(quest)) {
    return (
      <Badge
        className={`bg-dark-secondary text-red-text border-red-text border-[1px] hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between cursor-pointer ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] h-7 rounded-md px-3"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          openTaskModal(quest);
        }}
      >
        {isMobile ? "Not eligible" : "Not eligible"}
        <AlertCircle className="w-4 h-4 ml-1" />
      </Badge>
    );
  }

  // Check user's task completion status first (normalize missing status to "todo" like list API)
  const tasks = quest.tasks || [];
  const normalizedTasks = tasks.map((t) => ({
    ...t,
    user_status: t.user_status || "todo",
  }));
  const userTasks = normalizedTasks; // all tasks now have a status
  const completedTasks = userTasks.filter(
    (task) => task.user_status === "completed"
  );
  const underReviewTasks = userTasks.filter(
    (task) => task.user_status === "under_review"
  );
  const totalTasks = normalizedTasks.length;

  // Condition 2: User has completed all tasks and earned (highest priority)
  if (completedTasks.length === totalTasks && completedTasks.length > 0) {
    // Get actual tokens earned from the first completed task
    const taskWithTokens = completedTasks.find(
      (task) => task.user_tokens_earned && task.user_tokens_earned > 0
    );
    const actualTokensEarned = taskWithTokens?.user_tokens_earned || 0;

    // Fallback to calculated amount if no actual tokens earned is available
    const rewardAmount =
      actualTokensEarned > 0
        ? (actualTokensEarned / 1e6).toFixed(2) // Convert from wei to tokens
        : (quest.reward_pool / quest.total_users_to_reward).toFixed(2);

    // Find a completed task with transaction hash for Basescan redirect
    const taskWithTxHash = completedTasks.find((task) => task.user_tx_hash);

    if (taskWithTxHash?.user_tx_hash) {
      return (
        <Badge
          className={`bg-dark-secondary text-brand-200 border-brand-200 border-[1px] hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between ${
            isMobile
              ? "w-auto px-2 py-1 rounded-lg"
              : "w-[150px] h-7 rounded-md px-3"
          } ${!quest.celebrated ? "animate-shining" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            const transactionUrl = getTransactionUrl(quest.chain, taskWithTxHash?.user_tx_hash || "");
            window.open(transactionUrl, "_blank");
          }}
        >
          Earned ${Number(rewardAmount).toFixed(2)}
          {quest.celebrated ? (
            <Trophy className="w-4 h-4 ml-1 text-yellow-text" />
          ) : (
            <Trophy className="w-4 h-4 ml-1" />
          )}
        </Badge>
      );
    } else {
      // For raffle quests, show "You are eligible for Raffle" when all tasks completed but no tx hash
      if (quest.is_raffle) {
        return (
          <Badge
            className={`bg-dark-secondary text-brand-200 border-brand-200 border-[1px] hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between ${
              isMobile
                ? "w-auto px-2 py-1 rounded-lg"
                : "w-[150px] h-7 rounded-md px-3"
            }`}
          >
            {isMobile ? "Eligible for Raffle" : "You are eligible for Raffle"}
            <Gift className="w-4 h-4 ml-1" />
          </Badge>
        );
      }

      // Check if there are still rewards left in the pool
      const usersWithRewards = quest.total_claimed || 0;
      const totalRewardsAvailable = quest.total_users_to_reward || 0;

      if (totalRewardsAvailable < usersWithRewards) {
        // No rewards left - user completed all tasks but too late
        return (
          <Badge
            className={`bg-dark-secondary text-light-primary border-neutral-200 border-[1px] hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between ${
              isMobile
                ? "w-auto px-2 py-1 rounded-lg"
                : "w-[150px] h-7 rounded-md px-3"
            }`}
          >
            No Rewards Left
            <Frown className="w-4 h-4 ml-1" />
          </Badge>
        );
      }
    }
  }

  // Condition 3: Only show when ALL tasks are under review
  if (underReviewTasks.length === totalTasks && totalTasks > 0) {
    const isVerifying = verifyingQuestId === quest.id;
    return (
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleVerifyQuest(quest);
        }}
        disabled={isVerifying}
        className={`bg-dark-alpha-tertiary text-[#DCD9A2] border-accent-tertiary border-[1px] hover:bg-dark-alpha-quaternary font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] px-2 py-1 rounded-sm"
        } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 ml-1 animate-spin" />
            {isMobile ? "Checking..." : "Checking..."}
          </>
        ) : (
          <>
            {isMobile ? "Check" : "Check Progress"}
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>
    );
  }

  // Condition 4: User has completed some tasks but not all
  if (completedTasks.length > 0 && completedTasks.length < totalTasks) {
    const isOpeningModal = openingTaskModalQuestId === quest.id;
    return (
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          openTaskModal(quest);
        }}
        disabled={isOpeningModal}
        className={`bg-dark-alpha-tertiary text-[#A9F0DF] border-light-primary border-[1px] hover:bg-dark-alpha-quaternary font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] px-2 py-1 rounded-sm"
        } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isOpeningModal ? (
          <>
            <Loader2 className="w-4 h-4 ml-1 animate-spin" />
            {isMobile ? "Opening..." : "Opening..."}
          </>
        ) : (
          <>
            {isMobile
              ? `${completedTasks.length}/${totalTasks}`
              : `Continue ${completedTasks.length}/${totalTasks}`}
            <ArrowUpRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>
    );
  }

  // Check if quest is full or ended (only if user hasn't participated)
  const isQuestFull = (quest.total_claimed || 0) >= quest.total_users_to_reward;
  // const isQuestEnded =
  //   quest.status !== "active" || new Date(quest.end_date) < new Date();
  const isQuestEnded = new Date(quest.end_date) < new Date();

  // Condition 5: Quest is full or ended (only for users who haven't participated)
  if (isQuestFull || isQuestEnded) {
    return (
      <Badge
        className={`bg-dark-secondary text-red-text border-red-text border-[1px] hover:bg-dark-quaternary/50 font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] h-7 rounded-md px-3"
        }`}
      >
        {isMobile ? "Missed" : "Missed It"}
        <AlertCircle className="w-4 h-4 ml-1" />
      </Badge>
    );
  }

  // Condition 6: User is eligible and has not participated (clean slate)
  const isOpeningModal = openingTaskModalQuestId === quest.id;
  return (
    <Button
      onClick={(e) => {
        e.stopPropagation();
        openTaskModal(quest);
      }}
      disabled={isOpeningModal}
      size="sm"
      className={`bg-light-primary hover:bg-accent-secondary text-black font-medium text-xs flex items-center justify-between ${
        isMobile
          ? "w-auto px-2 py-1 rounded-lg"
          : "min-w-[150px] px-2 py-1 rounded-sm"
      } cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isOpeningModal ? (
        <>
          <Loader2 className="w-4 h-4 ml-1 animate-spin" />
          {isMobile ? "Opening..." : "Opening..."}
        </>
      ) : (
        <>
          {isMobile ? "Start" : "Start Campaign"}
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </>
      )}
    </Button>
  );
};

export default function QuestsTable({
  quests,
  loading,
  user,
  isUserEligible,
  getEligibilityReason,
  openTaskModal,
  hasUnderReviewTask,
  handleVerifyQuest,
  verifyingQuestId,
  login,
  isProcessing,
  openingTaskModalQuestId,
  hasMore,
  onLoadMore,
  handleSort,
  getSortIcon,
}: QuestsTableProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !loading && hasMore) {
        onLoadMore();
      }
    },
    [loading, hasMore, onLoadMore]
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
  const isMobile = useIsMobile();
  const router = useRouter();

  // Function to handle quest row click for navigation
  const handleQuestRowClick = (quest: Quest) => {
    router.push(`/campaigns/${quest.id}`);
  };

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Status Filter */}
        {/* {!isMobile && <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-light-tertiary">Status</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-black hover:bg-gray-100 text-xs px-3 py-1 rounded-lg"
            >
              All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent text-light-tertiary hover:text-light-primary border-light-quaternary text-xs px-3 py-1 rounded-lg"
            >
              Active
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent text-light-tertiary hover:text-light-primary border-light-quaternary text-xs px-3 py-1 rounded-lg"
            >
              Completed
            </Button>
          </div>
        </div>} */}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-light-primary">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg font-medium">Loading quests...</span>
            </div>
          </div>
        )}

        {!loading &&
          quests.map((quest, index) => {
            const primaryTask =
              quest.tasks && quest.tasks.length > 0 ? quest.tasks[0] : null;
            const isQuestFull =
              (quest.total_claimed || 0) >= quest.total_users_to_reward;
            const claimedPercentage =
              quest.total_users_to_reward > 0
                ? ((quest.total_claimed || 0) / quest.total_users_to_reward) *
                  100
                : 0;

            return (
              <div
                key={quest.id}
                className={`bg-dark-secondary rounded-xl p-4 border border-light-quaternary/50 ${
                  quest.start_date && !hasQuestStarted(quest.start_date)
                    ? "opacity-70 cursor-not-allowed"
                    : openingTaskModalQuestId === quest.id
                    ? "opacity-70 bg-dark-alpha-secondary cursor-wait"
                    : verifyingQuestId === quest.id
                    ? "opacity-70 bg-dark-alpha-tertiary cursor-wait"
                    : "opacity-100 hover:bg-dark-quaternary hover:border-brand-600/30 cursor-pointer transition-all duration-200 group"
                }`}
                onClick={() => {
                  const isAllowed =
                    quest.creator_x_handle === user?.x_handle || user?.is_admin;
                  if (
                    user &&
                    user.evm_wallet &&
                    openingTaskModalQuestId !== quest.id &&
                    (!quest.start_date || hasQuestStarted(quest.start_date))
                  ) {
                    isAllowed
                      ? handleQuestRowClick(quest)
                      : openTaskModal(quest);
                  }
                }}
              >
                {/* Header Section */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar/Icon */}
                    <div className="flex-shrink-0">
                      {primaryTask && primaryTask.profile_image_url ? (
                        <img
                          src={primaryTask.profile_image_url}
                          alt={
                            primaryTask.target_author_handle ||
                            primaryTask.task_follow_handle ||
                            "Target Author"
                          }
                          className="w-10 h-10 rounded-lg object-cover border border-light-quaternary/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      ) : (
                        generateAvatar(quest.creator_x_handle)
                      )}
                    </div>

                    {/* Quest Title and Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-light-primary truncate group-hover:text-light-primary transition-colors duration-200 flex items-center gap-2">
                          {quest.title}
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-light-primary" />
                        </h3>
                        {/* Raffle Badge */}
                        {quest.is_raffle && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs px-2 py-1 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            Raffle
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-light-tertiary truncate">
                        {generateTaskDescription(
                          quest.tasks,
                          quest.creator_x_handle
                        )}
                      </p>
                      {/* Raffle Countdown Timer */}
                      {quest.is_raffle && quest.status === "active" && (
                        <div className="mt-1">
                          <RaffleCountdown endDate={quest.end_date} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    {!user ? (
                      <Button
                        size="sm"
                        className="bg-light-primary hover:bg-accent-secondary text-black text-xs font-medium px-3 py-1.5 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          login();
                        }}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Participate"
                        )}
                      </Button>
                    ) : (() => {
                      const requiredWallet = getRequiredWalletForChain(quest.chain || '');
                      const needsWallet = requiredWallet && !user[requiredWallet];
                      
                      if (needsWallet) {
                        const walletType = requiredWallet === 'evm_wallet' ? 'EVM' : 'Solana';
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
                                <p>This quest requires a {walletType} wallet to participate</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      }
                      
                      return getQuestStatusBadge(
                        quest,
                        user,
                        isUserEligible,
                        getEligibilityReason,
                        hasUnderReviewTask,
                        openTaskModal,
                        handleVerifyQuest,
                        verifyingQuestId,
                        openingTaskModalQuestId,
                        true // isMobile
                      );
                    })()}
                  </div>
                </div>

                {/* Details Section */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-light-tertiary mb-1">
                      Claimed by
                    </div>
                    <div className="w-full bg-dark-quaternary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-brand-600 transition-all duration-500"
                        style={{
                          width: `${Math.min(claimedPercentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-white mt-1">
                      {quest.total_claimed || 0}/{quest.total_users_to_reward}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4 text-right">
                    <div className="text-xs text-light-tertiary mb-1">
                      Reward pool
                    </div>
                    <div className="text-sm font-semibold text-light-primary">
                      {quest.reward_system === "custom"
                        ? `${Number(
                            quest.kol_list_data?.find(
                              (kol) => kol.handle === user?.x_handle
                            )?.token_amount || 0
                          ).toFixed(4)} USDC`
                        : `${(
                            quest.reward_pool / quest.total_users_to_reward
                          ).toFixed(4)} USDC`}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Infinite Scroll Loading */}
        {hasMore && (
          <div
            ref={observerTarget}
            className="flex items-center justify-center py-4"
          >
            {loading && (
              <Loader2 className="w-6 h-6 animate-spin text-light-primary" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-light-primary">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Loading quests...</span>
          </div>
        </div>
      )}
      <Table className={loading ? "opacity-50 pointer-events-none" : ""}>
        <TableHeader>
          <TableRow className="border-light-quaternary hover:bg-dark-quaternary/50">
            <TableHead className="text-light-primary font-semibold w-12">
              #
            </TableHead>
            <TableHead className="text-light-primary font-semibold w-80">
              Quest
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold w-32 cursor-pointer hover:bg-dark-quaternary/30 transition-colors select-none group"
              onClick={() => handleSort("claimed_by")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-secondary">
                <span>Claimed by</span>
                {getSortIcon("claimed_by")}
              </div>
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold w-32 cursor-pointer hover:bg-dark-quaternary/30 transition-colors select-none group"
              onClick={() => handleSort("reward_amount")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-secondary">
                <span>Rewards</span>
                {getSortIcon("reward_amount")}
              </div>
            </TableHead>
            <TableHead className="text-light-primary font-semibold w-40">
              Total Reward Pool
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold w-32 cursor-pointer hover:bg-dark-quaternary/30 transition-colors select-none group"
              onClick={() => handleSort("time_left")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-secondary">
                <span>Time Left</span>
                {getSortIcon("time_left")}
              </div>
            </TableHead>
            <TableHead className="text-light-primary font-semibold w-40">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quests.map((quest, index) => {
            const primaryTask =
              quest.tasks && quest.tasks.length > 0 ? quest.tasks[0] : null;
            const taskConfig = primaryTask
              ? taskTypeConfig[primaryTask.task_type]
              : null;
            const isQuestFull =
              (quest.total_claimed || 0) >= quest.total_users_to_reward;
            const claimedPercentage =
              quest.total_users_to_reward > 0
                ? ((quest.total_claimed || 0) / quest.total_users_to_reward) *
                  100
                : 0;

            const isAllowed =
              quest.creator_x_handle === user?.x_handle || user?.is_admin;

            return (
              <TableRow
                key={quest.id}
                className={`border-light-quaternary transition-colors ${
                  quest.start_date && !hasQuestStarted(quest.start_date)
                    ? "opacity-70 cursor-not-allowed"
                    : openingTaskModalQuestId === quest.id
                    ? "opacity-70 bg-dark-alpha-secondary cursor-wait"
                    : verifyingQuestId === quest.id
                    ? "opacity-70 bg-dark-alpha-tertiary cursor-wait"
                    : isAllowed
                    ? "opacity-100 hover:bg-dark-alpha-secondary hover:border-light-primary/30 cursor-pointer group"
                    : "opacity-100"
                }`}
                onClick={() => {
                  // Only allow clicking if quest has started, user is eligible, and user is the creator
                  if (
                    user &&
                    user.evm_wallet &&
                    openingTaskModalQuestId !== quest.id &&
                    (!quest.start_date || hasQuestStarted(quest.start_date))
                  ) {
                    {
                      isAllowed
                        ? handleQuestRowClick(quest)
                        : openTaskModal(quest);
                    }
                  }
                }}
              >
                {/* Row Number */}
                <TableCell className="py-3 text-center">
                  <span className="text-sm text-light-tertiary font-medium">
                    {index + 1}
                  </span>
                </TableCell>

                {/* Quest Column */}
                <TableCell className="py-3">
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {primaryTask && primaryTask.profile_image_url ? (
                        <img
                          src={primaryTask.profile_image_url}
                          alt={
                            primaryTask.target_author_handle ||
                            primaryTask.task_follow_handle ||
                            "Target Author"
                          }
                          className="w-10 h-10 rounded-lg object-cover border border-light-quaternary/50"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.nextElementSibling?.classList.remove(
                              "hidden"
                            );
                          }}
                        />
                      ) : (
                        generateAvatar(quest.creator_x_handle)
                      )}
                    </div>

                    {/* Quest Details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold text-light-primary transition-colors duration-200 flex items-center gap-2 ${
                            isAllowed ? "group-hover:text-light-primary" : ""
                          }`}
                        >
                          {quest.title}
                          {isAllowed && (
                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-light-primary" />
                          )}
                        </h3>

                        {quest.start_date &&
                          !hasQuestStarted(quest.start_date) && (
                            <span className="text-xs text-light-primary font-medium">
                              (Not Started)
                            </span>
                          )}
                      </div>
                      <div className="text-xs text-light-tertiary">
                        {generateTaskDescription(
                          quest.tasks,
                          quest.creator_x_handle
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Claimed by Column */}
                <TableCell className="py-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-light-primary flex items-center gap-2">
                      <>
                        {quest.total_claimed || 0}/{quest.total_users_to_reward}
                      </>
                    </div>
                    <div className="w-full bg-dark-quaternary rounded-full h-2 overflow-hidden border border-light-quaternary/50">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out shadow-sm bg-neutral-100`}
                        style={{
                          width: `${
                            isQuestFull
                              ? "100%"
                              : `${Math.min(claimedPercentage, 100)}%`
                          }`,
                        }}
                      />
                    </div>
                  </div>
                </TableCell>

                {/* Rewards Column */}
                <TableCell className="py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {quest.reward_system === "custom" ? (
                        <span className="text-sm font-bold text-light-primary">
                          {Number(
                            quest.kol_list_data?.find(
                              (kol) => kol.handle === user?.x_handle
                            )?.token_amount || 0
                          ).toFixed(2)}{" "}
                          USDC
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-light-primary">
                          {(
                            quest.reward_pool / quest.total_users_to_reward
                          ).toFixed(2)}{" "}
                          USDC
                        </span>
                      )}
                      <Trophy className="w-4 h-4 text-light-primary" />
                    </div>
                    {quest.reward_system === "custom" ? (
                      <div className="text-xs text-accent-tertiary font-medium">
                        Your Reward
                      </div>
                    ) : (
                      <div className="text-xs text-accent-tertiary font-medium">
                        Per Winner
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Total Reward Pool Column */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-light-primary">
                      {quest.reward_pool.toFixed(2)} USDC
                    </span>
                  </div>
                </TableCell>

                {/* Time Left Column */}
                <TableCell className="py-3">
                  <div className="space-y-1">
                    <div className="text-sm text-light-primary">
                      {quest.start_date &&
                      !hasQuestStarted(quest.start_date) ? (
                        <span className="text-light-primary">
                          Starts in {getTimeUntilStart(quest.start_date)}
                        </span>
                      ) : quest.status === "active" ||
                        quest.status === "draft" ? (
                        <span className="text-light-primary">
                          {getTimeRemaining(quest.end_date)}
                        </span>
                      ) : (
                        "Ended"
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Action Column */}
                <TableCell className="py-3">
                  {!user ? (
                    <Button
                      size="sm"
                      className="btn-primarynew-sm inline-flex items-center justify-center min-w-[100px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        login();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Participate"
                      )}
                    </Button>
                  ) : (() => {
                    const requiredWallet = getRequiredWalletForChain(quest.chain || '');
                    const needsWallet = requiredWallet && !user[requiredWallet];
                    
                    if (needsWallet) {
                      const walletType = requiredWallet === 'evm_wallet' ? 'EVM' : 'Solana';
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
                              <p>This quest requires a {walletType} wallet to participate</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }
                    
                    return getQuestStatusBadge(
                      quest,
                      user,
                      isUserEligible,
                      getEligibilityReason,
                      hasUnderReviewTask,
                      openTaskModal,
                      handleVerifyQuest,
                      verifyingQuestId,
                      openingTaskModalQuestId,
                      false // isMobile
                    );
                  })()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Infinite Scroll Loading */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex items-center justify-center py-4"
        >
          {loading && (
            <Loader2 className="w-6 h-6 animate-spin text-light-primary" />
          )}
        </div>
      )}
      
      {/* Wallet Dialog */}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <UpdateWalletDialog
          onClose={() => setIsWalletDialogOpen(false)}
          open={isWalletDialogOpen}
        />
      </Dialog>
    </div>
  );
}
