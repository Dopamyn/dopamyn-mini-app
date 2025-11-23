import { QuestFormData } from "./draftManager";

export interface QuestTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  data: QuestFormData;
}

export const questTemplates: QuestTemplate[] = [
  {
    id: "referral-quest",
    name: "Referral Campaign",
    description: "Get users to join your community through referrals",
    icon: "users",
    data: {
      title: "Join Our Community",
      blockchain: "base",
      creator_x_handle: "",
      reward_pool: 10,
      total_users_to_reward: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      tasks: [
        {
          task_type: "follow",
          task_follow_handle: "@yourhandle",
          task_description: "Follow our official account to get started",
          task_count: 1,
        },
        {
          task_type: "tweet",
          task_tweet_hashtag: "#YourCommunity",
          task_description: "Post about joining our community",
          task_count: 1,
        },
      ],
      reward_system: "first_come",
      kolListData: [],
      eligibility_type: "filters",
      is_raffle: false,
      min_followers: 10,
      min_smart_followers: 0,
      is_smart_account: false,
      is_verified_account: false,
      eligibleKolListData: [],
    },
  },
  {
    id: "follow-retweet",
    name: "Follow + Retweet",
    description: "Simple engagement quest with follow and retweet tasks",
    icon: "heart",
    data: {
      title: "Follow & Retweet Campaign",
      blockchain: "base",
      creator_x_handle: "",
      reward_pool: 20,
      total_users_to_reward: 20,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      tasks: [
        {
          task_type: "follow",
          task_follow_handle: "@yourhandle",
          task_description: "Follow our account for updates",
          task_count: 1,
        },
        {
          task_type: "retweet",
          task_tweet_id: "your-tweet-url",
          task_description: "Retweet our announcement post",
          task_count: 1,
        },
      ],
      reward_system: "first_come",
      kolListData: [],
      eligibility_type: "filters",
      is_raffle: false,
      min_followers: 50,
      min_smart_followers: 0,
      is_smart_account: false,
      is_verified_account: false,
      eligibleKolListData: [],
    },
  },
  {
    id: "content-engagement",
    name: "Content Engagement",
    description: "Drive engagement on your latest content post",
    icon: "target",
    data: {
      title: "Engage with Our Latest Post",
      blockchain: "base",
      creator_x_handle: "",
      reward_pool: 100,
      total_users_to_reward: 50,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      tasks: [
        {
          task_type: "retweet",
          task_tweet_id: "your-content-tweet-url",
          task_description: "Retweet our latest content",
          task_count: 1,
        },
        {
          task_type: "reply",
          task_tweet_id: "your-content-tweet-url",
          task_description: "Leave a thoughtful reply on our post",
          task_count: 1,
        },
        {
          task_type: "quote_tweet",
          task_tweet_id: "your-content-tweet-url",
          task_description: "Quote tweet with your thoughts",
          task_count: 1,
        },
      ],
      reward_system: "first_come",
      kolListData: [],
      eligibility_type: "filters",
      is_raffle: false,
      min_followers: 100,
      min_smart_followers: 5,
      is_smart_account: false,
      is_verified_account: false,
      eligibleKolListData: [],
    },
  },
  {
    id: "brand-awareness",
    name: "Brand Awareness",
    description: "Increase brand visibility with hashtag campaigns",
    icon: "megaphone",
    data: {
      title: "Spread the Word",
      blockchain: "solana",
      creator_x_handle: "",
      reward_pool: 25,
      total_users_to_reward: 10,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      tasks: [
        {
          task_type: "follow",
          task_follow_handle: "@yourhandle",
          task_description: "Follow us for updates",
          task_count: 1,
        },
        {
          task_type: "tweet",
          task_tweet_hashtag: "#YourBrand",
          task_description: "Create content using our hashtag",
          task_count: 1,
        },
      ],
      reward_system: "first_come",
      kolListData: [],
      eligibility_type: "filters",
      is_raffle: false,
      min_followers: 200,
      min_smart_followers: 10,
      is_smart_account: true,
      is_verified_account: false,
      eligibleKolListData: [],
    },
  },
];

export function getTemplateById(id: string): QuestTemplate | undefined {
  return questTemplates.find((template) => template.id === id);
}
