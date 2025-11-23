"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { twitterAuth, TwitterUser } from "@/lib/twitter-auth";
import TwitterAuthModal from "@/components/TwitterAuthModal";

interface TwitterAuthContextType {
  user: TwitterUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => void;
}

const TwitterAuthContext = createContext<TwitterAuthContextType | undefined>(
  undefined
);

export function TwitterAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<TwitterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: "verifying" | "success" | "error";
  }>({
    isOpen: false,
    status: "verifying",
  });

  // Automatic token refresh (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const checkAndRefreshToken = async () => {
      await twitterAuth.ensureValidToken();
    };

    // Always check token on mount - this will handle expired tokens with refresh
    checkAndRefreshToken();

    // Set up periodic check every minute
    const intervalId = setInterval(checkAndRefreshToken, 60 * 1000); // 1 minute

    // Check token when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndRefreshToken();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;

    console.log("TwitterAuthProvider useEffect triggered");
    const handleAuthCallback = async () => {
      // Check for OAuth callback parameters in URL
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get("twitter_auth");
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        console.log("URL params:", { authSuccess, code, state });
        console.log("Current URL:", window.location.href);

        // Only process OAuth callback if we have all required parameters
        if (authSuccess === "success" && code && state) {
          // Clean up URL immediately to prevent re-processing on refresh
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("twitter_auth");
          newUrl.searchParams.delete("code");
          newUrl.searchParams.delete("state");
          window.history.replaceState({}, "", newUrl.toString());
          try {
            // Show verifying modal
            setModalState({ isOpen: true, status: "verifying" });

            console.log("Processing OAuth callback...");
            // Complete the OAuth callback
            const twitterUser = await twitterAuth.handleCallback(code, state);
            console.log("Authentication successful:", twitterUser.username);

            // Show success modal
            setModalState({ isOpen: true, status: "success" });

            // Store user info
            localStorage.setItem("twitter_user", JSON.stringify(twitterUser));
            setUser(twitterUser);

            // Dispatch event to notify UserContext that token is ready
            window.dispatchEvent(new CustomEvent("twitterTokenReady"));

            // Get return path and clean up
            const returnPath = localStorage.getItem("twitter_return_path");
            localStorage.removeItem("twitter_return_path");

            // Auto-close modal after 2 seconds and redirect
            setTimeout(() => {
              setModalState({ isOpen: false, status: "verifying" });
              // If we have a return path and we're not already there, redirect
              if (returnPath && returnPath !== window.location.pathname) {
                window.location.href = returnPath;
              }
            }, 2000);

            console.log("Authentication completed successfully");
          } catch (error) {
            console.error("Auth callback failed:", error);

            // Handle state-related errors gracefully (happen on page refresh or expired sessions)
            if (
              error instanceof Error &&
              (error.message.includes("state") ||
                error.message.includes("OAuth session") ||
                error.message.includes("expired"))
            ) {
              // For expired sessions, just clean up and let user try again
              // Don't show error modal for these cases
              console.log("OAuth session expired, user can try logging in again");
              return;
            }

            // Show error modal for other errors
            setModalState({ isOpen: true, status: "error" });

            // Auto-close error modal after 2 seconds
            setTimeout(() => {
              setModalState({ isOpen: false, status: "verifying" });
            }, 2000);
          }
        }
      }

      // Check if user is already authenticated
      if (twitterAuth.isAuthenticated()) {
        const currentUser = twitterAuth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
      setIsLoading(false);
    };

    handleAuthCallback();
  }, [isClient]);

  const login = () => {
    twitterAuth.initiateLogin();
  };

  const logout = () => {
    twitterAuth.logout();
    setUser(null);
    setIsAuthenticated(false); // Ensure authentication state is updated immediately
    // Don't reload the page - let the UI handle the state change naturally
  };

  const refreshUser = () => {
    if (twitterAuth.isAuthenticated()) {
      const currentUser = twitterAuth.getCurrentUser();
      setUser(currentUser);
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, status: "verifying" });
  };

  // Set client flag on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update authentication state when client is ready
  useEffect(() => {
    if (isClient) {
      const dbToken = localStorage.getItem("token");
      setIsAuthenticated(!!dbToken);
    }
  }, [isClient]);

  // Check for database token (primary authentication)
  const isFullyAuthenticated = () => {
    if (!isClient) return false;
    const dbToken = localStorage.getItem("token");
    return !!dbToken;
  };

  // Listen for database token changes (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        // Update authentication state based on token presence
        setIsAuthenticated(!!e.newValue);
        if (e.newValue === null) {
          // Token was removed, user is no longer authenticated
          setUser(null);
        }
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener("storage", handleStorageChange);

    // Also listen for direct localStorage changes in the same tab
    const originalRemoveItem = localStorage.removeItem;
    const originalSetItem = localStorage.setItem;

    localStorage.removeItem = function (key) {
      originalRemoveItem.apply(this, [key]);
      if (key === "token") {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, [key, value]);
      if (key === "token") {
        setIsAuthenticated(!!value);
      }
    };

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      localStorage.removeItem = originalRemoveItem;
      localStorage.setItem = originalSetItem;
    };
  }, [isClient]);

  const value: TwitterAuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  // Ensure token is valid when context value is accessed (client-side only)
  useEffect(() => {
    if (!isClient || isLoading) return;
    if (twitterAuth.isAuthenticated() || twitterAuth.canAuthenticate()) {
      twitterAuth.ensureValidToken();
    }
  }, [isClient, isLoading]);

  return (
    <TwitterAuthContext.Provider value={value}>
      {children}
      <TwitterAuthModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        onClose={closeModal}
      />
    </TwitterAuthContext.Provider>
  );
}

export function useTwitterAuth() {
  const context = useContext(TwitterAuthContext);
  if (context === undefined) {
    throw new Error("useTwitterAuth must be used within a TwitterAuthProvider");
  }
  return context;
}
