/**
 * Auto-save hook for quest drafts
 *
 * Automatically saves draft data every 2 minutes and on page unload.
 */

import { useEffect, useRef } from "react";
import { updateDraft, QuestFormData } from "@/lib/draftManager";

interface UseAutoSaveDraftOptions {
  draftId: string | null;
  getFormData: () => QuestFormData;
  getCurrentStep: () => number;
  getChainId?: () => string; // Optional function to get current chain ID
  enabled?: boolean; // Allow disabling auto-save
}

/**
 * Hook to auto-save quest drafts
 *
 * @param draftId - The draft ID to save to (null if no draft exists)
 * @param getFormData - Function to get current form data
 * @param getCurrentStep - Function to get current step number
 * @param enabled - Whether auto-save is enabled (default: true)
 */
export function useAutoSaveDraft({
  draftId,
  getFormData,
  getCurrentStep,
  getChainId,
  enabled = true,
}: UseAutoSaveDraftOptions): void {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unloadHandlerRef = useRef<((e: BeforeUnloadEvent) => void) | null>(
    null
  );

  // Store latest functions in refs to always use the most current version
  const getFormDataRef = useRef(getFormData);
  const getCurrentStepRef = useRef(getCurrentStep);
  const getChainIdRef = useRef(getChainId);
  const draftIdRef = useRef(draftId);
  const enabledRef = useRef(enabled);

  // Update refs when values change
  useEffect(() => {
    getFormDataRef.current = getFormData;
    getCurrentStepRef.current = getCurrentStep;
    getChainIdRef.current = getChainId;
    draftIdRef.current = draftId;
    enabledRef.current = enabled;
  }, [draftId, getFormData, getCurrentStep, getChainId, enabled]);

  // Save function
  const saveDraft = () => {
    const currentDraftId = draftIdRef.current;
    const isEnabled = enabledRef.current;

    if (!currentDraftId || !isEnabled) {
      return;
    }

    try {
      const formData = getFormDataRef.current();
      const currentStep = getCurrentStepRef.current();
      const chainId = getChainIdRef.current?.();

      // Extract title for display
      const title = formData.title || "Untitled Campaign";

      updateDraft(currentDraftId, {
        formData,
        currentStep,
        title,
        ...(chainId && { chainId }), // Include chainId if available
      });
    } catch (error) {
      console.error("Error auto-saving draft:", error);
    }
  };

  // Set up interval for periodic saves (every 30 seconds)
  useEffect(() => {
    if (!draftId || !enabled) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval (30 seconds = 30000 ms)
    intervalRef.current = setInterval(() => {
      saveDraft();
    }, 30000); // 30 seconds

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [draftId, enabled]);

  // Set up beforeunload handler for final save
  useEffect(() => {
    if (!draftId || !enabled) {
      return;
    }

    // Create handler function
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Save draft before page unloads
      saveDraft();

      // Note: Modern browsers ignore custom messages in beforeunload
      // But we still want to save the draft
    };

    // Store reference for cleanup
    unloadHandlerRef.current = handleBeforeUnload;

    // Add event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Also handle visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveDraft();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (unloadHandlerRef.current) {
        window.removeEventListener("beforeunload", unloadHandlerRef.current);
        unloadHandlerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [draftId, enabled]);

  // Also save when component unmounts (navigation away)
  useEffect(() => {
    return () => {
      if (draftIdRef.current && enabledRef.current) {
        saveDraft();
      }
    };
  }, []);
}
