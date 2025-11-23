// Chain Configuration System
// Centralized configuration for all supported blockchains

export enum ChainType {
  EVM = "EVM",
  SOLANA = "SOLANA",
}

export interface ChainConfig {
  id: string;
  name: string;
  type: ChainType;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  logo: string;
  // Quest contract configuration
  questContract: {
    address: string;
    abi: any; // Will be imported from abis folder
  };
  // Network-specific settings
  gasLimit?: number;
  chainId?: number;
  // Token addresses
  tokens: {
    usdc: string;
  };
  // Additional metadata
  explorerUrl?: string;
  isTestnet?: boolean;
}

// Chain configurations
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  "base-mainnet": {
    id: "base-mainnet",
    name: "Base",
    type: ChainType.EVM,
    rpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    logo: "/icons/base.svg",
    questContract: {
      address: process.env.NEXT_PUBLIC_BASE_QUEST_CONTRACT_ADDRESS || "",
      abi: null, // Will be imported dynamically
    },
    gasLimit: 4000000,
    chainId: 8453,
    tokens: {
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base mainnet USDC
    },
    explorerUrl: "https://basescan.org",
    isTestnet: false,
  },
  "ethereum-mainnet": {
    id: "ethereum-mainnet",
    name: "Ethereum",
    type: ChainType.EVM,
    rpcUrl: process.env.NEXT_PUBLIC_ETH_RPC_URL || "https://eth.llamarpc.com",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    logo: "/icons/eth.svg",
    questContract: {
      address: process.env.NEXT_PUBLIC_ETH_QUEST_CONTRACT_ADDRESS || "",
      abi: null, // Will be imported dynamically
    },
    gasLimit: 4000000,
    chainId: 1,
    tokens: {
      usdc: "0xA0b86a33E6441b8C4C8C0C4C8C0C4C8C0C4C8C0C", // Placeholder - update with actual USDC address
    },
    explorerUrl: "https://etherscan.io",
    isTestnet: false,
  },
  "polygon-mainnet": {
    id: "polygon-mainnet",
    name: "Polygon",
    type: ChainType.EVM,
    rpcUrl: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.llamarpc.com",
    nativeCurrency: {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
    },
    logo: "/icons/polygon.svg",
    questContract: {
      address: process.env.NEXT_PUBLIC_POLYGON_QUEST_CONTRACT_ADDRESS || "",
      abi: null, // Will be imported dynamically
    },
    gasLimit: 4000000,
    chainId: 137,
    tokens: {
      usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon USDC
    },
    explorerUrl: "https://polygonscan.com",
    isTestnet: false,
  },
  "solana-mainnet": {
    id: "solana-mainnet",
    name: "Solana",
    type: ChainType.SOLANA,
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
    nativeCurrency: {
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    logo: "/icons/sol.svg",
    questContract: {
      address: process.env.NEXT_PUBLIC_SOLANA_MAINNET_PROGRAM_ID || "",
      abi: null, // Solana uses IDL, not ABI
    },
    tokens: {
      usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // Solana mainnet USDC
    },
    explorerUrl: "https://explorer.solana.com",
    isTestnet: false,
  },
  "solana-devnet": {
    id: "solana-devnet",
    name: "Solana Devnet",
    type: ChainType.SOLANA,
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com",
    nativeCurrency: {
      name: "Solana",
      symbol: "SOL",
      decimals: 9,
    },
    logo: "/icons/sol.svg",
    questContract: {
      address: process.env.NEXT_PUBLIC_SOLANA_DEVNET_PROGRAM_ID || "5nHU6XszW84sgjxtKvhxTdoarmfNrPePJpd1kTY8YDP9",
      abi: null, // Solana uses IDL, not ABI
    },
    tokens: {
      usdc: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Solana devnet USDC
    },
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    isTestnet: true,
  },
};

