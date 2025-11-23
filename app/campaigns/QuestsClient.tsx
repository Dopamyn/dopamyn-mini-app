"use client";

import QuestsGrid from "@/app/components/campaigns/QuestsGrid";
import TaskDetailsModal from "@/app/components/campaigns/TaskDetailsModal";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@/contexts/UserContext";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { useHeader } from "@/contexts/HeaderContext";
import { Quest, QuestTask } from "@/lib/types";
import confetti from "canvas-confetti";
import { ChevronDown, ChevronUp, Loader2, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import QuestCelebrationModal from "../components/campaigns/QuestCelebrationModal";
import TelegramBotJoin from "@/components/TelegramBotJoin";
import { useToast } from "@/hooks/use-toast";
import { getTransactionUrl } from "@/lib/utils";

interface QuestFilters {
  status?: string;
  creator?: string;
  reward_system?: string;
}

interface SortConfig {
  key: "reward_amount" | "claimed_by" | "time_left" | null;
  direction: "asc" | "desc";
}

async function getQuests(
  filters: QuestFilters = {},
  start: number = 0,
  limit: number = 20
) {
  try {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all")
      params.append("status", filters.status);
    if (filters.creator) params.append("creator", filters.creator);
    if (filters.reward_system && filters.reward_system !== "all")
      params.append("reward_system", filters.reward_system);

    // Add pagination parameters
    params.append("start", start.toString());
    params.append("limit", limit.toString());

    const queryString = params.toString();
    const url = `/api/quests/list${queryString ? `?${queryString}` : ""}`;

    // Get token from localStorage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    const data = await response.json();

    // Handle both new API response (with total) and legacy response
    const quests = data.data || [];
    const total = data.total || quests.length;

    return {
      quests: quests,
      total: total,
    };
  } catch (error) {
    console.error("Error fetching quests:", error);
    return { quests: [], total: 0 };
  }
}

// Generate Twitter intent URL for tasks
const getTwitterIntentUrl = (task: QuestTask) => {
  const { task_type, task_follow_handle, task_tweet_id, target_author_handle } =
    task;

  // Use target_author_handle if available, otherwise fall back to task_follow_handle
  const targetHandle = target_author_handle || task_follow_handle;

  // Remove @ symbol if present in handle and ensure we have a valid handle
  const cleanHandle = targetHandle ? targetHandle.replace("@", "").trim() : "";

  if (!cleanHandle && task_type !== "tweet") {
    console.warn("No target handle found for task:", task);
    return "https://x.com";
  }

  switch (task_type) {
    case "follow":
      // Direct follow intent
      return `https://x.com/intent/follow?screen_name=${cleanHandle}`;
    case "tweet":
      // Compose tweet with pre-filled content
      let tweetText = "";
      if (task.task_type === "tweet" && task.task_tweet_cashtag) {
        tweetText += `$${task.task_tweet_cashtag} `;
      }
      if (task.task_type === "tweet" && task.task_tweet_hashtag) {
        tweetText += `#${task.task_tweet_hashtag} `;
      }
      if (task.task_type === "tweet" && task.task_tweet_handle) {
        tweetText += `@${task.task_tweet_handle} `;
      }
      if (task.task_type === "tweet" && task.task_tweet_website) {
        tweetText += `${task.task_tweet_website}`;
      }
      const encodedText = encodeURIComponent(tweetText.trim());
      return `https://x.com/intent/tweet?text=${encodedText}`;
    case "retweet":
      // Retweet specific tweet
      if (!task_tweet_id) {
        console.warn("No tweet ID found for retweet task:", task);
        return `https://x.com/${cleanHandle}`;
      }
      return `https://x.com/intent/retweet?tweet_id=${task_tweet_id}`;
    case "reply":
      // Reply to specific tweet
      if (!task_tweet_id) {
        console.warn("No tweet ID found for reply task:", task);
        return `https://x.com/${cleanHandle}`;
      }
      return `https://x.com/intent/tweet?in_reply_to=${task_tweet_id}`;
    case "quote_tweet":
      let quoteText = "";
          quoteText += `{Share your thoughts about this post}`;
      // Quote tweet with specific tweet - include the tweet URL in the text
      if (!task_tweet_id) {
        console.warn("No tweet ID found for quote tweet task:", task);
        return `https://x.com/intent/tweet?text=${cleanHandle}`;
      }
      return `https://x.com/intent/tweet?text=${encodeURIComponent(
        quoteText.trim()
      )}&url=https://x.com/i/status/${task_tweet_id}`;
    default:
      // Fallback to X home
      return "https://x.com";
  }
};

export default function QuestsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Extract filter values from searchParams to avoid unnecessary re-renders
  const statusParam = searchParams.get("status");
  const creatorParam = searchParams.get("creator");
  const rewardSystemParam = searchParams.get("reward_system");

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [verifyingQuestId, setVerifyingQuestId] = useState<string | null>(null);
  const [lastVerificationTimestamps, setLastVerificationTimestamps] = useState<
    Record<string, number>
  >({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isStartingTask, setIsStartingTask] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: "asc",
  });
  const [hasMore, setHasMore] = useState(true);
  const [pageFromUrl, setPageFromUrl] = useState(1);
  const { user, refreshUser } = useUser();
  const { setHeaderContent } = useHeader();
  const { login, isProcessing } = useTwitterDatabaseSync();
  const { toast } = useToast();
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [questToCelebrate, setQuestToCelebrate] = useState<Quest | null>(null);
  const [celebratedQuestIds, setCelebratedQuestIds] = useState<Set<string>>(
    () => {
      // Initialize from localStorage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("celebratedQuestIds");
        return stored ? new Set(JSON.parse(stored)) : new Set();
      }
      return new Set();
    }
  );

  const status = statusParam;
  const creator = creatorParam || undefined;
  const reward_system = rewardSystemParam ?? undefined;

  const filters: QuestFilters = useMemo(
    () => ({
      status: status === "all" || status == null ? undefined : status,
      creator,
      reward_system:
        reward_system === "all" || reward_system == null
          ? undefined
          : reward_system,
    }),
    [status, creator, reward_system]
  );

  // Note: Removed auto-close effect to allow editing existing wallet

  const updateQueryParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const newUrl = `${pathname}?${params.toString()}`;
      router.push(newUrl);
    },
    [pathname, router, searchParams]
  );

  // Set header content for campaigns page
  useEffect(() => {
    setHeaderContent(
      <div className="flex items-center gap-4">
        {/* <h1 className="text-xl font-semibold">Campaigns</h1> */}
        {/* <Badge
          variant="secondary"
          className="bg-accent-brand/20 text-accent-brand border-accent-brand/30"
        >
          Active Campaigns
        </Badge> */}
      </div>
    );

    // Cleanup when component unmounts
    return () => setHeaderContent(null);
  }, [setHeaderContent]);

  const QUEST_PER_PAGE = 10;

  useEffect(() => {
    const fetchQuestsForUrl = async () => {
      setLoading(true);
      setPageFromUrl(1); // Reset page when filters change
      setHasMore(true); // Reset hasMore when filters change

      const currentFilters: QuestFilters = {
        status:
          statusParam === "all" || statusParam === null
            ? undefined
            : statusParam || undefined,
        creator: creatorParam || undefined,
        reward_system:
          rewardSystemParam === "all"
            ? undefined
            : rewardSystemParam || undefined,
      };

      const result = await getQuests(currentFilters, 0, QUEST_PER_PAGE);

      setQuests(result.quests);
      setHasMore(result.quests.length === QUEST_PER_PAGE);
      setLoading(false);
    };

    fetchQuestsForUrl();
  }, [statusParam, creatorParam, rewardSystemParam]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const currentFilters: QuestFilters = {
      status:
        statusParam === "all" || statusParam === null
          ? undefined
          : statusParam || undefined,
      creator: creatorParam || undefined,
      reward_system:
        rewardSystemParam === "all"
          ? undefined
          : rewardSystemParam || undefined,
    };

    const nextPage = pageFromUrl + 1;
    const start = (nextPage - 1) * QUEST_PER_PAGE;

    const result = await getQuests(currentFilters, start, QUEST_PER_PAGE);

    if (result.quests.length > 0) {
      setQuests((prev) => [...prev, ...result.quests]);
      setPageFromUrl(nextPage);
      setHasMore(result.quests.length === QUEST_PER_PAGE);
    } else {
      setHasMore(false);
    }
  }, [
    loading,
    hasMore,
    pageFromUrl,
    statusParam,
    creatorParam,
    rewardSystemParam,
  ]);

  // Check if "My Quests" filter is active
  const isMyQuestsChecked = !!creatorParam;

  // Sorting functions
  const sortQuests = useCallback((quests: Quest[], sortConfig: SortConfig) => {
    if (!sortConfig.key) return quests;

    return [...quests].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case "reward_amount":
          aValue = a.reward_pool / a.total_users_to_reward;
          bValue = b.reward_pool / b.total_users_to_reward;
          break;
        case "claimed_by":
          aValue = (a.total_claimed || 0) / a.total_users_to_reward;
          bValue = (b.total_claimed || 0) / b.total_users_to_reward;
          break;
        case "time_left":
          const now = new Date();
          aValue = new Date(a.end_date).getTime() - now.getTime();
          bValue = new Date(b.end_date).getTime() - now.getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, []);

  // Sorted quests
  const sortedQuests = useMemo(() => {
    return sortQuests(quests, sortConfig);
  }, [quests, sortConfig, sortQuests]);

  // Handle sort column click
  const handleSort = useCallback((key: SortConfig["key"]) => {
    setIsSorting(true);
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    // Small delay to show loading state
    setTimeout(() => setIsSorting(false), 100);
  }, []);

  // Get sort icon for column
  const getSortIcon = useCallback(
    (key: SortConfig["key"]) => {
      if (isSorting && sortConfig.key === key) {
        return <Loader2 className="w-4 h-4 animate-spin text-light-primary" />;
      }
      if (sortConfig.key !== key) {
        return (
          <div className="flex flex-col -space-y-1">
            <ChevronUp className="w-3 h-3 text-light-tertiary" />
            <ChevronDown className="w-3 h-3 text-light-tertiary" />
          </div>
        );
      }
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="w-4 h-4 text-light-primary" />
      ) : (
        <ChevronDown className="w-4 h-4 text-light-primary" />
      );
    },
    [sortConfig.key, sortConfig.direction, isSorting]
  );

  // Helper function to get specific eligibility reason
  const getEligibilityReason = useCallback(
    (quest: Quest): string | null => {
      if (!user) return null;

      // Check follower criteria first (applies to all reward systems)
      if (quest.criteria && quest.criteria.length > 0) {
        const failingReasons: string[] = [];

        for (const criterion of quest.criteria) {
          if (criterion.criteria === "min_followers") {
            if ((user.followers || 0) < criterion.count) {
              failingReasons.push(
                `Minimum ${criterion.count} followers required (you have ${
                  user.followers || 0
                })`
              );
            }
          } else if (criterion.criteria === "min_smart_followers") {
            if ((user.smart_followers || 0) < criterion.count) {
              failingReasons.push(
                `Minimum ${
                  criterion.count
                } smart followers required (you have ${
                  user.smart_followers || 0
                })`
              );
            }
          } else if (criterion.criteria === "is_verified_account") {
            if (!user.is_verified) {
              failingReasons.push(
                "This quest requires a verified account"
              );
            }
          } else if (criterion.criteria === "is_smart_account") {
            if (!user.is_smart_account) {
              failingReasons.push(
                "This quest requires a smart account"
              );
            }
          }
        }

        // Return combined reasons if any criteria failed
        if (failingReasons.length > 0) {
          return failingReasons.join("\n");
        }
      }

      // Check custom reward system eligibility
      if (quest.reward_system === "custom" && user?.x_handle) {
        const userHandle = user.x_handle.toLowerCase().trim();

        // Check if user is in eligible_kol_list (simple array of handles)
        if (quest.eligible_kol_list && quest.eligible_kol_list.length > 0) {
          if (
            quest.eligible_kol_list.some(
              (handle) => handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // Check if user is in kol_list_data (array of objects with handle property)
        if (quest.kol_list_data && quest.kol_list_data.length > 0) {
          if (
            quest.kol_list_data.some(
              (kol) => kol.handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // If both lists exist but user is not in either, they are not eligible
        if (quest.eligible_kol_list || quest.kol_list_data) {
          return "This is a custom quest. You are not in the eligible users list for this quest set by the creator.";
        }
      }

      // Check custom reward system eligibility
      if (
        quest.reward_system === "first_come" &&
        quest.eligibility_type === "kol_list"
      ) {
        const userHandle = user.x_handle.toLowerCase().trim();

        // Check if user is in eligible_kol_list (simple array of handles)
        if (quest.eligible_kol_list && quest.eligible_kol_list.length > 0) {
          if (
            quest.eligible_kol_list.some(
              (handle) => handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // Check if user is in kol_list_data (array of objects with handle property)
        if (quest.kol_list_data && quest.kol_list_data.length > 0) {
          if (
            quest.kol_list_data.some(
              (kol) => kol.handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // If both lists exist but user is not in either, they are not eligible
        if (quest.eligible_kol_list || quest.kol_list_data) {
          return "This is a custom quest. You are not in the eligible users list for this quest set by the creator.";
        }
      }

      return null; // User is eligible
    },
    [user]
  );

  // Helper function to check if user is eligible for custom reward system
  const isUserEligible = useCallback(
    (quest: Quest) => {
      return (
        getEligibilityReason(quest) === null
        // ||  quest.creator_x_handle === user?.x_handle
      );
    },
    [getEligibilityReason]
  );

  const handleTaskStart = useCallback(
    async (taskId: string) => {
      try {
        setIsStartingTask(taskId);
        if (!user) {
          throw new Error("User not found");
        }

        // Find the task to get its details for the intent URL
        const quest = selectedQuest;
        if (!quest) {
          throw new Error("Quest not found");
        }

        const task = quest.tasks?.find((t) => t.task_id === taskId);
        if (!task) {
          throw new Error("Task not found");
        }

        const url = getTwitterIntentUrl(task);

        if (url && url !== "https://x.com") {
          window.open(url, "_blank");
        }

        const response = await fetch("/api/quests/user-tasks/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id: taskId,
            user_x_handle: user.x_handle,
            task_status: "under_review",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          // If user already has this task, that's fine - just proceed
          if (
            response.status !== 400 ||
            !errorData.error?.includes("already has this task")
          ) {
            throw new Error(
              errorData.error || "Failed to create user quest task"
            );
          }
        }

        const result = await response.json();

        // Refresh campaigns to show updated task status
        const currentFilters: QuestFilters = {
          status:
            statusParam === "all" || statusParam === null
              ? undefined
              : statusParam || undefined,
          creator: creatorParam || undefined,
          reward_system:
            rewardSystemParam === "all"
              ? undefined
              : rewardSystemParam || undefined,
        };
        const start = (pageFromUrl - 1) * QUEST_PER_PAGE;
        const questsResult = await getQuests(
          currentFilters,
          start,
          QUEST_PER_PAGE
        );
        setQuests(questsResult.quests);
        setShowTaskModal(false);

        // Redirect user to Twitter intent URL
      } catch (error) {
        console.error("Error creating user quest task:", error);
      } finally {
        setIsStartingTask(null);
      }
    },
    [user, selectedQuest, searchParams, QUEST_PER_PAGE]
  );

  const openTaskModal = useCallback((quest: Quest) => {
    setSelectedQuest(quest);
    setShowTaskModal(true);
  }, []);

  const hasUnderReviewTask = useCallback(
    (quest: Quest) =>
      quest.tasks?.some((t) => t.user_status === "under_review") || false,
    []
  );

  const handleVerifyQuest = useCallback(
    async (quest: Quest) => {
      try {
        setVerifyingQuestId(quest.id);
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
          `/api/quests/verification/quest/${encodeURIComponent(
            quest.id
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

        // Merge verification results into current campaigns if present
        if (data?.data?.verification_results) {
          setQuests((prevQuests) =>
            prevQuests.map((q: Quest) => {
              if (q.id !== quest.id) return q;
              return {
                ...(q as any),
                user_tx_hash: data?.data?.user_tx_hash,
                user_tokens_earned: data?.data?.user_tokens_earned,
                tasks: q.tasks.map((task: QuestTask) => {
                  const vr = data.data.verification_results.find(
                    (r: any) => r.task_id === task.task_id
                  );
                  return vr ? { ...task, verification_result: vr } : task;
                }),
              } as any;
            })
          );
        }

        // Show reward toast if a transaction hash is present
        const txHash: string | undefined = data?.data?.user_tx_hash;
        const tokensEarned: number | undefined = data?.data?.user_tokens_earned;
        if (txHash) {
          const explorerUrl = getTransactionUrl(
            quest.chain === "base" ? "base" : "solana",
            txHash
          );
          toast({
            title: "Reward received",
            description: tokensEarned
              ? `You earned ${tokensEarned} tokens. View tx: ${explorerUrl}`
              : `Your reward transaction has been submitted. View tx: ${explorerUrl}`,
          });
        }

        // Silent refresh to keep other data updated
        const currentFilters: QuestFilters = {
          status:
            statusParam === "all" || statusParam === null
              ? undefined
              : statusParam || undefined,
          creator: creatorParam || undefined,
          reward_system:
            rewardSystemParam === "all"
              ? undefined
              : rewardSystemParam || undefined,
        };
        const start = (pageFromUrl - 1) * QUEST_PER_PAGE;
        const result = await getQuests(currentFilters, start, QUEST_PER_PAGE);
        setQuests(result.quests);
      } catch (error) {
        console.error("verify quest error", error);
      } finally {
        setVerifyingQuestId(null);
      }
    },
    [user?.x_handle, statusParam, creatorParam, rewardSystemParam, pageFromUrl]
  );

  // // Auto-verify quests with tasks under review
  // useEffect(() => {
  //   if (loading || verifyingQuestId) {
  //     return; // Don't run if quests are loading or a verification is already in progress
  //   }

  //   const questsToVerify = quests.filter(hasUnderReviewTask);
  //   if (questsToVerify.length > 0) {
  //     const now = Date.now();
  //     const verificationCooldown = 1 * 60 * 1000; // 10 seconds

  //     // Find the first quest that is not on cooldown and verify it
  //     for (const quest of questsToVerify) {
  //       const lastVerified = lastVerificationTimestamps[quest.id];

  //       if (!lastVerified) {
  //         // If a quest has never been verified, set its first verification time to be 1 minute from now
  //         // This prevents immediate verification on page load
  //         setLastVerificationTimestamps((prev) => ({
  //           ...prev,
  //           [quest.id]: now,
  //         }));
  //       } else if (now - lastVerified > verificationCooldown) {
  //         setLastVerificationTimestamps((prev) => ({
  //           ...prev,
  //           [quest.id]: now,
  //         }));
  //         handleVerifyQuest(quest);
  //         break; // Verify one quest at a time
  //       }
  //     }
  //   }
  // }, [
  //   quests,
  //   loading,
  //   verifyingQuestId,
  //   hasUnderReviewTask,
  //   handleVerifyQuest,
  //   lastVerificationTimestamps,
  // ]);

  useEffect(() => {
    // This effect handles the initial 1-minute delay for the very first verification
    const questsToVerify = quests.filter(
      (q) => hasUnderReviewTask(q) && !lastVerificationTimestamps[q.id]
    );

    if (questsToVerify.length > 0) {
      const timer = setTimeout(() => {
        const questToVerify = questsToVerify[0];
        setLastVerificationTimestamps((prev) => ({
          ...prev,
          [questToVerify.id]: Date.now(),
        }));
        handleVerifyQuest(questToVerify);
      }, 10 * 1000); // 10 seconds delay

      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [
    quests,
    hasUnderReviewTask,
    handleVerifyQuest,
    lastVerificationTimestamps,
  ]);

  const statusOptions: Array<{ key: string; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  const isMyQuests = useMemo(() => {
    if (!user?.x_handle) return false;
    return filters.creator === user.x_handle;
  }, [filters.creator, user?.x_handle]);

  // Function to trigger confetti
  const triggerConfetti = useCallback(() => {
    var end = Date.now() + 3 * 1000; // 10 seconds

    // Example colors, feel free to adjust
    var colors = ["#00D992", "#1E8B5F", "#DFFCF6"];
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 65,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 65,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  // Effect to persist celebrated quest IDs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "celebratedQuestIds",
        JSON.stringify([...celebratedQuestIds])
      );
    }
  }, [celebratedQuestIds]);

  // Effect to check for newly completed campaigns and trigger confetti
  useEffect(() => {
    if (!quests || !user || !user.x_handle) return;

    quests.forEach((quest) => {
      const tasks = quest.tasks || [];
      const userTasks = tasks.filter((task) => task.user_status);
      const completedTasks = userTasks.filter(
        (task) => task.user_status === "completed"
      );
      const totalTasks = tasks.length;

      // Check if campaign is completed and hasn't been celebrated yet
      const isCompleted =
        completedTasks.length === totalTasks &&
        completedTasks.length > 0 &&
        (Boolean((quest as any)?.user_tx_hash) ||
          completedTasks.some((task) => (task as any).user_tx_hash));

      // Use both quest.celebrated and our localStorage tracking
      const notCelebrated =
        !quest.celebrated && !celebratedQuestIds.has(quest.id);

      if (isCompleted && notCelebrated) {
        triggerConfetti();
        setQuestToCelebrate(quest);
        setShowCelebrationModal(true);
        // Mark this quest as celebrated
        setCelebratedQuestIds((prev) => new Set(prev).add(quest.id));
      }
    });
  }, [quests, user, triggerConfetti, celebratedQuestIds]);

  return (
    <div>
      <div className=" min-h-screen pt-20">
        {/* Header Section */}
        <div className="flex flex-row items-center justify-between gap-4 mb-4 mx-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-light-primary">
              Campaigns
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base hidden md:block">
              Earn rewards for completing simple Twitter tasks.
            </p>
            {verifyingQuestId && (
              <div className="flex items-center gap-2 text-xs text-light-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                Verifying campaign tasks...
              </div>
            )}
          </div>
          {user ? (
            <div className="flex flex-row gap-2 sm:w-auto">
              <Link href="/campaigns/create" className="flex sm:flex-none">
                <button className="sm:btn-primarynew inline-flex items-center justify-end w-full sm:min-w-[130px] text-xs sm:text-sm">
                  <Plus className="w-5 h-5" />
                  {/* <Trophy className="hidden sm:block w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> */}
                  <span className="hidden sm:inline">Create Campaign</span>
                  <span className="hidden">Create Campaign</span>
                </button>
              </Link>
            </div>
          ) : (
            <button
              className="btn-primarynew inline-flex items-center justify-center min-w-[120px]"
              onClick={login}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                <Plus className="w-5 h-5 mr-2" />
                Create Campaign
                </>
              )}
            </button>
          )}
        </div>

        {/* Telegram Bot Join CTA */}
        {!user?.tg_username && (
          <div className="mx-4 mb-6">
            <TelegramBotJoin />
          </div>
        )}

        {/* Filters Toolbar */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="inline-flex min-w-fit bg-transparent border-b border-dark-quaternary">
              {statusOptions.map((opt) => {
                const isActive =
                  (opt.key === "all" && !status) || status === opt.key;
                return (
                  <span
                    key={opt.key}
                    onClick={() => {
                      updateQueryParam(
                        "status",
                        opt.key === "all" ? undefined : opt.key
                      );
                    }}
                    className={`relative h-8 px-4 text-sm font-medium transition-all cursor-pointer whitespace-nowrap -mb-[2px] ${
                      isActive
                        ? "text-light-alpha-secondary border-b-2 border-light-alpha-secondary"
                        : "text-light-alpha-quaternary hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </span>
                );
              })}
            </div>

            {/* <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-light-tertiary mr-1">
                Reward
              </span>
              {rewardOptions.map((opt) => (
                <Badge
                  key={opt.key}
                  onClick={() =>
                    updateQueryParam(
                      "reward_system",
                      opt.key === "all" ? undefined : opt.key
                    )
                  }
                  className={`cursor-pointer px-3 py-1 text-xs transition-all ${
                    (reward_system ?? "all") === opt.key
                      ? "bg-accent-quaternary text-light-primary border-light-primary/30"
                      : "bg-dark-secondary text-light-tertiary border-light-tertiary hover:bg-dark-alpha-quaternary"
                  }`}
                >
                  {opt.label}
                </Badge>
              ))}
            </div> */}

            {/* My Campaigns Switch - Hidden on Mobile */}
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <Switch
                  id="my-quests"
                  checked={isMyQuests}
                  onCheckedChange={(checked) =>
                    updateQueryParam(
                      "creator",
                      checked ? user?.x_handle : undefined
                    )
                  }
                  className="data-[state=checked]:bg-accent-brand data-[state=unchecked]:bg-dark-secondary border-light-tertiary hover:data-[state=unchecked]:bg-dark-quaternary transition-all duration-200"
                />
                <label
                  htmlFor="my-quests"
                  className="text-sm text-light-tertiary font-medium"
                >
                  Created by me
                </label>
                {loading && (
                  <Loader2 className="w-3 h-3 animate-spin text-light-primary" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="">
          {loading ? (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-light-primary" />
              <p className="text-muted-foreground text-lg">Loading campaigns...</p>
            </div>
          ) : quests && quests.length > 0 ? (
            <QuestsGrid
              quests={sortedQuests}
              loading={loading}
              user={user}
              isUserEligible={isUserEligible}
              getEligibilityReason={getEligibilityReason}
              openTaskModal={openTaskModal}
              hasUnderReviewTask={hasUnderReviewTask}
              handleVerifyQuest={handleVerifyQuest}
              verifyingQuestId={verifyingQuestId}
              login={login}
              isProcessing={isProcessing}
              openingTaskModalQuestId={null}
              hasMore={hasMore}
              onLoadMore={loadMore}
              handleSort={handleSort}
              getSortIcon={getSortIcon}
            />
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-light-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-light-tertiary mb-2">
                No campaigns found
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first campaign
              </p>
            </div>
          )}
        </div>

        {/* Task Details Modal */}
        <TaskDetailsModal
          open={showTaskModal}
          onOpenChange={setShowTaskModal}
          selectedQuest={selectedQuest}
          isUserEligible={isUserEligible}
          getEligibilityReason={getEligibilityReason}
          handleTaskStart={handleTaskStart}
        />

        {/* Quest Celebration Modal */}
        {questToCelebrate && (
          <QuestCelebrationModal
            quest={questToCelebrate}
            open={showCelebrationModal}
            onOpenChange={(open) => {
              setShowCelebrationModal(open);
              if (!open) {
                setQuestToCelebrate(null);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
