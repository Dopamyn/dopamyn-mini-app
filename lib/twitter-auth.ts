interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  verified_type?: string;
  is_identity_verified?: boolean;
  subscription_type?: string;
  location?: string;
  verified_followers_count?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
    like_count?: number;
    media_count?: number;
  };
}

interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

class TwitterAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private isRefreshing: boolean = false;

  constructor() {
    this.clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET!;
    this.redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI!;
  }

  // Generate PKCE code verifier and challenge
  private async generatePKCE() {
    const verifier = this.generateRandomString(64);
    const challenge = this.base64URLEncode(await this.sha256(verifier));
    return { verifier, challenge };
  }

  private generateRandomString(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  private async sha256(message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    return await crypto.subtle.digest("SHA-256", data);
  }

  private base64URLEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  // Check if running in mini app
  private async isMiniApp(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const { MiniKit } = await import("@worldcoin/minikit-js");
      return MiniKit.isInstalled();
    } catch {
      return false;
    }
  }

  // Initiate OAuth flow
  async initiateLogin(): Promise<void> {
    const { verifier, challenge } = await this.generatePKCE();

    // Store verifier for later use
    localStorage.setItem("twitter_code_verifier", verifier);

    // Store current path to redirect back to after auth
    const currentPath = window.location.pathname;
    localStorage.setItem("twitter_return_path", currentPath);

    // Check if in mini app and store context
    const isMiniApp = await this.isMiniApp();
    localStorage.setItem("twitter_is_miniapp", isMiniApp.toString());

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "tweet.read users.read offline.access",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: this.generateRandomString(16), // CSRF protection
    });

    // Store state for CSRF protection
    localStorage.setItem("twitter_oauth_state", params.get("state")!);

    window.location.href = `https://x.com/i/oauth2/authorize?${params}`;
  }

  // Handle OAuth callback
  async handleCallback(code: string, state: string): Promise<TwitterUser> {
    if (typeof window === "undefined") {
      throw new Error("Cannot handle callback on server side");
    }

    // Check if user is already authenticated - if so, this might be a duplicate callback
    if (this.isAuthenticated()) {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        console.log("User already authenticated, skipping callback");
        return currentUser;
      }
    }

    // Get code verifier first (needed regardless of state)
    const verifier = localStorage.getItem("twitter_code_verifier");
    if (!verifier) {
      throw new Error("OAuth session expired. Please try logging in again.");
    }

    // Verify CSRF state
    const storedState = localStorage.getItem("twitter_oauth_state");
    if (!storedState) {
      // If we have a code but no state, the session likely expired
      // But we can still try to proceed if we have the verifier
      console.warn("OAuth state missing, but proceeding with code verifier");
    } else if (storedState !== state) {
      console.error("State mismatch:", { storedState, receivedState: state });
      throw new Error("Invalid state parameter - possible CSRF attack");
    }

    // Clean up stored values (only if state was present)
    if (storedState) {
      localStorage.removeItem("twitter_oauth_state");
    }
    localStorage.removeItem("twitter_code_verifier");

    // Get referral code from localStorage if available
    const referralCode = localStorage.getItem("referral_code");

    // Exchange code for tokens via server-side API
    const response = await fetch("/api/auth/twitter/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        verifier,
        state,
        referral_code: referralCode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to exchange code for tokens");
    }

    const data = await response.json();

    // Store tokens securely
    this.storeTokens(data.tokens);

    // Store database token if available
    if (data.dbToken && typeof window !== "undefined") {
      localStorage.setItem("token", data.dbToken);
    }

    return data.user;
  }

  private storeTokens(tokens: AuthTokens): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("twitter_access_token", tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem("twitter_refresh_token", tokens.refresh_token);
    }
    localStorage.setItem(
      "twitter_token_expires_at",
      tokens.expires_at.toString()
    );
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("twitter_access_token");
    const expiresAt = localStorage.getItem("twitter_token_expires_at");

    if (!token || !expiresAt) return false;

    return Date.now() < parseInt(expiresAt);
  }

  // Check if we can attempt authentication (has refresh token)
  canAuthenticate(): boolean {
    if (typeof window === "undefined") return false;
    
    const refreshToken = localStorage.getItem("twitter_refresh_token");
    return refreshToken !== null && refreshToken.trim() !== "";
  }

  // Attempt to refresh expired Twitter token automatically
  async tryRefreshExpiredToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    
    if (!this.canAuthenticate()) {
      console.log("No refresh token available");
      return false;
    }

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      console.log("Token refresh already in progress, skipping...");
      return false;
    }

    this.isRefreshing = true;
    try {
      await this.refreshAccessToken();
      console.log("Twitter token refreshed successfully");
      return true;
    } catch (error) {
      console.error("Failed to refresh Twitter token:", error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }


  // Check if token is close to expiring (within 5 minutes)
  private isTokenCloseToExpiry(): boolean {
    if (typeof window === "undefined") return false;

    const expiresAt = localStorage.getItem("twitter_token_expires_at");
    if (!expiresAt) return false;

    const expiryTime = parseInt(expiresAt);
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000; // 5 minutes in milliseconds

    return expiryTime <= fiveMinutesFromNow;
  }

  // Automatically refresh token if close to expiry or expired but refreshable
  async ensureValidToken(): Promise<void> {
    if (typeof window === "undefined") return;

    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      console.log("Token refresh already in progress, skipping...");
      return;
    }

    const isAuth = this.isAuthenticated();
    const isCloseToExpiry = this.isTokenCloseToExpiry();
    const canRefresh = this.canAuthenticate();

    console.log(`Token check: authenticated=${isAuth}, closeToExpiry=${isCloseToExpiry}, canRefresh=${canRefresh}`);

    // Refresh token if:
    // 1. Token is authenticated but close to expiry, OR
    // 2. Token is expired but we have a refresh token available
    if ((isAuth && isCloseToExpiry) || (!isAuth && canRefresh)) {
      this.isRefreshing = true;
      try {
        if (!isAuth && canRefresh) {
          console.log("Twitter token expired, attempting to refresh silently...");
        } else {
          console.log("Twitter token close to expiry, refreshing automatically...");
        }
        await this.refreshAccessToken();
        console.log("Twitter token refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh Twitter token:", error);
        // Don't log out user on Twitter token refresh failure
        // Only clear Twitter tokens, keep user session intact
        this.clearTwitterTokens();
      } finally {
        this.isRefreshing = false;
      }
    }
  }

  // Get stored user info
  getCurrentUser(): TwitterUser | null {
    if (typeof window === "undefined") return null;

    const userJson = localStorage.getItem("twitter_user");
    return userJson ? JSON.parse(userJson) : null;
  }

  // Refresh access token
  async refreshAccessToken(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Cannot refresh token on server side");
    }

    const refreshToken = localStorage.getItem("twitter_refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Use server-side API endpoint to avoid CORS issues
    const response = await fetch("/api/auth/twitter/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to refresh token");
    }

    const data = await response.json();
    this.storeTokens(data.tokens);
  }

  // Clear only Twitter tokens (keep DB token intact)
  private clearTwitterTokens(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("twitter_access_token");
    localStorage.removeItem("twitter_refresh_token");
    localStorage.removeItem("twitter_token_expires_at");
    localStorage.removeItem("twitter_user");
    // Note: NOT removing "token" (DB token) - user stays logged in
  }

  // Full logout (clears both Twitter and DB tokens)
  logout(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("twitter_access_token");
    localStorage.removeItem("twitter_refresh_token");
    localStorage.removeItem("twitter_token_expires_at");
    localStorage.removeItem("twitter_user");
    localStorage.removeItem("token"); // Your app's JWT token
  }
}

export const twitterAuth = new TwitterAuth();
export type { TwitterUser, AuthTokens };
