/**
 * Draft Manager for Campaign Creation
 *
 * Manages localStorage-based draft storage for quest creation flow.
 * All drafts are stored under the "questDrafts" key.
 */

import { z } from "zod";

// Import the form schema type from the quest creation page
// We'll infer the type from the schema structure
export type QuestFormData = {
  title: string;
  blockchain: "base" | "solana";
  creator_x_handle: string;
  reward_pool: number;
  total_users_to_reward: number;
  start_date: string;
  end_date: string;
  tasks: Array<{
    task_id?: string;
    task_follow_handle?: string;
    task_type: "follow" | "tweet" | "retweet" | "reply" | "quote_tweet";
    task_tweet_id?: string;
    task_tweet_cashtag?: string;
    task_tweet_hashtag?: string;
    task_tweet_handle?: string;
    task_tweet_website?: string;
    task_count?: number;
    task_description?: string;
    task_image_required?: boolean;
    criteria?: Array<{
      quest_id?: string;
      criteria: "min_followers" | "min_smart_followers";
    }>;
  }>;
  criteria?: Array<{
    quest_id?: string;
    criteria: "min_followers" | "min_smart_followers";
  }>;
  reward_system: "first_come" | "raffle" | "custom";
  kolListFile?: any;
  kolListData?: Array<{
    handle: string;
    amount: number;
    profile_image_url?: string;
    name?: string;
  }>;
  eligibility_type?: "filters" | "kol_list";
  is_raffle?: boolean;
  min_followers?: number;
  min_smart_followers?: number;
  is_smart_account?: boolean;
  is_verified_account?: boolean;
  eligibleKolListFile?: any;
  eligibleKolListData?: Array<string | {
    handle: string;
    profile_image_url?: string;
    name?: string;
  }>;
};

/**
 * Quest Draft structure
 * Includes form data plus metadata
 */
export interface QuestDraft {
  draftId: string;
  formData: QuestFormData;
  currentStep: number;
  lastUpdated: string; // ISO timestamp
  title: string; // For display in drafts list
  chainId?: string; // Chain ID (e.g., "solana-devnet", "base-mainnet") to preserve exact chain selection
}

/**
 * Storage key for all drafts
 */
const STORAGE_KEY = "questDrafts";

/**
 * Get all drafts from localStorage
 */
function getAllDraftsFromStorage(): Record<string, QuestDraft> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error reading drafts from localStorage:", error);
    return {};
  }
}

/**
 * Save all drafts to localStorage
 */
function saveAllDraftsToStorage(drafts: Record<string, QuestDraft>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.error("Error saving drafts to localStorage:", error);
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn(
        "localStorage quota exceeded. Consider cleaning up old drafts."
      );
    }
  }
}

/**
 * Create a new draft
 * @param initialData Optional initial form data
 * @returns The newly created draft ID
 */
export function createDraft(initialData?: Partial<QuestFormData>): string {
  const draftId = crypto.randomUUID();
  const now = new Date().toISOString();

  const defaultFormData: QuestFormData = {
    title: "",
    blockchain: "base",
    creator_x_handle: "",
    reward_pool: 1,
    total_users_to_reward: 1,
    start_date: new Date().toISOString(),
    end_date: "",
    tasks: [],
    reward_system: "first_come",
    kolListData: [],
    eligibility_type: "filters",
    is_raffle: false,
    min_followers: 0,
    min_smart_followers: 0,
    is_smart_account: false,
    is_verified_account: false,
    eligibleKolListData: [],
  };

  const draft: QuestDraft = {
    draftId,
    formData: {
      ...defaultFormData,
      ...initialData,
    },
    currentStep: 1,
    lastUpdated: now,
    title: initialData?.title || "Untitled Campaign",
  };

  const allDrafts = getAllDraftsFromStorage();
  allDrafts[draftId] = draft;
  saveAllDraftsToStorage(allDrafts);

  return draftId;
}

/**
 * Get a specific draft by ID
 * @param draftId The draft ID
 * @returns The draft if found, undefined otherwise
 */
export function getDraft(draftId: string): QuestDraft | undefined {
  const allDrafts = getAllDraftsFromStorage();
  return allDrafts[draftId];
}

/**
 * Update an existing draft
 * @param draftId The draft ID
 * @param updates Partial updates to apply
 */
export function updateDraft(
  draftId: string,
  updates: Partial<QuestDraft>
): void {
  const allDrafts = getAllDraftsFromStorage();
  const existingDraft = allDrafts[draftId];

  if (!existingDraft) {
    console.warn(`Draft ${draftId} not found. Cannot update.`);
    return;
  }

  // Merge updates with existing draft
  const updatedDraft: QuestDraft = {
    ...existingDraft,
    ...updates,
    // Always update lastUpdated timestamp
    lastUpdated: new Date().toISOString(),
    // If formData is being updated, merge it properly
    formData: updates.formData
      ? { ...existingDraft.formData, ...updates.formData }
      : existingDraft.formData,
    // Update title if formData.title changed
    title:
      updates.formData?.title ||
      (updates.title !== undefined ? updates.title : existingDraft.title),
  };

  allDrafts[draftId] = updatedDraft;
  saveAllDraftsToStorage(allDrafts);
}

/**
 * Delete a draft
 * @param draftId The draft ID to delete
 */
export function deleteDraft(draftId: string): void {
  const allDrafts = getAllDraftsFromStorage();
  delete allDrafts[draftId];
  saveAllDraftsToStorage(allDrafts);
}

/**
 * Get all drafts
 * @returns Record of all drafts keyed by draft ID
 */
export function getAllDrafts(): Record<string, QuestDraft> {
  return getAllDraftsFromStorage();
}

/**
 * Get drafts sorted by last updated (newest first)
 * @returns Array of drafts sorted by lastUpdated
 */
export function getDraftsSortedByDate(): QuestDraft[] {
  const allDrafts = getAllDrafts();
  return Object.values(allDrafts).sort((a, b) => {
    return (
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  });
}

/**
 * Format time ago string for display
 * @param timestamp ISO timestamp
 * @returns Human-readable time ago string
 */
export function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return "just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 4)
    return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  if (diffMonths < 12)
    return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${Math.floor(diffMonths / 12)} year${
    Math.floor(diffMonths / 12) === 1 ? "" : "s"
  } ago`;
}
