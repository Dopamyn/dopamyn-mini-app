"use client";

import { useEffect, useState } from "react";
import { useMiniApp } from "@/hooks/useMiniApp";
import { useUser } from "@/contexts/UserContext";
import HumanVerificationGate from "./HumanVerificationGate";

interface MiniAppGuardProps {
  children: React.ReactNode;
  requireVerification?: boolean; // If true, requires verification when in mini app
}

/**
 * Guard component that detects if app is running in World App mini app
 * and shows verification gate if needed
 */
export default function MiniAppGuard({
  children,
  requireVerification = true,
}: MiniAppGuardProps) {
  const { isMiniApp } = useMiniApp();
  const { user } = useUser();
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    if (!isMiniApp || !requireVerification) {
      setShowGate(false);
      return;
    }

    // Check if user is verified
    const isVerified = user?.world_id_verified === true;
    setShowGate(!isVerified);
  }, [isMiniApp, requireVerification, user?.world_id_verified]);

  if (showGate) {
    return <HumanVerificationGate onVerificationComplete={() => setShowGate(false)} />;
  }

  return <>{children}</>;
}