// NOTE: Next.js only inlines environment variables that are referenced
// with static keys (e.g., process.env.NEXT_PUBLIC_FOO). Dynamic access
// like process.env[dynamicKey] does not work in the browser bundle.
// To reliably support per-chain disable flags on the client, we map
// each chain to its explicit env var here.
const DISABLE_FLAGS: Record<string, boolean> = {
  "base-mainnet": process.env.NEXT_PUBLIC_DISABLE_BASE_MAINNET === "true",
  "ethereum-mainnet": process.env.NEXT_PUBLIC_DISABLE_ETHEREUM_MAINNET === "true",
  "polygon-mainnet": process.env.NEXT_PUBLIC_DISABLE_POLYGON_MAINNET === "true",
  "solana-mainnet": process.env.NEXT_PUBLIC_DISABLE_SOLANA_MAINNET === "true",
  "solana-devnet": process.env.NEXT_PUBLIC_DISABLE_SOLANA_DEVNET === "true",
};

// Helper functions
export const getChainConfig = (chainId: string): ChainConfig => {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) {
    throw new Error(`Chain configuration not found for: ${chainId}`);
  }
  return config;
};

export const getAvailableChains = (): ChainConfig[] => {
  const chains = Object.values(CHAIN_CONFIGS);
  
  return chains.filter(chain => {
    // Check if chain is explicitly disabled (use static env var mapping)
    if (DISABLE_FLAGS[chain.id]) {
      return false;
    }
    
    // Legacy: Filter out Solana devnet if not enabled
    if (chain.id === "solana-devnet" && process.env.NEXT_PUBLIC_ENABLE_SOLANA_DEVNET !== "true") {
      return false;
    }
    
    // Check if chain has required environment variables
    if (!chain.questContract.address || chain.questContract.address === "0x" || chain.questContract.address === "") {
      return false;
    }
    
    return true;
  });
};

export const isChainEnabled = (chainId: string): boolean => {
  const availableChains = getAvailableChains();
  return availableChains.some(chain => chain.id === chainId);
};

export const getDefaultChain = (): ChainConfig => {
  const defaultChainId = process.env.NEXT_PUBLIC_DEFAULT_CHAIN || "base-mainnet";
  return getChainConfig(defaultChainId);
};

// Get chains by type
export const getEVMChains = (): ChainConfig[] => {
  return getAvailableChains().filter(chain => chain.type === ChainType.EVM);
};

export const getSolanaChains = (): ChainConfig[] => {
  return getAvailableChains().filter(chain => chain.type === ChainType.SOLANA);
};

// Chain management helpers
export const disableChain = (chainId: string): string => {
  return `NEXT_PUBLIC_DISABLE_${chainId.replace('-', '_').toUpperCase()}=true`;
};

export const enableChain = (chainId: string): string => {
  return `NEXT_PUBLIC_DISABLE_${chainId.replace('-', '_').toUpperCase()}=false`;
};

export const getChainStatus = (chainId: string): 'enabled' | 'disabled' | 'missing_config' => {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return 'missing_config';
  
  if (DISABLE_FLAGS[chainId]) return 'disabled';
  
  if (!config.questContract.address || config.questContract.address === "0x" || config.questContract.address === "") {
    return 'missing_config';
  }
  
  return 'enabled';
};

// Debug helper to check environment variables
export const debugChainEnvironment = () => {
  console.log("🔍 Chain Environment Debug:");
  console.log("==========================");
  
  Object.keys(CHAIN_CONFIGS).forEach(chainId => {
    const disableKey = `NEXT_PUBLIC_DISABLE_${chainId.replace('-', '_').toUpperCase()}`;
    // Value may be undefined on client if accessed dynamically; show mapped flag too
    // @ts-ignore - display raw env if available on server
    const disableValue = (process.env as any)[disableKey];
    const contractAddress = CHAIN_CONFIGS[chainId].questContract.address;
    
    console.log(`${chainId}:`);
    console.log(`  - ${disableKey} (raw) = ${disableValue || 'undefined'}`);
    console.log(`  - mapped DISABLE_FLAGS = ${DISABLE_FLAGS[chainId]}`);
    console.log(`  - Contract Address = ${contractAddress || 'undefined'}`);
    console.log(`  - Status = ${getChainStatus(chainId)}`);
    console.log("");
  });
  
  console.log("Available chains:", getAvailableChains().map(c => c.id));
};

// Get chain by network (for Solana)
export const getSolanaChainByNetwork = (network: "mainnet" | "devnet"): ChainConfig => {
  const chainId = network === "mainnet" ? "solana-mainnet" : "solana-devnet";
  return getChainConfig(chainId);
};
