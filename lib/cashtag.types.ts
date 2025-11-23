interface TokenDataItem {
  vol_24hr?: string;
  narrative?: string[];
  is_coin: number;
  pc_1_hr: number;
  pc_6_hr: number;
  pc_24_hr: number;
  liquidity: number;
  market_cap: string;
  chain?: string;
  token_name?: string;
  trading_since?: string;
  age_in_seconds?: string;
  pair_created_at?: string;
  token_icon?: string;
  mindshare?: number;
  mindshare_change_24_hr?: number;
  mentions_change_7_d?: number;
  mentions_change_24_hr?: number;
  mentions_change_1_hr?: number;
  // mention_count?: string;
  followers_count?: number;
  twitter?: string;
  telegram?: string;
  mention_count_1hr?: number;
  mention_count_24hr?: number;
  mention_count_15min?: number;
  mention_count_6hr?: number;
  total_unique_accounts?: number;
  total_unique_accounts_24hr?: number;
  token_id?: string;
  pair_id?: string;
  token_symbol?: string;
  buy_tax?: number;
  sell_tax?: number;
  is_contract_verified?: number;
  lp_lock_percentage?: number;
  lp_burned: number;
  is_honeypot?: number;
  "24_hr_data"?: {
    change: string;
    total_volume: number;
  };
  holders_count?: number;
  token_twitter?: string;
  token_telegram?: string;
  token_twitter_account?: string;
  token_telegram_account?: string;
  token_website?: string;
  dex_url?: string;
  // influencer_count?: string;
  influencer_count_24hr?: string;
  is_cmc_listed?: string | number;
  is_cg_listed?: string | number;
  is_coinbase?: string | number;
  is_gateio?: string | number;
  is_bingx?: string | number;
  is_mexc?: string | number;
  is_okx?: string | number;
  is_binance?: string | number;
  is_bybit?: string | number;
  is_kucoin?: string | number;
  is_bitget?: string | number;
  is_bitmart?: string | number;
  smart_followers?: number;
  t_1hr_mentions?: number;
  t_2hr_mentions?: number;
  t_3hr_mentions?: number;
  t_4hr_mentions?: number;
  t_5hr_mentions?: number;
  t_6hr_mentions?: number;
  t_7hr_mentions?: number;
  t_8hr_mentions?: number;
  t_9hr_mentions?: number;
  hourly_median?: number;
  t_1d_mentions?: number;
  t_2d_mentions?: number;
  t_3d_mentions?: number;
  t_4d_mentions?: number;
  t_5d_mentions?: number;
  t_6d_mentions?: number;
  t_7d_mentions?: number;
  t_8d_mentions?: number;
  t_9d_mentions?: number;
  daily_median?: number;
  token_supply?: number;
  profile_image_url?: string;
  ath_market_cap?: number;
  ath_timestamp?: string;
  market_data_source?: string;
  cmc_slug?: string;
  cg_id?: string;
}

