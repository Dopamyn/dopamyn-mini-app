"use client";

import { useToast } from "@/hooks/use-toast";
import { UserType } from "@/lib/types";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  refreshUser: () => Promise<void>;
  handleTokenExpiry: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const { isAuthenticated, login, logout } = useTwitterAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  // Use ref to prevent race conditions - more reliable than state
  const isFetchingRef = React.useRef(false);
  const fetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cache duration in milliseconds (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  // Error backoff duration (30 seconds)
  const ERROR_BACKOFF_DURATION = 30 * 1000;

  const fetchUser = async (retries = 0, forceRefresh = false) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000; // 1 second

    // Prevent multiple simultaneous requests using ref (more reliable)
    if (isFetchingRef.current) {
      console.log("Fetch already in progress, skipping");
      return;
    }

    // Check if we have cached data that's still valid
    if (!forceRefresh && user && lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION) {
      console.log("Using cached user data");
      return;
    }

    // Check if we're in error backoff period
    if (lastErrorTime && (Date.now() - lastErrorTime) < ERROR_BACKOFF_DURATION) {
      console.log("Still in error backoff period, skipping fetch");
      return;
    }

    // Set fetching flag immediately to prevent race conditions
    isFetchingRef.current = true;
    setIsFetching(true);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      console.log("Fetching user data from API");
      const response = await fetch("/api/user/get-user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If not ok, it might be a temporary issue or user not propagated yet
        if (retries < MAX_RETRIES) {
          console.warn(
            `Failed to fetch user (attempt ${retries + 1}). Retrying...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          isFetchingRef.current = false;
          setIsFetching(false);
          await fetchUser(retries + 1);
          return;
        } else {
          // After all retries exhausted, set error backoff
          console.log("Failed to fetch user after all retries, setting error backoff");
          setLastErrorTime(Date.now());
          setUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
          toast({
            title: "Session expired",
            description: "Your session has expired. Please log in again to continue.",
            duration: 5000,
          });
          // Don't call logout() here as it causes page reload
          // The user will see the login prompt naturally
          return;
        }
      }

      const responseData = await response.json();

      if (responseData.result) {
        setUser(responseData.result);
        setLastFetchTime(Date.now());
        setLastErrorTime(null); // Clear any previous errors on success
        if (
          typeof window !== "undefined" &&
          responseData.result.referral_code_used
        ) {
          localStorage.setItem(
            "referral_code",
            responseData.result.referral_code_used
          );
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setLastErrorTime(Date.now()); // Set error backoff
      
      if (
        error instanceof Error &&
        (error.message.includes("404") ||
          error.message.includes("401") ||
          error.message === "No token found")
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        toast({
          title: "User not registered!",
          description: "Please sign up to access your account.",
          duration: 1000,
        });
      } else {
        toast({
          title: "Failed to load user data.",
          description: "Please try refreshing the page.",
          duration: 3000,
        });
      }
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (isAuthenticated) {
      await fetchUser(0, true); // Force refresh
    }
  };

  // Handle database token expiry - force re-authentication
  const handleTokenExpiry = () => {
    console.log("Handling database token expiry - forcing re-authentication");
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    toast({
      title: "Session expired",
      description: "Your session has expired. Please log in again to continue.",
      duration: 5000,
    });
    // Don't call logout() here as it causes page reload
    // The user will see the login prompt naturally
  };

  useEffect(() => {
    // Clear any pending fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }

    if (isAuthenticated) {
      // Check if we have a token before trying to fetch user
      const token = localStorage.getItem("token");
      if (token) {
        // Debounce to prevent multiple rapid calls
        fetchTimeoutRef.current = setTimeout(() => {
          if (!isFetchingRef.current) {
            fetchUser();
          }
        }, 100);
      } else {
        // No token yet - wait for database sync to complete
        setIsLoading(false);
      }
    } else {
      // If not authenticated, we know user needs to connect
      setIsLoading(false);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [isAuthenticated]); // Only depend on isAuthenticated, not user or lastFetchTime

  // Listen for token removal events (when user manually deletes token)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" && e.newValue === null && isAuthenticated) {
        console.log("Database token removed, clearing user data");
        setUser(null);
        toast({
          title: "Session ended",
          description: "Your session has ended. Please log in again to continue.",
          duration: 5000,
        });
      }
    };

    // Listen for storage changes (when token is removed from another tab/window)
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      
      // Also listen for direct localStorage changes in the same tab
      const originalSetItem = localStorage.setItem;
      const originalRemoveItem = localStorage.removeItem;
      
      localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, [key, value]);
        // Don't trigger fetchUser here - let the isAuthenticated effect handle it
        // This prevents duplicate calls when token is set
      };
      
      localStorage.removeItem = function(key) {
        originalRemoveItem.apply(this, [key]);
        if (key === "token" && isAuthenticated) {
          console.log("Database token removed, clearing user data");
          setUser(null);
          toast({
            title: "Session ended",
            description: "Your session has ended. Please log in again to continue.",
            duration: 5000,
          });
        }
      };
      
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        localStorage.setItem = originalSetItem;
        localStorage.removeItem = originalRemoveItem;
      };
    }
  }, [isAuthenticated, user]);

  // Listen for token ready event from database sync
  useEffect(() => {
    const handleTokenReady = () => {
      // Only fetch if we're authenticated, don't have user data, and not already fetching
      if (isAuthenticated && !user && !isFetchingRef.current) {
        console.log("Token ready, fetching user...");
        // Small delay to ensure token is in localStorage
        setTimeout(() => {
          if (!isFetchingRef.current) {
            fetchUser();
          }
        }, 50);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("twitterTokenReady", handleTokenReady);
      return () => {
        window.removeEventListener("twitterTokenReady", handleTokenReady);
      };
    }
  }, [isAuthenticated, user]); // Removed isFetching from deps - use ref instead

  const value: UserContextType = {
    user,
    setUser,
    refreshUser,
    handleTokenExpiry,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
