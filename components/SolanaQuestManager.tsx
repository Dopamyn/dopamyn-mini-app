import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSolanaContracts } from "@/hooks/useSolanaContracts";
import { CreateQuestParams, SendRewardParams } from "@/lib/solana-types";
import { PublicKey } from "@solana/web3.js";
import React, { useState } from "react";

export const SolanaQuestManager: React.FC = () => {
  const {
    program,
    isConnected,
    isInitializing,
    connectWallet,
    initializeProgram,
    createQuest,
    getQuestInfo,
    getAllQuests,
    cancelQuest,
    updateQuestStatus,
    addSupportedToken,
    removeSupportedToken,
    pauseProgram,
    unpauseProgram,
    sendReward,
    getGlobalState,
  } = useSolanaContracts();

  // State for form inputs
  const [questId, setQuestId] = useState("");
  const [tokenMint, setTokenMint] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxWinners, setMaxWinners] = useState("");
  const [winnerAddress, setWinnerAddress] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // State for displaying data
  const [quests, setQuests] = useState<string[]>([]);
  const [globalState, setGlobalState] = useState<any>(null);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);

  const handleInitializeProgram = async () => {
    try {
      setLoading(true);
      // Example supported tokens - you would replace with actual token mints
      const supportedTokens = [
        new PublicKey("So11111111111111111111111111111111111111112"), // SOL
        // Add more supported token mints here
      ];
      await initializeProgram(supportedTokens);
      await refreshGlobalState();
    } catch (error) {
      console.error("Failed to initialize program:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuest = async () => {
    try {
      setLoading(true);
      const params: CreateQuestParams = {
        questId,
        tokenMint: new PublicKey(tokenMint),
        amount: parseInt(amount),
        deadline: parseInt(deadline),
        maxWinners: parseInt(maxWinners),
      };
      await createQuest(params);
      await refreshQuests();
      // Clear form
      setQuestId("");
      setTokenMint("");
      setAmount("");
      setDeadline("");
      setMaxWinners("");
    } catch (error) {
      console.error("Failed to create quest:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReward = async () => {
    try {
      setLoading(true);
      const params: SendRewardParams = {
        questId,
        winner: new PublicKey(winnerAddress),
        rewardAmount: parseInt(rewardAmount),
      };
      await sendReward(params);
      // Clear form
      setWinnerAddress("");
      setRewardAmount("");
    } catch (error) {
      console.error("Failed to send reward:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuests = async () => {
    try {
      const questList = await getAllQuests();
      setQuests(questList);
    } catch (error) {
      console.error("Failed to refresh quests:", error);
    }
  };

  const refreshGlobalState = async () => {
    try {
      const state = await getGlobalState();
      setGlobalState(state);
    } catch (error) {
      console.error("Failed to refresh global state:", error);
    }
  };

  const handleGetQuestInfo = async (questId: string) => {
    try {
      const quest = await getQuestInfo(questId);
      setSelectedQuest(quest);
    } catch (error) {
      console.error("Failed to get quest info:", error);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Solana Quest Manager</CardTitle>
          <CardDescription>
            Connect your Solana wallet to interact with the Quest Manager
            program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {isInitializing
              ? "Connecting..."
              : "Please connect your Solana wallet"}
          </p>
          <div className="text-center">
            <Button
              onClick={connectWallet}
              disabled={isInitializing}
              className="w-full"
            >
              {isInitializing ? "Connecting..." : "Connect Solana Wallet"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Solana Quest Manager</CardTitle>
          <CardDescription>
            Manage quests and rewards on Solana using Anchor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleInitializeProgram} disabled={loading}>
              Initialize Program
            </Button>
            <Button onClick={refreshGlobalState} variant="outline">
              Refresh Global State
            </Button>
            <Button onClick={refreshQuests} variant="outline">
              Refresh Quests
            </Button>
          </div>

          {globalState && (
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Global State</h3>
              <p>Paused: {globalState.paused ? "Yes" : "No"}</p>
              <p>Total Quests: {globalState.quests.length}</p>
              <p>Supported Tokens: {globalState.supportedTokenMints.length}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Quest */}
        <Card>
          <CardHeader>
            <CardTitle>Create Campaign</CardTitle>
            <CardDescription>Create a new campaign with rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="questId">Quest ID</Label>
              <Input
                id="questId"
                value={questId}
                onChange={(e) => setQuestId(e.target.value)}
                placeholder="unique-quest-id"
              />
            </div>
            <div>
              <Label htmlFor="tokenMint">Token Mint Address</Label>
              <Input
                id="tokenMint"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
                placeholder="Token mint public key"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline (Unix timestamp)</Label>
              <Input
                id="deadline"
                type="number"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="1735689600"
              />
            </div>
            <div>
              <Label htmlFor="maxWinners">Max Winners</Label>
              <Input
                id="maxWinners"
                type="number"
                value={maxWinners}
                onChange={(e) => setMaxWinners(e.target.value)}
                placeholder="10"
              />
            </div>
            <Button
              onClick={handleCreateQuest}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Creating..." : "Create Campaign"}
            </Button>
          </CardContent>
        </Card>

        {/* Send Reward */}
        <Card>
          <CardHeader>
            <CardTitle>Send Reward</CardTitle>
            <CardDescription>Send rewards to campaign winners</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rewardQuestId">Quest ID</Label>
              <Input
                id="rewardQuestId"
                value={questId}
                onChange={(e) => setQuestId(e.target.value)}
                placeholder="quest-id-to-reward"
              />
            </div>
            <div>
              <Label htmlFor="winnerAddress">Winner Address</Label>
              <Input
                id="winnerAddress"
                value={winnerAddress}
                onChange={(e) => setWinnerAddress(e.target.value)}
                placeholder="Winner's public key"
              />
            </div>
            <div>
              <Label htmlFor="rewardAmount">Reward Amount</Label>
              <Input
                id="rewardAmount"
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                placeholder="500000"
              />
            </div>
            <Button
              onClick={handleSendReward}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Reward"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quest List */}
      <Card>
        <CardHeader>
          <CardTitle>Quests</CardTitle>
          <CardDescription>View and manage existing quests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {quests.map((questId) => (
              <div
                key={questId}
                className="flex items-center justify-between p-3 border rounded"
              >
                <span className="font-mono text-sm">{questId}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGetQuestInfo(questId)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelQuest(questId)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
            {quests.length === 0 && (
              <p className="text-center text-muted-foreground">
                No Campaigns found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quest Details */}
      {selectedQuest && (
        <Card>
          <CardHeader>
            <CardTitle>Quest Details</CardTitle>
            <CardDescription>
              Information about the selected quest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quest ID</Label>
                <p className="font-mono text-sm">{selectedQuest.id}</p>
              </div>
              <div>
                <Label>Creator</Label>
                <p className="font-mono text-sm">
                  {selectedQuest.creator.toString()}
                </p>
              </div>
              <div>
                <Label>Amount</Label>
                <p>{selectedQuest.amount}</p>
              </div>
              <div>
                <Label>Deadline</Label>
                <p>
                  {new Date(selectedQuest.deadline * 1000).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Max Winners</Label>
                <p>{selectedQuest.maxWinners}</p>
              </div>
              <div>
                <Label>Total Winners</Label>
                <p>{selectedQuest.totalWinners}</p>
              </div>
              <div>
                <Label>Active</Label>
                <p>{selectedQuest.isActive ? "Yes" : "No"}</p>
              </div>
              <div>
                <Label>Reward Distributed</Label>
                <p>{selectedQuest.totalRewardDistributed}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  updateQuestStatus(selectedQuest.id, !selectedQuest.isActive)
                }
                variant="outline"
              >
                {selectedQuest.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Program Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Program Controls</CardTitle>
          <CardDescription>Manage the quest manager program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={pauseProgram} variant="destructive">
              Pause Program
            </Button>
            <Button onClick={unpauseProgram} variant="outline">
              Unpause Program
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
