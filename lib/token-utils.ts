/**
 * Token validation and management utilities
 */

/**
 * Check if a token is valid (exists and not empty)
 */
export function isValidToken(token: string | null): boolean {
  return token !== null && token.trim() !== "";
}

/**
 * Safely get database token from localStorage
 */
export function getDatabaseToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Safely get Twitter access token from localStorage
 */
export function getTwitterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("twitter_access_token");
}

/**
 * Check if Twitter token is expired
 */
export function isTwitterTokenExpired(): boolean {
  if (typeof window === "undefined") return true;
  
  const expiresAt = localStorage.getItem("twitter_token_expires_at");
  if (!expiresAt) return true;
  
  return Date.now() >= parseInt(expiresAt);
}

/**
 * Check if Twitter token is close to expiring (within 5 minutes)
 */
export function isTwitterTokenCloseToExpiry(): boolean {
  if (typeof window === "undefined") return false;
  
  const expiresAt = localStorage.getItem("twitter_token_expires_at");
  if (!expiresAt) return false;
  
  const expiryTime = parseInt(expiresAt);
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  
  return expiryTime <= fiveMinutesFromNow;
}

/**
 * Clear all authentication tokens from localStorage
 */
export function clearAllTokens(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem("token");
  localStorage.removeItem("twitter_access_token");
  localStorage.removeItem("twitter_refresh_token");
  localStorage.removeItem("twitter_token_expires_at");
  localStorage.removeItem("twitter_user");
}

/**
 * Check if both Twitter and database tokens are valid
 */
export function hasValidAuthState(): boolean {
  const twitterToken = getTwitterToken();
  const databaseToken = getDatabaseToken();
  
  return (
    isValidToken(twitterToken) &&
    !isTwitterTokenExpired() &&
    isValidToken(databaseToken)
  );
}

/**
 * Check if we have a valid Twitter token (not expired)
 */
export function hasValidTwitterToken(): boolean {
  const twitterToken = getTwitterToken();
  return isValidToken(twitterToken) && !isTwitterTokenExpired();
}

/**
 * Check if we have a valid database token
 */
export function hasValidDatabaseToken(): boolean {
  const databaseToken = getDatabaseToken();
  return isValidToken(databaseToken);
}

/**
 * Get Twitter username from stored user data
 */
export function getTwitterUsername(): string | null {
  if (typeof window === "undefined") return null;
  
  const userJson = localStorage.getItem("twitter_user");
  if (!userJson) return null;
  
  try {
    const user = JSON.parse(userJson);
    return user.username || null;
  } catch {
    return null;
  }
}
