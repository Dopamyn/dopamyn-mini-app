"use client";

import { QuestTabsContainer } from "@/app/components/campaigns/tabs";
import { QuestCard } from "@/app/components/campaigns/QuestCard";
import { Button } from "@/components/ui/button";
import { QuestDetails, Quest } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSolanaContract } from "@/hooks/useSolanaContract";
import { PublicKey } from "@solana/web3.js";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { useUser } from "@/contexts/UserContext";
import { useWallets, useConnectWallet, usePrivy } from "@privy-io/react-auth";
import {
  showErrorToast,
  showSuccessToast,
} from "@/app/components/ui/custom-toast";

const DEFAULT_USDC_MINT_MAINNET =
  process.env.NEXT_PUBLIC_SOLANA_USDC_MINT ||
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const fetchQuestDetails = async (
  shareableId: string
): Promise<QuestDetails | null> => {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/quests/${shareableId}/details`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching quest:", error);
    return null;
  }
};

export default function QuestDetailsPage({
  params,
}: {
  params: Promise<{ questId: string }>;
}) {
  const { connectWallet } = useConnectWallet({
    onSuccess: () => {
      showSuccessToast("Wallet connected successfully!");
    },
    onError: (error) => {
      console.error("Wallet connection error:", error);
      showErrorToast("Failed to connect wallet. Please try again.");
    },
  });
  const { questId: shareableId } = use(params);
  const [quest, setQuest] = useState<QuestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { login } = useTwitterDatabaseSync();
  const { user, refreshUser } = useUser();
  const [verifyingQuestId, setVerifyingQuestId] = useState<string | null>(null);
  const { ensureUserAtaForMint, hasUserAtaForMint, checkATAExists, wallet } = useSolanaContract("devnet");
  const [ataCheckInProgress, setAtaCheckInProgress] = useState(false);
  const [hasAta, setHasAta] = useState<boolean | null>(null);
  const [openingTaskModalQuestId, setOpeningTaskModalQuestId] = useState<
    string | null
  >(null);
  const showMissingAtaBackendFlag = Array.isArray((quest as any)?.tasks)
    ? (quest as any).tasks.some((t: any) => t?.user_status === "missingATA")
    : (quest as any)?.user_status === "missingATA";

  // Memoize wallet addresses to prevent unnecessary re-renders
  const userSolanaWalletAddress = useMemo(() => {
    if (!user?.solana_wallet) return null;
    if (typeof user.solana_wallet === 'string') {
      return user.solana_wallet;
    }
    const walletValue = user.solana_wallet as any;
    return walletValue?.toString?.() || null;
  }, [user?.solana_wallet]);

  const connectedWalletAddress = useMemo(() => {
    return wallet?.publicKey?.toString() || null;
  }, [wallet?.publicKey?.toString()]);

  useEffect(() => {
    const fetchQuest = async () => {
      setLoading(true);
      const questData = await fetchQuestDetails(shareableId);
      console.log("questData", questData);
      setQuest(questData);
      setLoading(false);
    };

    fetchQuest();
  }, [shareableId]);

  // Pre-check ATA using stored user.solana_wallet (primary) or connected wallet (fallback)
  useEffect(() => {
    const maybeCheckAta = async () => {
      try {
        if (!quest) return;
        // Only relevant for Solana quests
        if ((quest as any)?.chain !== "solana") {
          setHasAta(true);
          return;
        }
        const tokenAddr = (quest as any)?.token_address || (quest as any)?.token_mint || DEFAULT_USDC_MINT_MAINNET;
        const ownerAddress = userSolanaWalletAddress || connectedWalletAddress;
        
        if (!ownerAddress) {
          setHasAta(null);
          return;
        }
        if (tokenAddr && ownerAddress) {
          setAtaCheckInProgress(true);
          const mint = new PublicKey(tokenAddr);
          let exists: boolean = false;
          if (wallet && connectedWalletAddress === ownerAddress) {
            exists = await hasUserAtaForMint(mint);
          } else {
            exists = await checkATAExists(new PublicKey(ownerAddress), mint);
          }
          setHasAta(exists);
          // console.log("[ATA] Check result", { exists });
        }
      } catch (e) {
        console.warn("ATA pre-check failed", e);
        setHasAta(null);
      } finally {
        setAtaCheckInProgress(false);
      }
    };
    maybeCheckAta();
  }, [quest, connectedWalletAddress, userSolanaWalletAddress, hasUserAtaForMint, checkATAExists, wallet]);

  // Get eligibility reason
  // Helper function to get specific eligibility reason
  const getEligibilityReason = useCallback(
    (quest: QuestDetails | Quest): string | null => {
      if (!user) return null;

      // Check follower criteria first (applies to all reward systems)
      if (quest.criteria && quest.criteria.length > 0) {
        const failingReasons: string[] = [];

        for (const criterion of quest.criteria) {
          if (criterion.criteria === "min_followers") {
            if ((user.followers || 0) < criterion.count) {
              failingReasons.push(
                `Minimum ${criterion.count} followers required (you have ${
                  user.followers || 0
                })`
              );
            }
          } else if (criterion.criteria === "min_smart_followers") {
            if ((user.smart_followers || 0) < criterion.count) {
              failingReasons.push(
                `Minimum ${
                  criterion.count
                } smart followers required (you have ${
                  user.smart_followers || 0
                })`
              );
            }
          } else if (criterion.criteria === "is_verified_account") {
            if (!user.is_verified) {
              failingReasons.push(
                "This quest requires a verified account"
              );
            }
          } else if (criterion.criteria === "is_smart_account") {
            if (!user.is_smart_account) {
              failingReasons.push(
                "This quest requires a smart account"
              );
            }
          }
        }

        // Return combined reasons if any criteria failed
        if (failingReasons.length > 0) {
          return failingReasons.join("\n");
        }
      }

      // Check custom reward system eligibility
      if (quest.reward_system === "custom" && user?.x_handle) {
        const userHandle = user.x_handle.toLowerCase().trim();

        // Check if user is in eligible_kol_list (simple array of handles)
        if (quest.eligible_kol_list && quest.eligible_kol_list.length > 0) {
          if (
            quest.eligible_kol_list.some(
              (handle) => handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // Check if user is in kol_list_data (array of objects with handle property)
        const kolListData = (quest as Quest).kol_list_data;
        if (kolListData && kolListData.length > 0) {
          if (
            kolListData.some(
              (kol: any) => kol.handle?.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // If both lists exist but user is not in either, they are not eligible
        if (quest.eligible_kol_list || (quest as Quest).kol_list_data) {
          return "This is a custom quest. You are not in the eligible users list for this quest set by the creator.";
        }
      }

      // Check custom reward system eligibility
      if (
        quest.reward_system === "first_come" &&
        quest.eligibility_type === "kol_list"
      ) {
        const userHandle = user.x_handle.toLowerCase().trim();

        // Check if user is in eligible_kol_list (simple array of handles)
        if (quest.eligible_kol_list && quest.eligible_kol_list.length > 0) {
          if (
            quest.eligible_kol_list.some(
              (handle) => handle.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // Check if user is in kol_list_data (array of objects with handle property)
        const kolListData = (quest as Quest).kol_list_data;
        if (kolListData && kolListData.length > 0) {
          if (
            kolListData.some(
              (kol: any) => kol.handle?.toLowerCase().trim() === userHandle
            )
          ) {
            return null; // User is eligible
          }
        }

        // If both lists exist but user is not in either, they are not eligible
        if (quest.eligible_kol_list || (quest as Quest).kol_list_data) {
          return "This is a custom quest. You are not in the eligible users list for this quest set by the creator.";
        }
      }

      return null; // User is eligible
    },
    [user]
  );

  // Helper function to check if user is eligible for custom reward system
  const isUserEligible = useCallback(
    (quest: QuestDetails | Quest) => {
      return getEligibilityReason(quest) === null;
    },
    [getEligibilityReason]
  );
  // Placeholder functions for QuestCard
  const openTaskModal = useCallback((quest: QuestDetails | Quest) => {
    // This will be handled by the tabs component
    setOpeningTaskModalQuestId(quest.id);
  }, []);

  const hasUnderReviewTask = useCallback((quest: QuestDetails | Quest) => {
    // This would need to be implemented based on user's task status
    return false;
  }, []);

  const handleVerifyQuest = useCallback((quest: QuestDetails | Quest) => {
    // This would need to be implemented
    setVerifyingQuestId(quest.id);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-light-primary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Loading Data...</span>
        </div>
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Quest Not Found
          </h1>
          <p className="text-light-tertiary mb-6">
            The quest you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => router.push("/campaigns")}
            className="bg-light-primary hover:bg-accent-secondary text-black font-medium"
          >
            Back to Quests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto bg-dark-primary py-12 sm:py-20 px-4 sm:px-6 lg:py-12 lg:px-8">

      {/* Quest Header */}
      <div className="max-w-6xl pt-8 mx-auto mb-4 sm:mb-6 mt-4 sm:mt-16">
        <QuestCard
          quest={quest as any}
          user={user}
          isUserEligible={isUserEligible}
          getEligibilityReason={getEligibilityReason}
          openTaskModal={openTaskModal}
          hasUnderReviewTask={hasUnderReviewTask}
          handleVerifyQuest={handleVerifyQuest}
          verifyingQuestId={verifyingQuestId}
          login={login}
          isProcessing={false}
          isFullWidth={true}
        />
      </div>
      {/* If ATA may be missing for the quest token, offer a one-click create ATA button */}
      {(() => {
        const isSolanaQuest = (quest as any)?.chain === "solana";
        const tokenAddr = (quest as any)?.token_address || (quest as any)?.token_mint || DEFAULT_USDC_MINT_MAINNET;
        const userWalletAddr = userSolanaWalletAddress;
        const connectedAddr = connectedWalletAddress;
        // Only show banner if:
        // 1. User has no wallet, OR
        // 2. User has wallet but ATA is confirmed missing (hasAta === false), OR
        // 3. Backend says missing ATA and we haven't confirmed it exists yet
        const shouldOfferAtaBanner = isSolanaQuest && !!tokenAddr && (
          !userWalletAddr ||
          (userWalletAddr && hasAta === false) ||
          (userWalletAddr && showMissingAtaBackendFlag && hasAta !== true)
        );

        if (!shouldOfferAtaBanner) return false;
        const walletMatches = !!connectedAddr && !!userWalletAddr && connectedAddr === userWalletAddr;
        // console.log("[ATA] Wallet match status", { walletMatches });
        
        // Determine if we should show wallet mismatch message
        const showWalletMismatch = wallet && connectedAddr && userWalletAddr && !walletMatches;
        
        return (
        <div className="max-w-6xl mx-auto mb-4 sm:mb-6 mt-4 sm:mt-0">
          <div className="bg-yellow-950/40 border border-yellow-700 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-yellow-200 text-sm">
              {!userWalletAddr
                ? "Add a Solana wallet to receive rewards."
                : showWalletMismatch
                  ? (
                    <>
                      Your connected wallet doesn't match the wallet added.
                      <br />
                      Switch in your connected solana wallet (e.g. Phantom) manually if this button doesn't work.
                    </>
                  )
                  : hasAta === false
                    ? (walletMatches
                        ? "Your associated token account for this quest's token is missing. Create it to receive rewards."
                        : "Please connect your registered Solana wallet to create the token account and receive rewards.")
                    : "We could not confirm your token account. Connect your wallet to proceed."}
            </div>
            <div className={`flex ${showWalletMismatch ? 'flex-col items-end' : 'items-center'} gap-2`}>
            {!wallet ? (
              <Button
                onClick={async () => {
                  await connectWallet(); // opens Privy modal
                }}
                className="bg-light-primary hover:bg-accent-secondary text-black font-medium"
              >
                Connect Wallet
              </Button>
            ) : showWalletMismatch ? (
              <>
                <Button
                  onClick={async () => {
                    await connectWallet(); // opens Privy modal to switch wallet
                  }}
                  className="bg-light-primary hover:bg-accent-secondary text-black font-medium"
                >
                  Switch Wallet
                </Button>
                {/* <p className="text-yellow-300 text-xs mt-1 text-right">
                  Switch in solana wallet manually if this button doesn't work
                </p> */}
              </>
            ) : (
              <Button
                disabled={ataCheckInProgress || !connectedAddr || connectedAddr !== userWalletAddr}
                onClick={async () => {
                  try {
                    const tokenAddr = (quest as any)?.token_address || (quest as any)?.token_mint || DEFAULT_USDC_MINT_MAINNET;
                    console.log("tokenAddr", tokenAddr);
                    if (!tokenAddr) throw new Error("Missing token mint address");
                    if (connectedAddr !== userWalletAddr) {
                      console.warn("[ATA] Connected wallet mismatch", { connectedAddr, userWalletAddr });
                      throw new Error("Please connect your registered Solana wallet to proceed");
                    }
                    console.log("[ATA] Click: Create Token Account", { tokenAddr, connectedAddr });
                    const sig = await ensureUserAtaForMint(new PublicKey(tokenAddr));
                    if (sig) {
                      // Optionally refresh quest or user state here
                      console.log("[ATA] ATA created", { sig });
                      setHasAta(true);
                    }
                  } catch (e) {
                    console.error("Failed to create ATA", e);
                  }
                }}
                className="bg-light-primary hover:bg-accent-secondary text-black font-medium"
              >
                Create Token Account
              </Button> 
            )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Tabs Section */}
      <QuestTabsContainer
        quest={quest}
        shareableId={shareableId}
        questId={quest.id}
        login={login}
        hasAta={(quest as any)?.chain === "solana" ? hasAta : true}
      />
    </div>
  );
}
