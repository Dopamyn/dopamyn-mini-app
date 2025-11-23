"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Quest, QuestTask } from "@/lib/types";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedQuest: Quest | null;
  isUserEligible: (quest: Quest) => boolean;
  getEligibilityReason: (quest: Quest) => string | null;
  handleTaskStart: (taskId: string) => void;
}

const taskTypeConfig: Record<
  "follow" | "tweet" | "retweet" | "reply" | "quote_tweet",
  {
    icon: any;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  follow: {
    icon: CheckCircle,
    label: "Follow",
    color: "text-light-primary",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
  },
  tweet: {
    icon: CheckCircle,
    label: "Tweet",
    color: "text-green-text",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/40",
  },
  retweet: {
    icon: CheckCircle,
    label: "Retweet",
    color: "text-accent-tertiary",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40",
  },
  reply: {
    icon: CheckCircle,
    label: "Reply",
    color: "text-light-primary",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/40",
  },
  quote_tweet: {
    icon: CheckCircle,
    label: "Quote Tweet",
    color: "text-light-primary",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/40",
  },
};

// Helper function to generate detailed task description for modal
const generateDetailedTaskDescription = (
  task: QuestTask,
  creatorHandle: string
) => {
  const taskType = task.task_type;
  const taskCount = task.task_count || 1;

  let description = "";

  switch (taskType) {
    case "follow":
      description = "Follow the account listed below";
      break;
    case "tweet":
      // Check if this is an image-required tweet first
      if (task.task_image_required && task.task_description) {
        description = `Post minimum ${taskCount} tweet${
          taskCount > 1 ? "s" : ""
        } with image as described below`;
      } else {
        // For backward compatibility, infer tweet_type if not present
        const tweetType = task.task_tweet_handle
          ? "handle"
          : task.task_tweet_hashtag
          ? "hashtag"
          : task.task_tweet_cashtag
          ? "cashtag"
          : task.task_tweet_website
          ? "website"
          : undefined;

        if (tweetType === "hashtag" && task.task_tweet_hashtag) {
          description = `Post minimum ${taskCount} tweet${
            taskCount > 1 ? "s" : ""
          } using the hashtag mentioned`;
          if (task.task_description) {
            description += ` and talk about: ${task.task_description}`;
          }
        } else if (tweetType === "cashtag" && task.task_tweet_cashtag) {
          description = `Post minimum ${taskCount} tweet${
            taskCount > 1 ? "s" : ""
          } using the cashtag mentioned`;
          if (task.task_description) {
            description += ` and talk about: ${task.task_description}`;
          }
        } else if (tweetType === "handle" && task.task_tweet_handle) {
          description = `Tweet atleast ${taskCount} time${
            taskCount > 1 ? "s" : ""
          } mentioning the Account`;
          if (task.task_description) {
            description += ` and talk about: ${task.task_description}`;
          }
        } else if (tweetType === "website" && task.task_tweet_website) {
          description = `Post minimum ${taskCount} tweet${
            taskCount > 1 ? "s" : ""
          } about the website mentioned`;
          if (task.task_description) {
            description += ` and talk about: ${task.task_description}`;
          }
        } else {
          description = `Post minimum ${taskCount} tweet${
            taskCount > 1 ? "s" : ""
          }`;
        }
      }
      break;
    case "reply":
      description = "Join the conversation by replying to the below tweet";
      break;
    case "quote_tweet":
      description = "Quote this post with a comment";
      break;
    case "retweet":
      description = "Retweet this post";
      break;
    default:
      description = "Complete the specified task";
  }

  return description;
};

