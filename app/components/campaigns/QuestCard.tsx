"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { Quest, QuestDetails, QuestTask } from "@/lib/types";
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
import { useDominantColor } from "@/hooks/useDominantColor";
import { getRequiredWalletForChain, chainIcon } from "@/lib/helper";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";

interface QuestCardProps {
  quest: Quest | QuestDetails;
  user: any;
  isUserEligible: (quest: Quest | QuestDetails) => boolean;
  getEligibilityReason: (quest: Quest | QuestDetails) => string | null;
  openTaskModal: (quest: Quest | QuestDetails) => void;
  hasUnderReviewTask: (quest: Quest | QuestDetails) => boolean;
  handleVerifyQuest: (quest: Quest | QuestDetails) => void;
  verifyingQuestId: string | null;
  login: () => void;
  isProcessing: boolean;
  isFullWidth?: boolean;
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
    <div className="flex items-center gap-2">
      <Timer className="w-4 h-4 text-gray-400" />
      <span className="text-gray-400 text-sm">{timeLeft}</span>
    </div>
  );
};

// Utility functions (extracted from QuestsGrid.tsx)
const hasQuestStarted = (startDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date();
  const start = new Date(startDate);
  const nowUTC = now.getTime() + offset * 60 * 1000;
  const startUTC = start.getTime();
  return nowUTC >= startUTC;
};

const getTimeUntilStart = (startDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date();
  const start = new Date(startDate);
  const nowUTC = now.getTime() + offset * 60 * 1000;
  const startUTC = start.getTime();
  const diff = startUTC - nowUTC;

  if (diff <= 0) return "Started";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getTimeRemaining = (endDate: string) => {
  const offset = new Date().getTimezoneOffset();
  const now = new Date();
  const end = new Date(endDate);
  const nowUTC = now.getTime() + offset * 60 * 1000;
  const endUTC = end.getTime();
  const diff = endUTC - nowUTC;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "0m";
};

const generateAvatar = (
  handle?: string,
  width: number = 8,
  height: number = 8
) => {
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-light-primary to-accent-tertiary flex items-center justify-center text-dark-primary text-sm font-semibold`}
      style={{ width: `${width * 4}px`, height: `${height * 4}px` }}
    >
      {handle?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
};

const getQuestStatusBadge = (
  quest: Quest | QuestDetails,
  user: any,
  isUserEligible: (quest: Quest | QuestDetails) => boolean,
  getEligibilityReason: (quest: Quest | QuestDetails) => string | null,
  hasUnderReviewTask: (quest: Quest | QuestDetails) => boolean,
  openTaskModal: (quest: Quest | QuestDetails) => void,
  handleVerifyQuest: (quest: Quest | QuestDetails) => void,
  verifyingQuestId: string | null,
  isMobile: boolean = false
) => {
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
    return (
      <Badge
        className={`bg-dark-primary text-red-text border-red-text border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between cursor-pointer ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] h-7 rounded-md px-3"
        }`}
        // onClick={(e) => {
        //   e.stopPropagation();
        //   openTaskModal(quest);
        // }}
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
          className={`bg-dark-primary text-light-primary border-light-primary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
            isMobile
              ? "w-auto px-2 py-1 rounded-lg"
              : "w-[150px] h-7 rounded-md px-3"
          } ${!(quest as any).celebrated ? "animate-shining" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            const transactionUrl = getTransactionUrl(
              quest.chain || "",
              taskWithTxHash?.user_tx_hash || ""
            );
            window.open(transactionUrl, "_blank");
          }}
        >
          {isMobile ? "" : "Earned "}${Number(rewardAmount).toFixed(2)}
          {(quest as any).celebrated ? (
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

      // Check if there are still rewards left in the pool
      const usersWithRewards = quest.total_claimed || 0;
      const totalRewardsAvailable = quest.total_users_to_reward || 0;

      if (totalRewardsAvailable < usersWithRewards) {
        // No rewards left - user completed all tasks but too late
        return (
          <Badge
            className={`bg-dark-primary text-dark-primary border-light-tertiary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
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
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            Verifying
          </>
        ) : (
          "Under Review"
        )}
      </Button>
    );
  }

  // Condition 4: Show progress when some tasks are completed
  if (completedTasks.length > 0 && completedTasks.length < totalTasks) {
    const progressText = `${completedTasks.length}/${totalTasks}`;
    return (
      <Badge
        className={`bg-dark-primary text-light-primary border-light-primary border-[1px] hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
          isMobile
            ? "w-auto px-2 py-1 rounded-lg"
            : "w-[150px] h-7 rounded-md px-3"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          openTaskModal(quest);
        }}
      >
        {isMobile ? progressText : `Progress: ${progressText}`}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Badge>
    );
  }

  // Condition 5: Default participate button for quests that have started
  if (!quest.start_date || hasQuestStarted(quest.start_date)) {
    return (
      <Button
        size="sm"
        className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-3 py-1 rounded-sm"
        onClick={(e) => {
          e.stopPropagation();
          openTaskModal(quest);
        }}
      >
        Participate
      </Button>
    );
  }

  // Fallback for any other cases
  return (
    <Badge
      className={`bg-dark-primary text-light-tertiary border-light-tertiary hover:bg-dark-alpha-secondary font-medium text-xs flex items-center justify-between ${
        isMobile
          ? "w-auto px-2 py-1 rounded-lg"
          : "w-[150px] h-7 rounded-md px-3"
      }`}
    >
      Loading...
    </Badge>
  );
};

