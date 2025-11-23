import { useToast } from "@/hooks/use-toast";
import { ChainConfig, getChainConfig } from "@/lib/chain-config";
import { useBaseQuestManager } from "@/hooks/useBaseQuestManager";
import { useEthereumQuestManager } from "@/hooks/useEthereumQuestManager";
import { usePolygonQuestManager } from "@/hooks/usePolygonQuestManager";
import { useSolanaContract } from "@/hooks/useSolanaContract";
import { PublicKey } from "@solana/web3.js";
import { CreateQuestResult } from "@/lib/solana-types";

export interface QuestCreationParams {
  questId: string;
  tokenAddress: string;
  amount: bigint;
  deadline: bigint;
  maxWinners: bigint;
  onStepChange: (
    step: string,
    status: "processing" | "success" | "error",
    message?: string
  ) => void;
}

export interface MultiChainQuestHook {
  // Chain info
  chainConfig: ChainConfig;
  isConnected: boolean;
  isInitializing: boolean;
  
  // Quest functions
  createQuest: (params: QuestCreationParams) => Promise<CreateQuestResult>;
  approveTokens: (tokenAddress: string, amount: bigint, onStepChange: QuestCreationParams["onStepChange"]) => Promise<void>;
  checkAllowance: (tokenAddress: string, amount: bigint) => Promise<boolean>;
  
  // Chain-specific functions (passed through)
  [key: string]: any;
}

export const useMultiChainQuest = (selectedChainId: string): MultiChainQuestHook => {
  const { toast } = useToast();
  
  // Get chain configuration
  const chainConfig = getChainConfig(selectedChainId);
  
  // Initialize appropriate hook based on chain type
  const baseQuestManager = useBaseQuestManager();
  const ethereumQuestManager = useEthereumQuestManager();
  const polygonQuestManager = usePolygonQuestManager();
  const solanaMainnet = useSolanaContract("mainnet");
  const solanaDevnet = useSolanaContract("devnet");

  // Select the appropriate hook based on chain ID
  let activeHook: any;
  
  switch (selectedChainId) {
    case "base-mainnet":
      activeHook = baseQuestManager;
      break;
    case "ethereum-mainnet":
      activeHook = ethereumQuestManager;
      break;
    case "polygon-mainnet":
      activeHook = polygonQuestManager;
      break;
    case "solana-mainnet":
      activeHook = solanaMainnet;
      break;
    case "solana-devnet":
      activeHook = solanaDevnet;
      break;
    default:
      throw new Error(`Unsupported chain: ${selectedChainId}`);
  }

  // Create unified quest creation function
  const createMultiChainQuest = async (params: QuestCreationParams): Promise<CreateQuestResult> => {
    const { questId, tokenAddress, amount, deadline, maxWinners, onStepChange } = params;
    
    console.log("tokenMint", tokenAddress);

    if (chainConfig.type === "EVM") {
      // EVM chains use the same interface
      return await activeHook.createQuest(questId, tokenAddress, amount, deadline, maxWinners, onStepChange);
    } else if (chainConfig.type === "SOLANA") {
      // Solana has different parameters - convert bigint to number
      const solanaParams = {
        questId,
        tokenMint: new PublicKey(tokenAddress), // Convert string to PublicKey
        amount: Number(amount),
        deadline: Number(deadline),
        maxWinners: Number(maxWinners),
      };

      console.log("THIS IS WORKING SOLANA PARAMS:", solanaParams);
      
      const result = await activeHook.createQuest(solanaParams);
      return { txHash: result.txHash, questAccountAddress: result?.questAccountAddress || undefined };
    }
    
    throw new Error(`Unsupported chain type: ${chainConfig.type}`);
  };

  // Create unified token approval function
  const approveTokens = async (
    tokenAddress: string,
    amount: bigint,
    onStepChange: QuestCreationParams["onStepChange"]
  ): Promise<void> => {
    if (chainConfig.type === "EVM") {
      return await activeHook.approveTokens(tokenAddress, amount, onStepChange);
    } else if (chainConfig.type === "SOLANA") {
      // Solana doesn't need token approval - tokens are transferred directly
      onStepChange("Token Approval", "success", "Solana doesn't require token approval");
      return;
    }
    
    throw new Error(`Unsupported chain type: ${chainConfig.type}`);
  };

  // Create unified allowance checking function
  const checkAllowance = async (tokenAddress: string, amount: bigint): Promise<boolean> => {
    if (chainConfig.type === "EVM") {
      return await activeHook.checkAllowance(tokenAddress, amount);
    } else if (chainConfig.type === "SOLANA") {
      // Solana doesn't use allowances - return true
      return true;
    }
    
    throw new Error(`Unsupported chain type: ${chainConfig.type}`);
  };

  // Return unified interface
  return {
    // Chain info
    chainConfig,
    isConnected: activeHook.isConnected,
    isInitializing: activeHook.isInitializing,
    
    // Unified quest functions
    createMultiChainQuest,
    approveTokens,
    checkAllowance,
    
    // Pass through all other functions from the active hook
    ...activeHook,
  };
};
