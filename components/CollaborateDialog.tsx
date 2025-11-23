"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSignup } from "@/contexts/CreatorSignupContext";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useContract } from "@/hooks/useContract";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import apiClient from "@/lib/api";
import { CREDBUZZ_ACCOUNT } from "@/lib/constants";
import { allowedSolanaTokens, Campaign, Influencer, Token } from "@/lib/types";
import { useConnectWallet, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Loader2, Send, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

interface CollaborateDialogProps {
  influencerHandle?: string;
  children: React.ReactNode;
  mode?: "targeted" | "public";
}

export default function CollaborateDialog({
  influencerHandle,
  children,
  mode = "targeted",
}: CollaborateDialogProps) {
  // Use the Twitter database sync hook
  const {
    isAuthenticated,
    login,
    isProcessing,
    getDisplayName,
    getTwitterHandle,
  } = useTwitterDatabaseSync();

  // Get user data from UserContext
  const { user, refreshUser } = useUser();

  // Add signup context for creator temp signup
  const { fastSignup } = useSignup();

  const { wallets } = useWallets();
  const { toast } = useToast();
  const { connectWallet } = useConnectWallet({
    onSuccess: (data) => {},
    onError: (error) => {
      console.error("Error connecting wallet:", error);
    },
  });
  const {
    createTargetedCampaign,
    createPublicCampaign,
    contract,
    getERC20TokenInfo,
    approveToken,
    getTokenBalance,
  } = useContract();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add state for influencer data
  const [influencerData, setInfluencerData] = useState<Influencer | null>(null);
  const [isLoadingInfluencer, setIsLoadingInfluencer] = useState(false);

  // Add refs for managing API calls and form data
  const apiCallInProgressRef = useRef(false);
  const formDataRef = useRef<Campaign | null>(null);

  const [showAddToken, setShowAddToken] = useState(false);
  const [newTokenAddress, setNewTokenAddress] = useState("");
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [addTokenError, setAddTokenError] = useState<string | null>(null);
  const [baseTokens, setBaseTokens] = useState<Token[]>([]);

  const form = useForm<Campaign & { target_x_handle?: string }>({
    defaultValues: {
      campaign_id: "",
      owner_x_handle: "",
      influencer_x_handle: "",
      campaign_type: mode === "targeted" ? "Targeted" : "Public",
      campaign_name: "",
      description: "",
      status: "Ongoing",
      payment_token: "",
      payment_token_address: "",
      payment_token_decimals: 0,
      amount: 0,
      chain: "Base",
      offer_end_date: "",
      counter: 0,
      project_wallet: "",
      influencer_wallet: "",
      target_x_handle: "",
      is_visible: true,
    },
  });

  // Get MetaMask wallet address
  const metamaskWallet = wallets.find(
    (wallet) => wallet.walletClientType === "metamask"
  );
  const walletAddress = metamaskWallet?.address;

  // Function to handle creator temp signup (similar to CreateCampaignForm)
  const handleCreatorTempSignup = useCallback(
    async (username: string) => {
      try {
        setIsLoadingInfluencer(true);
        const userId = await fastSignup(username);

        if (userId) {
          // Fetch the newly created influencer data
          const response = await apiClient.get("/user/list-influencers");
          const influencers = response.data.result;

          // Use consistent comparison logic with fetchOrCreateInfluencer
          const cleanUsername = username.toLowerCase().trim();
          const newInfluencer = influencers.find(
            (inf: Influencer) =>
              inf.x_handle?.toLowerCase().trim() === cleanUsername
          );

          if (newInfluencer) {
            setInfluencerData(newInfluencer);
          }
        }
      } catch (error) {
        console.error("Error signing up creator:", error);
        toast({
          title: "Error",
          description: "Failed to add influencer to platform",
        });
      } finally {
        setIsLoadingInfluencer(false);
      }
    },
    [fastSignup, toast]
  );

  // Function to fetch or create influencer
  const fetchOrCreateInfluencer = useCallback(async () => {
    if (!influencerHandle) return;

    setIsLoadingInfluencer(true);
    try {
      // First, try to fetch existing influencers
      const response = await apiClient.get("/user/list-influencers");
      const influencers = response.data.result;

      // Normalize the handle for consistent comparison
      const cleanHandle = influencerHandle.toLowerCase().trim();

      const existingInfluencer = influencers.find(
        (inf: Influencer) => inf.x_handle?.toLowerCase().trim() === cleanHandle
      );

      if (existingInfluencer) {
        setInfluencerData(existingInfluencer);
      } else {
        // Influencer doesn't exist, create them
        await handleCreatorTempSignup(cleanHandle);
      }
    } catch (error) {
      console.error("Error fetching influencers:", error);
      toast({
        title: "Error",
        description: "Failed to load influencer data",
      });
    } finally {
      setIsLoadingInfluencer(false);
    }
  }, [influencerHandle, handleCreatorTempSignup, toast]);

  // Fetch influencer data when dialog opens and user is authenticated
  useEffect(() => {
    if (open && isAuthenticated && !isProcessing) {
      fetchOrCreateInfluencer();
    }
  }, [open, isAuthenticated, isProcessing]);

  // Update business wallet address when MetaMask wallet is connected
  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      form.setValue("project_wallet", walletAddress);
    }
  }, [isAuthenticated, walletAddress, form]);

  // Update X account when user is authenticated
  useEffect(() => {
    const twitterHandle = getTwitterHandle();
    if (twitterHandle) {
      form.setValue("owner_x_handle", twitterHandle);
    }
  }, [user, getTwitterHandle, form]);

  // Check if wallet is connected
  const isWalletConnected = isAuthenticated && walletAddress;

  // Watch the chain value to determine available tokens
  const selectedChain = form.watch("chain");

  // Get available tokens based on selected chain
  const getAvailableTokens = () => {
    if (selectedChain === "Solana") {
      return allowedSolanaTokens;
    } else {
      return baseTokens;
    }
  };

  // Get current datetime in the correct format for datetime-local inputs
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert datetime-local string to Unix timestamp
  const convertToTimestamp = (datetimeLocal: string): number => {
    if (!datetimeLocal) return 0;
    return Math.floor(new Date(datetimeLocal).getTime() / 1000);
  };

  const onSubmit = async (data: Campaign & { target_x_handle?: string }) => {
    // Set influencer wallet address if not already set
    const influencerWalletAddr = influencerData?.evm_wallet || CREDBUZZ_ACCOUNT;

    // Validate required fields with specific error messages
    const missingFields = [];

    if (mode === "targeted" && !influencerWalletAddr) {
      missingFields.push("Influencer wallet address");
    }
    if (!data.amount || data.amount <= 0) {
      missingFields.push("Token amount");
    }
    if (!data.offer_end_date) {
      missingFields.push("Offer end date");
    }
    if (!data.payment_token_address) {
      missingFields.push("Payment token");
    }
    if (!data.campaign_name) {
      missingFields.push("Campaign name");
    }
    if (!data.description) {
      missingFields.push("Campaign description");
    }
    if (mode === "public" && !data.target_x_handle) {
      missingFields.push("Target X handle");
    }

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
      });
      return;
    }

    if (mode === "targeted" && !influencerData) {
      toast({
        title: "Error",
        description: "Influencer data not loaded. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);

    // Update form data with correct influencer wallet address for targeted campaigns
    const campaignType = mode === "targeted" ? "Targeted" : "Public";
    const updatedData = {
      ...data,
      influencer_wallet:
        mode === "targeted" ? influencerWalletAddr : CREDBUZZ_ACCOUNT,
      campaign_type: campaignType,
      status: "Ongoing",
      influencer_x_handle: mode === "targeted" ? influencerHandle : undefined,
      target_x_handle:
        mode === "targeted" ? influencerHandle : data.target_x_handle,
      description: data.description,
    } as Campaign;

    formDataRef.current = updatedData;

    try {
      // Find selected token for decimals
      const availableTokens = getAvailableTokens();
      const selectedToken = availableTokens.find(
        (token) => token.address === data.payment_token_address
      );
      const decimals = selectedToken?.decimals;

      if (!decimals) {
        toast({
          title: "Error",
          description: "Invalid token selected",
        });
        return;
      }

      // Convert amount to wei
      const amountInWei = Number(
        ethers.parseUnits(data.amount?.toString() || "0", decimals)
      );

      // 1. Check balance first
      const balance = await getTokenBalance(data.payment_token_address || "");
      if (balance < amountInWei) {
        toast({
          title: "Insufficient balance",
          description: `You need ${amountInWei / 10 ** decimals} ${
            selectedToken?.symbol
          } tokens but only have ${Number(balance) / 10 ** decimals} ${
            selectedToken?.symbol
          } tokens. Please get more tokens before creating the campaign.`,
        });
        return;
      }

      // 2. Approve tokens for contract
      await approveToken(data.payment_token_address || "", amountInWei);

      // 3. Create campaign on blockchain
      await (mode === "targeted"
        ? createTargetedCampaign(
            influencerWalletAddr,
            amountInWei,
            convertToTimestamp(data.offer_end_date),
            data.payment_token_address || ""
          )
        : createPublicCampaign(
            convertToTimestamp(data.offer_end_date),
            amountInWei,
            data.payment_token_address || ""
          ));
    } catch (error) {
      console.error("Error creating campaign:", error);
      setIsSubmitting(false);
    }
  };

  // Handle campaign created event from contract
  const handleCampaignCreated = async (campaignId: string) => {
    try {
      if (!formDataRef.current) return;

      const data = formDataRef.current;

      // Build request body to match API schema exactly
      const requestBody = {
        campaign_id: campaignId,
        owner_x_handle: data.owner_x_handle?.replace("@", ""),
        influencer_x_handle: data.influencer_x_handle?.replace("@", ""),
        target_x_handle: data.target_x_handle?.replace("@", ""),
        campaign_type: data.campaign_type,
        campaign_name: data.campaign_name,
        description: data.description,
        status: "Ongoing",
        payment_token: data.payment_token,
        payment_token_address: data.payment_token_address,
        payment_token_decimals: data.payment_token_decimals,
        amount: data.amount,
        chain: data.chain,
        offer_end_date: data.offer_end_date,
        counter: data.chain === "Solana" ? data.counter : null,
        project_wallet: data.project_wallet,
        influencer_wallet: data.influencer_wallet ?? CREDBUZZ_ACCOUNT,
        is_visible: data.is_visible,
      };

      // Make API call to save campaign in database
      const response = await apiClient.post(
        "/campaign/create-campaign",
        requestBody
      );

      if (response.status === 201) {
        toast({
          title: "Success",
          description: "Campaign created successfully!",
        });
        setOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to save campaign in database",
        });
      }
    } catch (error) {
      console.error("API Error:", error);
      toast({
        title: "Error",
        description:
          "Campaign created on blockchain but failed to save in database",
      });
    } finally {
      setIsSubmitting(false);
      apiCallInProgressRef.current = false;
    }
  };

  // Update the event handling section
  useEffect(() => {
    if (!contract) return;

    const handleTargetedCampaignEvent = (campaignId: string) => {
      if (apiCallInProgressRef.current) return;
      apiCallInProgressRef.current = true;
      handleCampaignCreated(campaignId);
    };

    const handlePublicCampaignEvent = (campaignId: string) => {
      if (apiCallInProgressRef.current) return;
      apiCallInProgressRef.current = true;
      handleCampaignCreated(campaignId);
    };

    // Listen for both campaign creation events
    contract.on("TargetedCampaignCreated", handleTargetedCampaignEvent);
    contract.on("PublicCampaignCreated", handlePublicCampaignEvent);

    return () => {
      // Clean up both event listeners
      contract.off("TargetedCampaignCreated", handleTargetedCampaignEvent);
      contract.off("PublicCampaignCreated", handlePublicCampaignEvent);
      apiCallInProgressRef.current = false;
    };
  }, [contract]);

  // Update formDataRef when form data changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      formDataRef.current = data as Campaign;
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    refreshUser();
  }, []);

  // Handle connect wallet button click
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Fetch tokens from backend when dialog opens
  useEffect(() => {
    if (open) {
      apiClient.get("/campaign/list-payment-tokens").then((res) => {
        const tokens = res.data;
        // Map backend tokens to Token type
        setBaseTokens(
          tokens.map((t: any) => ({
            value: t.token_symbol,
            address: t.token_address,
            symbol: t.token_symbol,
            decimals: t.token_decimals,
          }))
        );
      });
    }
  }, [open]);

  const handleFetchAndAddToken = async () => {
    setIsFetchingToken(true);
    setAddTokenError(null);
    try {
      const { symbol, decimals } = await getERC20TokenInfo(newTokenAddress);
      const decimalsNum =
        typeof decimals === "bigint" ? Number(decimals) : decimals;
      if (!symbol || decimalsNum === undefined)
        throw new Error("Token info not found");
      await apiClient.post("/campaign/add-payment-token", {
        token_symbol: symbol,
        token_address: newTokenAddress,
        token_decimals: decimalsNum,
        first_used_by: user?.x_handle,
      });
      // Add to local list and select
      const newToken: Token = {
        value: symbol,
        address: newTokenAddress,
        symbol,
        decimals: decimalsNum,
      };
      setBaseTokens((prev) => [...prev, newToken]);
      form.setValue("payment_token", symbol);
      form.setValue("payment_token_address", newTokenAddress);
      form.setValue("payment_token_decimals", decimalsNum);
      setShowAddToken(false);
      setNewTokenAddress("");
      toast({ title: "Token added!", description: `${symbol} added to list.` });
    } catch (err: any) {
      setAddTokenError(
        "Could not fetch token info or add token. Please check the address."
      );
      toast({
        title: "Error",
        description: err.message || "Failed to add token",
      });
    } finally {
      setIsFetchingToken(false);
    }
  };

  // Authentication Connection UI Component
  const AuthConnectionUI = () => (
    <div className="text-center py-8 space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-accent-brand"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-100">
          Connect Your X Account
        </h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          You need to connect your X account to create campaigns and collaborate
          with influencers.
        </p>
      </div>
      <div className="space-y-3">
        <button
          onClick={login}
          disabled={isProcessing}
          className="btn-primarynew flex items-center justify-center gap-2 min-w-[160px] w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up account...
            </>
          ) : (
            <>
              Connect
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Account
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondarynew inline-flex items-center justify-center min-w-[160px] w-full"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // Wallet Connection UI Component
  const WalletConnectionUI = () => (
    <div className="text-center py-8 space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center">
          <Wallet className="w-8 h-8 text-accent-brand" />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-gray-100">
          Connect Your Wallet
        </h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Welcome, {getDisplayName()}! Now connect your MetaMask wallet to
          create campaigns.
        </p>
      </div>
      <div className="space-y-3">
        <Button
          onClick={handleConnectWallet}
          className="bg-accent-brand hover:bg-[#00C080] text-gray-900 font-medium h-10 px-6 w-full"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          className="border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-gray-200 h-10 w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  // Loading UI Component
  const LoadingUI = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brand mx-auto mb-4"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  // Also update the form to ensure default values are set properly
  useEffect(() => {
    if (influencerData) {
      // Set influencer wallet address when influencer data is loaded
      form.setValue(
        "influencer_wallet",
        influencerData.evm_wallet || CREDBUZZ_ACCOUNT
      );
      form.setValue("influencer_x_handle", influencerData.x_handle || "");
    }
  }, [influencerData, form]);

  // Set default dates when form loads
  useEffect(() => {
    if (!form.getValues("offer_end_date")) {
      // Set default to 24 hours from now as ISO string
      const defaultEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      form.setValue("offer_end_date", defaultEndTime.toISOString());
    }
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-900 border-gray-600 text-gray-100 shadow-2xl">
        <DialogHeader className="space-y-3 pb-6 border-b border-gray-700">
          <DialogTitle className="text-2xl font-bold text-gray-100">
            Create New Campaign
          </DialogTitle>
          <p className="text-sm text-gray-400 leading-relaxed">
            {!isAuthenticated
              ? "Loading..."
              : !isAuthenticated
              ? "Connect your X account to create campaigns"
              : !isWalletConnected
              ? "Connect your MetaMask wallet to proceed"
              : mode === "targeted"
              ? isLoadingInfluencer
                ? "Setting up influencer account..."
                : "Fill in the details below to create a new KOL promotion campaign"
              : "Fill in the details below to create a new public campaign"}
          </p>
        </DialogHeader>

        {!isAuthenticated || (mode === "targeted" && isLoadingInfluencer) ? (
          <LoadingUI />
        ) : !isAuthenticated ? (
          <AuthConnectionUI />
        ) : !isWalletConnected ? (
          <WalletConnectionUI />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Show target X handle field only for public campaigns */}
              {mode === "public" && (
                <FormField
                  control={form.control}
                  name="target_x_handle"
                  rules={{
                    required: "Target X handle is required",
                    pattern: {
                      value: /^@?[a-zA-Z0-9_]{1,15}$/,
                      message: "Please enter a valid X handle",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 text-sm font-medium">
                        Target X Handle
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="@handle"
                          className="bg-neutral-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9"
                          onChange={(e) => {
                            // Ensure handle starts with @
                            let value = e.target.value;
                            if (value && !value.startsWith("@")) {
                              value = "@" + value;
                            }
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              )}

              {/* Campaign Name */}
              <FormField
                control={form.control}
                name="campaign_name"
                rules={{ required: "Campaign name is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm font-medium">
                      Campaign Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter campaign name"
                        className="bg-neutral-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe your collaboration opportunity..."
                        className="bg-neutral-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand min-h-[80px] resize-none"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Offer End Date */}
              <FormField
                control={form.control}
                name="offer_end_date"
                rules={{ required: "Offer end date is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm font-medium">
                      Offer Ends
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="datetime-local"
                        className="bg-neutral-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[1] [&::-webkit-calendar-picker-indicator]:hover:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                        min={getCurrentDateTime()}
                        onChange={(e) => {
                          // Convert to simple datetime string
                          const dateString = new Date(
                            e.target.value
                          ).toLocaleString("sv-SE"); // YYYY-MM-DD HH:mm:ss format
                          field.onChange(dateString);
                        }}
                        value={
                          field.value && field.value !== ""
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />

              {/* Chain Selection */}
              {/* <FormField
                control={form.control}
                name="chain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm font-medium">
                      Blockchain
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Reset token fields when chain changes
                        form.setValue("token", "");
                        form.setValue("token_address", "");
                        form.setValue("token_decimals", 0);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-neutral-800 border-gray-600 text-gray-100 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9">
                          <SelectValue placeholder="Select blockchain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="Base"
                          className="text-gray-100 focus:bg-gray-700 focus:text-gray-100"
                        >
                          Base
                        </SelectItem>
                        <SelectItem
                          value="Solana"
                          className="text-gray-100 focus:bg-gray-700 focus:text-gray-100"
                          disabled
                        >
                          Solana
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              /> */}

              {/* Payment Token and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="payment_token"
                  rules={{ required: "Please select a payment token" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 text-sm font-medium">
                        Payment Token
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          if (value === "add_new_token") {
                            setShowAddToken(true);
                            form.setValue("payment_token", "");
                            form.setValue("payment_token_address", "");
                            form.setValue("payment_token_decimals", 0);
                          } else {
                            setShowAddToken(false);
                            field.onChange(value);
                            // Find the selected token and set address and decimals
                            const availableTokens = getAvailableTokens();
                            const selectedToken = availableTokens.find(
                              (token) => token.value === value
                            );
                            if (selectedToken) {
                              form.setValue(
                                "payment_token_address",
                                selectedToken.address
                              );
                              form.setValue(
                                "payment_token_decimals",
                                selectedToken.decimals
                              );
                            }
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-neutral-800 border-gray-600 text-gray-100 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {getAvailableTokens().map((token) => (
                            <SelectItem
                              key={token.value}
                              value={token.value}
                              className="text-gray-100 focus:bg-gray-700 focus:text-gray-100"
                            >
                              {token.symbol}
                            </SelectItem>
                          ))}
                          <SelectItem
                            value="add_new_token"
                            className="text-gray-100"
                          >
                            Add new token...
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {showAddToken && (
                        <div className="mt-2 space-y-2">
                          <Input
                            placeholder="Enter ERC20 token address"
                            value={newTokenAddress}
                            onChange={(e) => setNewTokenAddress(e.target.value)}
                            className="bg-neutral-800 border-gray-600 text-gray-100"
                          />
                          <Button
                            type="button"
                            onClick={handleFetchAndAddToken}
                            disabled={isFetchingToken || !newTokenAddress}
                            className="bg-accent-brand hover:bg-[#00C080] text-gray-900"
                          >
                            {isFetchingToken
                              ? "Fetching..."
                              : "Fetch & Add Token"}
                          </Button>
                          {addTokenError && (
                            <div className="text-red-400 text-xs">
                              {addTokenError}
                            </div>
                          )}
                        </div>
                      )}
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  rules={{
                    required: "Token amount is required",
                    min: { value: 0.0001, message: "Minimum amount is 0.0001" },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300 text-sm font-medium">
                        Token Amount
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          placeholder="0.0001"
                          className="bg-neutral-800 border-gray-600 text-gray-100 placeholder:text-gray-500 focus:border-accent-brand focus:ring-1 focus:ring-accent-brand h-9"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            field.onChange(value || 0.0001);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-gray-200 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting || (mode === "targeted" && !influencerData)
                  }
                  className="bg-accent-brand hover:bg-[#00C080] text-gray-900 font-medium h-9 px-6"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
