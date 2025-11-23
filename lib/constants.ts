// Environment variables
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// API Configuration
// Using Next.js API routes for server-side security
export const API_BASE_URL = "/api";

// For any client-side direct API calls (if needed)
export const TRENDSAGE_API_URL =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL || "http://localhost:8000";
// Keep old name for backward compatibility
export const CREDBUZZ_API_URL =
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  "http://localhost:8000";

export const CREDBUZZ_ACCOUNT =
  process.env.NEXT_PUBLIC_CREDBUZZ_ACCOUNT!;

export const OWNER_SOLANA_ADDRESS =
  process.env.NEXT_PUBLIC_OWNER_SOLANA_ADDRESS!;

export const SOLANA_USDC_MINT =
  process.env.NEXT_PUBLIC_SOLANA_USDC_MINT!;

// Campaign Configuration
export const SERVICE_FEE_PERCENT = 0.0; // 10% service fee (0.10 = 10%, set to 0 for no fee)
export const MIN_REWARD_POOL = 0.2; // Minimum reward pool in USDC
export const MIN_REWARD_PER_WINNER = 0.2; // Minimum reward per winner in USDC

// Helper functions for service fee calculations
export const calculateServiceFee = (amount: number): number => {
  return amount * SERVICE_FEE_PERCENT;
};

export const calculateTotalWithFee = (amount: number): number => {
  return amount * (1 + SERVICE_FEE_PERCENT);
};

export const getServiceFeeLabel = (): string => {
  return `${(SERVICE_FEE_PERCENT * 100).toFixed(0)}%`;
};
