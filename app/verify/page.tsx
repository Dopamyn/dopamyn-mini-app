"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import HumanVerificationGate from "@/components/HumanVerificationGate";
import { Loader2 } from "lucide-react";

export default function VerifyPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If user is already verified, redirect to campaigns
    if (!isLoading && user?.world_id_verified) {
      router.push("/campaigns");
    }
  }, [user?.world_id_verified, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-light-primary" />
      </div>
    );
  }

  // If already verified, show nothing (will redirect)
  if (user?.world_id_verified) {
    return null;
  }

  return (
    <HumanVerificationGate
      campaignTitle="quests"
      onVerificationComplete={() => {
        router.push("/campaigns");
      }}
    />
  );
}

