import apiClientNew from "./alphaApi";
import {
  GetTokenLeaderboardProps,
  GetTokenLeaderboardResponse,
} from "./cashtag.types";

export const getCashtagLeaderboard = async (
  params: GetTokenLeaderboardProps
): Promise<GetTokenLeaderboardResponse> => {
  const { requestedData, start, limit } = params;
  const {
    chain,
    sortBy,
    narrative,
    age,
    mktCap,
    athMktCap,
    liquidity,
    volume,
    holder,
    followers,
    smart_followers,
    influencers,
    search_term,
    account,
    mention_change_24_hr,
    token_id,
    is_best_pair,
    mention_15min,
    mention_1hr,
    mention_6hr,
    mention_24hr,
    is_cmc_listed,
    is_cg_listed,
    is_coinbase,
    is_gateio,
    is_bingx,
    is_mexc,
    is_okx,
    is_binance,
    is_bybit,
    is_kucoin,
    is_bitget,
    is_bitmart,
  } = requestedData || {};

  // normalize array fields into comma-separated strings
  const chainParam = Array.isArray(chain) ? chain.join(",") : chain;
  const narrativeParam = Array.isArray(narrative)
    ? narrative.join(",")
    : narrative;
  const tokenIdParam = Array.isArray(token_id) ? token_id.join(",") : token_id;
  const tokenSymbolParam = Array.isArray(search_term)
    ? search_term.join(",")
    : search_term;

  const queryParams: Record<string, string | number | boolean> = {
    start,
    limit,
    ...(chainParam && { chain: chainParam }),
    ...(narrativeParam && { narrative: narrativeParam }),
    ...(token_id && token_id.length && { token_id: tokenIdParam }),
    ...(search_term &&
      search_term.length && { token_symbol: tokenSymbolParam }),
    ...(age &&
      (age.age_gte || age.age_lte) && {
        age_gte: age.age_gte,
        age_lte: age.age_lte,
      }),
    ...(liquidity &&
      (liquidity.liquidity_gte || liquidity.liquidity_lte) && {
        liquidity_gte: liquidity.liquidity_gte,
        liquidity_lte: liquidity.liquidity_lte,
      }),
    ...(holder &&
      (holder.holders_count_gte || holder.holders_count_lte) && {
        holders_count_gte: holder.holders_count_gte,
        holders_count_lte: holder.holders_count_lte,
      }),
    ...(mktCap &&
      (mktCap.market_cap_gte || mktCap.market_cap_lte) && {
        market_cap_gte: mktCap.market_cap_gte,
        market_cap_lte: mktCap.market_cap_lte,
      }),
    ...(athMktCap &&
      (athMktCap.ath_market_cap_gte || athMktCap.ath_market_cap_lte) && {
        ath_market_cap_gte: athMktCap.ath_market_cap_gte,
        ath_market_cap_lte: athMktCap.ath_market_cap_lte,
      }),
    ...(volume &&
      (volume.vol_24hr_gte || volume.vol_24hr_lte) && {
        vol_24hr_gte: volume.vol_24hr_gte,
        vol_24hr_lte: volume.vol_24hr_lte,
      }),
    ...(followers &&
      (followers.followers_count_gte || followers.followers_count_lte) && {
        followers_count_gte: followers.followers_count_gte,
        followers_count_lte: followers.followers_count_lte,
      }),
    ...(smart_followers &&
      (smart_followers.smart_followers_gte ||
        smart_followers.smart_followers_lte) && {
        smart_followers_gte: smart_followers.smart_followers_gte,
        smart_followers_lte: smart_followers.smart_followers_lte,
      }),
    ...(influencers &&
      (influencers.influencer_count_gte ||
        influencers.influencer_count_lte) && {
        influencer_count_24hr_gte: influencers.influencer_count_gte,
        influencer_count_24hr_lte: influencers.influencer_count_lte,
      }),
    ...(account &&
      (account.total_unique_accounts_gte ||
        account.total_unique_accounts_lte) && {
        total_unique_accounts_24hr_gte: account.total_unique_accounts_gte,
        total_unique_accounts_24hr_lte: account.total_unique_accounts_lte,
      }),
    ...(mention_change_24_hr &&
      (mention_change_24_hr.mention_change_24_hr_gte ||
        mention_change_24_hr.mention_change_24_hr_lte) && {
        mentions_change_24_hr_gte:
          mention_change_24_hr.mention_change_24_hr_gte,
        mentions_change_24_hr_lte:
          mention_change_24_hr.mention_change_24_hr_lte,
      }),
    ...(mention_15min &&
      (mention_15min.mention_count_15min_gte ||
        mention_15min.mention_count_15min_lte) && {
        mention_count_15min_gte: mention_15min.mention_count_15min_gte,
        mention_count_15min_lte: mention_15min.mention_count_15min_lte,
      }),
    ...(mention_1hr &&
      (mention_1hr.mention_count_1hr_gte ||
        mention_1hr.mention_count_1hr_lte) && {
        mention_count_1hr_gte: mention_1hr.mention_count_1hr_gte,
        mention_count_1hr_lte: mention_1hr.mention_count_1hr_lte,
      }),
    ...(mention_6hr &&
      (mention_6hr.mention_count_6hr_gte ||
        mention_6hr.mention_count_6hr_lte) && {
        mention_count_6hr_gte: mention_6hr.mention_count_6hr_gte,
        mention_count_6hr_lte: mention_6hr.mention_count_6hr_lte,
      }),
    ...(mention_24hr &&
      (mention_24hr.mention_count_24hr_gte ||
        mention_24hr.mention_count_24hr_lte) && {
        mention_count_24hr_gte: mention_24hr.mention_count_24hr_gte,
        mention_count_24hr_lte: mention_24hr.mention_count_24hr_lte,
      }),
    ...(sortBy && sortBy !== "_" && { sort_by: sortBy }),
    ...(is_best_pair && { is_best_pair }),
    ...(is_cmc_listed && { is_cmc_listed }),
    ...(is_cg_listed && { is_cg_listed }),
    ...(is_coinbase && { is_coinbase }),
    ...(is_gateio && { is_gateio }),
    ...(is_bingx && { is_bingx }),
    ...(is_mexc && { is_mexc }),
    ...(is_okx && { is_okx }),
    ...(is_binance && { is_binance }),
    ...(is_bybit && { is_bybit }),
    ...(is_kucoin && { is_kucoin }),
    ...(is_bitget && { is_bitget }),
    ...(is_bitmart && { is_bitmart }),
  };

  const { data } = await apiClientNew.get<GetTokenLeaderboardResponse>(
    "/token/token-leaderboard",
    {
      params: queryParams,
    }
  );

  return data;
};
export const getCashtagLeaderboardHeatmap = async (
  params: GetTokenLeaderboardProps
): Promise<GetTokenLeaderboardResponse> => {
  const { requestedData, start, limit } = params;
  const {
    chain,
    sortBy,
    narrative,
    age,
    mktCap,
    athMktCap,
    liquidity,
    volume,
    holder,
    followers,
    smart_followers,
    influencers,
    search_term,
    account,
    mention_change_24_hr,
    token_id,
    is_best_pair,
    mention_15min,
    mention_1hr,
    mention_6hr,
    mention_24hr,
    is_cmc_listed,
    is_cg_listed,
    is_coinbase,
    is_gateio,
    is_bingx,
    is_mexc,
    is_okx,
    is_binance,
    is_bybit,
    is_kucoin,
    is_bitget,
    is_bitmart,
  } = requestedData || {};

  // normalize array fields into comma-separated strings
  const chainParam = Array.isArray(chain) ? chain.join(",") : chain;
  const narrativeParam = Array.isArray(narrative)
    ? narrative.join(",")
    : narrative;
  const tokenIdParam = Array.isArray(token_id) ? token_id.join(",") : token_id;
  const tokenSymbolParam = Array.isArray(search_term)
    ? search_term.join(",")
    : search_term;

  const queryParams: Record<string, string | number | boolean> = {
    start,
    limit,
    ...(chainParam && { chain: chainParam }),
    ...(narrativeParam && { narrative: narrativeParam }),
    ...(token_id && token_id.length && { token_id: tokenIdParam }),
    ...(search_term &&
      search_term.length && { token_symbol: tokenSymbolParam }),
    ...(age &&
      (age.age_gte || age.age_lte) && {
        age_gte: age.age_gte,
        age_lte: age.age_lte,
      }),
    ...(liquidity &&
      (liquidity.liquidity_gte || liquidity.liquidity_lte) && {
        liquidity_gte: liquidity.liquidity_gte,
        liquidity_lte: liquidity.liquidity_lte,
      }),
    ...(holder &&
      (holder.holders_count_gte || holder.holders_count_lte) && {
        holders_count_gte: holder.holders_count_gte,
        holders_count_lte: holder.holders_count_lte,
      }),
    ...(mktCap &&
      (mktCap.market_cap_gte || mktCap.market_cap_lte) && {
        market_cap_gte: mktCap.market_cap_gte,
        market_cap_lte: mktCap.market_cap_lte,
      }),
    ...(athMktCap &&
      (athMktCap.ath_market_cap_gte || athMktCap.ath_market_cap_lte) && {
        ath_market_cap_gte: athMktCap.ath_market_cap_gte,
        ath_market_cap_lte: athMktCap.ath_market_cap_lte,
      }),
    ...(volume &&
      (volume.vol_24hr_gte || volume.vol_24hr_lte) && {
        vol_24hr_gte: volume.vol_24hr_gte,
        vol_24hr_lte: volume.vol_24hr_lte,
      }),
    ...(followers &&
      (followers.followers_count_gte || followers.followers_count_lte) && {
        followers_count_gte: followers.followers_count_gte,
        followers_count_lte: followers.followers_count_lte,
      }),
    ...(smart_followers &&
      (smart_followers.smart_followers_gte ||
        smart_followers.smart_followers_lte) && {
        smart_followers_gte: smart_followers.smart_followers_gte,
        smart_followers_lte: smart_followers.smart_followers_lte,
      }),
    ...(influencers &&
      (influencers.influencer_count_gte ||
        influencers.influencer_count_lte) && {
        influencer_count_24hr_gte: influencers.influencer_count_gte,
        influencer_count_24hr_lte: influencers.influencer_count_lte,
      }),
    ...(account &&
      (account.total_unique_accounts_gte ||
        account.total_unique_accounts_lte) && {
        total_unique_accounts_24hr_gte: account.total_unique_accounts_gte,
        total_unique_accounts_24hr_lte: account.total_unique_accounts_lte,
      }),
    ...(mention_change_24_hr &&
      (mention_change_24_hr.mention_change_24_hr_gte ||
        mention_change_24_hr.mention_change_24_hr_lte) && {
        mentions_change_24_hr_gte:
          mention_change_24_hr.mention_change_24_hr_gte,
        mentions_change_24_hr_lte:
          mention_change_24_hr.mention_change_24_hr_lte,
      }),
    ...(mention_15min &&
      (mention_15min.mention_count_15min_gte ||
        mention_15min.mention_count_15min_lte) && {
        mention_count_15min_gte: mention_15min.mention_count_15min_gte,
        mention_count_15min_lte: mention_15min.mention_count_15min_lte,
      }),
    ...(mention_1hr &&
      (mention_1hr.mention_count_1hr_gte ||
        mention_1hr.mention_count_1hr_lte) && {
        mention_count_1hr_gte: mention_1hr.mention_count_1hr_gte,
        mention_count_1hr_lte: mention_1hr.mention_count_1hr_lte,
      }),
    ...(mention_6hr &&
      (mention_6hr.mention_count_6hr_gte ||
        mention_6hr.mention_count_6hr_lte) && {
        mention_count_6hr_gte: mention_6hr.mention_count_6hr_gte,
        mention_count_6hr_lte: mention_6hr.mention_count_6hr_lte,
      }),
    ...(mention_24hr &&
      (mention_24hr.mention_count_24hr_gte ||
        mention_24hr.mention_count_24hr_lte) && {
        mention_count_24hr_gte: mention_24hr.mention_count_24hr_gte,
        mention_count_24hr_lte: mention_24hr.mention_count_24hr_lte,
      }),
    ...(sortBy && sortBy !== "_" && { sort_by: sortBy }),
    ...(is_best_pair && { is_best_pair }),
    ...(is_cmc_listed && { is_cmc_listed }),
    ...(is_cg_listed && { is_cg_listed }),
    ...(is_coinbase && { is_coinbase }),
    ...(is_gateio && { is_gateio }),
    ...(is_bingx && { is_bingx }),
    ...(is_mexc && { is_mexc }),
    ...(is_okx && { is_okx }),
    ...(is_binance && { is_binance }),
    ...(is_bybit && { is_bybit }),
    ...(is_kucoin && { is_kucoin }),
    ...(is_bitget && { is_bitget }),
    ...(is_bitmart && { is_bitmart }),
  };

  const { data } = await apiClientNew.get<GetTokenLeaderboardResponse>(
    "/token/token-leaderboard-heatmap",
    {
      params: queryParams,
    }
  );

  return data;
};
