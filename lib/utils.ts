import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(
  address: string,
  startLength = 6,
  endLength = 4
) {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy text: ", err);
    return false;
  }
}

export function formatNumber(num: number, decimals: number = 1): string {
  if (num === 0) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(decimals)}B`;
  } else if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(decimals)}M`;
  } else if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(decimals)}K`;
  } else {
    return `${sign}${absNum.toFixed(decimals)}`;
  }
}

export function formatCompactNumber(num: number, decimals: number = 1): string {
  if (num === 0) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (absNum >= 1e12) {
    return `${sign}${(absNum / 1e12).toFixed(decimals)}T`;
  } else if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(decimals)}B`;
  } else if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(decimals)}M`;
  } else if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(decimals)}K`;
  } else {
    return `${sign}${absNum.toFixed(decimals)}`;
  }
}

export function truncateTweetId(
  tweetId: string,
  startLength = 6,
  endLength = 4
) {
  return tweetId.slice(0, startLength) + "..." + tweetId.slice(-endLength);
}

export function truncateName(name: string, maxLength: number = 11): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "...";
}

/**
 * Generate transaction URL based on chain type and transaction hash
 * @param chain - The chain type ("base" or "solana")
 * @param txHash - The transaction hash
 * @returns The explorer URL for the transaction
 */
export function getTransactionUrl(chain: string, txHash: string): string {
  if (!txHash) return "";
  
  // Default to base if chain is not specified (for backward compatibility)
  if (!chain || chain === "base") {
    // Ensure hash has 0x prefix for Base
    const prefixedHash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
    return `https://basescan.org/tx/${prefixedHash}`;
  } else if (chain === "solana-devnet") {
    // Solana transaction hash doesn't need 0x prefix
    return `https://solscan.io/tx/${txHash}?cluster=devnet`;
  } else if (chain === "solana-mainnet" || chain === "solana") {
    // Solana transaction hash doesn't need 0x prefix
    return `https://solscan.io/tx/${txHash}`;
  }
  
  // Fallback to base for unknown chain types
  const prefixedHash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  return `https://basescan.org/tx/${prefixedHash}`;
}
