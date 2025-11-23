import { PublicKey } from "@solana/web3.js";

// Quest Manager Program Types
export interface Quest {
  id: string;
  creator: PublicKey;
  tokenMint: PublicKey;
  escrowAccount: PublicKey;
  amount: number;
  deadline: number;
  isActive: boolean;
  totalWinners: number;
  totalRewardDistributed: number;
  maxWinners: number;
}

export interface GlobalState {
  owner: PublicKey;
  paused: boolean;
  supportedTokenMints: PublicKey[];
  quests: string[];
}

export interface RewardClaimed {
  questId: string;
  winner: PublicKey;
  rewardAmount: number;
  claimed: boolean;
}

// Program Error Types
export enum QuestManagerError {
  ContractPaused = 6000,
  UnsupportedTokenMint = 6001,
  UnauthorizedCancellation = 6002,
  QuestNotActive = 6003,
  QuestAlreadyCancelled = 6004,
  UnauthorizedStatusUpdate = 6005,
  UnauthorizedTokenModification = 6006,
  TokenAlreadySupported = 6007,
  TokenNotFound = 6008,
  UnauthorizedPauseAction = 6009,
  AlreadyPaused = 6010,
  AlreadyUnpaused = 6011,
  UnauthorizedRewardAction = 6012,
  InsufficientRewardBalance = 6013,
  MaxWinnersReached = 6014,
  AlreadyRewarded = 6015,
  UnauthorizedWithdrawal = 6016,
  NoTokensToWithdraw = 6017,
}

// Transaction Result Types
export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

// Quest Creation Parameters
export interface CreateQuestParams {
  questId: string;
  tokenMint: PublicKey;
  amount: number;
  deadline: number;
  maxWinners: number;
}

export interface CreateQuestResult {
  txHash: string;
  questAccountAddress?: string; // Quest Pubkey (base58 string) - Store this for getQuestInfo() calls!
}

// Reward Distribution Parameters
export interface SendRewardParams {
  questId: string;
  winner: PublicKey;
  rewardAmount: number;
}

// Program Configuration
export interface SolanaConfig {
  rpcUrl: string;
  programId: string;
  commitment: "processed" | "confirmed" | "finalized";
}

// Wallet Connection Status
export interface WalletStatus {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  error?: string;
}

// Quest Status Enum
export enum QuestStatus {
  Active = "active",
  Inactive = "inactive",
  Cancelled = "cancelled",
  Completed = "completed",
}

// Token Information
export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
}

// Escrow Account Information
export interface EscrowInfo {
  questId: string;
  tokenMint: PublicKey;
  amount: number;
  creator: PublicKey;
  isActive: boolean;
}

// Quest Statistics
export interface QuestStats {
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  totalRewardsDistributed: number;
  totalParticipants: number;
}

// Program State Information
export interface ProgramState {
  isInitialized: boolean;
  isPaused: boolean;
  owner: PublicKey | null;
  supportedTokens: PublicKey[];
  totalQuests: number;
}
