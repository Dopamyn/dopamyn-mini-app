"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  createDraft,
  getDraft,
  updateDraft,
  deleteDraft,
  QuestFormData,
} from "@/lib/draftManager";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";

import { AddTaskModal } from "@/app/components/campaigns/AddTaskModal";
import {
  Step,
  TransactionModal,
} from "@/app/components/campaigns/TransactionModal";
import EnhancedWalletManager from "@/app/components/campaigns/EnhancedWalletManager";
import KolListBuilder from "@/components/KolListBuilder";
import { SuccessPopup } from "@/components/SuccessPopup";
import { PromotionalBanner, InlinePromoBadge } from "@/components/PromotionalBanner";
import { toast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMultiChainQuest } from "@/hooks/useMultiChainQuest";
import { ChainSelector } from "@/app/components/campaigns/ChainSelector";
import { getDefaultChain, getAvailableChains } from "@/lib/chain-config";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { TASK_TYPES } from "@/lib/types";
import { getTemplateById } from "@/lib/questTemplates";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConnectWallet, useWallets, useLogout } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import {
  ArrowRight,
  Award,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Gift,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
  Check,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
import { CreateQuestResult } from "@/lib/solana-types";
import { format, addDays, startOfDay, endOfDay, set, isValid, parseISO, formatISO } from "date-fns";
import { 
  SERVICE_FEE_PERCENT, 
  MIN_REWARD_POOL, 
  MIN_REWARD_PER_WINNER,
  calculateServiceFee,
  calculateTotalWithFee,
  getServiceFeeLabel
} from "@/lib/constants";

// ERC20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Interface for KOL data
interface SelectedKOL {
  handle: string;
  amount: number;
}

// Format a Date to "YYYY-MM-DDTHH:mm" in UTC time for <input type="datetime-local">
const formatUTCForDatetimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIsoUtcString = (date: Date): string => {
  return date.toISOString();
};

const formatDateToLocalInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getMinEndDate = (startDateIsoUtc: string | undefined): string => {
  if (!startDateIsoUtc) {
    return toIsoUtcString(new Date());
  }
  const start = new Date(startDateIsoUtc);
  start.setUTCMinutes(start.getUTCMinutes() + 1);
  return toIsoUtcString(start);
};

// Helper function to get the current time for comparison
const getCurrentTime = (): Date => {
  return new Date();
};

// Helper function to validate end date is after start date
const isEndDateValid = (
  startDate: string | undefined,
  endDate: string | undefined
): boolean => {
  if (!startDate || !endDate) return true;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end > start;
};

// Schema definitions
const questCriteriaSchema = z.object({
  quest_id: z.string().optional(),
  criteria: z.enum(["min_followers", "min_smart_followers"]),
});

const taskSchema = z
  .object({
    task_id: z.string().optional(),
    task_follow_handle: z.string().optional(),
    task_type: z.enum(["follow", "tweet", "retweet", "reply", "quote_tweet"], {
      required_error: "Task type is required",
    }),
    task_tweet_id: z.string().optional(),
    task_tweet_cashtag: z.string().optional(),
    task_tweet_hashtag: z.string().optional(),
    task_tweet_handle: z.string().optional(),
    task_tweet_website: z.string().optional(),
    task_count: z.number().optional(),
    task_description: z.string().optional(),
    task_image_required: z.boolean().optional(),
    criteria: z.array(questCriteriaSchema).optional(),
  })
  .refine(
    (data) => {
      if (data.task_type === "follow") {
        return (
          data.task_follow_handle && data.task_follow_handle.trim().length > 0
        );
      } else if (
        data.task_type === "tweet" &&
        data.task_image_required === true
      ) {
        return (
          typeof data.task_description === "string" &&
          data.task_description.trim().length > 0
        );
      } else if (data.task_type === "tweet" && data.task_tweet_hashtag) {
        return (
          data.task_tweet_hashtag && data.task_tweet_hashtag.trim().length > 0
        );
      } else if (data.task_type === "tweet" && data.task_tweet_cashtag) {
        return (
          data.task_tweet_cashtag && data.task_tweet_cashtag.trim().length > 0
        );
      } else if (data.task_type === "tweet" && data.task_tweet_handle) {
        return (
          data.task_tweet_handle && data.task_tweet_handle.trim().length > 0
        );
      } else if (data.task_type === "tweet" && data.task_tweet_website) {
        return (
          data.task_tweet_website && data.task_tweet_website.trim().length > 0
        );
      } else if (
        data.task_type === "retweet" ||
        data.task_type === "reply" ||
        data.task_type === "quote_tweet"
      ) {
        return data.task_tweet_id && data.task_tweet_id.trim().length > 0;
      }

      // Default case - if task type is not recognized, return false
      return false;
    },
    {
      message: "Task details are required based on task type",
      path: ["task_type"],
    }
  );

const formSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title must be less than 100 characters"),
    blockchain: z.enum(["base", "solana"]).default("base"),
    creator_x_handle: z
      .string()
      .min(1, "Creator's X handle is required")
      .refine(
        (handle) => handle.startsWith("@") || handle.includes("@"),
        "Please include @ symbol in the handle"
      ),
    reward_pool: z.coerce
      .number()
      .min(0.2, "Reward pool must be at least $0.2")
      .max(1000000, "Reward pool cannot exceed $1,000,000")
      .default(1),
    total_users_to_reward: z.coerce
      .number()
      .min(1, "Must reward at least one user")
      .max(10000, "Cannot reward more than 10,000 users"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    tasks: z
      .array(taskSchema)
      .min(1, "At least one task is required")
      .max(20, "Cannot have more than 20 tasks"),
    criteria: z.array(questCriteriaSchema).optional(),
    reward_system: z.enum(["first_come", "raffle", "custom"]),
    kolListFile: z.any().optional(),
    kolListData: z
      .array(
        z.object({
          handle: z.string(),
          amount: z.number(),
          profile_image_url: z.string().optional(),
          name: z.string().optional(),
        })
      )
      .optional(),
    eligibility_type: z.enum(["filters", "kol_list"]).optional(),
    is_raffle: z.boolean().default(false).optional(),
    min_followers: z
      .number()
      .min(0)
      .max(10000000, "Follower count cannot exceed 10M")
      .optional(),
    min_smart_followers: z
      .number()
      .min(0)
      .max(10000000, "Smart follower count cannot exceed 10M")
      .optional(),
    is_smart_account: z.boolean().default(false).optional(),
    is_verified_account: z.boolean().default(false).optional(),
    eligibleKolListFile: z.any().optional(),
    eligibleKolListData: z.array(
      z.union([
        z.string(),
        z.object({
          handle: z.string(),
          profile_image_url: z.string().optional(),
          name: z.string().optional(),
        })
      ])
    ).optional(),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      path: ["end_date"],
      message: "End date must be after start date",
    }
  )
  .refine(
    (data) => {
      if (data.reward_system === "custom" && data.kolListData) {
        const totalKolAmount = data.kolListData.reduce(
          (sum, kol) => sum + kol.amount,
          0
        );
        return Math.abs(totalKolAmount - data.reward_pool) < 0.01; // Allow small floating point differences
      }
      return true;
    },
    {
      path: ["reward_pool"],
      message: "Reward pool must match the total amount in the KOL list",
    }
  )
  .refine(
    (data) => {
      if (data.reward_system === "custom" && data.kolListData) {
        return data.total_users_to_reward === data.kolListData.length;
      }
      return true;
    },
    {
      path: ["total_users_to_reward"],
      message:
        "Total users to reward must match the number of KOLs in the list",
    }
  )
  .refine(
    (data) => {
      // For first_come and raffle: check reward per winner
      if (
        (data.reward_system === "first_come" ||
          data.reward_system === "raffle") &&
        data.reward_pool > 0 &&
        data.total_users_to_reward > 0
      ) {
        const rewardPerWinner = data.reward_pool / data.total_users_to_reward;
        return rewardPerWinner >= MIN_REWARD_PER_WINNER;
      }
      // For custom: check each KOL's amount
      if (data.reward_system === "custom" && data.kolListData) {
        return data.kolListData.every(
          (kol) => kol.amount >= MIN_REWARD_PER_WINNER
        );
      }
      return true;
    },
    {
      path: ["reward_pool"],
      message: `Reward per winner must be at least $${MIN_REWARD_PER_WINNER}`,
    }
  );

// Helper Components
const IconWrapper = ({
  icon: Icon,
  className = "",
}: {
  icon: any;
  className?: string;
}) => (
  <div
    className={`flex-shrink-0 w-12 h-12 rounded-full bg-muted border border-border flex items-center justify-center ${className}`}
  >
    <Icon className="w-6 h-6 text-muted-foreground" />
  </div>
);

const Card = ({
  children,
  className = "",
  isMobile = false,
}: {
  children: React.ReactNode;
  className?: string;
  isMobile?: boolean;
}) => (
  <div
    className={`rounded-lg bg-dark-secondary border border-dark-alpha-tertiary ${
      isMobile ? "p-4" : "p-6"
    } ${className}`}
  >
    {children}
  </div>
);

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full bg-muted hover:bg-accent"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// KOL Action Button Components for consistency
const KolActionButton = ({
  onClick,
  icon: Icon,
  children,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    onClick={onClick}
    variant="outline"
    className="flex items-center justify-center gap-2 border-dark-secondary hover:border-light-primary hover:bg-light-primary/10"
  >
    <Icon className="w-4 h-4" />
    {children}
  </Button>
);

const KolActionButtons = ({
  onDopeListsClick,
  onCustomKolsClick,
  onUploadCsvClick,
}: {
  onDopeListsClick: () => void;
  onCustomKolsClick: () => void;
  onUploadCsvClick: () => void;
}) => (
  <div className="flex flex-col sm:flex-row gap-3">
    <KolActionButton onClick={onDopeListsClick} icon={Users}>
      DOPE KOL Lists
    </KolActionButton>
    <KolActionButton onClick={onCustomKolsClick} icon={Users}>
      Add Custom KOLs
    </KolActionButton>
    <KolActionButton onClick={onUploadCsvClick} icon={UploadCloud}>
      Upload CSV
    </KolActionButton>
  </div>
);

// KOL Table Components
const KolTableContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-dark-alpha-secondary rounded-lg border border-dark-secondary overflow-hidden">
    <div className="max-h-[300px] overflow-y-auto">{children}</div>
  </div>
);

const KolTableEmpty = () => (
  <div className="p-8 text-center text-light-tertiary">
    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
    <p className="text-sm">No KOLs added yet</p>
  </div>
);

const KolTableFooter = ({ 
  children 
}: { 
  children: React.ReactNode 
}) => (
  <div className="bg-dark-alpha-tertiary p-3 border-t border-dark-secondary">
    {children}
  </div>
);

