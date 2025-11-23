"use client";

import { Shield, Users, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorldcoinVerification from "./WorldcoinVerification";
import { useUser } from "@/contexts/UserContext";
import { useEffect } from "react";

interface HumanVerificationGateProps {
  onVerificationComplete?: () => void;
  campaignTitle?: string;
  rewardAmount?: string;
}

export default function HumanVerificationGate({
  onVerificationComplete,
  campaignTitle = "quests",
  rewardAmount,
}: HumanVerificationGateProps) {
  const { user, refreshUser } = useUser();

  useEffect(() => {
    // Check if user becomes verified
    if (user?.world_id_verified) {
      onVerificationComplete?.();
    }
  }, [user?.world_id_verified, onVerificationComplete]);

  const handleVerificationSuccess = async () => {
    // Refresh user data to get updated verification status
    await refreshUser();
    // onVerificationComplete will be called by useEffect when user is updated
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-xl font-bold">
            Human Verification Required
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-gray-600 dark:text-gray-300">
              To participate in{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {campaignTitle}
              </span>
              {rewardAmount && (
                <>
                  {" "}
                  and earn{" "}
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {rewardAmount}
                  </span>
                </>
              )}
              , you need to verify you&apos;re human.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Why verify?
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Fair competition - only real humans participate
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Protect against bots and fake accounts
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Build trust in the reward system
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <WorldcoinVerification
              onVerificationSuccess={handleVerificationSuccess}
              onVerificationError={(error) => console.error("Verification error:", error)}
              action="dopamyn-human-verification"
            />

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Powered by Worldcoin • Instant verification • No personal data required
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

