import { MessageSquare, Quote, Repeat, UserCheck } from "lucide-react";

export interface Influencer {
  x_handle: string | null;
  evm_wallet: string | null;
  solana_wallet: string | null;
}

export interface Campaign {
  campaign_id: string;
  owner_x_handle: string;
  influencer_x_handle: string;
  target_x_handle?: string;
  target_name?: string;
  target_token_symbol?: string;
  project_handle?: string;
  campaign_type: "Public" | "Targeted";
  campaign_name: string;
  description: string;
  status: "Ongoing" | "Completed" | "Upcoming";
  payment_token: string;
  payment_token_address: string;
  payment_token_decimals?: number;
  amount: number;
  chain: "Base" | "Solana";
  offer_end_date: string;
  counter?: number;
  project_wallet: string;
  influencer_wallet: string;
  verified_tweet_id?: string;
  is_visible: boolean;
  project_twitter?: string;
  project_whitepaper?: string;
  project_website?: string;
  project_telegram?: string;
  project_insta?: string;
  project_discord?: string;
  project_gitbook?: string;
  project_categories?: string;
  owner_info?: {
    name?: string;
    profile_image_url?: string;
    followers_count: number;
    followings_count: number;
    smart_followers_count?: number;
    engagement_score?: number;
  };
  campaign_rules?: string;
  ignore_accounts?: string;
  sub_campaigns?: Campaign[];
  seo_keywords?: string;
}

export type ReferralEntry = {
  x_handle: string;
  used_time: string;
  remaining_action?: "NONE" | "X_FOLLOW" | "PENDING";
  followers_count: number | null;
  smart_followers_count: number | null;
  reward_earned: number;
  profile_image_url?: string;
};

export type QuestEarningEntry = {
  quest_id: string;
  quest_title: string;
  // Legacy fields for backward compatibility
  task_id?: string;
  task_type?:
    | "follow"
    | "tweet"
    | "retweet"
    | "reply"
    | "quote_tweet"
    | "tweet_hashtag"
    | "tweet_cashtag"
    | "tweet_handle"
    | "tweet_image";
  task_description?: string;
  // New API fields
  task_types?: string[];
  tokens_earned?: number; // Keep for backward compatibility
  rewards_earned?: number | null;
  xp_earned?: number; // Optional since new API doesn't provide this
  completed_at: string;
  chain: "base" | "solana";
  tx_hash?: string; // Legacy field
  transaction?: string; // New API field
  profile_image_url?: string;
};

export type TransactionEntry = {
  id: string;
  type: "quest_earning" | "referral_bonus";
  description: string;
  amount: number;
  token_symbol: string;
  chain: "base" | "solana" | "ethereum";
  status: "completed" | "pending" | "failed";
  created_at: string;
  tx_hash?: string;
  related_quest_id?: string;
  related_referral_id?: string;
};

export type UserType = {
  x_handle: string;
  evm_wallet: string;
  solana_wallet: string;
  celo_wallet: string;
  algorand_wallet: string;
  referral_code: string;
  referral_code_used: string;
  tg_username?: string;
  chart_data?: GraphDataPoint[];
  activity_data?: HeatmapData;
  cred_score?: number;
  total_referrals?: number;
  x_follow_claimed?: boolean;
  total_points?: number;
  // extra user info
  name?: string;
  profile_image_url?: string;
  followers?: number;
  followings?: number;
  smart_followers?: number;
  engagement_score?: number;
  mindshare?: number;
  referrals: ReferralEntry[];
  partial_referrals: ReferralEntry[];
  is_admin?: boolean;
  is_verified?: boolean;
  is_smart_account?: boolean;
  is_external_smart_follower?: boolean; // Backend field, is_smart_account is convenience field
  world_id_verified?: boolean;
  world_id?: string;
};

export interface HeatmapData {
  handle: string;
  profile_image: string;
  daily_activity: DailyActivity[];
}

export interface DailyActivity {
  day: string;
  activity: ActivityItem[];
}

export interface ActivityItem {
  hour: number;
  avg_tweets: number;
}

export interface ProcessedActivityData {
  day: number;
  hour: number;
  value: number;
  actualTweets: number;
}
export interface GraphDataPoint {
  date: string;
  day: string;
  followers: number;
  smartFollowers: number;
  mindshare: number;
}

export interface InfluencerProfileResponse {
  success: boolean;
  message: string;
  result: {
    handle: string;
    chart_data: GraphDataPoint[];
    activity_data: HeatmapData;
    cred_score: number;
  };
}

export type TopCreator = {
  author_handle: string;
  profile_image_url: string;
};

export type Token = {
  value: string;
  address: string;
  symbol: string;
  decimals: number;
};

