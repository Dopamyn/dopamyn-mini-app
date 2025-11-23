import { useToast } from "@/hooks/use-toast";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import IERC20Abi from "../abis/IERC20.json";
import QuestManagerAbi from "../abis/QuestManager.json";
import { getChainConfig } from "@/lib/chain-config";

export const useBaseQuestManager = () => {
  const chainConfig = getChainConfig("base-mainnet");
  const { toast } = useToast();
  const { ready, wallets } = useWallets();
  const [questContract, setQuestContract] = useState<ethers.Contract | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [walletProvider, setWalletProvider] =
    useState<ethers.BrowserProvider | null>(null);

  const initContract = async () => {
    try {
      if (!walletProvider) {
        console.warn("Provider not found for base chain.");
        return;
      }
      setIsInitializing(true);

      const contractSigner = await walletProvider?.getSigner();

      const contractInstance = new ethers.Contract(
        chainConfig.questContract.address,
        QuestManagerAbi,
        contractSigner
      );
      setQuestContract(contractInstance);

      setIsConnected(true);
    } catch (error) {
      console.error("Error initializing contract:", error);
      setIsConnected(false);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    const getProvider = async () => {
      if (ready && wallets.length > 0) {
        try {
          const provider = await wallets[0].getEthereumProvider();
          const browserProvider = new ethers.BrowserProvider(provider);
          // Set a slower polling interval to avoid rate-limiting issues.
          browserProvider.pollingInterval = 15000;
          setWalletProvider(browserProvider);
        } catch (error) {
          console.error("Error setting up wallet provider:", error);
          setWalletProvider(null);
        }
      } else {
        setWalletProvider(null);
      }
    };
    getProvider();
  }, [ready, wallets]);

  useEffect(() => {
    if (walletProvider) {
      initContract();
    }
  }, [walletProvider]);

  const approveTokens = async (
    tokenAddress: string,
    amount: bigint,
    onStepChange: (
      step: string,
      status: "processing" | "success" | "error",
      message?: string
    ) => void
  ) => {
    try {
      if (!walletProvider) throw new Error("Wallet provider not initialized");
      const contractSigner = await walletProvider.getSigner();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20Abi,
        contractSigner
      );

      // If allowance is already sufficient, skip approval gracefully
      try {
        const currentAllowance: bigint = await tokenContract.allowance(
          await contractSigner.getAddress(),
          chainConfig.questContract.address
        );
        if (currentAllowance >= amount) {
          onStepChange(
            "Approving payment...",
            "success",
            "Token allowance already sufficient."
          );
          return;
        }
      } catch (allowErr) {
        // Non-fatal: continue with approval attempt
        console.warn("Allowance check failed, proceeding to approve:", allowErr);
      }

      onStepChange(
        "Approving payment...",
        "processing",
        "Please approve the token allowance in your wallet."
      );
      const approveTx = await tokenContract.approve(
        chainConfig.questContract.address,
        amount,
        // { gasLimit: chainConfig.gasLimit }
      );
      onStepChange(
        "Approving payment...",
        "processing",
        "Waiting for approval confirmation..."
      );
      await approveTx.wait();
      onStepChange("Approving payment...", "success", "Token approval successful!");
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        onStepChange("Approving payment...", "error", "Transaction rejected by user.");
        throw new Error("Approval rejected");
      }
      console.error("Approval failed:", error);
      onStepChange(
        "Approving payment...",
        "error",
        "Token approval failed. Please try again."
      );
      throw new Error("Approval failed");
    }
  };

  const createQuest = async (
    questId: string,
    tokenAddress: string,
    amount: bigint,
    deadline: bigint,
    maxWinners: bigint,
    onStepChange: (
      step: string,
      status: "processing" | "success" | "error",
      message?: string
    ) => void
  ) => {
    try {
      if (!questContract) throw new Error("Contract not initialized");
      onStepChange(
        "Create Campaign",
        "processing",
        "Please confirm the transaction to create the campaign."
      );
      const tx = await questContract.createQuest(
        questId,
        tokenAddress,
        amount,
        deadline,
        maxWinners
        // { gasLimit: bufferedGasLimit }
      );
      onStepChange(
        "Create Campaign",
        "processing",
        "Waiting for campaign creation confirmation..."
      );
      await tx.wait();
      onStepChange("Create Campaign", "success", "Campaign created successfully!");
      return { txHash: tx.hash };
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        onStepChange("Create Campaign", "error", "Transaction rejected by user.");
        throw new Error("Transaction rejected by user");
      }
      onStepChange(
        "Create Campaign",
        "error",
        "Campaign creation failed. Please try again."
      );
      throw new Error("Creation failed");
    }
  };

  const checkAllowance = async (tokenAddress: string, amount: bigint) => {
    try {
      if (!walletProvider) throw new Error("Wallet provider not initialized");
      const contractSigner = await walletProvider.getSigner();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20Abi,
        contractSigner
      );
      const currentAllowance = await tokenContract.allowance(
        await contractSigner.getAddress(),
        chainConfig.questContract.address
      );
      return currentAllowance >= amount;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  };

  return {
    questContract,
    isConnected,
    isInitializing,
    walletProvider,
    chainConfig,
    // Contract initialization
    initContract,
    // Quest Functions
    approveTokens,
    createQuest,
    checkAllowance,
  };
};
