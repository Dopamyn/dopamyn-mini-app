/**
 * Utility functions for handling mini app redirects and URLs
 */

/**
 * Get the appropriate redirect URL based on whether we're in a mini app or browser
 * @param path - The path to redirect to (e.g., "/auth/callback")
 * @param params - Optional query parameters
 * @param isMiniApp - Whether we're in a mini app environment
 * @returns The appropriate URL (worldapp:// for mini app, https:// for browser)
 */
export function getRedirectUrl(
  path: string,
  params?: Record<string, string>,
  isMiniApp?: boolean
): string {
  // If isMiniApp is not provided, try to detect it
  if (isMiniApp === undefined && typeof window !== "undefined") {
    // Check if MiniKit is available (lazy check)
    try {
      // This will be set by useMiniApp hook, but we can also check directly
      isMiniApp = (window as any).__isMiniApp === true;
    } catch {
      isMiniApp = false;
    }
  }

  if (isMiniApp) {
    // Mini app redirect format: worldapp://mini-app?app_id=...&path=...
    const appId = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
    const baseUrl = `worldapp://mini-app?app_id=${appId}&path=${encodeURIComponent(path)}`;

    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      return `${baseUrl}&${queryString}`;
    }

    return baseUrl;
  } else {
    // Browser redirect - use current origin
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = new URL(path, origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url.toString();
  }
}

/**
 * Redirect to a path, handling mini app vs browser appropriately
 * @param path - The path to redirect to
 * @param params - Optional query parameters
 * @param isMiniApp - Whether we're in a mini app environment
 */
export function redirectToMiniApp(
  path: string,
  params?: Record<string, string>,
  isMiniApp?: boolean
): void {
  if (typeof window === "undefined") return;

  const url = getRedirectUrl(path, params, isMiniApp);

  if (isMiniApp || url.startsWith("worldapp://")) {
    // For mini app, use window.location.href
    window.location.href = url;
  } else {
    // For browser, use window.location
    window.location.href = url;
  }
}

/**
 * Build a worldapp:// deep link URL
 * @param appId - World App ID
 * @param path - Path within the mini app
 * @param params - Optional query parameters
 * @returns The deep link URL
 */
export function buildWorldAppDeepLink(
  appId: string,
  path: string,
  params?: Record<string, string>
): string {
  const baseUrl = `worldapp://mini-app?app_id=${appId}&path=${encodeURIComponent(path)}`;

  if (params && Object.keys(params).length > 0) {
    const queryString = new URLSearchParams(params).toString();
    return `${baseUrl}&${queryString}`;
  }

  return baseUrl;
}

