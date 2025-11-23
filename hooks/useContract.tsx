import { useToast } from "@/hooks/use-toast";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import IERC20Abi from "../abis/IERC20.json";
import MarketplaceAbi from "../abis/Marketplace.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const GAS_LIMIT = 6666660;

export const useContract = () => {
  const { toast } = useToast();
  const { ready, wallets } = useWallets();
  const [contract, setContract] = useState<ethers.Contract | null>(null);
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
        CONTRACT_ADDRESS,
        MarketplaceAbi,
        contractSigner
      );
      setContract(contractInstance);

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
      if (wallets.length > 0) {
        const provider = await wallets[0].getEthereumProvider();
        setWalletProvider(new ethers.BrowserProvider(provider));
      }
    };
    getProvider();
  }, [ready, wallets]);

  useEffect(() => {
    if (walletProvider && ready) {
      initContract();
    }
  }, [walletProvider]);

  // Campaign Functions
  const getTokenBalance = async (tokenAddress: string) => {
    try {
      if (!walletProvider) throw new Error("Wallet provider not initialized");
      const contractSigner = await walletProvider.getSigner();
      const signerAddress = await contractSigner.getAddress();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20Abi,
        contractSigner
      );
      return await tokenContract.balanceOf(signerAddress);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      throw error;
    }
  };

  const createTargetedCampaign = async (
    selectedKol: string,
    offeringAmount: number,
    offerEndsIn: number,
    tokenAddress: string
  ) => {
    if (!selectedKol || !offeringAmount || !offerEndsIn || !tokenAddress) {
      toast({
        title: "All fields are required",
        description: "Please fill all the fields to create a campaign",
      });
      return;
    }

    try {
      if (!contract) throw new Error("Contract not initialized");

      // Check token balance first
      const balance = await getTokenBalance(tokenAddress);
      if (balance < offeringAmount) {
        toast({
          title: "Insufficient balance",
          description: `You need ${offeringAmount} tokens but only have ${balance} tokens`,
        });
        return;
      }

      const tx = await contract.createTargetedCampaign(
        selectedKol,
        offeringAmount,
        offerEndsIn,
        tokenAddress,
        { gasLimit: GAS_LIMIT }
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw error;
    }
  };

  const createPublicCampaign = async (
    offerEndsIn: number,
    poolAmount: number,
    tokenAddress: string
  ) => {
    if (!offerEndsIn || !poolAmount || !tokenAddress) {
      toast({
        title: "All fields are required",
        description: "Please fill all the fields to create an open campaign",
      });
      return;
    }

    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.createPublicCampaign(
        offerEndsIn,
        poolAmount,
        tokenAddress,
        { gasLimit: GAS_LIMIT }
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error creating public campaign:", error);
      throw error;
    }
  };

  const updateTargetedCampaign = async (
    campaignId: string,
    selectedKol: string,
    offerEndsIn: number,
    newAmountOffered: number
  ) => {
    if (!campaignId || !selectedKol || !newAmountOffered || !offerEndsIn) {
      toast({
        title: "All fields are required",
        description: "Please fill all the fields to update a campaign",
      });
      return;
    }
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.updateTargetedCampaign(
        campaignId,
        selectedKol,
        offerEndsIn,
        newAmountOffered,
        { gasLimit: GAS_LIMIT }
      );
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error updating campaign:", error);
      throw error;
    }
  };

  const fulfilTargetedCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: "Campaign ID is required",
        description: "Please provide a campaign ID to fulfill",
      });
      return;
    }
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.fulfilTargetedCampaign(campaignId, {
        gasLimit: GAS_LIMIT,
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error fulfilling campaign:", error);
      throw error;
    }
  };

  const discardTargetedCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: "Campaign ID is required",
        description: "Please provide a campaign ID to discard",
      });
      return;
    }
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.discardTargetedCampaign(campaignId, {
        gasLimit: GAS_LIMIT,
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error discarding campaign:", error);
      throw error;
    }
  };

  const completePublicCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: "Campaign ID is required",
        description: "Please provide a campaign ID to complete",
      });
      return;
    }
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.completePublicCampaign(campaignId, {
        gasLimit: GAS_LIMIT,
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error completing public campaign:", error);
      throw error;
    }
  };

  const discardPublicCampaign = async (campaignId: string) => {
    if (!campaignId) {
      toast({
        title: "Campaign ID is required",
        description: "Please provide a campaign ID to discard",
      });
      return;
    }
    try {
      if (!contract) throw new Error("Contract not initialized");
      const tx = await contract.discardPublicCampaign(campaignId, {
        gasLimit: GAS_LIMIT,
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error discarding public campaign:", error);
      throw error;
    }
  };

  // Getter functions
  const getTargetedCampaignsPaginated = async (
    offset: number,
    limit: number
  ) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getTargetedCampaignsPaginated(offset, limit);
    } catch (error) {
      console.error("Error getting targeted campaigns:", error);
      throw error;
    }
  };

  const getUserTargetedCampaigns = async (userAddress: string) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getUserTargetedCampaigns(userAddress);
    } catch (error) {
      console.error("Error getting user targeted campaigns:", error);
      throw error;
    }
  };

  const getTargetedCampaignInfo = async (campaignId: string) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getTargetedCampaignInfo(campaignId);
    } catch (error) {
      console.error("Error getting targeted campaign info:", error);
      throw error;
    }
  };

  const getPublicCampaignsPaginated = async (offset: number, limit: number) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getPublicCampaignsPaginated(offset, limit);
    } catch (error) {
      console.error("Error getting public campaigns:", error);
      throw error;
    }
  };

  const getUserPublicCampaigns = async (userAddress: string) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getUserPublicCampaigns(userAddress);
    } catch (error) {
      console.error("Error getting user public campaigns:", error);
      throw error;
    }
  };

  const getPublicCampaignInfo = async (campaignId: string) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      return await contract.getPublicCampaignInfo(campaignId);
    } catch (error) {
      console.error("Error getting public campaign info:", error);
      throw error;
    }
  };

  const getERC20TokenInfo = async (tokenAddress: string) => {
    try {
      if (!walletProvider) throw new Error("Wallet provider not initialized");
      const contractSigner = await walletProvider.getSigner();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20Abi,
        contractSigner
      );
      const [name, symbol, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
      ]);
      return { name, symbol, decimals };
    } catch (error) {
      console.error("Error fetching token info:", error);
      throw error;
    }
  };

  const approveToken = async (tokenAddress: string, amount: number) => {
    try {
      if (!walletProvider) throw new Error("Wallet provider not initialized");
      const contractSigner = await walletProvider.getSigner();
      const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20Abi,
        contractSigner
      );

      const currentAllowance = await tokenContract.allowance(
        contractSigner.getAddress(),
        CONTRACT_ADDRESS
      );

      if (currentAllowance >= amount) {
        return;
      }

      const tx = await tokenContract.approve(CONTRACT_ADDRESS, amount);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  };

  return {
    contract,
    isConnected,
    isInitializing,
    walletProvider,
    // Contract initialization
    initContract,
    // Campaign Functions
    createTargetedCampaign,
    createPublicCampaign,
    updateTargetedCampaign,
    fulfilTargetedCampaign,
    discardTargetedCampaign,
    completePublicCampaign,
    discardPublicCampaign,
    // Getter Functions
    getTargetedCampaignsPaginated,
    getUserTargetedCampaigns,
    getTargetedCampaignInfo,
    getPublicCampaignsPaginated,
    getUserPublicCampaigns,
    getPublicCampaignInfo,
    // Token Functions
    approveToken,
    getERC20TokenInfo,
    getTokenBalance,
  };
};