interface WatchlistTokenDataItem {
  is_coin: number;
  chain?: string;
  token_name?: string;
  token_id?: string;
  pair_id?: string;
  token_symbol?: string;
  cmc_slug?: string;
}
export interface WatchlistItem {
  is_coin: number;
  token_id?: string;
  token_symbol?: string;
  token_name?: string;
  cmc_slug?: string;
}
interface GetTokenLeaderboardProps {
  requestedData: {
    age?: { age_lte?: number; age_gte?: number };
    mktCap?: {
      market_cap_lte?: number;
      market_cap_gte?: number;
    };
    athMktCap?: {
      ath_market_cap_lte?: number;
      ath_market_cap_gte?: number;
    };
    influencers?: {
      influencer_count_gte?: number;
      influencer_count_lte?: number;
    };
    volume?: {
      vol_24hr_lte?: number;
      vol_24hr_gte?: number;
    };
    time24h?: string;
    liquidity?: {
      liquidity_lte?: number;
      liquidity_gte?: number;
    };
    holder?: {
      holders_count_gte?: number;
      holders_count_lte?: number;
    };
    followers?: {
      followers_count_lte?: number;
      followers_count_gte?: number;
    };
    smart_followers?: {
      smart_followers_lte?: number;
      smart_followers_gte?: number;
    };
    account?: {
      total_unique_accounts_gte?: number;
      total_unique_accounts_lte?: number;
    };
    mention_change_24_hr?: {
      mention_change_24_hr_gte?: number;
      mention_change_24_hr_lte?: number;
    };
    mention_15min?: {
      mention_count_15min_lte?: number;
      mention_count_15min_gte?: number;
    };
    mention_1hr?: {
      mention_count_1hr_lte?: number;
      mention_count_1hr_gte?: number;
    };
    mention_6hr?: {
      mention_count_6hr_lte?: number;
      mention_count_6hr_gte?: number;
    };
    mention_24hr?: {
      mention_count_24hr_lte?: number;
      mention_count_24hr_gte?: number;
    };
    chain?: string[];
    token_id?: string[];
    sortBy?: string;
    narrative?: string[];
    search_term?: string | string[];
    is_best_pair?: number;
    is_cmc_listed?: string | number;
    is_cg_listed?: string | number;
    is_coinbase?: string | number;
    is_gateio?: string | number;
    is_bingx?: string | number;
    is_mexc?: string | number;
    is_okx?: string | number;
    is_binance?: string | number;
    is_bybit?: string | number;
    is_kucoin?: string | number;
    is_bitget?: string | number;
    is_bitmart?: string | number;
  };
  start: number;
  limit: number;
  sort?: {
    field: keyof TokenDataItem;
    direction: "asc" | "desc";
  };
}

interface DexVolume {
  m5: number;
  h1: number;
  h6: number;
  h24: number;
}

interface DexPriceChange {
  m5: number;
  h1: number;
  h6: number;
  h24: number;
}

interface DexLiquidity {
  usd: number;
  base: number;
  quote: number;
}

interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  priceUsd: string;
  volume: DexVolume;
  priceChange: DexPriceChange;
  liquidity: DexLiquidity;
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  baseToken: {
    symbol: string;
    name: string;
    address: string;
  };
}

interface NewPairDataItem {
  token_id: string;
  pair_id: string;
  token_symbol: string;
  token_name: string;
  market_cap: string;
  liquidity: string;
  vol_24hr: string;
  token_logo?: string;
  mention_count: number;
  mentions_1_min: number;
  mentions_5_min: number;
  mentions_10_min: number;
  mentions_15_min: number;
  percent_change_1_min: number;
  percent_change_5_min: number;
  percent_change_10_min: number;
  percent_change_15_min: number;
  pair_created_at: string;
  pair_created_at_datetime: string;
}

interface GetNewPairDataItemResponse {
  result: NewPairDataItem[];
}

interface DexData {
  schemaVersion: string;
  pairs: Pair[];
}

interface GeckoTerminalData {
  data: {
    id: string;
    // type:string;
    attributes: {
      token_prices: {
        [key: string]: string;
      };
      market_cap_usd: {
        [key: string]: string;
      };
      h24_volume_usd: {
        [key: string]: string;
      };
    };
  };
}

interface GetCashtagDetailsProps {
  requestedData: {
    cashtags: string[];
  };
}

interface GetCashtagXChartProps {
  requestedData: {
    tag: string;
    token_symbol: string;
  };
  start: number;
  limit: number;
}

interface GetCashtagDyorProps {
  requestedData: {
    args: string;
    is_token: boolean;
  };
}

interface GetNewPairsProps {
  requestedData: {
    ageLte: number;
  };
}

interface GetCashtagXProps {
  requestedData: {
    token_symbol: string;
    time_in_seconds: number;
    sort_by: string;
  };
  start: number;
  limit: number;
}

interface GetCoinInfoProps {
  requestedData: {
    tweet_id?: string;
    symbols: string[];
  };
}

interface GetTokenInfoAPIResponse {
  result: TokenDataItem[];
}

interface GetOtherChainInfoProps {
  requestedData: {
    tweet_id?: string;
    tokens: {
      token_id: string;
      chain: string;
    }[];
  };
}

interface GetEthereumChainInfoProps {
  requestedData: {
    tweet_id?: string;
    tokens: string[];
  };
}

interface GetCashtagXResponse {
  result: {
    author_handle: string;
    tweet_count: number;
    followers_count: number;
    profile_image_url: string;
    crypto_tweets_all: number;
    engagement_score: number;
    followers_impact: number;
  }[];
  is_more_data: boolean;
}