export const QuestCard = ({
  quest,
  user,
  isUserEligible,
  getEligibilityReason,
  openTaskModal,
  hasUnderReviewTask,
  handleVerifyQuest,
  verifyingQuestId,
  login,
  isProcessing,
  isFullWidth = false,
}: QuestCardProps) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const { dominantColor } = useDominantColor(
    quest.tasks?.[0]?.profile_image_url
  );

  const primaryTask =
    quest.tasks && quest.tasks.length > 0 ? quest.tasks[0] : null;
  const isQuestFull = (quest.total_claimed || 0) >= quest.total_users_to_reward;
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

  const handleQuestCardClick = useCallback(
    (quest: Quest | QuestDetails) => {
      const shareableId =
        (quest as Quest).sharable_id || (quest as QuestDetails).id;
      router.push(`/campaigns/${shareableId}`);
    },
    [router]
  );

  return (
    <div
      className={`rounded-xl p-4 sm:p-6 transition-all duration-200 relative overflow-hidden border ${
        quest.is_raffle
          ? "border-light-primary/60"
          : "border-light-quaternary/20 "
      } ${
        quest.start_date && !hasQuestStarted(quest.start_date)
          ? "opacity-70 cursor-not-allowed"
          : verifyingQuestId === quest.id
          ? "opacity-70 cursor-wait"
          : isAllowed
          ? isFullWidth
            ? "cursor-default"
            : "opacity-100 hover:bg-dark-quaternary cursor-pointer"
          : "opacity-100 hover:bg-dark-quaternary cursor-pointer"
      }`}
      style={{
        background:
          dominantColor && dominantColor !== "#000000"
            ? (() => {
                // Create a lighter, more vibrant version of the dominant color
                const hex = dominantColor;
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
                  const lightR = Math.min(255, Math.round(r * lightenFactor));
                  const lightG = Math.min(255, Math.round(g * lightenFactor));
                  const lightB = Math.min(255, Math.round(b * lightenFactor));
                  const lightHex = `#${lightR
                    .toString(16)
                    .padStart(2, "0")}${lightG
                    .toString(16)
                    .padStart(2, "0")}${lightB.toString(16).padStart(2, "0")}`;

                  return `radial-gradient(ellipse at center top, ${lightHex}70 0%, ${lightHex}50 25%, ${lightHex}30 40%, ${hex}20 70%, transparent 85%)`;
                } else {
                  // For bright colors, use original color
                  return `radial-gradient(ellipse at center top, ${hex}30 0%, ${hex}20 25%, ${hex}15 50%, transparent 80%)`;
                }
              })()
            : "transparent",
      }}
      onClick={() => {
        if (isFullWidth) return; // Don't navigate on click for full-width version
        if (!quest.start_date || hasQuestStarted(quest.start_date)) {
          handleQuestCardClick(quest);
        }
      }}
    >
      {/* Top Section - Reward Amount and Action Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="bg-dark-alpha-secondary rounded-full px-1.5 py-1.5 flex items-center gap-2 border border-dark-alpha-tertiary">
            <span className="text-white text-sm font-medium">
              {quest.reward_pool % 1 === 0
                ? quest.reward_pool.toFixed(0)
                : quest.reward_pool.toFixed(1)}{" "}
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
              <Gift className="w-4 h-4" />
              <span className="text-white text-sm">
                {quest.is_raffle
                  ? "Raffle"
                  : quest.reward_system === "custom"
                  ? "Targeted"
                  : "FCFS"}
              </span>
            </div>
            {quest.chain && (
              <div className="inline-flex bg-dark-alpha-secondary border border-dark-alpha-tertiary rounded-md px-1.5 py-0.5 items-center gap-1">
                <img
                  src={chainIcon(quest.chain)}
                  alt={quest.chain}
                  className="w-3 h-3 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="hidden sm:inline text-xs text-light-tertiary font-normal">
                  {quest.chain.charAt(0).toUpperCase() + quest.chain.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Show time in top right */}
        {isMobile && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">{timeInfo}</span>
          </div>
        )}

        {/* <div className="flex justify-end">
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
          ) : !user.evm_wallet ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openWalletModal();
              }}
              disabled={connectingWallet}
              className="bg-light-primary hover:bg-light-secondary text-black font-medium text-xs flex items-center justify-between px-2 py-1 rounded-sm"
            >
              {connectingWallet ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Connecting...
                </>
              ) : (
                <>Add Wallet</>
              )}
            </Button>
          ) : (
            getQuestStatusBadge(
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
            )
          )}
        </div> */}
      </div>

      {/* Campaign Title */}
      <div
        className={`${
          isFullWidth ? "h-auto mb-4" : "h-[69px] mb-2"
        } flex items-start gap-3`}
      >
        <div className="relative">
          {primaryTask && primaryTask.profile_image_url ? (
            <img
              src={primaryTask.profile_image_url}
              alt={quest.title}
              className={`${
                isFullWidth ? "w-12 h-12" : "w-8 h-8"
              } rounded-xl object-cover`}
            />
          ) : (
            generateAvatar(quest.creator_x_handle)
          )}
        </div>
        <div className="flex-1">
          <h3
            className={`${
              isFullWidth
                ? isMobile
                  ? "text-xl"
                  : "text-3xl sm:text-4xl"
                : "text-xl"
            } text-white font-semibold ${
              isFullWidth ? "leading-tight mb-2" : "line-clamp-2 mb-2"
            }`}
          >
            {quest.title}
          </h3>
        </div>
      </div>

      {/* Stats Section */}
      <div className="space-y-4 relative">
        {/* Participants and Time */}
        <div
          className={`flex items-start gap-4 ${
            isFullWidth ? "flex-row justify-start" : "flex-row justify-start"
          }`}
        >
          <div
            className={`flex flex-row gap-4 ${
              isFullWidth ? (isMobile ? "gap-2" : "gap-6") : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">
                {quest.total_participants || 0} Participants
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm">
                {quest.total_claimed || 0}/{quest.total_users_to_reward} Winners
              </span>
            </div>
            {!isMobile && (
              <div className="flex items-center gap-2 ">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400 text-sm">{timeInfo}</span>
              </div>
            )}
          </div>
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

      {/* Wallet Dialog */}
      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <UpdateWalletDialog
          onClose={() => setIsWalletDialogOpen(false)}
          open={isWalletDialogOpen}
        />
      </Dialog>
    </div>
  );
};