// Helper function to get target display for tasks
const getTaskTarget = (task: QuestTask, creatorHandle: string) => {
  if (task.task_type === "follow") {
    return {
      type: "handle",
      value: task.task_follow_handle || creatorHandle,
      icon: "twitter",
    };
  } else if (task.task_type === "tweet") {
    // For backward compatibility, infer tweet_type if not present
    const tweetType = task.task_tweet_handle
      ? "handle"
      : task.task_tweet_hashtag
      ? "hashtag"
      : task.task_tweet_cashtag
      ? "cashtag"
      : task.task_tweet_website
      ? "website"
      : undefined;

    if (tweetType === "hashtag" && task.task_tweet_hashtag) {
      return {
        type: "hashtag",
        value: task.task_tweet_hashtag,
        icon: "tweet",
      };
    } else if (tweetType === "cashtag" && task.task_tweet_cashtag) {
      return {
        type: "cashtag",
        value: task.task_tweet_cashtag,
        icon: "tweet",
      };
    } else if (tweetType === "handle" && task.task_tweet_handle) {
      return { type: "handle", value: task.task_tweet_handle, icon: "tweet" };
    } else if (tweetType === "website" && task.task_tweet_website) {
      return {
        type: "website",
        value: task.task_tweet_website,
        icon: "tweet",
      };
    }
  } else if (
    task.task_type === "retweet" ||
    task.task_type === "quote_tweet" ||
    task.task_type === "reply"
  ) {
    return {
      type: "url",
      value: task.task_tweet_id
        ? `https://x.com/i/status/${task.task_tweet_id}`
        : "",
      icon: "share",
    };
  }

  return {
    type: "handle",
    value:
      task.target_author_handle || task.task_follow_handle || creatorHandle,
    icon: "twitter",
  };
};

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

