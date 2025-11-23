"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Users,
  Gift,
  CheckCircle2,
  ListChecks,
  Clock,
  Heart,
  Target,
  Megaphone,
  UserPlus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getAllDrafts,
  getDraftsSortedByDate,
  formatTimeAgo,
  deleteDraft,
  QuestDraft,
} from "@/lib/draftManager";
import { questTemplates } from "@/lib/questTemplates";
import { chainIcon } from "@/lib/helper";

interface Template {
  id: string;
  title: string;
  description: string;
  preview?: string;
}

// Mock templates - will be replaced with real templates later
const mockTemplates: Template[] = [
  {
    id: "1",
    title: "Twitter Follow Campaign",
    description: "Get users to follow your Twitter account",
    preview: "Follow @yourhandle and earn rewards",
  },
  {
    id: "2",
    title: "Tweet Engagement Campaign",
    description: "Boost engagement on your tweets",
    preview: "Like, retweet, and reply to earn",
  },
  {
    id: "3",
    title: "Community Growth Campaign",
    description: "Grow your community with social tasks",
    preview: "Complete social tasks to unlock rewards",
  },
];

export function QuestCreationLanding({
  onStartNewQuest,
  onSelectTemplate,
  onSelectDraft,
  onDeleteDraft,
}: {
  onStartNewQuest: () => void;
  onSelectTemplate?: (templateId: string) => void;
  onSelectDraft?: (draftId: string) => void;
  onDeleteDraft?: (draftId: string) => void;
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"templates" | "drafts">(
    "templates"
  );
  const [drafts, setDrafts] = useState<QuestDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Load drafts from localStorage
  useEffect(() => {
    const loadDrafts = () => {
      const sortedDrafts = getDraftsSortedByDate();
      setDrafts(sortedDrafts);
      if (sortedDrafts.length > 0 && !selectedDraftId) {
        setSelectedDraftId(sortedDrafts[0].draftId);
      }
    };

    loadDrafts();

    // Listen for storage changes (in case drafts are updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "questDrafts") {
        loadDrafts();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleDeleteDraft = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDraft(draftId);
    setDrafts(getDraftsSortedByDate());
    if (selectedDraftId === draftId) {
      const remainingDrafts = getDraftsSortedByDate();
      setSelectedDraftId(remainingDrafts[0]?.draftId || null);
    }
    onDeleteDraft?.(draftId);
  };

  // Helper function to get icon component from icon name
  const getTemplateIcon = (
    iconName?: string
  ): React.ComponentType<{ className?: string }> => {
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      users: Users,
      heart: Heart,
      target: Target,
      megaphone: Megaphone,
    };
    return iconMap[iconName || ""] || UserPlus;
  };

  // Helper function to format task type for display
  const formatTaskType = (taskType: string): string => {
    const typeMap: Record<string, string> = {
      follow: "Follow",
      retweet: "Retweet",
      tweet: "Tweet",
      reply: "Reply",
      quote_tweet: "Quote Tweet",
    };
    return (
      typeMap[taskType] ||
      taskType.charAt(0).toUpperCase() + taskType.slice(1).replace(/_/g, " ")
    );
  };

  // Helper function to calculate duration in days
  const calculateDuration = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div
      className={`min-h-screen ${
        isMobile
          ? "py-2 space-y-4 px-4"
          : "container py-4 sm:py-8 space-y-6 sm:space-y-8 mx-auto px-4 sm:px-6"
      } ${isMobile ? "py-8" : "pt-20 sm:pt-8"}`}
    >
      <div className="relative z-10">
        
        <div className="mb-6">
          <Link
            href="/campaigns"
            className={`inline-flex items-center text-light-tertiary hover:text-light-primary transition-colors ${
              isMobile ? "text-xs" : "text-sm"
            }`}
          >
            <ArrowLeft
              className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-2"}`}
            />
            Back to Campaigns
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1
            className={`font-medium text-light-primary ${
              isMobile ? "text-xl" : "text-2xl sm:text-3xl"
            }`}
          >
            Create a Campaign
          </h1>

          {/* Create New Campaign Button */}
          <button
            onClick={onStartNewQuest}
            className={`inline-flex items-center gap-2 text-accent-brand hover:text-accent-brand/80 transition-colors font-medium ${
              isMobile ? "text-sm" : "text-base"
            }`}
          >
            <Plus className="w-4 h-4" />
            Create New Campaign
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-8 border-b border-dark-quaternary">
          <button
            onClick={() => setActiveTab("templates")}
            className={`relative pb-3 px-1 font-medium transition-colors ${
              isMobile ? "text-sm" : "text-base"
            } ${
              activeTab === "templates"
                ? "text-light-primary"
                : "text-light-tertiary hover:text-light-primary"
            }`}
          >
            Campaign Templates
            {activeTab === "templates" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-brand shadow-[0_0_8px_rgba(255,128,128,0.6)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("drafts")}
            className={`relative pb-3 px-1 font-medium transition-colors ${
              isMobile ? "text-sm" : "text-base"
            } ${
              activeTab === "drafts"
                ? "text-light-primary"
                : "text-light-tertiary hover:text-light-primary"
            }`}
          >
            Saved Drafts
            {activeTab === "drafts" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-brand shadow-[0_0_8px_rgba(255,128,128,0.6)]" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4">
          {activeTab === "templates" ? (
            /* Templates Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {questTemplates.map((template) => {
                const taskTypes =
                  template.data.tasks?.map((t) => t.task_type) || [];
                const formattedTaskTypes = taskTypes.map(formatTaskType);
                const rewardPool = template.data.reward_pool || 0;
                const usersToReward = template.data.total_users_to_reward || 0;
                const blockchain = template.data.blockchain || "";
                const isRaffle = template.data.is_raffle || false;
                const rewardSystem = isRaffle
                  ? "Raffle"
                  : template.data.reward_system === "custom"
                  ? "Targeted"
                  : "First Come";

                // Build minimum requirements
                const minRequirements: string[] = [];
                if (
                  template.data.min_followers !== undefined &&
                  template.data.min_followers > 0
                ) {
                  minRequirements.push(
                    `${template.data.min_followers}+ followers`
                  );
                }
                if (
                  template.data.min_smart_followers !== undefined &&
                  template.data.min_smart_followers > 0
                ) {
                  minRequirements.push(
                    `${template.data.min_smart_followers}+ smart followers`
                  );
                }
                if (template.data.is_smart_account) {
                  minRequirements.push("Smart account");
                }
                if (template.data.is_verified_account) {
                  minRequirements.push("Verified");
                }

                const duration =
                  template.data.start_date && template.data.end_date
                    ? calculateDuration(
                        template.data.start_date,
                        template.data.end_date
                      )
                    : 0;

                const TemplateIcon = getTemplateIcon(template.icon);

                return (
                  <div
                    key={template.id}
                    onClick={() => onSelectTemplate?.(template.id)}
                    className="group relative p-6 gap-4 rounded-xl bg-dark-secondary border border-light-quaternary/40 hover:border-accent-brand/50 transition-all flex flex-col h-full cursor-pointer overflow-hidden hover:scale-[1.04] hover:z-50"
                  >
                    {/* Radial Accent Glow */}
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center_top,_rgba(255,128,128,0.12),_transparent_68%)]" />
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                      <img
                        src="/favicon-dope.svg"
                        alt=""
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                    {/* Header with Icon */}
                    <div className="mb-0 relative z-10">
                      <div className="flex items-center gap-3 mb-3">
                        {/* <div className="p-2 rounded-lg bg-accent-brand/10 border border-accent-brand/20">
                          <TemplateIcon className="w-5 h-5 text-accent-brand" />
                        </div> */}
                        <h3 className="text-lg font-semibold text-light-primary group-hover:text-accent-brand transition-colors">
                          {template.name}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-light-secondary flex-shrink-0" />
                      </div>
                      <p className="text-sm text-light-tertiary leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    {/* Reward Details */}
                    <div className="space-y-2 mb-0">
                      <div className="flex flex-wrap items-center gap-8">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-light-tertiary">
                            Reward Pool:
                          </span>
                          <span className="text-sm font-medium text-light-primary">
                            {rewardPool}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-light-tertiary">
                            Winners:
                          </span>
                          <span className="text-sm font-medium text-light-primary">
                            {usersToReward}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-light-tertiary">
                            Reward System:
                          </span>
                          <span className="text-sm font-medium text-light-primary">
                            {rewardSystem}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tasks/Requirements and Blockchain */}
                    <div className="flex items-center gap-4 mb-0 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-brand flex-shrink-0" />
                        <p className="text-sm text-light-tertiary">
                          {formattedTaskTypes.length > 3
                            ? `${formattedTaskTypes.slice(0, 3).join(" • ")} +${
                                formattedTaskTypes.length - 3
                              }`
                            : formattedTaskTypes.join(" • ")}
                        </p>
                      </div>
                      {blockchain && (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={chainIcon(blockchain)}
                            alt={blockchain}
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <span className="text-sm text-light-tertiary capitalize">
                            {blockchain}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Minimum Requirements */}
                    {minRequirements.length > 0 && (
                      <div className="flex items-center gap-2 mb-0">
                        <CheckCircle2 className="w-4 h-4 text-accent-brand flex-shrink-0" />
                        <span className="text-sm text-light-tertiary">
                          {minRequirements.join(" • ")}
                        </span>
                      </div>
                    )}

                    {/* Duration */}
                    {duration > 0 && (
                      <div className="flex items-center gap-2 mb-0">
                        <Clock className="w-4 h-4 text-light-tertiary" />
                        <span className="text-sm text-light-tertiary">
                          Duration: {duration} Day{duration !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Drafts Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {drafts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-light-tertiary mb-4">
                    No saved drafts yet
                  </p>
                  <p className="text-sm text-light-quaternary">
                    Start creating a campaign to save your progress automatically
                  </p>
                </div>
              ) : (
                drafts.map((draft) => {
                  const isSelected = selectedDraftId === draft.draftId;

                  const taskTypes =
                    draft.formData.tasks?.map((t) => t.task_type) || [];
                  const formattedTaskTypes = taskTypes.map(formatTaskType);
                  const rewardPool = draft.formData.reward_pool || 0;
                  const usersToReward =
                    draft.formData.total_users_to_reward || 0;
                  const blockchain = draft.formData.blockchain || "";
                  const isRaffle =
                    draft.formData.is_raffle ||
                    draft.formData.reward_system === "raffle";
                  const rewardSystem = isRaffle
                    ? "Raffle"
                    : draft.formData.reward_system === "custom"
                    ? "Targeted"
                    : "First Come";

                  const minRequirements: string[] = [];
                  if (
                    draft.formData.min_followers !== undefined &&
                    draft.formData.min_followers > 0
                  ) {
                    minRequirements.push(
                      `${draft.formData.min_followers}+ followers`
                    );
                  }
                  if (
                    draft.formData.min_smart_followers !== undefined &&
                    draft.formData.min_smart_followers > 0
                  ) {
                    minRequirements.push(
                      `${draft.formData.min_smart_followers}+ smart followers`
                    );
                  }
                  if (draft.formData.is_smart_account) {
                    minRequirements.push("Smart account");
                  }
                  if (draft.formData.is_verified_account) {
                    minRequirements.push("Verified");
                  }

                  const duration =
                    draft.formData.start_date && draft.formData.end_date
                      ? calculateDuration(
                          draft.formData.start_date,
                          draft.formData.end_date
                        )
                      : 0;

                  const preview = draft.formData.tasks?.length
                    ? `${draft.formData.tasks.length} task${
                        draft.formData.tasks.length > 1 ? "s" : ""
                      } configured`
                    : "Draft-ready campaign waiting for you to continue";

                  return (
                    <div
                      key={draft.draftId}
                      onClick={() => {
                        setSelectedDraftId(draft.draftId);
                        onSelectDraft?.(draft.draftId);
                      }}
                      className={`group relative p-6 gap-4 rounded-xl bg-dark-secondary border border-light-quaternary/40 hover:border-accent-brand/50
                       transition-all flex flex-col h-full cursor-pointer overflow-hidden hover:scale-[1.04] hover:z-50`}
                    >
                      {/* Radial Accent Glow */}
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center_top,_rgba(255,128,128,0.12),_transparent_68%)]" />
                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                        <img
                          src="/favicon-dope.svg"
                          alt=""
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-light-primary group-hover:text-accent-brand transition-colors">
                            {draft.title || "Untitled Campaign"}
                          </h3>
                          <ExternalLink className="w-4 h-4 text-light-secondary group-hover:text-accent-brand flex-shrink-0" />
                        </div>
                        <button
                          onClick={(e) => handleDeleteDraft(draft.draftId, e)}
                          className="p-2 rounded-md text-accent-brand hover:bg-dark-tertiary transition-colors"
                          aria-label="Delete draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 xl:gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-light-tertiary">
                              Reward Pool:
                            </span>
                            <span className="text-sm font-medium text-light-primary">
                              {rewardPool}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-light-tertiary">
                              Winners:
                            </span>
                            <span className="text-sm font-medium text-light-primary">
                              {usersToReward}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-light-tertiary">
                              Reward System:
                            </span>
                            <span className="text-sm font-medium text-light-primary">
                              {rewardSystem}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-accent-brand flex-shrink-0" />
                            <p className="text-sm text-light-tertiary">
                              {formattedTaskTypes.length === 0
                                ? "No tasks configured yet"
                                : formattedTaskTypes.length > 3
                                ? `${formattedTaskTypes
                                    .slice(0, 3)
                                    .join(" • ")} +${
                                    formattedTaskTypes.length - 3
                                  }`
                                : formattedTaskTypes.join(" • ")}
                            </p>
                          </div>
                          {blockchain && (
                            <div className="flex items-center gap-1.5">
                              <img
                                src={chainIcon(blockchain)}
                                alt={blockchain}
                                className="w-4 h-4 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <span className="text-sm text-light-tertiary capitalize">
                                {blockchain}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-light-quaternary">
                          Last edited {formatTimeAgo(draft.lastUpdated)}
                        </p>
                      </div>
                      {/* 
                      {minRequirements.length > 0 && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-accent-brand flex-shrink-0" />
                          <span className="text-sm text-light-tertiary">
                            {minRequirements.join(" • ")}
                          </span>
                        </div>
                      )}

                      {duration > 0 && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-light-tertiary" />
                          <span className="text-sm text-light-tertiary">
                            Duration: {duration} Day{duration !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )} */}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
