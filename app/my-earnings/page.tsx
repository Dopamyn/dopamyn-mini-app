"use client";

import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { ReferralEntry, QuestEarningEntry } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ReferralTable } from "../components/ReferralTable";
import { QuestEarningsTable } from "../components/QuestEarningsTable";
import { TransactionHistory } from "../components/TransactionHistory";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionEntry } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export default function MyEarnings() {
  const { toast } = useToast();
  const { user } = useUser();

  // Referral earnings state
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [referralsPage, setReferralsPage] = useState(0);
  const [hasMoreReferrals, setHasMoreReferrals] = useState(false);
  const referralsPerPage = 10;

  // Quest earnings state
  const [questEarningsLoading, setQuestEarningsLoading] = useState(false);
  const [questEarnings, setQuestEarnings] = useState<QuestEarningEntry[]>([]);
  const [questEarningsPage, setQuestEarningsPage] = useState(0);
  const [hasMoreQuestEarnings, setHasMoreQuestEarnings] = useState(false);
  const questEarningsPerPage = 50;

  // Transaction history state - dummy data

  // Fetch quest earnings on mount
  useEffect(() => {
    if (user) {
      fetchQuestEarnings();
    }
  }, [user]);
  const [transactionHistoryLoading, setTransactionHistoryLoading] =
    useState(false);
  const [transactionHistory, setTransactionHistory] = useState<
    TransactionEntry[]
  >([
    {
      id: "tx-1",
      type: "quest_earning",
      description: "Welcome to Dopamyn",
      amount: 50,
      token_symbol: "DOPE",
      chain: "base",
      status: "completed",
      created_at: "2024-10-25T10:30:00Z",
      tx_hash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      related_quest_id: "quest-1",
    },
    {
      id: "tx-2",
      type: "referral_bonus",
      description: "@crypto_trader_99 - Welcome to Dopamyn",
      amount: 25,
      token_symbol: "DOPE",
      chain: "base",
      status: "completed",
      created_at: "2024-10-25T10:35:00Z",
      tx_hash:
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      related_referral_id: "ref-1",
    },
    {
      id: "tx-3",
      type: "quest_earning",
      description: "Crypto Trends Analysis",
      amount: 100,
      token_symbol: "DOPE",
      chain: "solana",
      status: "completed",
      created_at: "2024-10-24T14:20:00Z",
      tx_hash:
        "solana_tx_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      related_quest_id: "quest-2",
    },
    {
      id: "tx-5",
      type: "quest_earning",
      description: "Weekly Activity Challenge",
      amount: 15,
      token_symbol: "DOPE",
      chain: "base",
      status: "completed",
      created_at: "2024-10-23T09:00:00Z",
      tx_hash:
        "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      related_quest_id: "quest-weekly",
    },
    {
      id: "tx-6",
      type: "quest_earning",
      description: "DeFi Protocol Engagement",
      amount: 120,
      token_symbol: "DOPE",
      chain: "base",
      status: "completed",
      created_at: "2024-10-23T09:45:00Z",
      tx_hash:
        "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
      related_quest_id: "quest-3",
    },
    {
      id: "tx-7",
      type: "referral_bonus",
      description: "@web3_builder - Crypto Trends Analysis",
      amount: 20,
      token_symbol: "DOPE",
      chain: "solana",
      status: "completed",
      created_at: "2024-10-24T15:50:00Z",
      tx_hash:
        "solana_tx_def1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      related_referral_id: "ref-2",
    },
  ]);
  const [transactionHistoryPage, setTransactionHistoryPage] = useState(0);
  const [hasMoreTransactionHistory, setHasMoreTransactionHistory] =
    useState(false);
  const transactionHistoryPerPage = 20;

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalQuestEarnings = questEarnings.reduce(
      (sum, earning) =>
        sum + (earning.rewards_earned ?? earning.tokens_earned ?? 0),
      0
    );
    const totalReferralEarnings = referrals.reduce(
      (sum, referral) => sum + referral.reward_earned,
      0
    );
    const totalXPEarned = questEarnings.reduce(
      (sum, earning) => sum + (earning.xp_earned ?? 0),
      0
    );
    const totalQuestsCompleted = new Set(
      questEarnings.map((earning) => earning.quest_id)
    ).size;

    return {
      totalQuestEarnings,
      totalReferralEarnings,
      totalXPEarned,
      totalQuestsCompleted,
    };
  }, [questEarnings, referrals]);

  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load more referrals from API
  const loadMoreReferrals = async (start: number, limit: number) => {
    try {
      const token = localStorage.getItem("token") as string;
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `/api/user/referral-earnings?sort_by=reward_earned_desc&start=${start}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.result?.referrals) {
        // Transform API response to match ReferralEntry format
        const transformedReferrals = data.result.referrals.map((ref: any) => ({
          x_handle: ref.x_handle,
          used_time: ref.last_used_time || ref.used_time,
          followers_count: ref.followers_count,
          smart_followers_count: ref.smart_followers_count,
          reward_earned: ref.reward_earned || 0,
          profile_image_url: ref.profile_image_url,
        }));
        return {
          referrals: transformedReferrals,
          partialReferrals: [],
        };
      }
      return { referrals: [], partialReferrals: [] };
    } catch (error) {
      console.error("Error loading more referrals:", error);
      return { referrals: [], partialReferrals: [] };
    }
  };

  // Fetch initial referrals on mount
  useEffect(() => {
    if (user) {
      const fetchInitialReferrals = async () => {
        setReferralsLoading(true);
        try {
          const token = localStorage.getItem("token") as string;
          if (!token) {
            throw new Error("No authentication token found");
          }

          const response = await fetch(
            "/api/user/referral-earnings?sort_by=reward_earned_desc&start=0&limit=10",
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data?.result?.referrals) {
            // Transform API response to match ReferralEntry format
            const transformedReferrals = data.result.referrals.map(
              (ref: any) => ({
                x_handle: ref.x_handle,
                used_time: ref.last_used_time || ref.used_time,
                followers_count: ref.followers_count,
                smart_followers_count: ref.smart_followers_count,
                reward_earned: ref.reward_earned || 0,
                profile_image_url: ref.profile_image_url,
              })
            );
            setReferrals(transformedReferrals);
            setHasMoreReferrals(transformedReferrals.length >= 10);
          }
        } catch (error) {
          console.error("Error fetching initial referrals:", error);
        } finally {
          setReferralsLoading(false);
        }
      };
      fetchInitialReferrals();
    }
  }, [user]);

  // Load more quest earnings (dummy data)
  const fetchQuestEarnings = async () => {
    try {
      setQuestEarningsLoading(true);
      const token = localStorage.getItem("token") as string;
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        "/api/user/quest-earnings?sort_by=rewards_earned_desc&start=0&limit=10",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data?.result?.quests) {
        setQuestEarnings(data.result.quests);
        setHasMoreQuestEarnings(data.result.quests.length >= 10);
      }
    } catch (error) {
      console.error("Error fetching quest earnings:", error);
    } finally {
      setQuestEarningsLoading(false);
    }
  };

  const loadMoreQuestEarnings = async (start: number, limit: number) => {
    try {
      const token = localStorage.getItem("token") as string;
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `/api/user/quest-earnings?sort_by=rewards_earned_desc&start=${start}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        earnings: data?.result?.quests || [],
      };
    } catch (error) {
      console.error("Error loading more quest earnings:", error);
      return { earnings: [] };
    }
  };

  // Load more transaction history (dummy data)
  const loadMoreTransactionHistory = async (start: number, limit: number) => {
    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { transactions: [] };
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-light-primary mb-4">
            Please connect your account
          </h1>
          <p className="text-light-tertiary">
            You need to be logged in to view your earnings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-0 lg:px-0 py-8 pt-20 sm:pt-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-light-primary">
              <Loader2 className="w-8 h-8 animate-spin text-accent-brand" />
              <span className="text-xl font-medium">
                Loading your earnings...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-light-primary mb-2">Error</h1>
          <p className="text-light-tertiary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-light-primary text-dark-primary px-4 py-2 rounded-lg hover:bg-light-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-primary px-4 sm:px-0 lg:px-0 py-8 pt-20 sm:pt-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-light-primary mb-2">
            My Earnings
          </h1>
          <p className="text-light-tertiary">
            Track your earnings from referrals and campaign completions
          </p>
        </div>

        {/* Summary Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6 border border-dark-quaternary/50">
            <div className="text-center">
              <p className="text-sm text-light-tertiary font-medium mb-2">
                Quest Earnings
              </p>
              <p className="text-2xl font-bold text-light-primary">
                💰 {formatNumber(summaryStats.totalQuestEarnings)}
              </p>
            </div>
          </div>

          <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6 border border-dark-quaternary/50">
            <div className="text-center">
              <p className="text-sm text-light-tertiary font-medium mb-2">
                Referral Earnings
              </p>
              <p className="text-2xl font-bold text-light-primary">
                💰 {formatNumber(summaryStats.totalReferralEarnings)}
              </p>
            </div>
          </div>

          <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6 border border-dark-quaternary/50">
            <div className="text-center">
              <p className="text-sm text-light-tertiary font-medium mb-2">
                XP Earned
              </p>
              <p className="text-2xl font-bold text-light-primary">
                {formatNumber(summaryStats.totalXPEarned)} XP
              </p>
            </div>
          </div>

          <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6 border border-dark-quaternary/50">
            <div className="text-center">
              <p className="text-sm text-light-tertiary font-medium mb-2">
                Campaigns Completed
              </p>
              <p className="text-2xl font-bold text-light-primary">
                {formatNumber(summaryStats.totalQuestsCompleted)}
              </p>
            </div>
          </div>
        </div>

        {/* Earnings Tabs */}
        <Tabs defaultValue="referrals" className="w-full">
          <TabsList className="-mb-px flex space-x-8 justify-start bg-transparent p-0">
            <TabsTrigger
              value="referrals"
              className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary data-[state=active]:border-accent-brand data-[state=active]:text-light-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Referral Earnings
            </TabsTrigger>
            <TabsTrigger
              value="quests"
              className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary data-[state=active]:border-accent-brand data-[state=active]:text-light-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Quest Earnings
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-light-tertiary hover:text-light-tertiary hover:border-dark-quaternary data-[state=active]:border-accent-brand data-[state=active]:text-light-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Transaction History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="referrals" className="mt-6">
            <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6">
              <ReferralTable
                initialReferrals={referrals}
                initialPartialReferrals={[]}
                onLoadMore={loadMoreReferrals}
              />
            </div>
          </TabsContent>

          <TabsContent value="quests" className="mt-6">
            <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6">
              <QuestEarningsTable
                initialEarnings={questEarnings}
                onLoadMore={loadMoreQuestEarnings}
              />
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <div className="bg-dark-secondary/30 rounded-lg backdrop-blur-sm p-6">
              <TransactionHistory
                initialTransactions={transactionHistory}
                onLoadMore={loadMoreTransactionHistory}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