interface GetTokenLeaderboardResponse {
  result: TokenDataItem[];
  is_more_data: boolean;
}

interface GetTokenLeaderboardKpiResponse {
  result: {
    total_tokens: number;
    total_mentions: number;
    total_accounts: number;
    total_marketcap: number;
    total_volume: number;
    total_liquidity: number;
  };
}

interface GetCashtagDetailsResponse {
  result: {
    token_symbol: string;
    total_tweets: number;
    total_accounts: number;
    total_influencers: number;
  }[];
}

interface GetCashtagXChartResponse {
  result: {
    token_symbol: string;
    date: string;
    count: number;
  }[];
}

// interface XChartItem {
//   token_symbol: string;
//   date: string;
//   count: number;
// }

interface GetCashtagDyorResponse {
  cashtag: string;
  data: string;
}

interface getotherchaininfoResponse {
  result: {
    chain: string;
    pair_id: string;
    token_id: string;
    token_symbol: string;
    token_name: string;
    age_in_seconds: number;
    latest_liquidity_usd: number;
    liquidity: number;
    latest_market_cap: number;
    market_cap: number;
    liquidity_lock_percentage: null;
    ath_market_cap: null;
    holders_count: number;
    token_twitter_account: string;
    token_twitter: string;
    token_telegram_account: string;
    token_telegram: string;
    token_website: string;
    token_icon: string;
    buy_tax: number;
    sell_tax: number;
    is_honeypot: number;
    dex: string;
    dex_url: string;
    "5_min_data": {
      change: number;
      total_volume: number;
      buy_txn: number;
      sell_txn: number;
    };
    "1_hr_data": {
      change: number;
      total_volume: number;
      buy_txn: number;
      sell_txn: number;
    };
    "6_hr_data": {
      change: number;
      total_volume: number;
      buy_txn: number;
      sell_txn: number;
    };
    "24_hr_data": {
      change: number;
      total_volume: number;
      buy_txn: number;
      sell_txn: number;
    };
    pair_created_at: number;
    trading_since: number;
    lp_burned: number;
    is_scam: null;
    can_burn: number;
    can_mint: number;
    can_freeze: null;
    contract_creator: string;
    contract_owner: string;
    lp_lock_percentage: number;
    lp_unlock_date: string;
    narrative: string[];
    mentions_in_24hr: null;
    influencer_count: null;
    total_accounts: null;
    is_contract_verified: number;
  }[];
}

interface GET_COIN_INFOResponse {
  result: {
    pair_id: null;
    token_id: null;
    age_in_seconds: number;
    latest_liquidity_usd: null;
    liquidity: null;
    latest_market_cap: number;
    market_cap: number;
    buy_tax: null;
    sell_tax: null;
    is_honeypot: null;
    liquidity_lock_percentage: null;
    is_contract_verified: null;
    ath_market_cap: null;
    holders_count: null;
    dex: null;
    token_website: null;
    "5_min_data": {
      change: null;
      buy_volume: null;
      sell_volume: null;
      total_volume: null;
      buy_txn: null;
      sell_txn: null;
      total_txn: null;
      unique_buyers: null;
      unique_sellers: null;
    };
    "1_hr_data": {
      change: number;
      buy_volume: null;
      sell_volume: null;
      total_volume: null;
      buy_txn: null;
      sell_txn: null;
      total_txn: null;
      unique_buyers: null;
      unique_sellers: null;
    };
    "6_hr_data": {
      change: null;
      buy_volume: null;
      sell_volume: null;
      total_volume: null;
      buy_txn: null;
      sell_txn: null;
      total_txn: null;
      unique_buyers: null;
      unique_sellers: null;
    };
    "24_hr_data": {
      change: number;
      buy_volume: null;
      sell_volume: null;
      total_volume: number;
      buy_txn: null;
      sell_txn: null;
      total_txn: null;
      unique_buyers: null;
      unique_sellers: null;
    };
    holder_distribution: {
      top_5_by_percentage_holdings: null;
      top_20_by_percentage_holdings: null;
      top_100_by_percentage_holdings: null;
      liquidity_pool: null;
      burnt: null;
    };
    chain: null;
    pair_created_at: null;
    trading_since: null;
    token_symbol: string;
    token_name: string;
    token_twitter_account: string;
    token_twitter: string;
    token_telegram_account: string;
    token_telegram: string;
    token_icon: string;
  }[];
}

