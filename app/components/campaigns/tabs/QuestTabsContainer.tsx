"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestDetails, Quest } from "@/lib/types";
import { useState, useCallback } from "react";
import QuestDetailsTab from "./QuestDetailsTab";
import CampaignResultsTab, { ResultData } from "./CampaignResultsTab";
import CampaignSummaryTab from "./CampaignSummaryTab";
import { useUser } from "@/contexts/UserContext";

interface QuestTabsContainerProps {
  quest: QuestDetails;
  shareableId: string;
  questId: string;
  login?: () => void;
  hasAta?: boolean | null;
}

export default function QuestTabsContainer({
  quest: initialQuest,
  shareableId,
  questId,
  login,
  hasAta,
}: QuestTabsContainerProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [resultsData, setResultsData] = useState<ResultData[]>([]);
  const [quest, setQuest] = useState<QuestDetails>(initialQuest);

  // Function to update quest details
  const updateQuestDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`/api/quests/${shareableId}/details`, {
        headers,
      });
      const data = await response.json();
      if (data.data) {
        setQuest(data.data);
      }
    } catch (error) {
      console.error("Error updating quest details:", error);
    }
  }, [shareableId]);

  // Function to update task statuses from verify API response
  const handleTaskStatusUpdate = useCallback((verificationResults: any[]) => {
    console.log("ver1", verificationResults);
    setQuest((prevQuest) => ({
      ...prevQuest,
      tasks: prevQuest.tasks?.map((task) => {
        const verificationResult = verificationResults.find(
          (vr) => vr.task_id === task.task_id
        );
        console.log("verification result", verificationResult);
        return verificationResult
          ? { ...task, user_status: verificationResult.status }
          : task;
      }),
    }));
  }, []);

  const canViewCampaignTabs =
    quest.creator_x_handle === user?.x_handle || user?.is_admin;

  // Enhanced Twitter Intent URL generator
  const getTwitterIntentUrl = useCallback(
    (task: any) => {
      const {
        task_type,
        task_follow_handle,
        task_tweet_id,
        target_author_handle,
      } = task;

      const targetHandle =
        target_author_handle || task_follow_handle || quest.creator_x_handle;
      const cleanHandle = targetHandle
        ? targetHandle.replace("@", "").trim()
        : "";

      switch (task_type) {
        case "follow":
          if (!cleanHandle) return "https://x.com";
          return `https://x.com/intent/follow?screen_name=${cleanHandle}`;
        case "tweet":
          let tweetText = "{";

          // Handle image tasks with description
          if (task.task_image_required) {
            tweetText += "Tweet with a pic/media\n";
          }
          // Non-image tasks
          if (task.task_description) {
            tweetText += "Guidelines- ";
            tweetText += task.task_description;
            tweetText += "\n";
          }

          if (
            task.task_tweet_cashtag ||
            task.task_tweet_hashtag ||
            task.task_tweet_handle
          ) {
            tweetText += "Share your thoughts about ";
          }

          if (task.task_tweet_cashtag) {
            const cashtag = task.task_tweet_cashtag.startsWith("$")
              ? task.task_tweet_cashtag
              : `$${task.task_tweet_cashtag}`;
            tweetText += `${cashtag} `;
          }
          if (task.task_tweet_hashtag) {
            const hashtag = task.task_tweet_hashtag.startsWith("#")
              ? task.task_tweet_hashtag
              : `#${task.task_tweet_hashtag}`;
            tweetText += `${hashtag} `;
          }
          if (task.task_tweet_handle) {
            const handle = task.task_tweet_handle.startsWith("@")
              ? task.task_tweet_handle
              : `@${task.task_tweet_handle}`;
            tweetText += `${handle} `;
          }
          if (task.task_tweet_website) {
            tweetText += `${task.task_tweet_website} `;
          }
          // Add handle mention if no other content
          if (!tweetText.trim() && cleanHandle) {
            tweetText = `Share your thoughts about @${cleanHandle}`;
          }
          if (tweetText.trim()) tweetText += "}";
          return `https://x.com/intent/tweet?text=${encodeURIComponent(
            tweetText.trim()
          )}`;
        case "retweet":
          if (!task_tweet_id)
            return cleanHandle
              ? `https://x.com/${cleanHandle}`
              : "https://x.com";
          return `https://x.com/intent/retweet?tweet_id=${task_tweet_id}`;
        case "reply":
          if (!task_tweet_id)
            return cleanHandle
              ? `https://x.com/${cleanHandle}`
              : "https://x.com";
          let replyText = "Great post! ";
          if (task.task_tweet_hashtag)
            replyText += `#${task.task_tweet_hashtag.replace("#", "")} `;
          if (task.task_tweet_cashtag)
            replyText += `$${task.task_tweet_cashtag.replace("$", "")} `;
          replyText += "🚀";
          return `https://x.com/intent/tweet?in_reply_to=${task_tweet_id}&text=${encodeURIComponent(
            replyText.trim()
          )}`;
        case "quote_tweet":
          if (!task_tweet_id)
            return cleanHandle
              ? `https://x.com/intent/tweet?text=@${cleanHandle}`
              : "https://x.com";
          let quoteText = "";
          quoteText += `{Share your thoughts about this post}`;
          if (task.task_tweet_hashtag)
            quoteText += `#${task.task_tweet_hashtag.replace("#", "")} `;
          if (task.task_tweet_cashtag)
            quoteText += `$${task.task_tweet_cashtag.replace("$", "")} `;
          quoteText += "🚀";
          return `https://x.com/intent/tweet?text=${encodeURIComponent(
            quoteText.trim()
          )}&url=https://x.com/i/status/${task_tweet_id}`;
        default:
          return "https://x.com";
      }
    },
    [quest.creator_x_handle]
  );

  // Function to create task without opening URL (for Content Lab)
  const createTaskOnly = useCallback(
    async (taskId: string) => {
      try {
        if (!user) {
          throw new Error("User not found");
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
          if (
            response.status !== 400 ||
            !errorData.error?.includes("already has this task")
          ) {
            throw new Error(
              errorData.error || "Failed to create user quest task"
            );
          }
        }

        console.log("Task created successfully");
      } catch (error) {
        console.error("Error creating task:", error);
        throw error; // Re-throw so caller can handle
      }
    },
    [user]
  );

  // Handle task start function (opens Twitter URL)
  const handleTaskStart = useCallback(
    async (taskId: string) => {
      try {
        if (!user) {
          throw new Error("User not found");
        }

        const task = quest.tasks?.find((t) => t.task_id === taskId);
        if (!task) {
          throw new Error("Task not found");
        }

        // Create the task first
        await createTaskOnly(taskId);

        // Then open Twitter URL
        const url = getTwitterIntentUrl(task);
        if (url && url !== "https://x.com") {
          window.open(url, "_blank");
        }
      } catch (error) {
        console.error("Error starting task:", error);
      }
    },
    [user, quest.tasks, getTwitterIntentUrl, createTaskOnly]
  );

  // Helper function to get specific eligibility reason
  const getEligibilityReason = useCallback(
    (quest: QuestDetails | Quest): string | null => {
      if (!user) return null;

      // KOL list gating (applies regardless of reward system)
      try {
        const userHandle = (user.x_handle || "").toLowerCase().trim();

        // Normalize possible list shapes from different APIs
        const eligibleKolList: string[] = Array.isArray((quest as any).eligible_kol_list)
          ? ((quest as any).eligible_kol_list as string[])
          : [];

        // details API uses `kol_data: string[]`; list API may use `kol_list_data: { handle: string }[]`
        const kolDataStrings: string[] = Array.isArray((quest as any).kol_data)
          ? ((quest as any).kol_data as string[])
          : [];

        const kolListDataHandles: string[] = Array.isArray((quest as any).kol_list_data)
          ? ((quest as any).kol_list_data as any[])
              .map((k) =>
                typeof k === "string"
                  ? k
                  : (k?.handle as string) || ""
              )
              .filter((h) => !!h)
          : [];

        const combinedAllowList = new Set(
          [
            ...eligibleKolList.map((h) => (h || "").toLowerCase().trim()),
            ...kolDataStrings.map((h) => (h || "").toLowerCase().trim()),
            ...kolListDataHandles.map((h) => (h || "").toLowerCase().trim()),
          ].filter((h) => h)
        );

        // If any KOL list is present, then enforce membership
        if (combinedAllowList.size > 0) {
          if (!combinedAllowList.has(userHandle)) {
            return "This quest is limited to a specific KOL list by the creator.";
          }
        }
      } catch (_) {
        // do not block if shape mismatches; fallback to other checks
      }

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

      return null; // User is eligible
    },
    [user]
  );

  // Helper function to check if user is eligible for custom reward system
  const isUserEligible = useCallback(
    (quest: QuestDetails | Quest) => {
      return (
        getEligibilityReason(quest) === null ||
        quest.creator_x_handle === user?.x_handle
      );
    },
    [getEligibilityReason]
  );

  // const { isLoading } = useUser();

  // // Show skeleton loader while user data is loading
  // if (isLoading) {
  //   return (
  //     <div className="animate-pulse space-y-4">
  //       <div className="h-10 bg-light-tertiary/50 rounded w-full max-w-[600px]"></div>
  //       <div className="h-12 bg-light-tertiary/50 rounded w-full"></div>
  //       <div className="h-12 bg-light-tertiary/50 rounded w-full"></div>
  //       <div className="h-12 bg-light-tertiary/50 rounded w-full"></div>
  //     </div>
  //   );
  // }

  return (
    <Tabs
      defaultValue="details"
      className="w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <TabsList className="inline-flex min-w-fit bg-transparent border-b border-dark-quaternary">
          <TabsTrigger
            value="details"
            className="relative h-10 px-4 text-sm font-medium text-light-alpha-quaternary transition-all hover:text-white data-[state=active]:text-light-alpha-secondary data-[state=active]:border-b-2 data-[state=active]:border-light-alpha-secondary whitespace-nowrap -mb-[2px]"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="campaign_results"
            className="relative h-10 px-4 text-sm font-medium text-light-alpha-quaternary transition-all hover:text-white data-[state=active]:text-light-alpha-secondary data-[state=active]:border-b-2 data-[state=active]:border-light-alpha-secondary whitespace-nowrap -mb-[2px]"
          >
            Results
          </TabsTrigger>
          {canViewCampaignTabs && (
            <TabsTrigger
              value="campaign_summary"
              className="relative h-10 px-4 text-sm font-medium text-light-alpha-quaternary transition-all hover:text-white data-[state=active]:text-light-alpha-secondary data-[state=active]:border-b-2 data-[state=active]:border-light-alpha-secondary whitespace-nowrap -mb-[2px]"
            >
              Summary
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="details" className="mt-6">
        <QuestDetailsTab
          quest={quest}
          isUserEligible={isUserEligible}
          getEligibilityReason={getEligibilityReason}
          handleTaskStart={handleTaskStart}
          createTaskOnly={createTaskOnly}
          user={user}
          questId={quest.id}
          onQuestUpdate={updateQuestDetails}
          onTaskStatusUpdate={handleTaskStatusUpdate}
          login={login}
          hasAta={hasAta ?? null}
        />
      </TabsContent>
      <TabsContent value="campaign_results" className="mt-6">
        <CampaignResultsTab
          quest={quest}
          questId={questId}
          onResultsUpdate={setResultsData}
        />
      </TabsContent>
      {canViewCampaignTabs && (
        <TabsContent value="campaign_summary" className="mt-6">
          <CampaignSummaryTab quest={quest} results={resultsData as any} />
        </TabsContent>
      )}
    </Tabs>
  );
}
