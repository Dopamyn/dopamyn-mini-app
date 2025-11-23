export interface ProfileData {
  name: string;
  author_handle: string;
  bio: string;
  profile_image_url: string;
  followers_count: number;
  smart_followers_count: number;
  mindshare: number;
  account_created_at?: string;
}

export interface ChartDataPoint {
  date: string;
  label?: string;
  followers_count: number;
  smart_followers_count: number;
  mindshare: number;
  value?: number;
  originalValue?: number;
}

export interface ActivityData {
  hour: number;
  avg_tweets: number;
}

export interface DailyActivity {
  day: string;
  activity: ActivityData[];
}

export interface UserProfileResponse {
  result: {
    chart_data: [string, string, number, number, number][];
    activity_data: {
      handle: string;
      daily_activity: DailyActivity[];
      profile_image: string;
    };
    cred_score: number;
  };
  message: string;
}

export interface AuthorDetailsResponse {
  result: {
    author_handle: string;
    name: string;
    bio: string;
    url_in_bio: string;
    profile_image_url: string;
    profile_banner_url: string;
    followers_count: number;
    followings_count: number;
    account_created_at: string;
    crypto_tweets_all: number | null;
    crypto_tweets_views_all: number | null;
    engagement_score: number | null;
    followers_impact: number | null;
    total_symbols_mentioned: number | null;
    symbols_mentioned_in_last_24hr: number | null;
    new_symbols_mentioned_in_last_24hr: number | null;
    unique_author_handle_count: number | null;
    total_mention_count: number | null;
    tags: string[];
    mentions_24hr: number | null;
    mindshare: number | null;
    smart_followers_count: number | null;
  };
  message: string;
}

export interface Tweet {
  tweet_id: string;
  author_handle: string;
  body: string;
  tweet_create_time: string;
  view_count: number;
  like_count: number;
  quote_count: number;
  reply_count: number;
  retweet_count: number;
  profile_image_url: string;
  sentiment: number | null;
  tweet_category?: string | null;
}

export interface TweetMentionData {
  tweet_id: string;
  mentioned_author_handle: string;
  author_found: boolean;
  author_handle: string;
  body: string;
  author_id?: string;
  tweet_create_time?: string;
  view_count?: number;
  like_count?: number;
  quote_count?: number;
  reply_count?: number;
  retweet_count?: number;
  profile_image_url?: string;
  sentiment?: number;
  tweet_category?: string | null;
}

export interface PaginationInfo {
  total_count: number;
  start: number;
  limit: number;
  has_more: boolean;
  next_start?: number;
}

export interface MentionsResponse {
  tweets: TweetMentionData[];
  pagination: PaginationInfo;
}

export interface TopTweetsResponse {
  result: Tweet[];
  message: string;
}

export interface TokenData {
  symbol: string;
  total_tweets: number;
  first_tweet_time: string;
  last_tweet_time: string;
  icon: string | null;
  narratives: string[];
  volume_24hr: number;
}

export interface TokenOverviewResponse {
  result: {
    unique_token_count: number;
    total_mentions: number;
    most_mentioned_token: {
      symbol: string;
      mention_count: number;
    };
    narrative_breakdown: Record<string, number>;
    tokens: TokenData[];
  };
  message: string;
}

export interface AuthorData {
  author_handle: string;
  name: string;
  bio: string;
  url_in_bio: string;
  profile_image_url: string;
  profile_banner_url: string;
  followers_count: number;
  followings_count: number;
  account_created_at: string;
  crypto_tweets_all: number;
  crypto_tweets_views_all: number;
  engagement_score: number;
  followers_impact: number;
  smart_followers_count: number;
}

export interface MindshareResponse {
  result: {
    period: string;
    project_name: string;
    author_handle: string | null;
    total_results: number;
    mindshare_data: Array<{
      project_name: string;
      author_handle: string;
      author_buzz: number;
      project_buzz: number;
      mindshare_percent: number;
      period: string;
      created_at: string;
      tweet_count: number;
      current_rank: number;
      previous_rank: number;
      user_info: {
        name: string;
        handle: string;
        profile_image_url: string | null;
        followers_count: number;
        followings_count: number;
        smart_followers_count: number;
        engagement_score: number;
        user_joined: boolean;
      };
    }>;
  };
  message: string;
}

export interface Community {
  id: string;
  name: string;
  image: string;
  followers: number;
  active_quests: number;
  token: string;
  description?: string;
  tags?: string[];
  verified?: boolean;
}