export default function TaskDetailsModal({
  open,
  onOpenChange,
  selectedQuest,
  isUserEligible,
  getEligibilityReason,
  handleTaskStart,
}: TaskDetailsModalProps) {
  const [optimisticUnderReview, setOptimisticUnderReview] = useState<
    Set<string>
  >(new Set());
  const isMobile = useIsMobile();
  // Helper function to check if quest is eligible for starting tasks
  const isQuestEligibleForTasks = (quest: Quest) => {
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

  // Comprehensive function to get task action button (similar to QuestsTable)
  const getTaskActionButton = (task: QuestTask) => {
    // Only show action buttons for todo or rejected tasks
    if (task.user_status !== "todo" && task.user_status !== "rejected") {
      return null;
    }

    // Check if quest has ended first (highest priority)
    if (
      (() => {
        const now = new Date();
        const nowISO = now.toISOString().slice(0, 19);
        return selectedQuest!.end_date < nowISO;
      })()
    ) {
      return (
        <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between w-[150px] px-2 py-1 cursor-not-allowed opacity-60">
          Quest Ended
          <AlertTriangle className="w-4 h-4 ml-1" />
        </div>
      );
    }

    // Check if user is not eligible (second priority)
    if (!isUserEligible(selectedQuest!)) {
      const eligibilityReason = getEligibilityReason(selectedQuest!);
      return (
        <div className="space-y-1">
          <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between w-[150px] px-2 py-1 cursor-not-allowed opacity-60">
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

    // Check other quest conditions
    if (!isQuestEligibleForTasks(selectedQuest!)) {
      return (
        <div className="bg-neutral-800 text-light-tertiary border-light-tertiary hover:bg-neutral-700/50 rounded-sm font-medium text-xs flex items-center justify-between w-[150px] px-2 py-1 cursor-not-allowed opacity-60">
          {selectedQuest!.status !== "active" ? "Quest Inactive" : "Quest Full"}
          <AlertTriangle className="w-4 h-4 ml-1" />
        </div>
      );
    }

    // All conditions met - show start/retry button
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          className={`inline-flex items-center justify-between w-[150px] px-2 py-1 rounded-sm font-medium text-xs cursor-pointer transition-all duration-200 hover:scale-105 ${
            task.user_status === "rejected"
              ? "bg-dark-alpha-tertiary text-light-primary border-light-primary border-2 hover:bg-dark-alpha-quaternary"
              : "bg-light-primary hover:bg-accent-secondary text-black"
          }`}
          onClick={() => {
            // First start the task
            handleTaskStart(task.task_id);
            // Optimistically mark as under_review
            setOptimisticUnderReview((prev: Set<string>) => {
              const next = new Set(prev);
              next.add(task.task_id);
              return next;
            });

            // Then redirect to Twitter with appropriate intent
            const twitterUrl = getTwitterIntentUrl(
              task,
              selectedQuest?.creator_x_handle || ""
            );
            if (twitterUrl && twitterUrl !== "https://x.com") {
              // Small delay to ensure task is started first
              setTimeout(() => {
                window.open(twitterUrl, "_blank");
              }, 500);
            }
          }}
        >
          <span>
            {task.user_status === "rejected"
              ? "Retry on X"
              : task.task_type === "tweet"
              ? "Tweet on X"
              : task.task_type === "follow"
              ? "Follow on X"
              : task.task_type === "reply"
              ? "Reply on X"
              : task.task_type === "quote_tweet"
              ? "Quote on X"
              : "Retweet on X"}
          </span>
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
        <span className="text-xs text-light-primary/60 max-w-[150px] text-right leading-tight">
          {(optimisticUnderReview.has(task.task_id)
            ? "under_review"
            : task.user_status) === "rejected"
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
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`border-0 bg-transparent overflow-hidden backdrop-blur-sm p-0 ${
          isMobile
            ? "max-w-[95vw] max-h-[90vh] min-w-[95vw] min-h-[200px] mx-2"
            : "max-w-[800px] max-h-[85vh] min-w-[800px] min-h-[300px]"
        }`}
      >
        {/* Enhanced Modal Content with Theme-consistent Styling */}
        <div className="relative w-full h-full bg-neutral-700/50 rounded-2xl border border-neutral-600/30 shadow-2xl overflow-hidden">
          {selectedQuest && (
            <div
              className={`relative space-y-6 overflow-y-auto custom-scrollbar ${
                isMobile
                  ? "p-4 max-h-[calc(90vh-120px)]"
                  : "p-6 max-h-[calc(85vh-180px)]"
              }`}
            >
              {/* Modal Header */}
              {isUserEligible(selectedQuest) && (
                <div
                  className={`flex items-center justify-center ${
                    isMobile ? "mb-6" : "mb-12"
                  }`}
                >
                  <h2
                    className={`font-medium text-light-primary ${
                      isMobile ? "text-xl" : "text-3xl"
                    }`}
                  >
                    What You Need to Do
                  </h2>
                </div>
              )}
              {/* Quest Status Warning */}
              {selectedQuest &&
                (() => {
                  // Check if quest has ended first (highest priority)
                  if (
                    (() => {
                      const now = new Date();
                      const nowISO = now.toISOString().slice(0, 19);
                      return selectedQuest.end_date < nowISO;
                    })() ||
                    !isQuestEligibleForTasks(selectedQuest)
                  ) {
                    return (
                      <div
                        className={`flex flex-col items-center justify-center gap-4 text-center ${
                          isMobile ? "p-4" : "p-8"
                        }`}
                      >
                        <div
                          className={`rounded-full bg-red-500/20 flex items-center justify-center mb-2 ${
                            isMobile ? "w-12 h-12" : "w-16 h-16"
                          }`}
                        >
                          <XCircle
                            className={`text-red-400 ${
                              isMobile ? "w-6 h-6" : "w-8 h-8"
                            }`}
                          />
                        </div>
                        <h3
                          className={`font-semibold text-light-primary ${
                            isMobile ? "text-lg" : "text-xl"
                          }`}
                        >
                          Quest Not Available
                        </h3>
                        <p
                          className={`text-light-primary/80 leading-relaxed ${
                            isMobile
                              ? "text-sm max-w-[300px]"
                              : "text-base max-w-[450px]"
                          }`}
                        >
                          {selectedQuest.status !== "active"
                            ? "This quest is completed."
                            : "This quest is full and cannot accept more participants."}
                        </p>
                      </div>
                    );
                  }

                  // Check if user is not eligible (second priority)
                  if (!isUserEligible(selectedQuest)) {
                    return (
                      <div
                        className={`flex flex-col items-center justify-center gap-4 text-center ${
                          isMobile ? "p-4" : "p-8"
                        }`}
                      >
                        <div
                          className={`rounded-full bg-red-500/20 flex items-center justify-center mb-2 ${
                            isMobile ? "w-12 h-12" : "w-16 h-16"
                          }`}
                        >
                          <svg
                            className={`text-red-400 ${
                              isMobile ? "w-6 h-6" : "w-8 h-8"
                            }`}
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
                        </div>
                        <h3
                          className={`font-semibold text-light-primary ${
                            isMobile ? "text-lg" : "text-xl"
                          }`}
                        >
                          You are not eligible for this Quest
                        </h3>
                        <p
                          className={`text-light-primary/80 leading-relaxed ${
                            isMobile
                              ? "text-sm max-w-[300px]"
                              : "text-base max-w-[450px]"
                          }`}
                        >
                          {getEligibilityReason(selectedQuest) ||
                            "This quest is only available to selected accounts chosen by the campaign organizer. Your account is not on the eligible list."}
                        </p>
                      </div>
                    );
                  }

                  return null; // No warning needed
                })()}

              {isUserEligible(selectedQuest) &&
                isQuestEligibleForTasks(selectedQuest) && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {selectedQuest.tasks.map((task: QuestTask, index) => {
                        const taskConfig =
                          taskTypeConfig[
                            task.task_type as keyof typeof taskTypeConfig
                          ] || taskTypeConfig.follow;
                        const targetInfo = getTaskTarget(
                          task,
                          selectedQuest.creator_x_handle
                        );

                        return (
                          <div
                            key={task.task_id}
                            className={`border-b-2 border-neutral-600 pb-4 last:border-b-0 ${
                              task.user_status === "completed"
                                ? "opacity-50"
                                : ""
                            }`}
                          >
                            {/* Task Header with Title and Description */}
                            <div className={`${isMobile ? "mb-3" : "mb-4"}`}>
                              <p
                                className={`text-light-primary/80 leading-relaxed ${
                                  isMobile ? "text-xs" : "text-sm"
                                }`}
                              >
                                {generateDetailedTaskDescription(
                                  task,
                                  selectedQuest.creator_x_handle
                                )}
                              </p>
                              {/* Show task description for image-required tweets */}
                              {task.task_image_required &&
                                task.task_description && (
                                  <div
                                    className={`mt-3 p-3 bg-neutral-800/50 rounded-lg border border-neutral-600/50 ${
                                      isMobile ? "text-xs" : "text-sm"
                                    }`}
                                  >
                                    <p className="text-neutral-300 font-medium mb-2">
                                      Task Description:
                                    </p>
                                    <p className="text-light-primary/90 leading-relaxed">
                                      {task.task_description}
                                    </p>
                                  </div>
                                )}
                            </div>

                            {/* Task Target and Action Section - Properly Aligned */}
                            <div
                              className={`${
                                isMobile
                                  ? "flex flex-col gap-3"
                                  : "flex items-center justify-between"
                              }`}
                            >
                              {/* Task Target with Icon */}
                              <div
                                className={`flex items-center gap-3 ${
                                  isMobile ? "w-full" : ""
                                }`}
                              >
                                <div
                                  className={`rounded-full flex items-center justify-center overflow-hidden bg-neutral-600/30 ${
                                    isMobile ? "w-6 h-6" : "w-8 h-8"
                                  }`}
                                >
                                  {targetInfo.icon === "twitter" ? (
                                    // Use profile image if available, otherwise fallback to X logo
                                    task.profile_image_url ? (
                                      <img
                                        src={task.profile_image_url}
                                        alt="Profile"
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                          // Fallback to X logo if image fails to load
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.style.display = "none";
                                          const fallback =
                                            target.nextElementSibling as HTMLElement;
                                          if (fallback)
                                            fallback.style.display = "flex";
                                        }}
                                      />
                                    ) : (
                                      <svg
                                        className="w-5 h-5 text-green-text"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                      </svg>
                                    )
                                  ) : targetInfo.icon === "tweet" ? (
                                    // For all tweet-related tasks, use tweet icon
                                    <img
                                      src="/tweet_icon.svg"
                                      alt="Tweet"
                                      className="w-5 h-5"
                                    />
                                  ) : targetInfo.icon === "share" ? (
                                    // For retweet/quote/reply tasks, use reply icon
                                    <img
                                      src="/reply_icon.svg"
                                      alt="Reply"
                                      className="w-5 h-5"
                                    />
                                  ) : (
                                    // Fallback icon
                                    <svg
                                      className="w-5 h-5 text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                                      />
                                    </svg>
                                  )}

                                  {/* Fallback X logo for profile images */}
                                  {targetInfo.icon === "twitter" && (
                                    <svg
                                      className="w-5 h-5 text-green-text hidden"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span
                                    className={`text-light-primary font-medium ${
                                      isMobile ? "text-sm" : "text-md"
                                    }`}
                                  >
                                    {targetInfo.type === "handle" ? (
                                      `@${targetInfo.value.replace(/^@+/, "")}`
                                    ) : targetInfo.type === "hashtag" ? (
                                      `#${targetInfo.value.replace(/^#+/, "")}`
                                    ) : targetInfo.type === "cashtag" ? (
                                      `$${targetInfo.value.replace(/^\$+/, "")}`
                                    ) : targetInfo.type === "url" &&
                                      targetInfo.value ? (
                                      <a
                                        href={targetInfo.value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-light-primary hover:text-blue-300 underline cursor-pointer"
                                      >
                                        View Tweet
                                      </a>
                                    ) : (
                                      targetInfo.value
                                    )}
                                  </span>
                                  {targetInfo.type === "url" && (
                                    <span
                                      className={`text-light-primary/60 ${
                                        isMobile ? "text-xs" : "text-xs"
                                      }`}
                                    >
                                      Click to view the tweet
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Status and Action Section - Right Aligned */}
                              <div
                                className={`flex flex-col gap-2 ${
                                  isMobile ? "items-start w-full" : "items-end"
                                }`}
                              >
                                {/* Status Message */}
                                {task.user_status === "completed" && (
                                  <div
                                    className={`bg-neutral-800 text-light-primary border-light-primary border font-medium text-xs flex items-center gap-2 ${
                                      isMobile
                                        ? "w-full px-3 py-2 rounded-lg"
                                        : "rounded-sm px-2 py-1"
                                    }`}
                                  >
                                    <svg
                                      className="w-4 h-4 text-light-primary"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Task Completed
                                  </div>
                                )}
                                {task.user_status === "under_review" && (
                                  <div
                                    className={`bg-dark-alpha-tertiary text-accent-tertiary border-accent-tertiary border-2 font-medium text-xs flex items-center gap-2 ${
                                      isMobile
                                        ? "w-full px-3 py-2 rounded-lg"
                                        : "rounded-sm px-2 py-1"
                                    }`}
                                  >
                                    <svg
                                      className="w-4 h-4 text-accent-tertiary"
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
                                    Under Review
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

                                {/* Action Button */}
                                {(task.user_status === "todo" ||
                                  task.user_status === "rejected") && (
                                  <div
                                    className={`flex gap-1 ${
                                      isMobile
                                        ? "justify-end w-1/3 ml-auto"
                                        : "flex-col items-end"
                                    }`}
                                  >
                                    <button
                                      className={`inline-flex items-center justify-between font-medium text-xs cursor-pointer transition-all duration-200 hover:scale-105 ${
                                        isMobile
                                          ? "w-full px-2 py-2 rounded-lg text-sm"
                                          : "w-[150px] px-2 py-1 rounded-sm"
                                      } ${
                                        task.user_status === "rejected"
                                          ? "bg-dark-alpha-tertiary text-light-primary border-light-primary border-2 hover:bg-dark-alpha-quaternary"
                                          : "bg-light-primary hover:bg-accent-secondary text-black"
                                      }`}
                                      onClick={() => {
                                        // First start the task
                                        handleTaskStart(task.task_id);

                                        // Then redirect to Twitter with appropriate intent
                                        const twitterUrl = getTwitterIntentUrl(
                                          task,
                                          selectedQuest.creator_x_handle
                                        );
                                        if (
                                          twitterUrl &&
                                          twitterUrl !== "https://x.com"
                                        ) {
                                          // Small delay to ensure task is started first
                                          setTimeout(() => {
                                            window.open(twitterUrl, "_blank");
                                          }, 500);
                                        }
                                      }}
                                    >
                                      <span>
                                        {task.user_status === "rejected"
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
                                      <svg
                                        className="w-4 h-4 ml-1"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
