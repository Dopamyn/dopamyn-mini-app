import {
  GetTokenLeaderboardProps,
  GetTokenLeaderboardResponse,
} from "./cashtag.types";

/**
 * Client-side function to get cashtag leaderboard data
 * Uses API routes to keep sensitive keys on the server
 */
export const getCashtagLeaderboard = async (
  params: GetTokenLeaderboardProps
): Promise<GetTokenLeaderboardResponse> => {
  const { requestedData, start, limit } = params;
  
  const queryParams = new URLSearchParams({
    start: start.toString(),
    limit: limit.toString(),
    ...(requestedData && { requestedData: JSON.stringify(requestedData) }),
  });

  const response = await fetch(`/api/cashtag/leaderboard?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Client-side function to get cashtag leaderboard heatmap data
 * Uses API routes to keep sensitive keys on the server
 */
export const getCashtagLeaderboardHeatmap = async (
  params: GetTokenLeaderboardProps
): Promise<GetTokenLeaderboardResponse> => {
  const { requestedData, start, limit } = params;
  
  const queryParams = new URLSearchParams({
    start: start.toString(),
    limit: limit.toString(),
    ...(requestedData && { requestedData: JSON.stringify(requestedData) }),
  });

  const response = await fetch(`/api/cashtag/heatmap?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch heatmap data: ${response.statusText}`);
  }

  return response.json();
};
