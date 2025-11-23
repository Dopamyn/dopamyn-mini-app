"use client";

import { useEffect, useState } from "react";

interface MiniAppState {
  isMiniApp: boolean;
  miniKit: any | null;
}

/**
 * Hook to detect if the app is running in World App mini app environment
 * @returns {MiniAppState} Object with isMiniApp boolean and miniKit instance
 */
export function useMiniApp(): MiniAppState {
  const [state, setState] = useState<MiniAppState>({
    isMiniApp: false,
    miniKit: null,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Dynamically import MiniKit to avoid SSR issues
    const checkMiniApp = async () => {
      try {
        const { MiniKit } = await import("@worldcoin/minikit-js");
        const isInstalled = MiniKit.isInstalled();

        setState({
          isMiniApp: isInstalled,
          miniKit: isInstalled ? MiniKit : null,
        });
      } catch (error) {
        // MiniKit not available, not in mini app
        console.log("MiniKit not available:", error);
        setState({
          isMiniApp: false,
          miniKit: null,
        });
      }
    };

    checkMiniApp();
  }, []);

  return state;
}

