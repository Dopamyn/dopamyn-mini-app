"use client";

import { useEffect, useState } from "react";

/**
 * Client-side wrapper for MiniKitProvider and Eruda
 * This must be a client component to avoid SSR issues
 */
export default function MiniKitProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [MiniKitProvider, setMiniKitProvider] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);

    // Dynamically import MiniKitProvider only on client
    const loadMiniKit = async () => {
      try {
        const { MiniKitProvider: Provider } = await import("@worldcoin/minikit-js/minikit-provider");
        setMiniKitProvider(() => Provider);
      } catch (error) {
        // MiniKit not available - this is fine in browser
        console.log("MiniKit not available (expected in browser)");
      }
    };

    loadMiniKit();

    // Load Eruda only in mini app environment
    const loadEruda = async () => {
      try {
        const { MiniKit } = await import("@worldcoin/minikit-js");
        
        if (MiniKit.isInstalled()) {
          const eruda = await import("eruda");
          eruda.default.init();
          console.log("Eruda loaded for mini app debugging");
        }
      } catch (error) {
        // Not in mini app or Eruda failed to load - silently fail
        // This is expected in browser environment
      }
    };

    loadEruda();
  }, []);

  // Render children directly if MiniKitProvider is not available (browser mode)
  if (!isClient || !MiniKitProvider) {
    return <>{children}</>;
  }

  return <MiniKitProvider>{children}</MiniKitProvider>;
}
