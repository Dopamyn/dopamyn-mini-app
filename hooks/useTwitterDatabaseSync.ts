"use client";

import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export const useTwitterDatabaseSync = () => {
  const {
    user: twitterUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
  } = useTwitterAuth();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Database sync is now handled server-side in the token exchange
  // This hook now just manages the user state and provides helper functions
  const syncWithDatabase = useCallback(async () => {
    // No-op since sync is handled server-side
    // Just refresh user data if we have a token
    const token = localStorage.getItem("token");
    if (token && isAuthenticated) {
      // Only sync if we don't already have user data (UserContext will handle initial fetch)
      // This prevents duplicate calls when UserContext is already fetching
      if (!user) {
        await refreshUser();
      }
    }
  }, [isAuthenticated, refreshUser, user]);

  // Effect with minimal dependencies and debouncing
  useEffect(() => {
    // Clear any pending sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    if (isAuthenticated && twitterUser?.username) {
      // Debounce to prevent rapid successive calls
      // Also check if we recently synced (within last 2 seconds)
      const now = Date.now();
      if (now - lastSyncRef.current > 2000) {
        syncTimeoutRef.current = setTimeout(() => {
          lastSyncRef.current = Date.now();
          syncWithDatabase();
        }, 300);
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated, twitterUser?.username, syncWithDatabase]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Get profile image from either database user or Twitter user
  const getProfileImage = () => {
    if (
      twitterUser?.profile_image_url &&
      typeof twitterUser.profile_image_url === "string"
    ) {
      return twitterUser.profile_image_url.replace("_normal", "_400x400");
    } 
    if (user?.profile_image_url && typeof user.profile_image_url === "string") {
      return user.profile_image_url.replace("_normal", "_400x400");
    }
    return "/placeholder.svg?height=32&width=32";
  };

  // Get display name
  const getDisplayName = () => {
    // if (user?.x_handle) return user.x_handle;
    if (twitterUser?.name) return twitterUser.name;
    if (user?.name) return user.name;
    if (twitterUser?.username) return `@${twitterUser.username}`;
    return "User";
  };

  // Get twitter handle - return lowercase for consistency
  const getTwitterHandle = () => {
    if (user?.x_handle) return user.x_handle.toLowerCase();
    if (twitterUser?.username) return twitterUser.username.toLowerCase();
    return null;
  };

  return {
    // Twitter auth states
    isAuthenticated,
    isLoading,
    user: twitterUser,

    // Database user
    dbUser: user,

    // Actions
    login,
    logout: handleLogout,

    // Processing state
    isProcessing,

    // Helper functions
    getProfileImage,
    getDisplayName,
    getTwitterHandle,
  };
};