export const allowedSolanaTokens: Token[] = [
  {
    value: "PNUT",
    address: "DqzF9xAWWGqkCm3JSxrZxRbSapZCUSvNFjGqczG76RKN",
    symbol: "PNUT",
    decimals: 9,
  },
  {
    value: "GHH",
    address: "8UmwuePr2LHpt1H6aVpvHqp4LeTXDJq7HRH83Xoq5PXn",
    symbol: "GHH",
    decimals: 9,
  },
];

export interface Task {
  id: number;
  title: string;
  description: string;
  total: number;
  completed: number;
  points: number;
  action?: () => Promise<void>;
  link?: string;
}

export type QuestRewardSystem = "first_come" | "custom";
export type QuestStatus = "active" | "completed" | "cancelled" | "draft";

export interface TaskCriteria {
  task_id: string;
  criteria: "min_followers" | "min_smart_followers";
  count: number;
}

export interface QuestCriteria {
  quest_id: string;
  criteria:
    | "min_followers"
    | "min_smart_followers"
    | "is_verified_account"
    | "is_smart_account";
  count: number;
}

export interface QuestTask {
  task_id: string;
  task_follow_handle: string;
  task_type: "follow" | "tweet" | "retweet" | "reply" | "quote_tweet";
  task_tweet_id: string;
  task_tweet_cashtag?: string;
  task_tweet_hashtag?: string;
  task_tweet_handle?: string;
  task_tweet_website?: string;
  task_count?: number;
  task_description?: string;
  task_image_required?: boolean;
  target_author_handle?: string;
  profile_image_url?: string;
  user_status?:
    | "todo"
    | "under_review"
    | "completed"
    | "rejected"
    | "missingATA";
  criteria?: TaskCriteria[];
  user_tx_hash?: string;
  user_tokens_earned?: number;
  verification_result?: any;
}

export interface Quest {
  sharable_id: any;
  id: string;
  creator_x_handle: string;
  title: string;
  reward_pool: number;
  total_users_to_reward: number;
  start_date?: string;
  end_date: string;
  tasks: QuestTask[];
  reward_system: QuestRewardSystem;
  status: QuestStatus;
  created_at: string;
  updated_at: string;
  total_claimed?: number;
  total_participants?: number;
  eligibility_type?: "filters" | "kol_list";
  eligible_kol_list?: string[];
  kol_list_data?: Array<{
    handle: string;
    mode: string;
    token_amount: number | null;
    payout_status: string | null;
  }>;
  criteria?: QuestCriteria[];
  celebrated?: boolean; // Changed from is_celebrated
  is_raffle?: boolean;
  chain: "base" | "solana";
}

export interface QuestDetails {
  is_raffle: boolean | undefined;
  id: string;
  creator_x_handle: string;
  title: string;
  reward_pool: number;
  total_users_to_reward: number;
  start_date?: string;
  end_date: string;
  reward_system: QuestRewardSystem;
  status: QuestStatus;
  created_at: string;
  updated_at: string;
  is_test: boolean;
  total_claimed?: number;
  total_participants?: number;
  eligibility_type?: "filters" | "kol_list";
  eligible_kol_list?: string[];
  tasks: QuestTask[];
  criteria: QuestCriteria[];
  kol_data: string[];
  user_progress?: {
    user_handle: string;
    completed_tasks: number;
    total_tasks: number;
    all_tasks_completed: boolean;
  };
  chain?: "base" | "solana";
  token_address?: string;
}

export interface QuestComprehensiveDetails extends Quest {
  // Additional fields from comprehensive response
  user_quest_status?: Array<{
    user_x_handle: string;
    first_interaction: string | null;
    total_tasks: number;
    completed_tasks: number;
    all_tasks_completed: boolean;
    total_tokens_earned: number;
    tasks: Array<{
      task_id: string;
      task_type: string;
      task_follow_handle: string | null;
      task_tweet_id: string | null;
      task_tweet_cashtag: string | null;
      task_tweet_hashtag: string | null;
      task_tweet_handle: string | null;
      task_tweet_website: string | null;
      task_count: number | null;
      target_author_handle: string | null;
      profile_image_url: string | null;
      user_status: string;
      tx_hash: string | null;
      celebrated: boolean | null;
      tokens_earned: number | null;
      token_contract: string | null;
      created_at: string | null;
      updated_at: string | null;
      found_tweet_ids: string | null;
      verification_source: string | null;
      verification_timestamp: string | null;
      verification_summary: string | null;
      error_message: string | null;
      api_calls_count: number | null;
      tweets_found_count: number | null;
      verification_data: any | null;
    }>;
  }>;
  total_claimed?: number;
  total_users_interacted?: number;
}

export interface QuestResponse {
  success: boolean;
  data: Quest;
  message: string;
}

export interface UserQuestTaskCreate {
  task_id: string;
  user_x_handle: string;
  task_status:
    | "todo"
    | "under_review"
    | "completed"
    | "rejected"
    | "missingATA";
}

export interface UserQuestTaskUpdate {
  task_status:
    | "todo"
    | "under_review"
    | "completed"
    | "rejected"
    | "missingATA";
}