interface TokenLeaderboardDataInterface {
  id?: string;
  name?: string;
  url?: string;
  token_symbol?: string;
  mention_count?: string;
  vol_24hr?: string;
  market_cap?: string;
  liquidity?: number;
  influencer_count?: string;
  twitter?: string;
  telegram?: string;
  narrative?: string[];
  mentions_change_30_min?: number;
  mentions_change_1_hr?: number;
  mentions_change_24_hr?: number;
  mentions_change_7_d?: number;
}

interface GetTokenInfoProps {
  requestedTokens: {
    chain: string;
    id: string;
    is_coin: number;
    token_symbol: string;
  }[];
  tweetId?: string;
}

interface TokenInfo {
  chain: string;
  id: string;
  is_coin: number;
  token_symbol: string;
}

interface SegregatedCoinsProps {
  tokens: TokenInfo[];
  coins: string[];
}

interface GetCashtagTweetNewsprops {
  requestedData: {
    start_time: number;
    end_time: number;
    token_symbol: string[];
  };
  start: number;
  limit: number;
}

interface Tweet {
  tweet_id: string;
  tweet_body: string;
  tweet_create_time: string;
  profile_image_url: string;
  author_handle: string;
  author_name: string;
  retweeted_author_handle: string | null;
  retweet_profile_image_url: string | null;
  retweet_author_name: string | null;
  hashtag: string;
  followers_count: string;
}

interface GetCashtagTweetNewsResponse {
  result: Tweet[];
  is_more_data: boolean;
}

interface EntityData {
  entity: string;
  engagement: string | null;
  count: string;
}

interface Result {
  symbol: EntityData[];
  hashtag: EntityData[];
  account: EntityData[];
}

interface GetCashtagTweetSummaryprops {
  requestedData: {
    start_time: number;
    end_time: number;
    token_symbol: string[];
  };
}

interface GetCashtagTweetSummaryResponse {
  result: Result;
}

interface DexScreenerIframeProps {
  pairId: string | null;
  chain: string | null;
}

interface HierarchyOption {
  value: string;
  label: string;
  accessor: (d: TokenDataItem) => number;
}

interface ColorByOption {
  value: string;
  label: string;
  accessor: (d: TokenDataItem, duration: keyof DurationMap) => number;
}

interface CryptoTreemapProps {
  combinedData?: TokenDataItem[];
  isVisible?: boolean;
}

interface DurationMap {
  "1hr": number;
  "24hr": number;
  "7days": number;
}

interface FilterValue {
  min: string; // Using `string` because input values are strings
  max: string;
}

interface FilterValuesState {
  [key: string]: FilterValue;
}

export type {
  ColorByOption,
  CryptoTreemapProps,
  DexData,
  DexLiquidity,
  DexPriceChange,
  DexScreenerIframeProps,
  DexVolume,
  DurationMap,
  FilterValuesState,
  GeckoTerminalData,
  GET_COIN_INFOResponse,
  GetCashtagDetailsProps,
  GetCashtagDetailsResponse,
  GetCashtagDyorProps,
  GetCashtagDyorResponse,
  GetCashtagTweetNewsprops,
  GetCashtagTweetNewsResponse,
  GetCashtagTweetSummaryprops,
  GetCashtagTweetSummaryResponse,
  GetCashtagXChartProps,
  GetCashtagXChartResponse,
  GetCashtagXProps,
  GetCashtagXResponse,
  GetCoinInfoProps,
  GetEthereumChainInfoProps,
  GetNewPairDataItemResponse,
  GetNewPairsProps,
  GetOtherChainInfoProps,
  getotherchaininfoResponse,
  GetTokenInfoAPIResponse,
  GetTokenInfoProps,
  GetTokenLeaderboardKpiResponse,
  GetTokenLeaderboardProps,
  GetTokenLeaderboardResponse,
  HierarchyOption,
  NewPairDataItem,
  Pair,
  SegregatedCoinsProps,
  TokenDataItem,
  TokenLeaderboardDataInterface,
  WatchlistTokenDataItem,
};
