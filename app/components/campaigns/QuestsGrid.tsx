"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
  Clock,
  Frown,
  Loader2,
  Trophy,
  Users,
  Gift,
  Timer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProfileImageColors } from "@/hooks/useDominantColor";
import {
  truncateText,
  chainIcon,
  getRequiredWalletForChain,
} from "@/lib/helper";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";

interface QuestsGridProps {
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

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (months > 0) return `${months}m ${days}d`;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Check if quest has started
const hasQuestStarted = (startDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date().getTime() + offset * 60 * 1000;
  const start = new Date(startDate).getTime();
  return now >= start;
};

// Helper function to generate task description
const generateTaskDescription = (
  tasks: QuestTask[] | undefined,
  creatorHandle: string
) => {
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
const generateAvatar = (
  handle: string,
  width: number = 8,
  height: number = 8
) => {
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
      className={`w-${width} h-${height} rounded-full ${colors[colorIndex]} flex items-center justify-center shadow-lg`}
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
  // If quest is targeted to a specific KOL list, and current user isn't on it,
  // mark as Not eligible regardless of other states.
  const kolList: Array<{ handle?: string }> | undefined = (quest as any)
    .kol_list_data;
  if (Array.isArray(kolList) && kolList.length > 0) {
    const userHandle = (
      (user?.twitter_handle as string) ||
      (user?.x_handle as string) ||
      (user?.handle as string) ||
      (user?.username as string) ||
      ""
    ).toLowerCase();

    const allowedHandles = new Set(
      kolList
        .map((k) => (k?.handle || "").toLowerCase())
        .filter((h) => h && h.trim().length > 0)
    );

    if (!allowedHandles.has(userHandle)) {
      return (
        <Badge
          className={`bg-dark-primary text-red-text border-red-text border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
            isMobile
              ? "w-auto px-2 py-1 rounded-lg"
              : "w-[120px] h-7 rounded-md px-3"
          }`}
        >
          {isMobile ? "Not eligible" : "Not eligible"}
          <AlertCircle className="w-4 h-4 ml-1" />
        </Badge>
      );
    }
  }

  // Check if quest has started first
  if (quest.start_date && !hasQuestStarted(quest.start_date)) {
    const timeUntilStart = getTimeUntilStart(quest.start_date);
    return (
      <Badge
        className={`bg-dark-primary text-light-tertiary border-light-tertiary hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
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
    const eligibilityReason = getEligibilityReason(quest);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className={`bg-dark-primary text-red-text border-red-text border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between cursor-pointer ${
                isMobile
                  ? "w-auto px-2 py-1 rounded-lg"
                  : "w-[120px] h-7 rounded-md px-3"
              }`}
              // onClick={(e) => {
              //   e.stopPropagation();
              //   openTaskModal(quest);
              // }}
            >
              {isMobile ? "Not eligible" : "Not eligible"}
              <AlertCircle className="w-4 h-4 ml-1" />
            </Badge>
          </TooltipTrigger>
          {eligibilityReason && (
            <TooltipContent>
              <p>{eligibilityReason}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
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
          className={`bg-dark-primary text-light-primary border-light-primary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
            isMobile
              ? "w-auto px-2 py-1 rounded-lg"
              : "w-[120px] h-7 rounded-md px-3"
          } ${!quest.celebrated ? "animate-shining" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            const transactionUrl = getTransactionUrl(
              quest.chain || "",
              taskWithTxHash?.user_tx_hash || ""
            );
            window.open(transactionUrl, "_blank");
          }}
        >
          {quest.celebrated ? (
            <Trophy className="w-3 h-3 ml-1 text-yellow-text" />
          ) : (
            <Trophy className="w-3 h-3 ml-1" />
          )}
          ${Number(rewardAmount).toFixed(2)}
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </Badge>
      );
    } else {
      // For raffle quests, show "You are eligible for Raffle" when all tasks completed but no tx hash
      if (quest.is_raffle) {
        return (
          <Badge
            className={`bg-dark-primary text-light-primary border-light-primary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
              isMobile
                ? "w-auto px-2 py-1 rounded-lg"
                : "w-[150px] h-7 rounded-md px-3"
            }`}
          >
            {isMobile ? "Eligible for Raffle" : "Eligible for Raffle"}
            <Gift className="w-4 h-4 ml-1" />
          </Badge>
        );
      }

      // For non-raffle quests, IF pool is exhausted or quest ended → show Missed; ELSE show Claim
      if (!quest.is_raffle) {
        const isQuestFull =
          (quest.total_claimed || 0) >= (quest.total_users_to_reward || 0);
        const isQuestEnded = (() => {
          const now = new Date();
          const nowISO = now.toISOString().slice(0, 19);
          return quest.end_date < nowISO || quest.status !== "active";
        })();

        if (isQuestFull || isQuestEnded) {
          return (
            <Badge
              className={`bg-dark-primary text-red-text border-red-text border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
                isMobile
                  ? "w-auto px-2 py-1 rounded-lg"
                  : "w-[100px] h-7 rounded-md px-3"
              }`}
            >
              Missed
              <AlertCircle className="w-4 h-4 ml-1" />
            </Badge>
          );
        }

        return (
          <Badge
            className={`bg-light-primary text-black border-light-primary border-[1px] hover:bg-light-secondary font-medium text-xs flex items-center justify-between ${
              isMobile
                ? "w-auto px-2 py-1 rounded-lg"
                : "w-[120px] h-7 rounded-md px-3"
            }`}
          >
            Claim
            <ArrowUpRight className="w-4 h-4 ml-1" />
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
            className={`bg-dark-primary text-light-tertiary border-light-tertiary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
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
        // onClick={(e) => {
        //   e.stopPropagation();
        //   handleVerifyQuest(quest);
        // }}
        disabled={isVerifying}
        className={`bg-dark-alpha-tertiary text-light-tertiary border-light-tertiary border-[1px] hover:bg-dark-alpha-tertiary font-medium text-xs flex items-center justify-between ${
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

  // Condition 4: User has completed some tasks but not all - show time left instead of continue button
  if (completedTasks.length > 0 && completedTasks.length < totalTasks) {
    const timeInfo =
      quest.start_date && !hasQuestStarted(quest.start_date)
        ? `Starts in ${getTimeUntilStart(quest.start_date)}`
        : quest.status === "active" || quest.status === "draft"
        ? ` ${getTimeRemaining(quest.end_date)} left`
        : "Ended";

    return (
      <div
        className={` ${
          timeInfo == "Ended"
            ? "bg-dark-primary text-red-text border-red-text border-[1px]"
            : "bg-light-primary text-black"
        } font-medium text-xs flex items-center justify-center ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "min-w-[100px] px-2 py-1 rounded-sm"
        }`}
      >
        <Clock className="w-4 h-4 mr-1" />
        <span>{timeInfo}</span>
        {timeInfo !== "Ended" && <ArrowUpRight className="w-4 h-4 ml-1" />}
      </div>
    );
  }

  // Check if quest is full or ended (only if user hasn't participated)
  const isQuestFull = (quest.total_claimed || 0) >= quest.total_users_to_reward;
  // const isQuestEnded =
  //   quest.status !== "active" || new Date(quest.end_date) < new Date();
  const isQuestEnded = (() => {
    const now = new Date();
    // Format current time in same ISO format as quest dates (UTC)
    const nowISO = now.toISOString().slice(0, 19); // "2025-09-23T06:05:56"

    return quest.end_date < nowISO;
  })();
  // Condition 5: Quest is full or ended (only for users who haven't participated)
  if (isQuestFull || isQuestEnded || quest?.status === "completed") {
    return (
      <Badge
        className={`bg-dark-primary text-red-text border-red-text border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[100px] h-7 rounded-md px-3"
        }`}
      >
        {isMobile ? "Missed" : "Missed"}
        <AlertCircle className="w-4 h-4 ml-1" />
      </Badge>
    );
  }

  // Condition 6: User is eligible and has not participated (clean slate) - show time left instead of start button
  const timeInfo =
    quest.start_date && !hasQuestStarted(quest.start_date)
      ? `Starts in ${getTimeUntilStart(quest.start_date)}`
      : quest.status === "active" || quest.status === "draft"
      ? ` ${getTimeRemaining(quest.end_date)} left`
      : "Ended";

  return (
    <div
      className={` ${
        timeInfo == "Ended"
          ? "bg-dark-primary text-red-text border-red-text border-[1px]"
          : "bg-light-primary text-black"
      } font-medium text-xs flex items-center justify-center ${
        isMobile
          ? "w-auto px-2 py-1 rounded-lg"
          : "min-w-[100px] px-2 py-1 rounded-sm"
      }`}
    >
      <Clock className="w-4 h-4 mr-1" />
      <span>{timeInfo}</span>
      {timeInfo !== "Ended" && <ArrowUpRight className="w-4 h-4 ml-1" />}
    </div>
  );
};

export default function QuestsGrid({
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
}: QuestsGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  // Extract and console log dominant colors from profile images
  const profileColors = useProfileImageColors(quests, true);

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

  // Function to handle quest card click for navigation
  const handleQuestCardClick = (quest: Quest) => {
    if (!user) {
      login();
      return;
    }

    // For non-raffle quests, require specific wallet based on chain
    if (!quest.is_raffle) {
      const requiredWallet = getRequiredWalletForChain(quest.chain || "");
      if (requiredWallet && !user[requiredWallet]) {
        setIsWalletDialogOpen(true);
        return;
      }
    }

    router.push(`/campaigns/${quest.sharable_id}`);
  };

  if (loading && quests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-light-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg font-medium">Loading quests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 mb-8 mx-2">
        {quests.map((quest, index) => {
          const primaryTask =
            quest.tasks && quest.tasks.length > 0 ? quest.tasks[0] : null;
          const isQuestFull =
            (quest.total_claimed || 0) >= quest.total_users_to_reward;
          const claimedPercentage =
            quest.total_users_to_reward > 0
              ? ((quest.total_claimed || 0) / quest.total_users_to_reward) * 100
              : 0;

          const isAllowed = true;

          const timeInfo =
            quest.start_date && !hasQuestStarted(quest.start_date)
              ? `Starts in ${getTimeUntilStart(quest.start_date)}`
              : quest.status === "active" || quest.status === "draft"
              ? ` ${getTimeRemaining(quest.end_date)} left`
              : "Ended";

          return (
            <div
              key={quest.id}
              className={`rounded-xl p-4 transition-all duration-200 relative overflow-hidden border border-light-quaternary/40 hover:scale-[1.04]
               ${
                 quest.start_date && !hasQuestStarted(quest.start_date)
                   ? "opacity-70 cursor-not-allowed"
                   : openingTaskModalQuestId === quest.id
                   ? "opacity-70 cursor-wait"
                   : verifyingQuestId === quest.id
                   ? "opacity-70 cursor-wait"
                   : isAllowed
                   ? "opacity-100 hover:bg-dark-quaternary cursor-pointer"
                   : "opacity-100 hover:bg-dark-quaternary cursor-pointer"
               }`}
              style={{
                background: profileColors[quest.id]
                  ? (() => {
                      // Create a lighter, more vibrant version of the dominant color
                      const hex = profileColors[quest.id];
                      const rgb = parseInt(hex.slice(1), 16);
                      const r = (rgb >> 16) & 255;
                      const g = (rgb >> 8) & 255;
                      const b = rgb & 255;

                      // Calculate brightness and create lighter variant for darker colors
                      const brightness = (r + g + b) / 3;
                      const isDarkColor = brightness < 100;

                      if (isDarkColor) {
                        // For dark colors, create a lighter, more vibrant version
                        const lightenFactor = 1.8;
                        const lightR = Math.min(
                          255,
                          Math.round(r * lightenFactor)
                        );
                        const lightG = Math.min(
                          255,
                          Math.round(g * lightenFactor)
                        );
                        const lightB = Math.min(
                          255,
                          Math.round(b * lightenFactor)
                        );
                        const lightHex = `#${lightR
                          .toString(16)
                          .padStart(2, "0")}${lightG
                          .toString(16)
                          .padStart(2, "0")}${lightB
                          .toString(16)
                          .padStart(2, "0")}`;

                        return `radial-gradient(ellipse at center top, ${lightHex}70 0%, ${lightHex}50 25%, ${lightHex}30 40%, ${hex}20 70%, transparent 85%)`;
                      } else {
                        // For bright colors, use original color
                        return `radial-gradient(ellipse at center top, ${hex}30 0%, ${hex}20 25%, ${hex}15 50%, transparent 80%)`;
                      }
                    })()
                  : "transparent",
              }}
              onClick={() => {
                if (
                  openingTaskModalQuestId !== quest.id &&
                  (!quest.start_date || hasQuestStarted(quest.start_date))
                ) {
                  handleQuestCardClick(quest);
                }
              }}
            >
              {/* Top Section - Reward Amount and Action Button */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="bg-dark-alpha-secondary rounded-full px-1.5 py-1.5 flex items-center gap-2 border border-dark-alpha-tertiary">
                    <span className="text-white text-sm font-medium">
                      {quest.reward_pool
                        // quest.reward_pool / quest.total_users_to_reward
                        .toFixed(0)}{" "}
                      USDC
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full px-1.5 py-1.5 flex items-center gap-2 border border-dark-alpha-tertiary ${
                        quest.is_raffle
                          ? "bg-[linear-gradient(180deg,_#5A3636_6.53%,_#0A0A0A_111.36%)]"
                          : quest.reward_system === "custom"
                          ? "bg-[linear-gradient(180deg,_#1e3a5f_6.53%,_#0A0A0A_111.36%)]"
                          : "bg-[linear-gradient(180deg,_#2D4A22_6.53%,_#0A0A0A_111.36%)]"
                      }`}
                    >
                      {/* <Gift className="w-4 h-4" /> */}
                      <span className="text-white text-sm">
                        {quest.is_raffle
                          ? "Raffle"
                          : quest.reward_system === "custom"
                          ? "Targeted"
                          : "FCFS"}
                      </span>
                    </div>
                    {quest.chain && (
                      <div className="bg-dark-alpha-secondary rounded-full px-1.5 py-1.5 flex items-center gap-2 border border-dark-alpha-tertiary">
                        <img
                          src={chainIcon(quest.chain)}
                          alt={quest.chain}
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  {!user ? (
                    <Button
                      size="sm"
                      className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        login();
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Connecting..." : "Participate"}
                    </Button>
                  ) : (
                    (() => {
                      const requiredWallet = getRequiredWalletForChain(
                        quest.chain || ""
                      );
                      const needsWallet =
                        requiredWallet && !user[requiredWallet];

                      if (needsWallet) {
                        const walletType =
                          requiredWallet === "evm_wallet" ? "EVM" : "Solana";
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
                                  This quest requires a {walletType} wallet to
                                  participate
                                </p>
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
                        isMobile
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Campaign Title */}
              <div className="h-[69px] mb-2 flex items-start gap-3">
                <div className="relative">
                  {primaryTask && primaryTask.profile_image_url ? (
                    <img
                      src={primaryTask.profile_image_url}
                      alt={quest.title}
                      className="w-8 h-8 rounded-xl object-cover"
                    />
                  ) : (
                    generateAvatar(quest.creator_x_handle)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-xl font-semibold line-clamp-2 mb-2">
                    {truncateText(quest.title, 25)}
                  </h3>
                </div>
              </div>

              {/* Stats Section */}
              <div className="space-y-4 relative">
                {/* Participants and Time */}
                <div className="flex items-start gap-4 flex-row justify-start">
                  <div className="flex flex-row gap-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        {quest.total_claimed || 0}/{quest.total_users_to_reward}{" "}
                        Winners
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 text-sm">
                        {quest.total_participants || 0} Participants
                      </span>
                    </div>
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">{timeInfo}</span>
                  </div> */}
                </div>

                {/* Profile Image in Bottom Right */}
                <div className="absolute -bottom-8 -right-8">
                  {primaryTask && primaryTask.profile_image_url ? (
                    <img
                      src={primaryTask.profile_image_url}
                      alt={quest.title}
                      className="w-24 h-24 rounded-full object-cover opacity-50"
                    />
                  ) : (
                    <div className="opacity-50">
                      {generateAvatar(quest.creator_x_handle, 24, 24)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Wallet Dialog - rendered outside the quest cards to avoid nesting issues */}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <UpdateWalletDialog
          onClose={() => setIsWalletDialogOpen(false)}
          open={isWalletDialogOpen}
        />
      </Dialog>
    </div>
  );
}