export interface UserQuestTask {
  task_id: string;
  user_x_handle: string;
  task_status:
    | "todo"
    | "under_review"
    | "completed"
    | "rejected"
    | "missingATA";
  created_at: string;
  updated_at: string;
}

export interface UserQuestTaskResponse {
  success: boolean;
  data: UserQuestTask;
  message: string;
}

export const TASK_TYPES = {
  follow: {
    label: "Follow Account",
    icon: UserCheck,
    fields: [
      {
        name: "task_follow_handle",
        placeholder: "Username",
        type: "text",
        required: true,
      },
    ],
  },
  retweet: {
    label: "Retweet Post",
    icon: Repeat,
    fields: [
      {
        name: "task_tweet_id",
        placeholder:
          "Post URL or ID (e.g., https://x.com/username/status/123456789)",
        type: "text",
        required: true,
      },
    ],
  },
  quote_tweet: {
    label: "Quote Post",
    icon: Quote,
    fields: [
      {
        name: "task_tweet_id",
        placeholder:
          "Post URL or ID (e.g., https://x.com/username/status/123456789)",
        type: "text",
        required: true,
      },
      {
        name: "task_description",
        placeholder:
          "What should participants include in their quote? (e.g., thoughts, opinions, additional context)",
        type: "textarea",
        required: false,
      },
    ],
  },
  reply: {
    label: "Reply to Post",
    icon: MessageSquare,
    fields: [
      {
        name: "task_tweet_id",
        placeholder:
          "Post URL or ID (e.g., https://x.com/username/status/123456789)",
        type: "text",
        required: true,
      },
      {
        name: "task_description",
        placeholder:
          "What should participants include in their reply? (e.g., thoughts, questions, feedback)",
        type: "textarea",
        required: false,
      },
    ],
  },
  tweet_hashtag: {
    label: "Create Post with Hashtag",
    icon: MessageSquare,
    fields: [
      {
        name: "task_tweet_hashtag",
        placeholder: "Hashtag (e.g., #Bitcoin, #Crypto, #DeFi)",
        type: "text",
        required: true,
      },
      {
        name: "task_count",
        placeholder: "Number of posts required",
        type: "number",
        required: true,
      },
      {
        name: "task_description",
        placeholder:
          "What should participants talk about? (e.g., features, benefits, news)",
        type: "textarea",
        required: false,
      },
    ],
  },
  tweet_cashtag: {
    label: "Create Post with Cashtag",
    icon: MessageSquare,
    fields: [
      {
        name: "task_tweet_cashtag",
        placeholder: "Cashtag (e.g., $BTC, $ETH, $SOL)",
        type: "text",
        required: true,
      },
      {
        name: "task_count",
        placeholder: "Number of posts required",
        type: "number",
        required: true,
      },
      {
        name: "task_description",
        placeholder:
          "What should participants talk about? (e.g., price action, utility, partnerships)",
        type: "textarea",
        required: false,
      },
    ],
  },
  tweet_handle: {
    label: "Create Post Mentioning Handle",
    icon: MessageSquare,
    fields: [
      {
        name: "task_tweet_handle",
        placeholder: "Handle to mention (e.g., Bitcoin, Ethereum)",
        type: "text",
        required: true,
      },
      {
        name: "task_count",
        placeholder: "Number of posts required",
        type: "number",
        required: true,
      },
      {
        name: "task_description",
        placeholder:
          "What should participants talk about? (e.g., project updates, community, achievements)",
        type: "textarea",
        required: false,
      },
    ],
  },
  tweet_image: {
    label: "Create Post with Image",
    icon: MessageSquare,
    fields: [
      {
        name: "task_tweet_cashtag",
        placeholder: "Cashtag (e.g., $BTC, $ETH, $SOL)",
        type: "text",
        required: false,
      },
      {
        name: "task_tweet_hashtag",
        placeholder: "Hashtag (e.g., #Bitcoin, #Crypto, #DeFi)",
        type: "text",
        required: false,
      },
      {
        name: "task_tweet_handle",
        placeholder: "Handle to mention (e.g., Bitcoin, Ethereum)",
        type: "text",
        required: false,
      },
      {
        name: "task_description",
        placeholder:
          "Describe what must be posted (e.g., Upload a picture of the Yellow Cab in Token2049 with the QR code visible)",
        type: "textarea",
        required: true,
      },
      
    ],
  },
  // tweet_website: {
  //   label: "Create Post with Website Link",
  //   icon: MessageSquare,
  //   fields: [
  //     {
  //       name: "task_tweet_website",
  //       placeholder: "Website URL (e.g., https://example.com)",
  //       type: "text",
  //       required: true,
  //     },
  //     {
  //       name: "task_count",
  //       placeholder: "Number of posts required",
  //       type: "number",
  //       required: true,
  //     },
  //   ],
  // },
};