// Stepper Component
const Stepper = ({
  currentStep,
  setCurrentStep,
  isMobile = false,
}: {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isMobile?: boolean;
}) => {
  const steps = [
    { 
      number: 1, 
      title: "Campaign Details", 
      shortTitle: "Details",
      icon: FileUp 
    },
    { 
      number: 2, 
      title: "Rewards & Eligibility", 
      shortTitle: "Rewards",
      icon: Award 
    },
    { 
      number: 3, 
      title: "Preview & Publish", 
      shortTitle: "Publish",
      icon: CheckCircle2 
    },
  ];

  return (
    <nav aria-label="Progress" className="w-full max-w-3xl mx-auto px-4">
      <div className="flex items-start justify-between relative">
        {steps.map((step, index) => (
          <div key={step.title} className="flex flex-1 last:flex-none">
            <div className="flex flex-col items-center relative z-10">
              <button
                onClick={() => setCurrentStep(step.number)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                  currentStep >= step.number
                    ? "bg-[#FF8080] text-white shadow-[#FF8080]/20"
                    : "bg-[#1E2025] text-[#6B7280] border border-[#2D313A] hover:border-[#FF8080]/50 hover:text-[#FF8080]"
                }`}
              >
                {step.number}
              </button>
              <span
                className={`absolute top-11 w-32 text-center text-xs font-medium transition-colors duration-300 ${
                  currentStep >= step.number
                    ? "text-[#FF8080]"
                    : "text-[#6B7280]"
                }`}
              >
                {isMobile ? step.shortTitle : step.title}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-[1px] mt-[18px] mx-2 bg-[#2D313A] relative overflow-hidden">
                <div 
                  className={`h-full bg-[#FF8080] transition-all duration-500 ease-out ${
                    currentStep > step.number ? "w-full" : "w-0"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Spacer to account for the absolute positioned labels */}
      <div className="h-10" />
    </nav>
  );
};

function CreateCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const { isAuthenticated, user, dbUser, login } = useTwitterDatabaseSync();

  // Track if user has selected a reward system for Step 2 UX
  const [hasSelectedRewardSystem, setHasSelectedRewardSystem] = useState(false);

  // Chain selection state
  const [selectedChainId, setSelectedChainId] = useState(getDefaultChain().id);

  // Multi-chain quest hook
  const {
    chainConfig,
    isConnected: isQuestConnected,
    isInitializing,
    createMultiChainQuest: createQuestUnified,
    approveTokens,
    checkAllowance,
    questContract,
    walletProvider,
    connectWallet: connectQuestWallet,
    ensureInitialized,
  } = useMultiChainQuest(selectedChainId);

  const { wallets } = useWallets();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { logout } = useLogout();
  // Detect connected wallet types
  const evmWallet = wallets.find((w) => w.type === "ethereum");
  const solanaWallet = solanaWallets.find(
    (w) => w.address !== undefined && w.address !== null
  );

  // Check if appropriate wallet is connected for selected chain
  const isAppropriateWalletConnected = () => {
    if (chainConfig.type === "EVM") {
      return !!evmWallet;
    } else if (chainConfig.type === "SOLANA") {
      return !!solanaWallet;
    }
    return false;
  };

  const isWalletConnected = wallets.length > 0;
  const [walletBalances, setWalletBalances] = useState<{
    usdc_balance: number;
    native_balance: number;
    chain: string;
    native_token: string;
  } | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isBaseNetwork, setIsBaseNetwork] = useState(false);
  const [currentNetworkName, setCurrentNetworkName] = useState<string>("");

  // KOL creation dialog state
  const [isKolDialogOpen, setIsKolDialogOpen] = useState(false);
  const [isEligibilityKolDialogOpen, setIsEligibilityKolDialogOpen] =
    useState(false);

  // Bulk operations states for custom KOL list
  const [selectedKolHandles, setSelectedKolHandles] = useState<Set<string>>(new Set());
  const [bulkAmount, setBulkAmount] = useState<string>("");
  const [kolAmountInputs, setKolAmountInputs] = useState<{ [key: string]: string }>({});

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState<Step[]>([
    { title: "Saving your campaign...", status: "pending", message: "~10 seconds" },
    { title: "Approving payment...", status: "pending", message: "Confirm in wallet (~30 seconds)" },
    { title: "Launching campaign...", status: "pending", message: "Confirm in wallet (~30 seconds)" },
    { title: "Finalizing...", status: "pending", message: "~5 seconds" },
    { title: "🎉 Your campaign is live!", status: "pending" },
  ]);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [createdQuestId, setCreatedQuestId] = useState<string | null>(null);

  const handleCloseModal = () => {
    setIsTransactionModalOpen(false);
    // Reset submission state if user closes modal mid-transaction
    if (isSubmitting) {
      setIsSubmitting(false);
    }
    setTransactionError(null);
    // It's good practice to reset the steps for the next time the modal opens
    setTransactionSteps([
      { title: "Approve Token", status: "pending" },
      { title: "Create Campaign", status: "pending" },
    ]);
  };

  // Minimum time tracking for real-time updates
  const [minEndTime, setMinEndTime] = useState<string>("");

  const { connectWallet } = useConnectWallet({
    onSuccess: () => {
      setIsConnectingWallet(false);
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been connected successfully!",
      });
    },
    onError: (error) => {
      setIsConnectingWallet(false);
      console.error("Error connecting wallet:", error);

      // More specific error messages
      let errorMessage = "Failed to connect wallet. Please try again.";
      if (error.toString().includes("generic_connect_wallet_error")) {
        errorMessage =
          "Phantom wallet connection failed. Please check:\n1. Phantom is unlocked\n2. Phantom is on Devnet\n3. Browser allows popups";
      } else if (error.toString().includes("User rejected")) {
        errorMessage = "Connection was cancelled. Please try again.";
      }

      toast({
        title: "Connection Error",
        description: errorMessage,
      });
    },
  });
  // const connectWallet = async () => {
  //   console.log("Wallet connection temporarily disabled");
  //   setIsConnectingWallet(false);
  // };

  // Note: With Privy, network switching is handled by Privy's UI
  // Users can connect their Solana wallet through Privy, which handles all network configurations

  // Simplified wallet connection - now handled by EnhancedWalletManager
  const handleConnectWallet = async () => {
    // This function is now mainly for backward compatibility
    // The actual wallet connection is handled by EnhancedWalletManager
    connectQuestWallet();
  };

  // Note: Balance fetching is now handled by EnhancedWalletManager component

  // Function to check if connected to Base network
  const checkBaseNetwork = useCallback(async () => {
    if (!isWalletConnected || !walletProvider) {
      setIsBaseNetwork(false);
      setCurrentNetworkName("");
      return;
    }

    try {
      const network = await walletProvider.getNetwork();
      const isBase = network.chainId === BigInt(8453); // Base mainnet chainId
      setIsBaseNetwork(isBase);

      // Get network name for display
      if (isBase) {
        setCurrentNetworkName("Base");
      } else {
        // Try to get network name from common chain IDs
        const chainId = Number(network.chainId);
        switch (chainId) {
          case 1:
            setCurrentNetworkName("Ethereum Mainnet");
            break;
          case 11155111:
            setCurrentNetworkName("Sepolia Testnet");
            break;
          case 84532:
            setCurrentNetworkName("Base Sepolia Testnet");
            break;
          default:
            setCurrentNetworkName(`Chain ID ${chainId}`);
        }
      }
    } catch (error) {
      console.error("Error checking network:", error);
      setIsBaseNetwork(false);
      setCurrentNetworkName("");
    }
  }, [isWalletConnected, walletProvider]);

  // Function to switch to Base network
  const switchToBaseNetwork = async (
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!isWalletConnected) return;
    if (e) {
      e.preventDefault();
    }

    await wallets[0].switchChain(8453);
  };

  // Add refs for managing form data
  const formDataRef = useRef<z.infer<typeof formSchema> | null>(null);
  // Track the last draftIdParam we processed to prevent duplicate draft creation
  const lastProcessedDraftIdRef = useRef<string | null>(null);

  // Check network when wallet provider changes
  useEffect(() => {
    checkBaseNetwork();
  }, [checkBaseNetwork]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      blockchain: "base",
      creator_x_handle: "",
      reward_pool: 10,
      total_users_to_reward: 1,
      start_date: new Date().toISOString(), // Current time
      end_date: addDays(new Date(), 3).toISOString(), // 3 days from now
      tasks: [],
      reward_system: "" as any, // Start with no selection for better UX
      kolListFile: null,
      kolListData: [],
      eligibility_type: "filters",
      is_raffle: false,
      min_followers: 0,
      min_smart_followers: 0,
      is_smart_account: false,
      is_verified_account: false,
      eligibleKolListFile: null,
      eligibleKolListData: [],
    },
  });

  // Check authentication and redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a quest.",
      });
      return;
    }
  }, [isAuthenticated, router]);

  // Set creator_x_handle when user is authenticated
  useEffect(() => {
    if (isAuthenticated && dbUser?.x_handle) {
      // Ensure the handle includes @ symbol for validation
      const handle = dbUser.x_handle.startsWith("@")
        ? dbUser.x_handle
        : `@${dbUser.x_handle}`;
      form.setValue("creator_x_handle", handle);
    }
  }, [isAuthenticated, dbUser?.x_handle, form]);

  // Set start_date to current time and end_date to 3 days later when component mounts
  useEffect(() => {
    const currentTimeUTC = toIsoUtcString(new Date());
    const currentStart = form.getValues("start_date");
    const currentEnd = form.getValues("end_date");
    
    // Only set if not already set or invalid
    if (!currentStart || !isValid(new Date(currentStart))) {
    form.setValue("start_date", currentTimeUTC);
    }
    
    // Set end_date to 3 days later if not already set or invalid
    if (!currentEnd || !isValid(new Date(currentEnd))) {
      const threeDaysLater = addDays(new Date(), 3);
      form.setValue("end_date", toIsoUtcString(threeDaysLater));
    }

    // Initialize minimum end time
    const startDate = form.getValues("start_date") || currentTimeUTC;
    setMinEndTime(getMinEndDate(startDate));
  }, [form]);

  // Auto-clear end date if it becomes invalid when start date changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "start_date" && value.start_date && value.end_date) {
        if (!isEndDateValid(value.start_date, value.end_date)) {
          form.setValue("end_date", "");
        }
      }

      // Update minimum end time when start date changes
      if (name === "start_date") {
        setMinEndTime(getMinEndDate(value.start_date));
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  // Update minimum end time when start date changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentStartDate = form.getValues("start_date");
      setMinEndTime(getMinEndDate(currentStartDate));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [form]);

  // Update formDataRef when form data changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      formDataRef.current = data as z.infer<typeof formSchema>;
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Auto-save draft hook
  useAutoSaveDraft({
    draftId: currentDraftId,
    getFormData: () => {
      const formValues = form.getValues();
      // Convert form values to QuestFormData format
      return {
        title: formValues.title || "",
        blockchain: formValues.blockchain || "base",
        creator_x_handle: formValues.creator_x_handle || "",
        reward_pool: formValues.reward_pool || 1,
        total_users_to_reward: formValues.total_users_to_reward || 1,
        start_date: formValues.start_date || "",
        end_date: formValues.end_date || "",
        tasks: formValues.tasks || [],
        criteria: formValues.criteria,
        reward_system: formValues.reward_system || ("" as any), // Keep empty if not selected
        kolListData: formValues.kolListData || [],
        eligibility_type: formValues.eligibility_type || "filters",
        is_raffle: formValues.is_raffle || false,
        min_followers: formValues.min_followers,
        min_smart_followers: formValues.min_smart_followers,
        is_smart_account: formValues.is_smart_account || false,
        is_verified_account: formValues.is_verified_account || false,
        eligibleKolListData: formValues.eligibleKolListData || [],
      } as QuestFormData;
    },
    getCurrentStep: () => currentStep,
    getChainId: () => selectedChainId,
    enabled: !!currentDraftId && !isSubmitting,
  });

  // Helper function to map blockchain name to chain ID
  // Prefers available chains (e.g., solana-devnet if available over solana-mainnet)
  const getChainIdFromBlockchain = (blockchain: string): string => {
    const blockchainLower = blockchain.toLowerCase();
    const availableChains = getAvailableChains();
    
    // For Solana, check which Solana chain is available
    if (blockchainLower === "solana") {
      // Prefer devnet if available, otherwise mainnet
      const solanaDevnet = availableChains.find(c => c.id === "solana-devnet");
      if (solanaDevnet) return "solana-devnet";
      const solanaMainnet = availableChains.find(c => c.id === "solana-mainnet");
      if (solanaMainnet) return "solana-mainnet";
    }
    
    // For other blockchains, use standard mapping
    const blockchainMap: Record<string, string> = {
      base: "base-mainnet",
      ethereum: "ethereum-mainnet",
      polygon: "polygon-mainnet",
    };
    
    const mappedChainId = blockchainMap[blockchainLower];
    if (mappedChainId) {
      // Verify the chain is available
      const availableChain = availableChains.find(c => c.id === mappedChainId);
      if (availableChain) return mappedChainId;
    }
    
    // Fallback to default chain
    return getDefaultChain().id;
  };

  // Load template or draft from URL params on mount
  useEffect(() => {
    const templateIdParam = searchParams.get("templateId");
    const draftIdParam = searchParams.get("draftId");

    // Handle template loading first (templates take precedence over drafts)
    if (templateIdParam) {
      // Prevent duplicate template loading
      if (lastProcessedDraftIdRef.current === templateIdParam) {
        return; // Already processed this template
      }

      const template = getTemplateById(templateIdParam);
      if (template) {
        // Create a new draft for the template
        const newDraftId = createDraft();
        setCurrentDraftId(newDraftId);
        setCurrentStep(1);
        lastProcessedDraftIdRef.current = templateIdParam;

        // Map blockchain to chain ID and set it
        const chainId = getChainIdFromBlockchain(
          template.data.blockchain || "base"
        );
        setSelectedChainId(chainId);

        // Load form data from template
        const templateData = template.data;
        form.reset({
          title: templateData.title || "",
          blockchain: templateData.blockchain || "base",
          creator_x_handle: templateData.creator_x_handle || "",
          reward_pool: templateData.reward_pool || 1,
          total_users_to_reward: templateData.total_users_to_reward || 1,
          start_date: templateData.start_date || toIsoUtcString(new Date()),
          end_date: templateData.end_date || toIsoUtcString(addDays(new Date(), 3)),
          tasks: templateData.tasks || [],
          criteria: templateData.criteria,
          reward_system: templateData.reward_system || ("" as any),
          kolListData: templateData.kolListData || [],
          eligibility_type: templateData.eligibility_type || "filters",
          is_raffle: templateData.is_raffle || false,
          min_followers: templateData.min_followers,
          min_smart_followers: templateData.min_smart_followers,
          is_smart_account: templateData.is_smart_account || false,
          is_verified_account: templateData.is_verified_account || false,
          eligibleKolListData: templateData.eligibleKolListData || [],
          kolListFile: null,
          eligibleKolListFile: null,
        });
        return; // Exit early, template loaded
      } else {
        console.error(`Template ${templateIdParam} not found`);
      }
    }

    // Only initialize once if we don't have a current draft ID
    if (currentDraftId && currentDraftId === draftIdParam) {
      return; // Already loaded this draft
    }

    // Prevent duplicate draft creation - if we've already processed this draftIdParam, skip
    // Use a special marker for "no draftIdParam" to track when we've created a new draft
    const processedKey = draftIdParam || "__NEW_DRAFT__";
    if (lastProcessedDraftIdRef.current === processedKey) {
      return; // Already processed this draftIdParam, don't create duplicate
    }

    if (draftIdParam) {
      const draft = getDraft(draftIdParam);
      if (draft) {
        setCurrentDraftId(draftIdParam);
        setCurrentStep(draft.currentStep);
        lastProcessedDraftIdRef.current = draftIdParam;

        // Load form data from draft
        const draftFormData = draft.formData;
        
        // Restore chain selection - use stored chainId if available, otherwise derive from blockchain
        const blockchain = draftFormData.blockchain || "base";
        const chainId = draft.chainId || getChainIdFromBlockchain(blockchain);
        setSelectedChainId(chainId);
        
        form.reset({
          title: draftFormData.title || "",
          blockchain: blockchain,
          creator_x_handle: draftFormData.creator_x_handle || "",
          reward_pool: draftFormData.reward_pool || 1,
          total_users_to_reward: draftFormData.total_users_to_reward || 1,
          start_date: draftFormData.start_date || toIsoUtcString(new Date()),
          end_date: draftFormData.end_date || toIsoUtcString(addDays(new Date(), 3)),
          tasks: draftFormData.tasks || [],
          criteria: draftFormData.criteria,
          reward_system: draftFormData.reward_system || ("" as any),
          kolListData: draftFormData.kolListData || [],
          eligibility_type: draftFormData.eligibility_type || "filters",
          is_raffle: draftFormData.is_raffle || false,
          min_followers: draftFormData.min_followers,
          min_smart_followers: draftFormData.min_smart_followers,
          is_smart_account: draftFormData.is_smart_account || false,
          is_verified_account: draftFormData.is_verified_account || false,
          eligibleKolListData: draftFormData.eligibleKolListData || [],
          kolListFile: null, // Files can't be restored from localStorage
          eligibleKolListFile: null, // Files can't be restored from localStorage
        });
      } else {
        console.error(`Draft ${draftIdParam} not found`);
        // Create a new draft if the specified one doesn't exist
        const newDraftId = createDraft();
        setCurrentDraftId(newDraftId);
        setCurrentStep(1);
        lastProcessedDraftIdRef.current = draftIdParam;
      }
    } else if (!currentDraftId) {
      // No draft ID in URL and no current draft, create a new draft
      const draftId = createDraft();
      setCurrentDraftId(draftId);
      setCurrentStep(1);
      lastProcessedDraftIdRef.current = "__NEW_DRAFT__";
      // Reset form to defaults
      const creatorHandle = dbUser?.x_handle
        ? dbUser.x_handle.startsWith("@")
          ? dbUser.x_handle
          : `@${dbUser.x_handle}`
        : "";
      form.reset({
        title: "",
        blockchain: "base",
        creator_x_handle: creatorHandle,
        reward_pool: 1,
        total_users_to_reward: 1,
        start_date: toIsoUtcString(new Date()),
        end_date: toIsoUtcString(addDays(new Date(), 3)),
        tasks: [],
        reward_system: "" as any, // Start with no selection for better UX
        kolListFile: null,
        kolListData: [],
        eligibility_type: "filters",
        is_raffle: false,
        min_followers: 0,
        min_smart_followers: 0,
        is_smart_account: false,
        is_verified_account: false,
        eligibleKolListFile: null,
        eligibleKolListData: [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, dbUser?.x_handle]);

  // Check if reward system is already selected when navigating to Step 2
  useEffect(() => {
    if (currentStep === 2) {
      const rewardSystem = form.watch("reward_system");
      // If reward system is already set (from draft/template), show the config panel
      if (rewardSystem) {
        setHasSelectedRewardSystem(true);
      } else {
        setHasSelectedRewardSystem(false);
      }
    }
  }, [currentStep, form]);

  // Function to manually save draft
  const handleSaveDraft = () => {
    let draftIdToUse = currentDraftId;

    if (!draftIdToUse) {
      // Create a new draft if one doesn't exist
      draftIdToUse = createDraft();
      setCurrentDraftId(draftIdToUse);
    }

    try {
      const formValues = form.getValues();
      const formData: QuestFormData = {
        title: formValues.title || "",
        blockchain: formValues.blockchain || "base",
        creator_x_handle: formValues.creator_x_handle || "",
        reward_pool: formValues.reward_pool || 1,
        total_users_to_reward: formValues.total_users_to_reward || 1,
        start_date: formValues.start_date || "",
        end_date: formValues.end_date || "",
        tasks: formValues.tasks || [],
        criteria: formValues.criteria,
        reward_system: formValues.reward_system || ("" as any), // Keep empty if not selected
        kolListData: formValues.kolListData || [],
        eligibility_type: formValues.eligibility_type || "filters",
        is_raffle: formValues.is_raffle || false,
        min_followers: formValues.min_followers,
        min_smart_followers: formValues.min_smart_followers,
        is_smart_account: formValues.is_smart_account || false,
        is_verified_account: formValues.is_verified_account || false,
        eligibleKolListData: formValues.eligibleKolListData || [],
      };

      updateDraft(draftIdToUse, {
        formData,
        currentStep,
        title: formData.title || "Untitled Campaign",
        chainId: selectedChainId,
      });

      // Show visual feedback
      setIsDraftSaved(true);
      setTimeout(() => {
        setIsDraftSaved(false);
      }, 2000); // Hide after 2 seconds

      toast({
        title: "Draft saved",
        description: "Your campaign draft has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error saving draft",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Note: Balance fetching is now handled by EnhancedWalletManager component
  // It fetches balances when wallet/blockchain changes and provides a manual refresh button

  const handleAddTask = (task: any) => {
    const currentTasks = form.getValues("tasks") || [];
    form.setValue("tasks", [...currentTasks, task]);
  };

  const handleEditTask = (task: any, taskIndex: number) => {
    const currentTasks = form.getValues("tasks") || [];
    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = task;
    form.setValue("tasks", updatedTasks);
    setEditingTaskIndex(null);
  };

  const handleRemoveTask = (taskIndex: number) => {
    const currentTasks = form.getValues("tasks") || [];
    form.setValue(
      "tasks",
      currentTasks.filter((_, i) => i !== taskIndex)
    );
  };

  // Bulk operations for custom KOL list
  const handleSelectAllKols = () => {
    const kolList = form.watch("kolListData") || [];
    if (selectedKolHandles.size === kolList.length) {
      // Deselect all
      setSelectedKolHandles(new Set());
    } else {
      // Select all
      setSelectedKolHandles(new Set(kolList.map((kol: any) => kol.handle)));
    }
  };

  const handleToggleKolSelection = (handle: string) => {
    const newSelection = new Set(selectedKolHandles);
    if (newSelection.has(handle)) {
      newSelection.delete(handle);
    } else {
      newSelection.add(handle);
    }
    setSelectedKolHandles(newSelection);
  };

  const handleBulkDelete = () => {
    const kolList = form.watch("kolListData") || [];
    const updatedList = kolList.filter((kol: any) => !selectedKolHandles.has(kol.handle));
    form.setValue("kolListData", updatedList);
    form.setValue("total_users_to_reward", updatedList.length);
    const totalAmount = updatedList.reduce((sum: number, k: any) => sum + k.amount, 0);
          form.setValue("reward_pool", totalAmount);
    setSelectedKolHandles(new Set());

            toast({
      title: "KOLs Removed",
      description: `Successfully removed ${selectedKolHandles.size} KOL(s)`,
    });
  };

  const handleBulkUpdateAmount = () => {
    const amount = parseFloat(bulkAmount);
    if (isNaN(amount) || amount <= 0) {
            toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
            });
            return;
          }

    const kolList = form.watch("kolListData") || [];
    const updatedList = kolList.map((kol: any) => {
      if (selectedKolHandles.has(kol.handle)) {
        return { ...kol, amount };
      }
      return kol;
    });
    
    form.setValue("kolListData", updatedList);
    const totalAmount = updatedList.reduce((sum: number, k: any) => sum + k.amount, 0);
          form.setValue("reward_pool", totalAmount);
    form.trigger("reward_pool");
    setBulkAmount("");

      toast({
      title: "Amounts Updated",
      description: `Successfully updated ${selectedKolHandles.size} KOL(s) to $${amount} each`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Double-check minimum reward per winner validation (should already be caught by form.trigger, but safety net)
    if (
      values.reward_system === "first_come" ||
      values.reward_system === "raffle"
    ) {
      if (values.reward_pool > 0 && values.total_users_to_reward > 0) {
        const rewardPerWinner =
          values.reward_pool / values.total_users_to_reward;
        if (rewardPerWinner < MIN_REWARD_PER_WINNER) {
          toast({
            title: "Validation Error",
            description: `Reward per winner must be at least $${MIN_REWARD_PER_WINNER}. Current: $${rewardPerWinner.toFixed(
              2
            )}`,
            variant: "destructive",
          });
          return;
        }
      }
    } else if (values.reward_system === "custom" && values.kolListData) {
      const invalidKols = values.kolListData.filter(
        (kol) => kol.amount > 0 && kol.amount < MIN_REWARD_PER_WINNER
      );
      if (invalidKols.length > 0) {
        toast({
          title: "Validation Error",
          description: `${invalidKols.length} KOL(s) have rewards below the minimum of $${MIN_REWARD_PER_WINNER} per winner. Please update their amounts.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsTransactionModalOpen(true);
    setTransactionError(null);

    const selectedChain = values.blockchain;
    const isBaseChain = selectedChain === "base";

    setTransactionSteps([
      { title: "Saving your quest...", status: "pending" as const, message: "~10 seconds" },
      ...(isBaseChain
        ? [
            { title: "Approving payment...", status: "pending" as const, message: "Confirm in wallet (~30 seconds)" },
            {
              title: "Launching campaign...",
              status: "pending" as const,
              message: "Confirm in wallet (~30 seconds)"
            },
          ]
        : [
            {
              title: "Launching campaign...",
              status: "pending" as const,
              message: "Confirm in wallet (~30 seconds)"
            },
          ]),
      { title: "Finalizing...", status: "pending" as const, message: "~5 seconds" },
      { title: "🎉 Your campaign is live!", status: "pending" as const },
    ]);

    try {
      setIsSubmitting(true);
      const rewardAmount = isBaseChain
        ? ethers.parseUnits(values.reward_pool.toFixed(6), 6)
        : Math.floor(values.reward_pool * 1_000_000); // Convert to lamports for Solana
      const deadline = BigInt(
        Math.floor(new Date(values.end_date).getTime() / 1000)
      );
      const maxWinners = BigInt(values.total_users_to_reward);

      // Step 1: Create campaign in database first to get campaign ID
      setTransactionSteps((prevSteps) =>
        prevSteps.map((s) =>
          s.title === "Saving your campaign..."
            ? {
                ...s,
                status: "processing",
                message: "Creating campaign in database to get campaign ID...",
              }
            : s
        )
      );

      const apiResponse = await fetch("/api/quests/create-quest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          // Convert raffle to first_come for API but keep is_raffle flag
          reward_system:
            values.reward_system === "raffle"
              ? "first_come"
              : values.reward_system,
          is_raffle: values.reward_system === "raffle",
          status: "draft",
          blockchain: selectedChain,
          token_address: chainConfig.tokens.usdc,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(
          errorData.error || "Failed to create campaign in database"
        );
      }

      const apiData = await apiResponse.json();
      const questId = apiData.data.id;

      setTransactionSteps((prevSteps) =>
        prevSteps.map((s) =>
          s.title === "Saving your quest..."
            ? {
                ...s,
                status: "success",
                message: "Campaign created in database successfully!",
              }
            : s
        )
      );

      let txResult: CreateQuestResult;
      let txnHash: string;
      let questAccountAddress: string | undefined;

      if (isBaseChain) {
        // Step 2: Check and approve tokens for EVM chains
        const hasSufficientAllowance = await checkAllowance(
          chainConfig.tokens.usdc,
          BigInt(rewardAmount)
        );
        if (!hasSufficientAllowance) {
          await approveTokens(
            chainConfig.tokens.usdc,
            BigInt(rewardAmount),
            (step: string, status: Step["status"], message?: string) => {
              setTransactionSteps((prevSteps) =>
                prevSteps.map((s) =>
                  s.title === step ? { ...s, status, message } : s
                )
              );
            }
          );
        } else {
          setTransactionSteps((prevSteps) =>
            prevSteps.map((s) =>
              s.title === "Approving payment..."
                ? {
                    ...s,
                    status: "success",
                    message: "Token allowance already sufficient.",
                  }
                : s
            )
          );
        }

        // Step 3: Create campaign on Base blockchain
        setTransactionSteps((prevSteps) =>
          prevSteps.map((s) =>
            s.title === "Launching campaign..."
              ? {
                  ...s,
                  status: "processing",
                  message:
                    "Creating campaign on Base blockchain with database campaign ID...",
                }
              : s
          )
        );

        txResult = await createQuestUnified({
          questId, // Use the quest ID from database
          tokenAddress: chainConfig.tokens.usdc,
          amount: BigInt(rewardAmount),
          deadline,
          maxWinners: BigInt(maxWinners),
          onStepChange: (
            step: string,
            status: Step["status"],
            message?: string
          ) => {
            setTransactionSteps((prevSteps) =>
              prevSteps.map((s) =>
                s.title === step ? { ...s, status, message } : s
              )
            );
          },
        });
        txnHash = txResult.txHash;
      } else {
        // Step 2: Create campaign on Solana blockchain
        setTransactionSteps((prevSteps) =>
          prevSteps.map((s) =>
            s.title === "Launching campaign..."
              ? {
                  ...s,
                  status: "processing",
                  message:
                    "Creating campaign on Solana blockchain with database campaign ID...",
                }
              : s
          )
        );

        // Ensure Solana wallet is connected via Privy
        if (!isAppropriateWalletConnected()) {
          throw new Error(
            `${chainConfig.name} wallet not connected. Please connect via Privy.`
          );
        }

        console.log("Using wallet from Privy:", solanaWallet?.address);
        console.log("About to ensure contracts are initialized...");

        // Ensure contracts are properly initialized
        await ensureInitialized();
        console.log("Solana contracts initialization completed");

        const solanaParams = {
          questId,
          tokenMint: new PublicKey(chainConfig.tokens.usdc),
          amount: Number(rewardAmount),
          deadline: Number(deadline),
          maxWinners: Number(maxWinners),
        };

        console.log("Solana params:", solanaParams);

        txResult = await createQuestUnified({
          questId,
          tokenAddress: chainConfig.tokens.usdc,
          amount: BigInt(rewardAmount),
          deadline: BigInt(deadline),
          maxWinners: BigInt(maxWinners),
          onStepChange: (
            step: string,
            status: Step["status"],
            message?: string
          ) => {
            setTransactionSteps((prevSteps) =>
              prevSteps.map((s) =>
                s.title === step ? { ...s, status, message } : s
              )
            );
          },
        });

        console.log("MOVED ON..");
        txnHash = txResult.txHash; // Extract transaction hash from result
        questAccountAddress = txResult.questAccountAddress; // Extract quest account address

        console.log("Quest creation result:", {
          txHash: txnHash,
          questAccountAddress: questAccountAddress,
          walletUsed: solanaWallet?.address || "unknown",
        });
      }

      setTransactionSteps((prevSteps) =>
        prevSteps.map((s) =>
          s.title === "Launching campaign..."
            ? {
                ...s,
                status: "success",
                message: `Campaign created on ${selectedChain} blockchain! Waiting for confirmation and database update...`,
              }
            : s
        )
      );

      // Step 4: Update quest status in database to 'active' since we have the transaction hash
      if (txnHash) {
        setTransactionSteps((prevSteps) =>
          prevSteps.map((s) =>
            s.title === "Finalizing..."
              ? {
                  ...s,
                  status: "processing",
                  message: "Updating campaign status in database...",
                }
              : s
          )
        );

        try {
          const updatePayload: any = {
            status: "active",
            txn_hash: txnHash,
            contract_status: 1,
            blockchain: selectedChain,
          };

          // Add quest account address for Solana quests
          if (!isBaseChain && questAccountAddress) {
            updatePayload.quest_account_address = questAccountAddress;
            console.log(
              "Adding quest account address to update payload:",
              questAccountAddress
            );
          }

          const updateResponse = await fetch(`/api/quests/${questId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatePayload),
          });

          if (!updateResponse.ok) {
            console.warn("Failed to update quest status in database");
            setTransactionSteps((prevSteps) =>
              prevSteps.map((s) =>
                s.title === "Finalizing..."
                  ? {
                      ...s,
                      status: "error",
                      message: "Failed to update campaign status in database",
                    }
                  : s
              )
            );
          } else {
            setCreatedQuestId(questId);
            setTransactionSteps((prevSteps) =>
              prevSteps.map((s) =>
                s.title === "Finalizing..."
                  ? {
                      ...s,
                      status: "success",
                      message: "Campaign status updated to active in database",
                    }
                  : s
              )
            );

            // Final success step
            setTransactionSteps((prevSteps) =>
              prevSteps.map((s) =>
                s.title === "🎉 Your campaign is live!"
                  ? {
                      ...s,
                      status: "success",
                      message: `Campaign created successfully on ${selectedChain} blockchain and database updated!`,
                    }
                  : s
              )
            );

            setCreatedQuestId(questId);
            setShowSuccessPopup(true);
            setIsTransactionModalOpen(false);

            // Clean up draft after successful quest creation
            if (currentDraftId) {
              deleteDraft(currentDraftId);
              setCurrentDraftId(null);
            }
          }
        } catch (updateError) {
          console.warn("Error updating campaign status:", updateError);
          setTransactionSteps((prevSteps) =>
            prevSteps.map((s) =>
              s.title === "Finalizing..."
                ? {
                    ...s,
                    status: "error",
                    message: "Error updating campaign status in database",
                  }
                : s
            )
          );
        }
      } else {
        console.error("No transaction hash received");
      }
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      setTransactionError(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMainButtonClick = async () => {
    // Validate form - creator_x_handle should already be set correctly via useEffect
    // Ensure creator_x_handle is set before validation

    console.log("form errors:", form.formState.errors);
    if (!form.getValues("creator_x_handle") && dbUser?.x_handle) {
      const handle = dbUser.x_handle.startsWith("@")
        ? dbUser.x_handle
        : `@${dbUser.x_handle}`;
      form.setValue("creator_x_handle", handle);
    }

    const isValid = await form.trigger();
    if (!isValid) {
      // Get form errors
      const errors = form.formState.errors;
      if (errors.reward_pool) {
        toast({
          title: "Validation Error",
          description:
            errors.reward_pool.message || "Please check reward pool settings",
          variant: "destructive",
        });
      } else if (errors.kolListData) {
        toast({
          title: "Validation Error",
          description:
            errors.kolListData.message || "Please check KOL list settings",
          variant: "destructive",
        });
      } else if (errors.creator_x_handle) {
        // This shouldn't happen now, but handle it gracefully
        toast({
          title: "Validation Error",
          description: "Please ensure your X handle is set correctly",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields correctly",
          variant: "destructive",
        });
      }
      // Don't throw, just return - the toast will inform the user
      return;
    }

    // If validation passes, proceed with submission
    const values = form.getValues();
    await onSubmit(values);
  };

  // Validation for each step
  const isStep1Valid = (() => {
    const title = form.watch("title");
    const startDate = form.watch("start_date");
    const endDate = form.watch("end_date");
    const tasks = form.watch("tasks");

    // Basic field validation
    if (!title || !startDate || !endDate || !tasks || tasks.length === 0) {
      return false;
    }

    // Time validation: ensure end date is after start date
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    if (!isEndDateValid(startDate, endDate)) {
      return false;
    }

    // Date order validation
    if (!isEndDateValid(startDate, endDate)) {
      return false;
    }

    // Task validation: ensure all tasks have valid data
    const areTasksValid = tasks.every((task) => {
      if (task.task_type === "follow") {
        return (
          task.task_follow_handle && task.task_follow_handle.trim().length > 0
        );
      } else if (
        task.task_type === "retweet" ||
        task.task_type === "reply" ||
        task.task_type === "quote_tweet"
      ) {
        return task.task_tweet_id && task.task_tweet_id.trim().length > 0;
      } else if (task.task_type === "tweet") {
        // Tweet with image: require description; count not required
        if (task.task_image_required) {
          return (
            typeof task.task_description === "string" &&
            task.task_description.trim().length > 0
          );
        }

        // Other tweet tasks: require count and specific field
        if (!task.task_count || task.task_count <= 0) return false;

        if (task.task_tweet_hashtag) {
          return task.task_tweet_hashtag.trim().length > 0;
        }
        if (task.task_tweet_cashtag) {
          return task.task_tweet_cashtag.trim().length > 0;
        }
        if (task.task_tweet_handle) {
          return task.task_tweet_handle.trim().length > 0;
        }
        if (task.task_tweet_website) {
          return task.task_tweet_website.trim().length > 0;
        }
        return true;
      }
      return true;
    });

    return areTasksValid;
  })();
  const isStep2Valid = (() => {
    // First, ensure step 1 validation still passes (dates might have become invalid)
    if (!isStep1Valid) {
      return false;
    }

    // Then check step 2 specific validation (rewards + eligibility)
    const rewardsValid =
      form.watch("reward_system") &&
      (form.watch("reward_system") === "custom"
        ? form.watch("kolListData") &&
          (form.watch("kolListData")?.length || 0) > 0
        : form.watch("reward_pool") > 0 &&
          form.watch("total_users_to_reward") > 0);

    if (!rewardsValid) return false;

    // Check minimum reward per winner validation
    const rewardSystem = form.watch("reward_system");
    if (rewardSystem === "first_come" || rewardSystem === "raffle") {
      const rewardPool = form.watch("reward_pool");
      const totalWinners = form.watch("total_users_to_reward");
      if (rewardPool > 0 && totalWinners > 0) {
        const rewardPerWinner = rewardPool / totalWinners;
        if (rewardPerWinner < MIN_REWARD_PER_WINNER) {
          return false;
        }
      }
    } else if (rewardSystem === "custom") {
      const kolListData = form.watch("kolListData") || [];
      if (kolListData.length > 0) {
        const hasInvalidAmount = kolListData.some(
          (kol: any) => kol.amount < MIN_REWARD_PER_WINNER
        );
        if (hasInvalidAmount) {
          return false;
        }
      }
    }

    // Check eligibility validation for FCFS
    if (form.watch("reward_system") === "first_come") {
      if (form.watch("eligibility_type") === "filters") {
        // Filters are optional - users can proceed without setting minimum requirements
        return true;
      }
      if (form.watch("eligibility_type") === "kol_list") {
        const eligibleCount = form.watch("eligibleKolListData")?.length || 0;
        return eligibleCount > 0;
      }
    }

    // Custom distribution doesn't need eligibility validation
    return true;
  })();

  // Check if user has sufficient balance for the quest (required validation)
  const hasSufficientBalance = (() => {
    if (!walletBalances) {
      // console.log("No wallet balances available");
      return false; // Require balance info to proceed
    }

    // Check native balance (minimum 0.001 ETH/SOL required)
    const availableNative = Number(walletBalances.native_balance);
    const hasEnoughNative = availableNative >= 0.001;

    // Check USDC balance for quest rewards (required)
    if (form.watch("reward_pool") <= 0) return hasEnoughNative; // Only native required if no USDC needed

    const requiredUSDC = form.watch("reward_pool");
    const availableUSDC = Number(walletBalances.usdc_balance);
    const hasEnoughUSDC = availableUSDC >= requiredUSDC;

    // console.log("USDC balance check:", {
    //   availableUSDC,
    //   requiredUSDC,
    //   hasEnoughUSDC,
    // });

    // Both balances must be sufficient to proceed
    const sufficient = hasEnoughNative && hasEnoughUSDC;
    // console.log("Final balance check result:", sufficient);
    return sufficient;
  })();

  const handleNext = () => {
    if (currentStep === 1) {
      if (isStep1Valid) {
        setCurrentStep((s) => s + 1);
      } else {
        // Provide specific feedback for time validation issues
        const startDate = form.watch("start_date");
        const endDate = form.watch("end_date");

        if (startDate && endDate) {
          if (!isEndDateValid(startDate, endDate)) {
            toast({
              title: "Invalid Date Range",
              description:
                "End date must be after start date. Please adjust your dates.",
            });
            return;
          }
        }

        // Generic validation error
        toast({
          title: "Validation Error",
          description:
            "Please complete all required fields and ensure dates are valid before continuing.",
        });
      }
    }
    if (currentStep === 2) {
      if (isStep2Valid) {
        setCurrentStep((s) => s + 1);
      } else {
        // Check if step 1 validation failed (dates became invalid)
        if (!isStep1Valid) {
          toast({
            title: "Date Validation Failed",
            description:
              "Your start or end dates have become invalid. Please return to step 1 and fix the date issues.",
          });
          setCurrentStep(1); // Force user back to step 1
          return;
        }

        // Check if reward system is not selected
        if (!form.watch("reward_system")) {
          toast({
            title: "Select Distribution Method",
            description:
              "Please select a reward distribution method (First Come First Serve, Raffle, or Custom) to continue.",
          });
          return;
        }

        // Step 2 specific validation error
        toast({
          title: "Step 2 Validation Error",
          description:
            "Please complete all required fields in rewards and eligibility before continuing.",
        });
      }
    }
    if (currentStep === 3) {
      // Handle wallet connection check for selected chain
      if (!isAppropriateWalletConnected()) {
        toast({
          title: "Wallet Required",
          description: `Please connect your ${chainConfig.name} wallet using the wallet manager above.`,
        });
        return;
      }

      // For EVM chains, check network
      if (chainConfig.type === "EVM" && !isBaseNetwork) {
        switchToBaseNetwork();
        return;
      }

      // Call handleMainButtonClick - it will handle validation and errors internally
      handleMainButtonClick().catch((error) => {
        console.error("Error in handleMainButtonClick:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      });
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => s - 1);
  };

  const getContinueButtonState = () => {
    if (currentStep === 1) return { disabled: !isStep1Valid, text: "Continue" };
    if (currentStep === 2) {
      // Show "Continue" for all reward systems now
      if (form.watch("reward_system") === "custom") {
        return { disabled: !isStep2Valid, text: "Continue" };
      }
      return { disabled: !isStep2Valid, text: "Continue" };
    }
    if (currentStep === 3) {
      // Check if appropriate wallet is connected for selected chain
      if (!isAppropriateWalletConnected()) {
        return {
          disabled: true,
          text: `Connect ${chainConfig.name} Wallet First`,
        };
      }

      // For EVM chains, check network
      if (chainConfig.type === "EVM" && !isBaseNetwork) {
        return {
          disabled: false,
          text: "Switch to Base Network",
        };
      }

      // Check if step 2 validation still passes (including minimum reward per winner)
      if (!isStep2Valid) {
        return {
          disabled: true,
          text: "Fix Validation Errors",
        };
      }

      return {
        disabled: !hasSufficientBalance || !walletBalances, // Require sufficient balances to publish
        text: "Publish Campaign",
      };
    }
    return { disabled: true, text: "Continue" };
  };

  const { disabled: isContinueDisabled, text: continueButtonText } =
    getContinueButtonState();

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="container py-8 space-y-8 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary mx-auto mb-4"></div>
            <p className="text-light-tertiary">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <div className="container py-8 space-y-8 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-light-primary mb-4">
              Authentication Required
            </h1>
            <p className="text-light-tertiary mb-6">
              You need to be logged in to create a campaign. Please connect your
              wallet and Twitter account.
            </p>
            <Button
              onClick={login}
              className="bg-light-primary text-dark-primary hover:bg-accent-secondary"
            >
              Connect Wallet & Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while user data is being fetched
  if (!dbUser?.x_handle) {
    return (
      <div className="container py-8 space-y-8 mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-light-primary mx-auto mb-4"></div>
            <p className="text-light-tertiary">Loading user data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`${
          isMobile
            ? "space-y-4 pt-8 pb-20"
            : "min-container py-12 space-y-6 sm:space-y-8"
        } mx-auto min-h-screen max-w-7xl`}
      >
        <div
          className={`${
            isMobile
              ? "py-2 space-y-4 px-4"
              : "container sm:py-8 space-y-6 sm:space-y-8 mx-auto px-4 sm:px-6"
          } ${isMobile ? "py-8" : "pt-20 sm:pt-8"}`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <a
                  href="/campaigns/create"
                  className={`inline-flex items-center text-light-tertiary hover:text-light-primary transition-colors ${
                    isMobile ? "text-xs" : "text-sm"
                  }`}
                >
                  <svg
                    className={`${isMobile ? "w-3 h-3 mr-1" : "w-4 h-4 mr-2"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  {isMobile ? "Back" : "Back to Drafts"}
                </a>
              </div>
              <h1
                className={`font-medium text-light-primary flex-1 text-center ${
                  isMobile ? "text-xl" : "text-2xl sm:text-3xl"
                }`}
              >
                Create New Campaign
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  className={`inline-flex items-center gap-2 text-accent-brand hover:text-accent-brand/80 transition-all font-medium ${
                    isMobile ? "text-xs px-2 py-1" : "text-sm px-3 py-1.5"
                  } ${isDraftSaved ? "opacity-70" : ""}`}
                  type="button"
                  disabled={isDraftSaved}
                >
                  {isDraftSaved ? (
                    <>
                      <Check
                        className={`${
                          isMobile ? "w-3 h-3" : "w-4 h-4"
                        } animate-in zoom-in-50 duration-200`}
                      />
                      <span className={isMobile ? "hidden" : ""}>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className={`${isMobile ? "w-3 h-3" : "w-4 h-4"}`} />
                      <span className={isMobile ? "hidden" : ""}>
                        Save Draft
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Promotional Banner - Option 1: Top of page (always visible) */}
          <div className="max-w-4xl mx-auto mb-6">
            <PromotionalBanner
              dismissible={true}
              variant="gradient"
              size={isMobile ? "sm" : "md"}
              endDate="December 31, 2025"
            />
          </div>

          <div className={`${isMobile ? "mb-6" : "mb-12"} flex justify-center`}>
            <Stepper
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              isMobile={isMobile}
            />
          </div>

          <div className={`${isMobile ? "w-full" : "max-w-6xl"} mx-auto`}>
            <main>
              <Form {...form}>
                <form className="space-y-8">
                  {/* Step 1: Quest Details */}
                  {currentStep === 1 && (
                    <div className="space-y-8 animate-in fade-in-0 duration-500">
                      <AddTaskModal
                        isOpen={isModalOpen}
                        onClose={() => {
                          setIsModalOpen(false);
                          setEditingTaskIndex(null);
                        }}
                        onAddTask={handleAddTask}
                        editingTask={
                          editingTaskIndex !== null
                            ? form.watch("tasks")?.[editingTaskIndex]
                            : undefined
                        }
                        editingTaskIndex={editingTaskIndex ?? undefined}
                        onEditTask={handleEditTask}
                      />

                      <Card isMobile={isMobile} className="p-5 bg-gradient-to-br from-dark-primary via-dark-primary to-dark-alpha-secondary border-light-quaternary/30">
                        <div className="space-y-4">
                          {/* Quest Title and Duration - Same Row */}
                          <div className={`grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                            {/* Quest Title */}
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-light-secondary text-sm font-medium">
                                    Quest Title
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        placeholder="e.g., Help us reach 10K followers"
                                        {...field}
                                        maxLength={100}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                          }
                                        }}
                                        className="text-sm h-10 bg-dark-alpha-secondary/50 border-light-quaternary/40 focus:border-[#FF8080] transition-all"
                                      />
                                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-light-tertiary/60">
                                        {field.value?.length || 0}/100
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Duration */}
                          <div>
                              <FormLabel className="text-light-secondary text-sm font-medium mb-3 block">
                                Duration
                                  </FormLabel>
                              <DateTimeRangePicker
                                start={form.watch("start_date")}
                                end={form.watch("end_date")}
                                onStartChange={(value) => {
                                  form.setValue("start_date", value);
                                  form.trigger("end_date");
                                }}
                                onEndChange={(value) => {
                                  form.setValue("end_date", value);
                                          form.trigger("end_date");
                                        }}
                                      />
                              {/* Validation Message */}
                              {(form.formState.errors.start_date || form.formState.errors.end_date) && (
                                <p className="text-red-500 text-xs mt-1">
                                  {form.formState.errors.start_date?.message || 
                                   form.formState.errors.end_date?.message}
                                </p>
                              )}
                              {/* End Date Logic Validation */}
                              {form.watch("end_date") && !isEndDateValid(form.watch("start_date"), form.watch("end_date")) && (
                                <p className="text-red-500 text-xs mt-1">
                                  End date must be after start date
                                </p>
                              )}
                                      </div>
                          </div>

                          {/* Quest Tasks - Same Card */}
                          <div className="pt-2 border-t border-light-quaternary/20">
                            <h3 className="text-sm font-semibold mb-3 text-light-primary flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-[#FF8080]" />
                          Quest Tasks
                        </h3>
                            <div className="space-y-3">
                              {form.watch("tasks") && form.watch("tasks").length > 0 && (
                              <ul className="space-y-3">
                                {form
                                  .watch("tasks")
                                  ?.map((task: any, index: number) => {
                                    const tweetType =
                                      task.task_type === "tweet" &&
                                      task.task_tweet_hashtag
                                        ? "hashtag"
                                        : task.task_type === "tweet" &&
                                          task.task_tweet_cashtag
                                        ? "cashtag"
                                        : task.task_type === "tweet" &&
                                          task.task_tweet_handle
                                        ? "handle"
                                        : task.task_type === "tweet" &&
                                          task.task_tweet_website
                                        ? "website"
                                        : task.task_type === "tweet" &&
                                          task.task_image_required
                                        ? "image"
                                        : undefined;

                                    // For tweet types, use task_type + tweetType (e.g., "tweet_hashtag")
                                    // For simple types (follow, retweet, reply, quote_tweet), use task_type directly
                                    const taskTypeKey = tweetType 
                                      ? `${task.task_type}_${tweetType}` 
                                      : task.task_type;

                                    const taskInfo =
                                      TASK_TYPES[taskTypeKey as keyof typeof TASK_TYPES];
                                    const Icon =
                                      taskInfo?.icon || MessageSquare; // Fallback icon

                                    // Validate individual task
                                    const isTaskValid = (() => {
                                      if (task.task_type === "follow") {
                                        return (
                                          task.task_follow_handle &&
                                          task.task_follow_handle.trim()
                                            .length > 0
                                        );
                                      } else if (
                                        task.task_type === "retweet" ||
                                        task.task_type === "reply" ||
                                        task.task_type === "quote_tweet"
                                      ) {
                                        return (
                                          task.task_tweet_id &&
                                          task.task_tweet_id.trim().length > 0
                                        );
                                      } else if (task.task_type === "tweet") {
                                        // Image-required tweet: validate description only
                                        if (task.task_image_required) {
                                          return (
                                            typeof task.task_description ===
                                              "string" &&
                                            task.task_description.trim()
                                              .length > 0
                                          );
                                        }

                                        // Other tweet tasks: require count and specific field
                                        if (
                                          !task.task_count ||
                                          task.task_count <= 0
                                        )
                                          return false;

                                        if (task.task_tweet_hashtag) {
                                          return (
                                            task.task_tweet_hashtag.trim()
                                              .length > 0
                                          );
                                        }
                                        if (task.task_tweet_cashtag) {
                                          return (
                                            task.task_tweet_cashtag.trim()
                                              .length > 0
                                          );
                                        }
                                        if (task.task_tweet_handle) {
                                          return (
                                            task.task_tweet_handle.trim()
                                              .length > 0
                                          );
                                        }
                                        if (task.task_tweet_website) {
                                          return (
                                            task.task_tweet_website.trim()
                                              .length > 0
                                          );
                                        }

                                        return true;
                                      }
                                      return true;
                                    })();

                                    return (
                                      <li
                                        key={index}
                                        className={`flex items-center justify-between rounded-lg border transition-all hover:scale-[1.01] ${
                                          isMobile ? "p-2.5" : "p-3"
                                        } ${
                                          isTaskValid
                                            ? "bg-[#23262E] border-[#2D313A] hover:border-[#FF8080]/50"
                                            : "bg-red-900/20 border-red-text/40"
                                        }`}
                                      >
                                        <div
                                          className={`flex items-center ${
                                            isMobile ? "space-x-2" : "space-x-2.5"
                                          }`}
                                        >
                                          <div className={`p-1.5 rounded-md ${isTaskValid ? "bg-[#FF8080]/10" : "bg-red-500/10"}`}>
                                          <Icon
                                            className={`${
                                                isMobile ? "w-3.5 h-3.5" : "w-4 h-4"
                                            } ${
                                              isTaskValid
                                                  ? "text-[#FF8080]"
                                                : "text-red-text"
                                            }`}
                                          />
                                          </div>
                                          <div className={`flex ${isMobile ? "flex-col gap-1" : "items-center gap-2"}`}>
                                          <span
                                              className={`text-light-secondary font-medium ${
                                                isMobile ? "text-xs" : "text-sm"
                                            }`}
                                          >
                                            {taskInfo?.label || task.task_type}:
                                          </span>
                                          <span
                                            className={`font-mono text-light-primary bg-light-primary/10 rounded-md ${
                                              isMobile
                                                  ? "px-1.5 py-0.5 text-xs"
                                                  : "px-2 py-0.5 text-xs"
                                              }`}
                                            >
                                              {(() => {
                                                let primaryDetail = '';
                                                let description = task.task_description || '';

                                                if (task.task_type === "follow") {
                                                  primaryDetail = task.task_follow_handle || '';
                                                } else if (task.task_type === "retweet" || task.task_type === "reply" || task.task_type === "quote_tweet") {
                                                  primaryDetail = task.task_tweet_id ? `#${task.task_tweet_id}` : '';
                                                } else if (task.task_type === "tweet") {
                                                  if (task.task_image_required) {
                                                    primaryDetail = 'Image Post';
                                                  } else if (task.task_tweet_hashtag) {
                                                    primaryDetail = `${task.task_tweet_hashtag}`;
                                                  } else if (task.task_tweet_cashtag) {
                                                    primaryDetail = `${task.task_tweet_cashtag}`;
                                                  } else if (task.task_tweet_handle) {
                                                    primaryDetail = `@${task.task_tweet_handle}`;
                                                  } else if (task.task_tweet_website) {
                                                    primaryDetail = task.task_tweet_website;
                                                  }
                                                }

                                                const countSuffix = task.task_count && task.task_count > 1 ? ` (${task.task_count}x)` : '';

                                                if (primaryDetail) {
                                                  if (description) {
                                                    return `${primaryDetail}${countSuffix} - ${description}`;
                                                  } else {
                                                    return `${primaryDetail}${countSuffix}`;
                                                  }
                                                } else if (description) {
                                                  return description;
                                                }

                                                return 'Task details missing';
                                              })()}
                                          </span>
                                          </div>
                                          {!isTaskValid && (
                                            <span
                                              className={`text-red-500 bg-red-500/10 rounded ${
                                                isMobile
                                                  ? "text-xs px-1 py-0.5"
                                                  : "text-xs px-2 py-1"
                                              }`}
                                            >
                                              Invalid
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingTaskIndex(index);
                                              setIsModalOpen(true);
                                            }}
                                            className={`text-light-tertiary hover:text-[#FF8080] transition-all rounded-lg hover:bg-[#FF8080]/10 border border-transparent hover:border-[#FF8080]/30 ${
                                              isMobile ? "p-1.5" : "p-2"
                                            }`}
                                            title="Edit task"
                                          >
                                            <Pencil
                                              className={`${
                                                isMobile ? "w-3 h-3" : "w-3.5 h-3.5"
                                              }`}
                                            />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveTask(index)
                                            }
                                            className={`text-light-tertiary hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/30 ${
                                              isMobile ? "p-1.5" : "p-2"
                                            }`}
                                            title="Delete task"
                                          >
                                            <Trash2
                                              className={`${
                                                isMobile ? "w-3 h-3" : "w-3.5 h-3.5"
                                              }`}
                                            />
                                          </button>
                                        </div>
                                      </li>
                                    );
                                  })}
                              

                              {/* Task validation summary */}
                              {(() => {
                                const tasks = form.watch("tasks") || [];
                                const validTasks = tasks.filter((task) => {
                                  if (task.task_type === "follow") {
                                    return (
                                      task.task_follow_handle &&
                                      task.task_follow_handle.trim().length > 0
                                    );
                                  } else if (
                                    task.task_type === "retweet" ||
                                    task.task_type === "reply" ||
                                    task.task_type === "quote_tweet"
                                  ) {
                                    return (
                                      task.task_tweet_id &&
                                      task.task_tweet_id.trim().length > 0
                                    );
                                  } else if (task.task_type === "tweet") {
                                    // Image-required tweet: validate description only
                                    if (task.task_image_required) {
                                      return (
                                        typeof task.task_description ===
                                          "string" &&
                                        task.task_description.trim().length > 0
                                      );
                                    }

                                    // Other tweet tasks: require count and specific field
                                    if (
                                      !task.task_count ||
                                      task.task_count <= 0
                                    )
                                      return false;

                                    if (task.task_tweet_hashtag) {
                                      return (
                                        task.task_tweet_hashtag.trim().length >
                                        0
                                      );
                                    }
                                    if (task.task_tweet_cashtag) {
                                      return (
                                        task.task_tweet_cashtag.trim().length >
                                        0
                                      );
                                    }
                                    if (task.task_tweet_handle) {
                                      return (
                                        task.task_tweet_handle.trim().length > 0
                                      );
                                    }
                                    if (task.task_tweet_website) {
                                      return (
                                        task.task_tweet_website.trim().length >
                                        0
                                      );
                                    }

                                    return true;
                                  }
                                  return true;
                                });

                                if (validTasks.length !== tasks.length) {
                                  return (
                                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                                      <p className="text-yellow-600 text-sm">
                                        ⚠️ {tasks.length - validTasks.length}{" "}
                                        task(s) have validation issues. Please
                                        fix them to continue.
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              </ul>
                          )}
                              
                              {/* Add Task Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskIndex(null);
                              setIsModalOpen(true);
                            }}
                                className={`w-full border-2 border-dashed border-light-quaternary/40 hover:border-[#FF8080] hover:bg-[#FF8080]/5 text-light-secondary hover:text-[#FF8080] font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group ${
                                  isMobile ? "py-2.5 px-3" : "py-2.5 px-4"
                            }`}
                          >
                                <div className="p-1 rounded-md bg-[#FF8080]/10 group-hover:bg-[#FF8080]/20 transition-colors">
                            <Plus
                                    className={`${isMobile ? "w-3.5 h-3.5" : "w-4 h-4"} text-[#FF8080]`}
                            />
                                </div>
                                <span className="text-sm">
                              Add Task
                            </span>
                          </button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Step 2: Rewards & Eligibility */}
                  {currentStep === 2 && (
                    <div className="animate-in fade-in-0 duration-500">
                      <style jsx>{`
                        @keyframes slideInScale {
                          0% {
                            opacity: 0;
                            transform: translateY(20px) scale(0.95);
                          }
                          100% {
                            opacity: 1;
                            transform: translateY(0) scale(1);
                          }
                        }
                        
                        @keyframes slideFromRight {
                          0% {
                            opacity: 0;
                            transform: translateX(100px);
                          }
                          100% {
                            opacity: 1;
                            transform: translateX(0);
                          }
                        }
                        
                        @keyframes slideFromLeft {
                          0% {
                            opacity: 0;
                            transform: translateX(-50px);
                          }
                          100% {
                            opacity: 1;
                            transform: translateX(0);
                          }
                        }
                        
                        @keyframes pulseGlow {
                          0%, 100% {
                            box-shadow: 0 0 20px rgba(255, 128, 128, 0.2);
                          }
                          50% {
                            box-shadow: 0 0 30px rgba(255, 128, 128, 0.4);
                          }
                        }
                        
                        .animate-slide-in-scale {
                          animation: slideInScale 0.5s ease-out forwards;
                        }
                        
                        .animate-slide-from-right {
                          animation: slideFromRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                        
                        .animate-slide-from-left {
                          animation: slideFromLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        }
                        
                        .animate-pulse-glow {
                          animation: pulseGlow 2s ease-in-out infinite;
                        }
                      `}</style>
                      
                      {/* Initial State: 3 Column Layout (Before Selection) */}
                      {!hasSelectedRewardSystem && (
                        <div className="space-y-8">
                          <div className="text-center max-w-2xl mx-auto animate-slide-in-scale">
                            <h2 className="text-2xl font-semibold text-light-primary mb-3">
                          How do you want to distribute rewards?
                          </h2>
                          <p className="text-sm text-light-tertiary">
                            Choose a distribution method that best fits your campaign goals.
                          </p>
                      </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                          {/* First Come First Serve Option */}
                            <div
                              onClick={() => {
                                form.setValue("reward_system", "first_come");
                                setHasSelectedRewardSystem(true);
                              }}
                              className="animate-slide-in-scale"
                              style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}
                            >
                              <Card
                                isMobile={isMobile}
                                className="cursor-pointer p-6 bg-dark-secondary/30 border-dark-secondary hover:border-light-primary/50 hover:bg-dark-secondary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,128,128,0.2)] h-full"
                              >
                              <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-light-primary/10 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-light-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-light-primary mb-2">
                                    First Come First Serve
                                  </h3>
                                  <p className="text-sm text-light-tertiary">
                                    Rewards are given to the first eligible participants who complete the campaign.
                                  </p>
                                </div>
                              </div>
                              </Card>
                            </div>

                            {/* Raffle Option */}
                            <div
                              onClick={() => {
                                form.setValue("reward_system", "raffle");
                                setHasSelectedRewardSystem(true);
                              }}
                              className="animate-slide-in-scale"
                              style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}
                            >
                              <Card
                                isMobile={isMobile}
                                className="cursor-pointer p-6 bg-dark-secondary/30 border-dark-secondary hover:border-light-primary/50 hover:bg-dark-secondary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,128,128,0.2)] h-full"
                              >
                              <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-light-primary/10 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-light-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-light-primary mb-2">
                                    Raffle
                                  </h3>
                                  <p className="text-sm text-light-tertiary">
                                    Winners are randomly selected from all eligible participants after the campaign ends.
                                  </p>
                                </div>
                              </div>
                              </Card>
                            </div>

                            {/* Custom/Targeted Option */}
                            <div
                              onClick={() => {
                                form.setValue("reward_system", "custom");
                                form.setValue("reward_pool", 0);
                                form.setValue("total_users_to_reward", 0);
                                setHasSelectedRewardSystem(true);
                              }}
                              className="animate-slide-in-scale"
                              style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}
                            >
                              <Card
                                isMobile={isMobile}
                                className="cursor-pointer p-6 bg-dark-secondary/30 border-dark-secondary hover:border-light-primary/50 hover:bg-dark-secondary/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,128,128,0.2)] h-full"
                              >
                              <div className="text-center space-y-4">
                                <div className="w-16 h-16 mx-auto rounded-full bg-light-primary/10 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-light-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-light-primary mb-2">
                                    Custom/Targeted
                                  </h3>
                                  <p className="text-sm text-light-tertiary">
                                    Manually select specific users and assign them custom reward amounts.
                                  </p>
                                </div>
                              </div>
                              </Card>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* After Selection: Sidebar Layout */}
                      {hasSelectedRewardSystem && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          {/* Left Sidebar: Compact Selection */}
                          <div className="lg:col-span-4 space-y-6 animate-slide-from-left">
                        <div>
                          <h2 className="text-xl font-semibold text-light-primary mb-2">
                                Distribution Method
                          </h2>
                          <p className="text-sm text-light-tertiary">
                                You can switch methods anytime.
                          </p>
                      </div>

                        <div className="space-y-3">
                              {/* First Come First Serve - Compact */}
                          <div 
                            onClick={() => {
                              form.setValue("reward_system", "first_come");
                            }}
                            className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                              form.watch("reward_system") === "first_come" 
                                ? "bg-light-primary/10 border-light-primary shadow-[0_0_15px_rgba(255,128,128,0.15)]" 
                                : "bg-dark-secondary/30 border-dark-secondary hover:border-light-quaternary/50 hover:bg-dark-secondary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                form.watch("reward_system") === "first_come"
                                  ? "border-light-primary"
                                  : "border-light-quaternary"
                              }`}>
                      {form.watch("reward_system") === "first_come" && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-light-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium text-light-primary">First Come First Serve</h3>
                                <p className={`text-light-tertiary mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                  Rewards are given to the first eligible participants who complete the campaign.
                                </p>
                              </div>
                            </div>
                          </div>

                              {/* Raffle - Compact */}
                          <div 
                            onClick={() => {
                              form.setValue("reward_system", "raffle");
                            }}
                            className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                              form.watch("reward_system") === "raffle" 
                                ? "bg-light-primary/10 border-light-primary shadow-[0_0_15px_rgba(255,128,128,0.15)]" 
                                : "bg-dark-secondary/30 border-dark-secondary hover:border-light-quaternary/50 hover:bg-dark-secondary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                form.watch("reward_system") === "raffle"
                                  ? "border-light-primary"
                                  : "border-light-quaternary"
                              }`}>
                                {form.watch("reward_system") === "raffle" && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-light-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium text-light-primary">Raffle</h3>
                                <p className={`text-light-tertiary mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                  Winners are randomly selected from all eligible participants after the campaign ends.
                                </p>
                              </div>
                            </div>
                          </div>

                              {/* Custom/Targeted - Compact */}
                          <div 
                            onClick={() => {
                              form.setValue("reward_system", "custom");
                              form.setValue("reward_pool", 0);
                              form.setValue("total_users_to_reward", 0);
                            }}
                            className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
                              form.watch("reward_system") === "custom" 
                                ? "bg-light-primary/10 border-light-primary shadow-[0_0_15px_rgba(255,128,128,0.15)]" 
                                : "bg-dark-secondary/30 border-dark-secondary hover:border-light-quaternary/50 hover:bg-dark-secondary/50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                form.watch("reward_system") === "custom"
                                  ? "border-light-primary"
                                  : "border-light-quaternary"
                              }`}>
                                {form.watch("reward_system") === "custom" && (
                                  <div className="w-2.5 h-2.5 rounded-full bg-light-primary" />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium text-light-primary">Custom/Targeted</h3>
                                <p className={`text-light-tertiary mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                                  Manually select specific users and assign them custom reward amounts.
                                </p>
                              </div>
                            </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Configuration Panel */}
                          <div className="lg:col-span-8 animate-slide-from-right">
                            <Card 
                              isMobile={isMobile} 
                              className="p-6 bg-gradient-to-br from-dark-primary via-dark-primary to-dark-alpha-secondary h-full border-light-primary/50 animate-pulse-glow"
                            >
                          <h3 className="text-lg font-semibold mb-6 text-light-primary flex items-center gap-2">
                            {form.watch("reward_system") === "first_come" && "Configure First Come First Serve"}
                            {form.watch("reward_system") === "raffle" && "Configure Raffle"}
                            {form.watch("reward_system") === "custom" && "Configure Custom Distribution"}
                          </h3>

                          {(form.watch("reward_system") === "first_come" || form.watch("reward_system") === "raffle") && (
                            <div className="space-y-6">
                                {/* Blockchain and Token Selection Row */}
                                <div
                                  className={`grid gap-4 mb-6 ${
                                    isMobile ? "grid-cols-1" : "grid-cols-2"
                                  }`}
                                >
                            {/* Blockchain Selection */}
                            <ChainSelector
                              selectedChainId={selectedChainId}
                              onChainChange={(chainId) => {
                                setSelectedChainId(chainId);
                                // Update form blockchain value based on selected chain
                                if (chainId.includes("base")) {
                                  form.setValue("blockchain", "base");
                                } else if (chainId.includes("solana")) {
                                  form.setValue("blockchain", "solana");
                                }
                              }}
                            />

                            {/* Token Selection (Read-only for now) */}
                            <div>
                              <FormLabel className="text-light-tertiary mb-1 block text-sm">
                                Token
                              </FormLabel>
                              <div className="px-3 py-2 rounded-lg border border-dark-secondary bg-dark-alpha-secondary text-sm h-9 flex items-center">
                                <div className="flex items-center gap-2">
                                  <Image
                                    src="/usdc.svg"
                                    alt="USDC"
                                    width={16}
                                    height={16}
                                    className="flex-shrink-0"
                                  />
                                  <span className="text-light-primary font-medium text-sm">
                                    USDC
                                  </span>
                                  <span className="text-light-tertiary text-xs ml-auto">
                                    Default
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                                {/* Reward Pool and Winners Row */}
                                <div
                                  className={`grid gap-4 ${
                                    isMobile
                                      ? "grid-cols-1"
                                      : "grid-cols-2"
                                  }`}
                                >
                                  <FormField
                                    control={form.control}
                                    name="reward_pool"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-light-secondary text-sm font-medium">
                                          Reward Pool Size (USDC)
                                        </FormLabel>
                                        <FormControl>
                                          <div className="relative">
                                            <Input
                                  type="number"
                                              placeholder="e.g. 10000"
                                              value={
                                                field.value === 0 ? "" : field.value
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                const numValue =
                                                  value === ""
                                                    ? 0
                                                    : parseFloat(value) || 0;
                                                field.onChange(numValue);
                                              }}
                                              min={1}
                                              step={1}
                                              className={`h-10 bg-dark-alpha-secondary/50 border-light-quaternary/40 focus:border-[#FF8080] transition-all ${
                                                field.value <= 0
                                                  ? "border-red-text focus:border-red-text focus:ring-red-text/50"
                                                  : ""
                                              }`}
                                            />
                                            {field.value <= 0 && (
                                              <div className="absolute -bottom-5 left-0 text-xs text-red-text">
                                                Amount required (min $1)
                              </div>
                                            )}
                              </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="total_users_to_reward"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-light-secondary text-sm font-medium">
                                          Total Number of Winners
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                              type="number"
                                            placeholder="e.g. 500"
                                              value={
                                                field.value === 0 ? "" : field.value
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value;
                                                const numValue =
                                                  value === ""
                                                    ? 0
                                                    : parseInt(value) || 0;
                                                field.onChange(numValue);
                                              }}
                                              min={1}
                                            className="h-10 bg-dark-alpha-secondary/50 border-light-quaternary/40 focus:border-[#FF8080] transition-all"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                          </div>

                          {form.watch("reward_pool") > 0 &&
                            form.watch("total_users_to_reward") > 0 && (
                              <div
                                className={`rounded-lg border ${
                                  form.watch("reward_pool") /
                                    form.watch("total_users_to_reward") <
                                  MIN_REWARD_PER_WINNER
                                    ? "bg-red-text/10 border-red-text/50"
                                    : "bg-dark-alpha-secondary border-dark-secondary"
                                } p-3`}
                              >
                                <div className={`flex ${isMobile ? "flex-col gap-2" : "items-center justify-between gap-4"}`}>
                                  {/* Reward per Winner */}
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm ${
                                    form.watch("reward_pool") /
                                      form.watch("total_users_to_reward") <
                                    MIN_REWARD_PER_WINNER
                                      ? "text-red-text"
                                      : "text-light-secondary"
                                    }`}>
                                      Reward per Winner:
                                    </span>
                                  <span
                                      className={`font-bold text-base ${
                                      form.watch("reward_pool") /
                                        form.watch("total_users_to_reward") <
                                      MIN_REWARD_PER_WINNER
                                        ? "text-red-text"
                                        : "text-light-primary"
                                      }`}
                                  >
                                    $
                                    {(
                                      form.watch("reward_pool") /
                                      form.watch("total_users_to_reward")
                                    ).toFixed(2)}
                                  </span>
                                  </div>

                                  {/* Service Fee Info */}
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-light-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm text-light-secondary">
                                      Total Payable:{" "}
                                      <span className="text-light-primary font-bold">
                                        ${calculateTotalWithFee(form.watch("reward_pool")).toFixed(2)} USDC
                                      </span>
                                      <span className="text-xs text-light-tertiary ml-1">
                                        (incl. {getServiceFeeLabel()} fee)
                                      </span>
                                    </span>
                                  </div>
                                </div>
                                {form.watch("reward_pool") /
                                  form.watch("total_users_to_reward") <
                                  MIN_REWARD_PER_WINNER && (
                                  <p className="text-xs text-red-text mt-2">
                                    ⚠️ Minimum reward per winner must be at
                                    least ${MIN_REWARD_PER_WINNER}
                                  </p>
                                )}
                              </div>
                            )}
                                
                                {/* Filters / Eligibility Section (Only for FCFS/Raffle) */}
                                <div className="pt-4 border-t border-light-quaternary/20">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                    <h4 className="text-sm font-semibold text-light-primary">Eligibility</h4>
                                    
                                    {/* Main Toggle for Eligibility Type */}
                                    <div className="inline-flex min-w-fit bg-transparent border-b border-dark-quaternary self-start sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() => form.setValue("eligibility_type", "filters")}
                                        className={`relative h-8 px-4 text-sm font-medium transition-all cursor-pointer whitespace-nowrap -mb-[2px] ${
                                          form.watch("eligibility_type") === "filters"
                                            ? "text-light-alpha-secondary border-b-2 border-light-alpha-secondary"
                                            : "text-light-alpha-quaternary hover:text-white"
                                        }`}
                                      >
                                        Everyone (Filters)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => form.setValue("eligibility_type", "kol_list")}
                                        className={`relative h-8 px-4 text-sm font-medium transition-all cursor-pointer whitespace-nowrap -mb-[2px] ${
                                          form.watch("eligibility_type") === "kol_list"
                                            ? "text-light-alpha-secondary border-b-2 border-light-alpha-secondary"
                                            : "text-light-alpha-quaternary hover:text-white"
                                        }`}
                                      >
                                        Specific KOLs
                                      </button>
                              </div>
                            </div>

                                  <div className="space-y-4">
                                    {/* Option A: Filters (Only show if eligibility_type is filters) */}
                                    {form.watch("eligibility_type") === "filters" && (
                                      <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-4">
                                          <label
                                            htmlFor="minFollowers"
                                            className="flex-grow text-sm font-medium text-light-secondary"
                                          >
                                            Minimum X Account Followers
                                          </label>
                                          <input
                                          type="number"
                                            id="minFollowers"
                                            placeholder="e.g. 100"
                                            min="0"
                                            value={form.watch("min_followers") || ""}
                                            onChange={(e) =>
                                              form.setValue(
                                                "min_followers",
                                                parseInt(e.target.value) || 0
                                              )
                                            }
                                            className="w-32 h-9 px-3 text-sm bg-dark-alpha-secondary/50 border-light-quaternary/40 rounded-lg focus:border-[#FF8080] focus:outline-none transition-all"
                                />
                              </div>
                                        <div className="flex items-center gap-4">
                                          <label
                                            htmlFor="minSmartFollowers"
                                            className="flex-grow text-sm font-medium text-light-secondary"
                                          >
                                            Minimum Smart Followers
                                          </label>
                                          <input
                                          type="number"
                                            id="minSmartFollowers"
                                            placeholder="e.g. 50"
                                            min="0"
                                            value={
                                              form.watch("min_smart_followers") || ""
                                            }
                                            onChange={(e) =>
                                              form.setValue(
                                                "min_smart_followers",
                                                parseInt(e.target.value) || 0
                                              )
                                            }
                                            className="w-32 h-9 px-3 text-sm bg-dark-alpha-secondary/50 border-light-quaternary/40 rounded-lg focus:border-[#FF8080] focus:outline-none transition-all"
                                          />
                                        </div>
                                        
                                        {/* Other Filters */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="flex items-center gap-3 p-3 rounded-lg border border-dark-alpha-tertiary bg-dark-secondary">
                                            <Bot className="w-5 h-5 text-light-tertiary" />
                                            <label
                                              htmlFor="isSmartAccount"
                                              className="flex-grow text-sm font-medium text-light-secondary"
                                            >
                                              Smart Account Only
                                            </label>
                                            <Switch
                                              id="isSmartAccount"
                                              checked={
                                                form.watch("is_smart_account") || false
                                              }
                                              onCheckedChange={(checked) =>
                                                form.setValue(
                                                  "is_smart_account",
                                                  !!checked
                                                )
                                              }
                                              className="data-[state=checked]:bg-accent-brand data-[state=unchecked]:bg-dark-secondary border-light-tertiary hover:data-[state=unchecked]:bg-dark-quaternary transition-all duration-200"
                                />
                              </div>
                                          <div className="flex items-center gap-3 p-3 rounded-lg border border-dark-alpha-tertiary bg-dark-secondary">
                                            <CheckCircle2 className="w-5 h-5 text-light-tertiary" />
                                            <label
                                              htmlFor="isVerifiedAccount"
                                              className="flex-grow text-sm font-medium text-light-secondary"
                                            >
                                              Verified Account Only
                                            </label>
                                            <Switch
                                              id="isVerifiedAccount"
                                              checked={
                                                form.watch("is_verified_account") ||
                                                false
                                              }
                                              onCheckedChange={(checked) =>
                                                form.setValue(
                                                  "is_verified_account",
                                                  !!checked
                                                )
                                              }
                                              className="data-[state=checked]:bg-accent-brand data-[state=unchecked]:bg-dark-secondary border-light-tertiary hover:data-[state=unchecked]:bg-dark-quaternary transition-all duration-200"
                                            />
                            </div>
                          </div>
                          </div>
                          )}

                                    {/* Option B: KOL List (Only show if eligibility_type is kol_list) */}
                                    {form.watch("eligibility_type") === "kol_list" && (
                                      <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                        {/* KOL List Table */}
                                        {form.watch("eligibleKolListData") && (form.watch("eligibleKolListData")?.length || 0) > 0 ? (
                                          <>
                                            <div className="mb-4 flex items-center justify-between">
                                              <div>
                                                <h4 className="text-sm font-medium text-light-secondary mb-1">Eligible KOLs</h4>
                                                <p className="text-xs text-light-tertiary">Manage your eligible KOL list</p>
                                              </div>
                                              <Button
                                                type="button"
                                                onClick={() => setIsEligibilityKolDialogOpen(true)}
                                                variant="outline"
                                                size="sm"
                                                className="border-light-primary text-light-primary hover:bg-light-primary/10 flex items-center gap-2"
                                              >
                                                <Pencil className="w-4 h-4" />
                                                Edit List
                                              </Button>
                                            </div>
                                            <KolTableContainer>
                                              <table className="w-full">
                                                <thead className="bg-dark-alpha-tertiary sticky top-0">
                                                  <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-light-tertiary">Handle</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-dark-secondary/30">
                                                  {form.watch("eligibleKolListData")?.map((item: any, index: number) => {
                                                    const handle = typeof item === 'string' ? item : item.handle;
                                                    const profileImageUrl = typeof item === 'string' ? null : item.profile_image_url;
                                                    return (
                                                    <tr key={index} className="hover:bg-dark-alpha-secondary/30">
                                                        <td className="px-4 py-2 text-sm font-medium text-light-secondary">
                                                          <div className="flex items-center gap-2">
                                                            {profileImageUrl && profileImageUrl.trim() ? (
                                                              <img
                                                                src={profileImageUrl}
                                                                alt={handle}
                                                                className="w-6 h-6 rounded-full object-cover"
                                                                onError={(e) => {
                                                                  e.currentTarget.src = "/placeholder.svg?height=24&width=24";
                                                                }}
                                                              />
                                                            ) : (
                                                              <div className="w-6 h-6 rounded-full bg-dark-tertiary flex items-center justify-center text-xs text-light-tertiary">
                                                                {handle.charAt(0).toUpperCase()}
                                                              </div>
                                                            )}
                                                            <span>@{handle}</span>
                                                          </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </KolTableContainer>
                                            <KolTableFooter>
                                              <div className="flex justify-between items-center">
                                                <span className="text-sm text-light-tertiary">{form.watch("eligibleKolListData")?.length || 0} Eligible KOLs</span>
                                              </div>
                                            </KolTableFooter>
                                          </>
                                        ) : (
                                          <div className="p-8 text-center bg-dark-alpha-secondary rounded-lg border border-dark-secondary">
                                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-light-tertiary" />
                                            <p className="text-sm text-light-tertiary mb-4">No eligible KOLs added yet</p>
                                            <Button
                                              type="button"
                                              onClick={() => setIsEligibilityKolDialogOpen(true)}
                                              className="bg-light-primary hover:bg-light-primary/90 text-dark-primary"
                                            >
                                              <Users className="w-4 h-4 mr-2" />
                                              Add KOLs
                                            </Button>
                                          </div>
                                        )}
                              </div>
                                    )}
                            </div>
                          </div>
                            </div>
                      )}

                      {form.watch("reward_system") === "custom" && (
                            <div className="space-y-6">
                              {/* Blockchain and Token Selection Row */}
                          <div className={`grid gap-4 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                                <ChainSelector
                                  selectedChainId={selectedChainId}
                                  onChainChange={(chainId) => {
                                    setSelectedChainId(chainId);
                                    if (chainId.includes("base")) {
                                      form.setValue("blockchain", "base");
                                    } else if (chainId.includes("solana")) {
                                      form.setValue("blockchain", "solana");
                                    }
                                  }}
                                />
                                <div>
                                  <FormLabel className="text-light-tertiary mb-1 block text-sm">Token</FormLabel>
                                  <div className="px-3 py-2 rounded-lg border border-dark-secondary bg-dark-alpha-secondary text-sm h-9 flex items-center">
                                    <div className="flex items-center gap-2">
                                      <Image src="/usdc.svg" alt="USDC" width={16} height={16} className="flex-shrink-0" />
                                      <span className="text-light-primary font-medium text-sm">USDC</span>
                                      <span className="text-light-tertiary text-xs ml-auto">Default</span>
                                    </div>
                                  </div>
                                </div>
                          </div>

                              {/* KOL List Management */}
                              <div>
                                <div className="mb-4 flex items-center justify-between">
                                  <div>
                                    <h4 className="text-sm font-medium text-light-secondary mb-1">KOL List Details</h4>
                                    <p className="text-xs text-light-tertiary">Manage your selected KOLs and their reward amounts</p>
                                  </div>
                                  {form.watch("kolListData") && (form.watch("kolListData")?.length || 0) > 0 && (
                                    <Button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setIsKolDialogOpen(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="border-light-primary text-light-primary hover:bg-light-primary/10 flex items-center gap-2"
                                    >
                                      <Pencil className="w-4 h-4" />
                                      Edit List
                                    </Button>
                                  )}
                          </div>

                                {/* Read-Only KOL Preview Table */}
                                {form.watch("kolListData") && (form.watch("kolListData")?.length || 0) > 0 ? (
                                  <KolTableContainer>
                                    <table className="w-full">
                                      <thead className="bg-dark-alpha-tertiary sticky top-0">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-light-tertiary">Handle</th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-light-tertiary">Amount (USDC)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-dark-secondary/30">
                                        {form.watch("kolListData")?.map((kol: any, index: number) => (
                                          <tr key={index} className="hover:bg-dark-alpha-secondary/30">
                                            <td className="px-4 py-2 text-sm font-medium text-light-secondary">
                                              <div className="flex items-center gap-2">
                                                {kol.profile_image_url ? (
                                                  <img
                                                    src={kol.profile_image_url}
                                                    alt={kol.handle}
                                                    className="w-6 h-6 rounded-full"
                                                    onError={(e) => {
                                                      e.currentTarget.src = "/placeholder.svg?height=24&width=24";
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-6 h-6 rounded-full bg-dark-tertiary flex items-center justify-center text-xs text-light-tertiary">
                                                    {kol.handle.charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                                <span>@{kol.handle}</span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-light-primary text-right font-semibold">
                                              ${kol.amount.toFixed(2)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </KolTableContainer>
                                ) : (
                                  <div className="p-8 text-center bg-dark-alpha-secondary rounded-lg border border-dark-secondary">
                                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-light-tertiary" />
                                    <p className="text-sm text-light-tertiary mb-4">No KOLs added yet</p>
                                    <Button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setIsKolDialogOpen(true);
                                      }}
                                      className="bg-light-primary hover:bg-light-primary/90 text-dark-primary"
                                    >
                                      <Users className="w-4 h-4 mr-2" />
                                      Add KOLs
                          </Button>
                                  </div>
                                )}
                                {form.watch("kolListData") && (form.watch("kolListData")?.length || 0) > 0 && (
                                  <KolTableFooter>
                                    <div className={`flex ${isMobile ? "flex-col gap-3" : "justify-between items-center"}`}>
                                      <div className="flex items-center gap-4 flex-wrap">
                                        <span className="text-sm text-light-tertiary">
                                          Total Pool: <span className="text-light-primary font-bold">
                                            ${(() => {
                                              const kolListData = form.watch("kolListData") || [];
                                              const total = kolListData.reduce((sum: number, kol: any) => sum + (kol.amount || 0), 0);
                                              return total.toFixed(2);
                                            })()}
                                          </span>
                                        </span>
                                        <span className="text-sm text-light-tertiary">
                                          {form.watch("kolListData")?.length || 0} KOLs
                                        </span>
                                        {/* Service Fee Info for Custom Distribution */}
                                        {(() => {
                                          const kolListData = form.watch("kolListData") || [];
                                          const totalPool = kolListData.reduce((sum: number, kol: any) => sum + (kol.amount || 0), 0);
                                          if (totalPool > 0) {
                                            return (
                                              <div className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-light-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm text-light-secondary">
                                                  Total Payable:{" "}
                                                  <span className="text-light-primary font-bold">
                                                    ${calculateTotalWithFee(totalPool).toFixed(2)} USDC
                                                  </span>
                                                  <span className="text-xs text-light-tertiary ml-1">
                                                    (incl. {getServiceFeeLabel()} fee)
                                                  </span>
                                                </span>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                    </div>
                                  </KolTableFooter>
                                )}

                                {(() => {
                                  const kolListData = form.watch("kolListData") || [];
                                  const invalidKols = kolListData.filter((kol: any) => kol.amount > 0 && kol.amount < MIN_REWARD_PER_WINNER);
                                  if (invalidKols.length > 0) {
                                    return (
                                      <Alert className="border-red-text/50 bg-red-text/10">
                                        <AlertDescription className="text-red-text text-sm">
                                          ⚠️ {invalidKols.length} KOL(s) have rewards below ${MIN_REWARD_PER_WINNER}.
                                        </AlertDescription>
                                      </Alert>
                                    );
                                  }
                                  return null;
                                })()}
                          </div>
                          </div>
                          )}
                        </Card>
                      </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Create KOL List Dialog - Only for Custom Distribution Rewards */}
                  <Dialog
                    open={isKolDialogOpen}
                    onOpenChange={setIsKolDialogOpen}
                  >
                    <DialogContent 
                      className="w-[95vw] bg-dark-primary border border-border rounded-2xl shadow-2xl backdrop-blur-sm max-w-6xl max-h-[85vh] overflow-y-auto"
                      onEscapeKeyDown={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onInteractOutside={(e) => e.preventDefault()}
                    >
                      <DialogHeader>
                        <DialogTitle>Create Your KOL List</DialogTitle>
                      </DialogHeader>

                      <KolListBuilder
                        mode="rewards"
                        existingList={form.watch("kolListData") || []}
                        onApply={(kols) => {
                          // Update form with selected KOLs for rewards
                          const selectedKols = kols as SelectedKOL[];
                          // Sum up the amounts (amounts are in USDC units)
                          const totalAmount = selectedKols.reduce(
                            (sum, kol) => sum + kol.amount, // Keep in USDC units
                            0
                          );
                          form.setValue("kolListData", selectedKols);
                          form.setValue(
                            "total_users_to_reward",
                            selectedKols.length
                          );
                          form.setValue("reward_pool", totalAmount);

                          toast({
                            title: "KOL List Updated",
                            description: `Successfully updated KOL list with ${
                              selectedKols.length
                            } KOLs and total reward pool of $${totalAmount.toFixed(
                              2
                            )}`,
                          });

                          // Close dialog and reset state
                          setIsKolDialogOpen(false);
                        }}
                        onClose={() => setIsKolDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Create Eligibility KOL List Dialog */}
                  <Dialog
                    open={isEligibilityKolDialogOpen}
                    onOpenChange={setIsEligibilityKolDialogOpen}
                  >
                    <DialogContent 
                      className="w-[95vw] p-6 max-w-6xl max-h-[85vh] bg-dark-primary border border-dark-alpha-quaternary rounded-2xl shadow-2xl backdrop-blur-sm overflow-y-auto"
                      onEscapeKeyDown={(e) => e.preventDefault()}
                      onPointerDownOutside={(e) => e.preventDefault()}
                      onInteractOutside={(e) => e.preventDefault()}
                    >
                      <DialogHeader>
                        <DialogTitle>Manage Eligible KOL List</DialogTitle>
                      </DialogHeader>

                      <KolListBuilder
                        mode="eligibility"
                        existingList={form.watch("eligibleKolListData") || []}
                        onApply={(kols) => {
                          // Update form with selected KOLs for eligibility
                          // kols can be objects (with profile_image_url) or strings (legacy)
                          form.setValue("eligibleKolListData", kols);

                          toast({
                            title: "Eligibility KOL List Updated",
                            description: `Successfully updated eligible KOL list with ${kols.length} KOLs`,
                          });

                          // Close dialog and reset state
                          setIsEligibilityKolDialogOpen(false);
                        }}
                        onClose={() => setIsEligibilityKolDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Step 3: Preview & Publish */}
                  {currentStep === 3 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-0 duration-500">
                      {/* Left Column: Campaign Summary */}
                      <div className="lg:col-span-7 space-y-6">
                        <Card className="p-6" isMobile={isMobile}>
                          {/* Campaign Header */}
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-light-primary mb-2">
                              {form.watch("title")}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-light-tertiary">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                              Ends{" "}
                                {new Date(form.watch("end_date")).toLocaleDateString()}{" "}
                              at{" "}
                                {new Date(form.watch("end_date")).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Accordion for Rewards, Eligibility, and Tasks */}
                          <Accordion type="multiple" defaultValue={["rewards"]} className="w-full">
                            {/* Rewards Summary Accordion */}
                            <AccordionItem value="rewards" className="border-dark-secondary">
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 text-light-secondary">
                              <Award className="w-4 h-4" />
                                  <span className="font-medium">Rewards Summary</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pb-2">
                                  {/* 1x4 Grid on web (4 columns), 2x2 on mobile */}
                                  <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                              <div className="p-3 bg-dark-alpha-secondary rounded-lg border border-dark-secondary/50">
                                <p className="text-xs text-light-tertiary mb-1">
                                  Distribution
                                </p>
                                <p className="text-sm font-semibold capitalize text-light-primary">
                                  {form.watch("reward_system")?.replace("_", " ")}
                                </p>
                              </div>

                              <div className={`p-3 rounded-lg border ${
                                form.watch("reward_pool") < MIN_REWARD_POOL && !dbUser.is_admin
                                  ? "bg-red-text/10 border-red-text/50"
                                  : "bg-dark-alpha-secondary border-dark-secondary/50"
                              }`}>
                                <p className="text-xs text-light-tertiary mb-1">
                                      Reward Pool
                                    </p>
                                <p className="text-sm font-semibold text-light-primary">
                                  ${(() => {
                                    // For custom campaigns, calculate from KOL list
                                    if (form.watch("reward_system") === "custom") {
                                      const kolListData = form.watch("kolListData") || [];
                                      const total = kolListData.reduce((sum: number, kol: any) => sum + (kol.amount || 0), 0);
                                      return total.toFixed(2);
                                    }
                                    // For other campaigns, use reward_pool
                                    return form.watch("reward_pool").toFixed(2);
                                  })()} USDC
                                </p>
                              </div>

                              {(form.watch("reward_system") === "first_come" || form.watch("reward_system") === "raffle") && (
                                <>
                                  <div className="p-3 bg-dark-alpha-secondary rounded-lg border border-dark-secondary/50">
                                    <p className="text-xs text-light-tertiary mb-1">
                                      Winners
                                    </p>
                                    <p className="text-sm font-semibold text-light-primary">
                                      {form.watch("total_users_to_reward")}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-dark-alpha-secondary rounded-lg border border-dark-secondary/50">
                                    <p className="text-xs text-light-tertiary mb-1">
                                      Per Winner
                                    </p>
                                    <p className="text-sm font-semibold text-light-primary">
                                      ${(form.watch("reward_pool") / form.watch("total_users_to_reward")).toFixed(2)}
                                    </p>
                                  </div>
                                </>
                              )}

                              {form.watch("reward_system") === "custom" && (
                                <div className="p-3 bg-dark-alpha-secondary rounded-lg border border-dark-secondary/50">
                                  <p className="text-xs text-light-tertiary mb-1">
                                      Total Winners
                                    </p>
                                  <p className="text-sm font-semibold text-light-primary">
                                    {form.watch("kolListData")?.length || 0} KOLs
                                    </p>
                                  </div>
                              )}
                            </div>
                            
                            {/* Service Fee Display */}
                            <div className="mt-3 p-3 bg-dark-alpha-tertiary rounded-lg border border-dark-secondary">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-light-tertiary">Service Fee ({getServiceFeeLabel()})</span>
                                <span className="font-semibold text-light-primary">
                                  ${(() => {
                                    // Calculate actual reward pool for custom campaigns
                                    let actualRewardPool = form.watch("reward_pool");
                                    if (form.watch("reward_system") === "custom") {
                                      const kolListData = form.watch("kolListData") || [];
                                      actualRewardPool = kolListData.reduce((sum: number, kol: any) => sum + (kol.amount || 0), 0);
                                    }
                                    return calculateServiceFee(actualRewardPool).toFixed(2);
                                  })()} USDC
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-dark-secondary/50">
                                <span className="text-sm font-medium text-light-secondary">Total Payable</span>
                                <span className="text-base font-bold text-light-primary">
                                  ${(() => {
                                    // Calculate actual reward pool for custom campaigns
                                    let actualRewardPool = form.watch("reward_pool");
                                    if (form.watch("reward_system") === "custom") {
                                      const kolListData = form.watch("kolListData") || [];
                                      actualRewardPool = kolListData.reduce((sum: number, kol: any) => sum + (kol.amount || 0), 0);
                                    }
                                    return calculateTotalWithFee(actualRewardPool).toFixed(2);
                                  })()} USDC
                                </span>
                              </div>
                            </div>
                          </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Eligibility Accordion - For all reward systems */}
                            <AccordionItem value="eligibility" className="border-dark-secondary">
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 text-light-secondary">
                                <UserCheck className="w-4 h-4" />
                                  <span className="font-medium">Eligibility</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pb-2">
                                  {/* Custom campaigns - show KOL list */}
                                  {form.watch("reward_system") === "custom" && (
                                    <>
                                      <p className="text-xs text-light-tertiary mb-2">
                                        Specific KOLs Only (Custom Distribution)
                                      </p>
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                        {form.watch("kolListData")?.length || 0} KOLs
                                      </span>
                                    </>
                                  )}
                                  
                                  {/* FCFS/Raffle campaigns */}
                                  {(form.watch("reward_system") === "first_come" || form.watch("reward_system") === "raffle") && (
                                    <>
                                <p className="text-xs text-light-tertiary mb-2">
                                  {form.watch("eligibility_type") === "filters"
                                    ? "Everyone (with filters)"
                                    : "Specific KOLs Only"}
                                </p>
                                {form.watch("eligibility_type") === "filters" && (
                                  <div className="flex flex-wrap gap-2">
                                    {(form.watch("min_followers") || 0) > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                        Min Followers: {form.watch("min_followers")}
                                      </span>
                                    )}
                                    {(form.watch("min_smart_followers") || 0) > 0 && (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                        Min Smart: {form.watch("min_smart_followers")}
                                      </span>
                                    )}
                                    {form.watch("is_smart_account") && (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                        Smart Account
                                      </span>
                                    )}
                                    {form.watch("is_verified_account") && (
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                )}
                                {form.watch("eligibility_type") === "kol_list" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-light-primary/20 text-light-primary border border-light-primary/30">
                                    {form.watch("eligibleKolListData")?.length || 0} Eligible KOLs
                                  </span>
                                      )}
                                    </>
                                )}
                              </div>
                              </AccordionContent>
                            </AccordionItem>

                            {/* Tasks Accordion */}
                            <AccordionItem value="tasks" className="border-dark-secondary border-b-0">
                              <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 text-light-secondary">
                              <Target className="w-4 h-4" />
                                  <span className="font-medium">Required Tasks ({form.watch("tasks")?.length || 0})</span>
                            </div>
                              </AccordionTrigger>
                              <AccordionContent>
                            <div className="space-y-2">
                              {form
                                .watch("tasks")
                                ?.map((task: any, index: number) => {
                                  const tweetType =
                                    task.task_type === "tweet" &&
                                    task.task_tweet_hashtag
                                      ? "hashtag"
                                      : task.task_type === "tweet" &&
                                        task.task_tweet_cashtag
                                      ? "cashtag"
                                      : task.task_type === "tweet" &&
                                        task.task_tweet_handle
                                      ? "handle"
                                      : task.task_type === "tweet" &&
                                        task.task_tweet_website
                                      ? "website"
                                      : task.task_type === "tweet" &&
                                        task.task_image_required
                                      ? "image"
                                      : undefined;
                                  
                                  // Build the correct task type key
                                  const taskTypeKey = tweetType 
                                    ? `${task.task_type}_${tweetType}` 
                                    : task.task_type;
                                  
                                  const taskInfo = TASK_TYPES[taskTypeKey as keyof typeof TASK_TYPES];
                                  const Icon = taskInfo?.icon || Target; // Fallback icon
                                  return (
                                    <div
                                      key={index}
                                      className="flex items-start gap-3 p-3 bg-dark-alpha-secondary rounded-lg border border-dark-secondary/50 hover:border-dark-secondary transition-colors"
                                    >
                                      <div className="flex-shrink-0 w-7 h-7 bg-light-primary/10 rounded-lg flex items-center justify-center mt-0.5">
                                        {Icon && (
                                          <Icon className="w-3.5 h-3.5 text-light-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-light-primary">
                                          {taskInfo?.label || task.task_type}
                                        </p>
                                        <p className="text-xs text-light-tertiary mt-0.5 break-words">
                                          {(() => {
                                            // Follow task
                                            if (task.task_type === "follow") {
                                              return task.task_follow_handle;
                                            }
                                            
                                            // Tweet with image
                                            if (task.task_type === "tweet" && task.task_image_required) {
                                              return task.task_description || "Image Post";
                                            }
                                            
                                            // Tweet tasks
                                            if (task.task_type === "tweet") {
                                              const parts = [];
                                              if (task.task_tweet_hashtag) parts.push(task.task_tweet_hashtag);
                                              if (task.task_tweet_cashtag) parts.push(task.task_tweet_cashtag);
                                              if (task.task_tweet_handle) parts.push(`@${task.task_tweet_handle}`);
                                              if (task.task_tweet_website) parts.push(task.task_tweet_website);
                                              if (task.task_count && task.task_count > 1) parts.push(`(${task.task_count}x)`);
                                              return parts.join(" ") || "Tweet";
                                            }
                                            
                                            // Retweet, Reply, Quote Tweet
                                            if (task.task_type === "retweet" || task.task_type === "reply" || task.task_type === "quote_tweet") {
                                              return task.task_tweet_id ? `Tweet ID: ${task.task_tweet_id}` : "Tweet interaction";
                                            }
                                            
                                            return "Task details";
                                          })()}
                                    </p>
                                  </div>
                            </div>
                                  );
                                })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </Card>
                      </div>

                      {/* Right Column: Wallet & Payment */}
                      <div className="lg:col-span-5">
                        <div className="lg:sticky lg:top-6 space-y-6">
                          <Card className="p-6" isMobile={isMobile}>
                            {/* <h4 className="text-lg font-semibold text-light-primary mb-4">
                              Connect Wallet & Publish
                            </h4> */}

                          {/* Enhanced Wallet Management Section */}
                          <EnhancedWalletManager
                            selectedBlockchain={form.watch("blockchain")}
                            rewardPool={form.watch("reward_pool")}
                            onWalletChange={(wallet) => {
                              if (wallet) {
                                if (wallet.type === "ethereum") {
                                  setWalletAddress(wallet.address);
                                } else if (wallet.type === "solana") {
                                  // Solana wallet address is handled by the component
                                }
                              } else {
                                setWalletAddress(null);
                              }
                            }}
                            onBalancesChange={(balances) => {
                              console.log(
                                "💰 Balances received from EnhancedWalletManager:",
                                balances
                              );
                              setWalletBalances(balances);
                            }}
                          />
                      </Card>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`${
                      isMobile ? "mt-6" : "mt-12"
                    } flex justify-between items-center`}
                  >
                    <Button
                      type="button"
                      onClick={handleBack}
                      size={isMobile ? "sm" : "sm"}
                      variant="outline"
                      disabled={currentStep === 1}
                      className={isMobile ? "text-xs px-3 py-1" : ""}
                    >
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      Previous
                    </Button>
                    {/* Conditional rendering based on wallet and network state */}
                    <Button
                      type="button"
                      onClick={handleNext}
                      size={isMobile ? "sm" : "sm"}
                      disabled={
                        isContinueDisabled ||
                        isSubmitting ||
                        (currentStep === 3 &&
                          !dbUser.is_admin &&
                          form.watch("reward_pool") < MIN_REWARD_POOL)
                      }
                      className={`flex items-center ${
                        isMobile ? "space-x-1 text-xs px-3 py-1" : "space-x-2"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <div
                            className={`animate-spin rounded-full border-b-2 border-dark-primary ${
                              isMobile ? "h-3 w-3 mr-1" : "h-4 w-4 mr-2"
                            }`}
                          ></div>
                          {isMobile ? "Creating..." : "Creating Campaign..."}
                        </>
                      ) : (
                        <>
                          <span>{continueButtonText}</span>
                          {currentStep < 3 && (
                            <ArrowRight
                              className={isMobile ? "w-3 h-3" : "w-5 h-5"}
                            />
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </main>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Arrows */}
      {!isMobile && (
        <>
          {/* Left Arrow - Previous Step */}
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`fixed left-4 md:left-64 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              currentStep === 1
                ? "bg-dark-secondary border border-dark-alpha-tertiary text-light-tertiary cursor-not-allowed opacity-50"
                : "bg-dark-secondary border border-dark-alpha-tertiary text-light-primary hover:bg-dark-tertiary hover:border-accent-brand/50 hover:text-accent-brand"
            }`}
            aria-label="Previous step"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Right Arrow - Next Step */}
          <button
            type="button"
            onClick={handleNext}
            disabled={
              isContinueDisabled ||
              isSubmitting ||
              (currentStep === 3 &&
                !dbUser.is_admin &&
                form.watch("reward_pool") < MIN_REWARD_POOL)
            }
            className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              isContinueDisabled ||
              isSubmitting ||
              (currentStep === 3 &&
                !dbUser.is_admin &&
                form.watch("reward_pool") < MIN_REWARD_POOL)
                ? "bg-dark-secondary border border-dark-alpha-tertiary text-light-tertiary cursor-not-allowed opacity-50"
                : "bg-dark-secondary border border-dark-alpha-tertiary text-light-primary hover:bg-dark-tertiary hover:border-accent-brand/50 hover:text-accent-brand"
            }`}
            aria-label="Next step"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        onCheckQuest={() => {
          setShowSuccessPopup(false);
          if (createdQuestId) {
            router.push(`/campaigns/${createdQuestId}`);
          } else {
            router.push("/campaigns");
          }
        }}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseModal}
        steps={transactionSteps}
        error={transactionError}
        onRetry={() => onSubmit(form.getValues())}
      />

    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateCampaignPageContent />
    </Suspense>
  );
}
