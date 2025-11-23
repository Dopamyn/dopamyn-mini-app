"use client";

import { use, useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import {
  Trophy,
  HelpCircle,
  Check,
  Star,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import LogoFullIcon from "@/public/icons/LogoFullIcon";
import { XLogo } from "@/components/icons/x-logo";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { useWallets } from "@privy-io/react-auth";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  getTransactionUrl,
  truncateAddress,
  copyToClipboard,
} from "@/lib/utils";
import { QuestDetails, QuestTask } from "@/lib/types";
import { ExternalLink, CheckCircle2, Copy } from "lucide-react";

interface ClaimData {
  quest_id?: string;
  campaign_name?: string;
  creator_handle?: string;
  reward_amount?: number;
  reward_token?: string;
  reward_token_symbol?: string;
  verified_claims?: number;
  chain?: "base" | "solana";
  tasks?: QuestTask[];
}

type ClaimStep = "login" | "wallet" | "claim" | "success";

interface WinnerData extends QuestDetails {
  user_tx_hash?: string;
  user_tokens_earned?: number;
}

export default function ClaimPage({
  params,
}: {
  params: Promise<{ winnerId: string }>;
}) {
  const { winnerId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ClaimStep>("login");
  const [isClaiming, setIsClaiming] = useState(false);
  const [winnerData, setWinnerData] = useState<WinnerData | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const confettiShownRef = useRef(false);

  // Twitter auth
  const {
    isAuthenticated,
    login,
    isLoading: isAuthLoading,
  } = useTwitterDatabaseSync();
  const { user } = useUser();

  // Wallet connection
  const { wallets } = useWallets();
  // Check if user has any wallet addresses saved (not just connected wallets)
  const hasWallet =
    wallets.length > 0 ||
    user?.evm_wallet ||
    user?.solana_wallet ||
    user?.algorand_wallet;

  const { toast } = useToast();

  // Fetch quest details from winner API on page load
  useEffect(() => {
    const fetchQuestDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/quests/winner/${winnerId}`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch quest details: ${response.status}`);
        }

        const result = await response.json();
        const questDetails: WinnerData = result.data || result;

        if (!questDetails) {
          throw new Error("Invalid quest data received");
        }

        // Extract claim data from quest details
        const rewardAmount =
          questDetails.total_users_to_reward > 0
            ? questDetails.reward_pool / questDetails.total_users_to_reward
            : questDetails.reward_pool;

        setClaimData({
          quest_id: questDetails.id,
          campaign_name: questDetails.title,
          creator_handle: questDetails.creator_x_handle,
          reward_amount: rewardAmount,
          reward_token_symbol: "USDC", // Default, can be updated based on quest token_address
          verified_claims: questDetails.total_claimed || 0,
          chain: questDetails.chain || "base",
          tasks: questDetails.tasks || [],
        });

        // If tx_hash already exists, show success page
        const txHash =
          questDetails.user_tx_hash ||
          questDetails.tasks?.find((t: any) => t.user_tx_hash)?.user_tx_hash;

        if (txHash) {
          const updatedQuestDetails = {
            ...questDetails,
            user_tx_hash: txHash,
            user_tokens_earned: questDetails.user_tokens_earned || rewardAmount,
          };
          setWinnerData(updatedQuestDetails);
          setCurrentStep("success");
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching quest details:", err);
        setError(err.message || "Failed to load claim data");
        setLoading(false);
      }
    };

    fetchQuestDetails();
  }, [winnerId]);

  // Show confetti once per winnerId when success page is shown
  useEffect(() => {
    if (currentStep !== "success" || !winnerData || confettiShownRef.current)
      return;

    const confettiStorageKey = "confetti_winnerIds";

    // Get existing array of winnerIds that have shown confetti
    const storedWinnerIds = localStorage.getItem(confettiStorageKey);
    const confettiShownWinnerIds: string[] = storedWinnerIds
      ? JSON.parse(storedWinnerIds)
      : [];

    // Check if confetti has already been shown for this winnerId
    if (!confettiShownWinnerIds.includes(winnerId)) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: NodeJS.Timeout = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      // Add this winnerId to the array and store in localStorage
      confettiShownWinnerIds.push(winnerId);
      localStorage.setItem(
        confettiStorageKey,
        JSON.stringify(confettiShownWinnerIds)
      );
      confettiShownRef.current = true;

      // Cleanup function to clear interval if component unmounts
      return () => {
        clearInterval(interval);
      };
    }
  }, [currentStep, winnerData, winnerId]);

  // Determine current step based on authentication and wallet status
  // Don't override if already on success step or if user manually navigated to wallet
  useEffect(() => {
    if (isAuthLoading || currentStep === "success") return;

    if (!isAuthenticated || !user) {
      setCurrentStep("login");
    } else if (!hasWallet) {
      setCurrentStep("wallet");
    } else {
      setCurrentStep("claim");
    }
  }, [isAuthenticated, user, hasWallet, isAuthLoading, currentStep]);

  const handleVerifyClick = async () => {
    if (currentStep === "login") {
      // Step 1: Login with X
      login();
    } else if (currentStep === "wallet") {
      // Step 2: Navigate to wallet page
      router.push(`/claim/${winnerId}/wallet`);
    } else if (currentStep === "claim") {
      // Step 3: Claim reward - Verify and claim
      await handleClaimReward();
    }
  };

  const handleClaimReward = async () => {
    if (!claimData?.quest_id) {
      toast({
        title: "Error",
        description: "Quest ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsClaiming(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please login first");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // Step 1: Call verify API
      const verifyResponse = await fetch(
        `/api/quests/verification/quest/${encodeURIComponent(
          claimData.quest_id
        )}/verify`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ user_handle: user?.x_handle }),
        }
      );

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || verifyData?.success === false) {
        throw new Error(verifyData?.error || "Verification failed");
      }

      // Step 2: Call winner API to get tx_hash
      const winnerResponse = await fetch(`/api/quests/winner/${winnerId}`, {
        method: "GET",
        headers,
      });

      if (!winnerResponse.ok) {
        throw new Error("Failed to fetch winner details");
      }

      const winnerResult = await winnerResponse.json();
      // Handle response structure (same as quest/details API)
      const questDetails: WinnerData = winnerResult.data || winnerResult;

      // Check if tx_hash exists in tasks or at quest level
      const txHash =
        questDetails.user_tx_hash ||
        questDetails.tasks?.find((t: any) => t.user_tx_hash)?.user_tx_hash;

      if (txHash) {
        // Update questDetails with tx_hash
        const updatedQuestDetails = {
          ...questDetails,
          user_tx_hash: txHash,
          user_tokens_earned:
            questDetails.user_tokens_earned || claimData.reward_amount,
        };
        setWinnerData(updatedQuestDetails);
        setCurrentStep("success");
      } else {
        // Poll for tx_hash or show pending state
        toast({
          title: "Claim Processing",
          description:
            "Your reward is being processed. Please check back soon.",
        });
        // Poll for tx_hash (up to 3 times with 3 second intervals)
        let pollCount = 0;
        const maxPolls = 3;
        const pollInterval = setInterval(async () => {
          try {
            pollCount++;
            const pollResponse = await fetch(`/api/quests/winner/${winnerId}`, {
              method: "GET",
              headers,
            });
            const pollData = await pollResponse.json();
            const pollQuestDetails: WinnerData = pollData.data || pollData;
            const pollTxHash =
              pollQuestDetails.user_tx_hash ||
              pollQuestDetails.tasks?.find((t: any) => t.user_tx_hash)
                ?.user_tx_hash;

            if (pollTxHash) {
              clearInterval(pollInterval);
              const updatedQuestDetails = {
                ...pollQuestDetails,
                user_tx_hash: pollTxHash,
                user_tokens_earned:
                  pollQuestDetails.user_tokens_earned ||
                  claimData.reward_amount,
              };
              setWinnerData(updatedQuestDetails);
              setCurrentStep("success");
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              toast({
                title: "Processing",
                description:
                  "Your reward is still being processed. Please check back later.",
              });
            }
          } catch (e) {
            console.error("Error polling for tx_hash:", e);
            if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
            }
          }
        }, 3000);
      }
    } catch (error: any) {
      toast({
        title: "Claim Failed",
        description:
          error.message || "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-light-primary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !claimData) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-light-primary mb-4">
            {error || "Claim not found"}
          </h1>
          <p className="text-light-tertiary">
            {error || "Unable to load claim information"}
          </p>
        </div>
      </div>
    );
  }

  // Show success page when reward is credited
  if (currentStep === "success" && winnerData) {
    const txHash = winnerData.user_tx_hash;
    const tokensEarned =
      winnerData.user_tokens_earned || claimData.reward_amount;
    const chain = (winnerData as any)?.chain || "base";
    const transactionUrl = txHash ? getTransactionUrl(chain, txHash) : "";

    // Get wallet address based on chain
    const getWalletAddress = () => {
      if (
        chain === "solana" ||
        chain === "solana-mainnet" ||
        chain === "solana-devnet"
      ) {
        return user?.solana_wallet || "";
      } else if (chain === "base" || chain?.includes("evm")) {
        return user?.evm_wallet || "";
      }
      return (
        user?.evm_wallet || user?.solana_wallet || user?.algorand_wallet || ""
      );
    };

    const walletAddress = getWalletAddress();

    const handleCopyAddress = async () => {
      if (walletAddress) {
        const success = await copyToClipboard(walletAddress);
        if (success) {
          setCopiedAddress(true);
          setTimeout(() => setCopiedAddress(false), 2000);
          toast({
            title: "Copied",
            description: "Wallet address copied to clipboard",
          });
        }
      }
    };

    const handleCopyHash = async () => {
      if (txHash) {
        const success = await copyToClipboard(txHash);
        if (success) {
          setCopiedHash(true);
          setTimeout(() => setCopiedHash(false), 2000);
          toast({
            title: "Copied",
            description: "Transaction hash copied to clipboard",
          });
        }
      }
    };
    return (
      <div className="min-h-screen bg-dark-primary">
        {/* Header */}
        <header className="w-full px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <LogoFullIcon width="120" height="32" />
          </Link>
          <button className="w-8 h-8 rounded-full border border-light-tertiary/30 flex items-center justify-center hover:bg-dark-secondary transition-colors">
            <HelpCircle className="w-4 h-4 text-light-primary" />
          </button>
        </header>

        {/* Main Content */}
        <main className="max-w-md mx-auto px-4 pb-24 md:pb-8 min-h-[calc(100vh-80px)] flex flex-col">
          {/* Success Message Section */}
          <div className="text-center mb-6 mt-16">
            <h1
              className="text-5xl font-black text-light-primary mb-3"
              style={{ fontFamily: "Roboto Flex" }}
            >
              Reward credited to your wallet!
            </h1>
            <p className="text-light-tertiary text-md leading-relaxed px-2 mt-4">
              Your{" "}
              <span className="font-bold text-light-primary">
                ${tokensEarned} {claimData.reward_token_symbol}
              </span>{" "}
              has been credited.
              {/* You can track this reward anytime in your Activity tab. */}
            </p>
          </div>

          {/* Spacer to push content to bottom */}
          <div className="flex-1"></div>

          {/* Dashed Separator */}
          <div className="border-t border-dashed border-light-tertiary/20 mb-6"></div>

          {/* Transaction Details Card */}
          <div className="bg-dark-quaternary rounded-lg border border-dark-tertiary p-5 mb-6">
            {/* To - Wallet Address */}
            <div className="flex items-center justify-between py-3 border-b border-dashed border-light-tertiary/20">
              <span className="text-light-tertiary text-sm">To</span>
              <div className="flex items-center gap-2">
                <span className="text-light-primary text-sm font-mono">
                  {walletAddress ? truncateAddress(walletAddress) : "N/A"}
                </span>
                {walletAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-dark-tertiary rounded transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress ? (
                      <Check className="w-4 h-4 text-green-text" />
                    ) : (
                      <Copy className="w-4 h-4 text-light-tertiary" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Transaction Hash */}
            {txHash && (
              <div className="flex items-center justify-between py-3 border-b border-dashed border-light-tertiary/20">
                <span className="text-light-tertiary text-sm">
                  Transaction hash
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-light-primary text-sm font-mono">
                    {truncateAddress(txHash)}
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="p-1 hover:bg-dark-tertiary rounded transition-colors"
                    title="Copy hash"
                  >
                    {copiedHash ? (
                      <Check className="w-4 h-4 text-green-text" />
                    ) : (
                      <Copy className="w-4 h-4 text-light-tertiary" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between py-3">
              <span className="text-light-tertiary text-sm">Status</span>
              <span className="text-green-text text-sm font-medium">
                Confirmed
              </span>
            </div>
          </div>

          {/* View Active Campaigns Button */}
          <Button
            onClick={() => router.push("/campaigns")}
            className="w-full bg-accent-brand hover:bg-accent-brand/90 text-light-primary font-semibold h-12 rounded-lg mb-6 flex items-center justify-center"
            size="lg"
          >
            <span>View active campaigns</span>
            <ArrowUpRight className="w-5 h-5 ml-2" />
          </Button>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 text-light-quaternary text-xs pb-4">
            <ShieldCheck className="w-4 h-4 text-light-quaternary" />
            <span>Rewards are usually credited in ~ 5 min</span>
          </div>
        </main>
      </div>
    );
  }
  console.log("claimdata", claimData);
  console.log("winner", winnerData);

  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Header */}
      <header className="w-full px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <LogoFullIcon width="120" height="32" />
        </Link>
        <button className="w-8 h-8 rounded-full border border-light-tertiary/30 flex items-center justify-center hover:bg-dark-secondary transition-colors">
          <HelpCircle className="w-4 h-4 text-light-primary" />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-2 pb-28">
        {/* Eligibility Message */}
        <div className="text-left mb-6 mt-8 ">
          <h1
            className="text-5xl font-black text-light-primary mb-3"
            style={{ fontFamily: "Roboto Flex" }}
          >
            You're eligible for a reward
          </h1>
          <p className="text-light-tertiary text-sm leading-relaxed">
            This page exists because your activity on{" "}
            <div className=" hover:underline inline-flex items-center gap-1">
              <XLogo className="w-3 h-3" />
            </div>{" "}
            met the criteria for a campaign run by{" "}
            <Link
              href={`https://x.com/${claimData.creator_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-text  inline-flex items-center gap-1 underline underline-offset-1"
            >
              <span>@{claimData.creator_handle}</span>
              <ArrowUpRight className="w-4 h-4 " />
            </Link>
          </p>
        </div>

        {/* Reward Card */}
        <div className="bg-dark-tertiary rounded-lg p-5 mb-6 border border-dark-tertiary">
          {/* Card Header */}
          <div className="flex items-center gap-2 mb-4">
            <LogoFullIcon width="80" height="20" />
            <span className="text-light-primary text-sm font-medium">
              Campaign
            </span>
          </div>

          {/* Campaign Info */}
          <div className="flex items-center gap-2 mb-8">
            {claimData.tasks?.[0]?.profile_image_url ? (
              <img
                src={claimData.tasks[0].profile_image_url}
                alt={claimData.campaign_name || "Campaign"}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <Trophy className="w-5 h-5 text-accent-brand" />
            )}
            <h2 className="text-light-primary font-semibold text-xl">
              {claimData.campaign_name}
            </h2>
          </div>

          {/* <p className="text-light-tertiary text-sm mb-6">
            from{" "}
            <Link
              href={`https://x.com/${claimData.creator_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-tertiary hover:underline inline-flex items-center gap-1"
            >
              <XLogo className="w-3 h-3" />
              <span>@{claimData.creator_handle}</span>
            </Link>
          </p> */}

          {/* Reward Amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold text-light-primary">
                ${claimData.reward_amount}
              </span>
              <img src="/usdc.svg" alt="USDC" className="w-5 h-5" />
              <span className="text-light-primary font-medium text-md">
                {claimData.reward_token_symbol}
              </span>
            </div>

            {/* Verified Badge */}
            <div className="flex items-center gap-1 bg-accent-brand/20 px-2 py-1 rounded-full">
              <Check className="w-3 h-3 text-accent-brand" />
              <span className="text-accent-brand text-xs font-medium">
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Claiming Instructions */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 text-light-secondary text-xs">
            <Star className="w-4 h-4 text-yellow-text" />
            <span>Claiming takes around 2 minutes.</span>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-between text-light-tertiary text-sm">
            <div
              className={`text-center flex-1 ${
                currentStep === "login"
                  ? "text-light-primary"
                  : currentStep === "wallet" || currentStep === "claim"
                  ? "text-green-text"
                  : ""
              }`}
            >
              <div className="font-medium mb-1 flex items-center justify-center gap-1">
                {currentStep === "wallet" || currentStep === "claim" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>Step I</span>
                )}
              </div>
              <div className="text-xs flex items-center justify-center gap-1">
                <span>Login with</span>
                <XLogo className="w-3 h-3" />
              </div>
            </div>
            <button
              onClick={() => {
                if (isAuthenticated && user) {
                  router.push(`/claim/${winnerId}/wallet`);
                }
              }}
              disabled={!isAuthenticated || !user}
              className={`text-center flex-1 transition-colors ${
                currentStep === "wallet"
                  ? "text-light-primary"
                  : currentStep === "claim"
                  ? "text-green-text"
                  : "text-light-tertiary"
              } `}
            >
              <div className="font-medium mb-1 flex items-center justify-center gap-1">
                {currentStep === "claim" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>Step II</span>
                )}
              </div>
              <div className="text-xs flex items-center justify-center">
                <span>Add wallet address</span>
              </div>
            </button>
            <div
              className={`text-center flex-1 ${
                currentStep === "claim" ? "text-light-primary" : ""
              }`}
            >
              <div className="font-medium mb-1">Step III</div>
              <div className="text-xs">Claim reward</div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleVerifyClick}
          disabled={isAuthLoading || isClaiming}
          className="w-full bg-accent-brand hover:bg-accent-brand/90 text-light-primary font-semibold h-12 rounded-lg mb-6 flex items-center justify-center text-md"
          size="lg"
        >
          {isClaiming ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span>Claiming Reward...</span>
            </>
          ) : currentStep === "login" ? (
            <>
              <span className="text-light-primary flex items-center gap-1">
                Login with
                <span className="text-light-primary">
                  <XLogo className="w-5 h-5" />
                </span>
                to claim reward
              </span>
            </>
          ) : currentStep === "wallet" ? (
            <>
              <Wallet className="w-5 h-5 mr-2" />
              <span>Connect Wallet to claim reward</span>
            </>
          ) : (
            <>
              <span>Claim Reward</span>
              <ArrowUpRight className="w-5 h-5 mr-2" />
            </>
          )}
        </Button>

        {/* Footer Verification Status */}
        <div className="flex items-center justify-center gap-2 text-light-quaternary text-xs">
          <ShieldCheck className="w-4 h-4 text-light-quaternary" />
          <span>24+ verified claims. Verify the reward belongs to you.</span>
        </div>
      </main>
    </div>
  );
}
