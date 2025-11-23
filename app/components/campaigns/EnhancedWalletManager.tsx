"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useWallets,
  useConnectWallet,
  usePrivy,
} from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { Button } from "@/components/ui/button";
import { Wallet, AlertCircle, Check, RefreshCw } from "lucide-react";
import { showSuccessToast, showErrorToast } from "../ui/custom-toast";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { ethers } from "ethers";
import { getChainConfig, isChainEnabled } from "@/lib/chain-config";

// ERC20 ABI for balance checking
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

type WalletInfo = {
  address: string;
  type: "ethereum" | "solana";
  name: string;
  walletClientType?: string;
  isConnected: boolean;
};

interface EnhancedWalletManagerProps {
  selectedBlockchain: "base" | "solana";
  onWalletChange?: (wallet: WalletInfo | null) => void;
  onBalancesChange?: (balances: { usdc_balance: number; native_balance: number; chain: string; native_token: string } | null) => void;
  rewardPool: number;
  className?: string;
}

const EnhancedWalletManager = ({
  selectedBlockchain,
  onWalletChange,
  onBalancesChange,
  rewardPool,
  className = "",
}: EnhancedWalletManagerProps) => {
  const { wallets: walletsEvm, ready: evmReady } = useWallets();
  const { wallets: walletsSolana, ready: solanaReady } = useSolanaWallets();
  const { logout } = usePrivy();
  const { connectWallet } = useConnectWallet({
    onSuccess: () => {
      showSuccessToast("Wallet connected successfully!");
    },
    onError: (error) => {
      console.error("Wallet connection error:", error);
      showErrorToast("Failed to connect wallet. Please try again.");
    },
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [balances, setBalances] = useState<{
    native: number;
    usdc: number;
    isLoading: boolean;
  }>({
    native: 0,
    usdc: 0,
    isLoading: false,
  });

  // Track selected wallet per chain to allow switching among multiple connected wallets
  const [selectedEvmWalletIdx, setSelectedEvmWalletIdx] = useState(0);
  const [selectedSolWalletIdx, setSelectedSolWalletIdx] = useState(0);

  // Ensure selected indices are within bounds when wallet lists change
  useEffect(() => {
    if (selectedEvmWalletIdx >= walletsEvm.length) {
      setSelectedEvmWalletIdx(0);
    }
  }, [walletsEvm.length, selectedEvmWalletIdx]);

  useEffect(() => {
    if (selectedSolWalletIdx >= walletsSolana.length) {
      setSelectedSolWalletIdx(0);
    }
  }, [walletsSolana.length, selectedSolWalletIdx]);

  // Resolve active chain config based on selected chain and environment flags
  const chainConfig = useMemo(() => {
    if (selectedBlockchain === "solana") {
      const useMainnet = isChainEnabled("solana-mainnet");
      const targetId = useMainnet ? "solana-mainnet" : "solana-devnet";
      return getChainConfig(targetId);
    }
    // default to Base mainnet for EVM path currently supported here
    return getChainConfig("base-mainnet");
  }, [selectedBlockchain]);

  // Get current wallet based on selected blockchain - SIMPLIFIED
  const currentWallet = useMemo(() => {
    if (selectedBlockchain === "solana") {
      console.log("walletsSolana", walletsSolana);
      // Get first Solana wallet
      const solanaWallet = walletsSolana[selectedSolWalletIdx];
      if (!solanaWallet) return null;
      
      return {
        address: solanaWallet.address,
        type: "solana" as const,
        name: solanaWallet.address,
        walletClientType: solanaWallet.standardWallet.name,
        isConnected: true,
      };
    } else {
      // Get first EVM wallet
      const evmWallet = walletsEvm[selectedEvmWalletIdx];
      if (!evmWallet) return null;
      
      return {
        address: evmWallet.address,
        type: "ethereum" as const,
        name: evmWallet.address,
        walletClientType: evmWallet.walletClientType,
        isConnected: true,
      };
    }
  }, [selectedBlockchain, walletsEvm, walletsSolana, selectedEvmWalletIdx, selectedSolWalletIdx]);

  // Notify parent component of wallet changes
  useEffect(() => {
    onWalletChange?.(currentWallet || null);
  }, [currentWallet, onWalletChange]);

  // Fetch wallet balances function
  const fetchBalances = async () => {
    if (!currentWallet) {
      setBalances({ native: 0, usdc: 0, isLoading: false });
      onBalancesChange?.(null);
      return;
    }

    setBalances((prev) => ({ ...prev, isLoading: true }));

      try {
        if (selectedBlockchain === "solana") {
          // Fetch Solana balances
          const connection = new Connection(
            chainConfig.rpcUrl,
            "confirmed"
          );
          const publicKey = new PublicKey(currentWallet.address);

          // Fetch SOL balance
          const solBalance = await connection.getBalance(publicKey);
          const solBalanceInSol = solBalance / LAMPORTS_PER_SOL;

          // Fetch USDC balance
          let usdcBalance = 0;
          try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
              publicKey,
              { programId: TOKEN_PROGRAM_ID }
            );

            const usdcAccount = tokenAccounts.value.find(
              (account) =>
                account.account.data.parsed.info.mint === chainConfig.tokens.usdc
            );

            if (usdcAccount) {
              usdcBalance =
                usdcAccount.account.data.parsed.info.tokenAmount.uiAmount || 0;
            }
          } catch (error) {
            console.error("Error fetching USDC balance:", error);
          }

          const newBalances = {
            native: solBalanceInSol,
            usdc: usdcBalance,
            isLoading: false,
          };
          setBalances(newBalances);
          
          // Notify parent component
          onBalancesChange?.({
            usdc_balance: usdcBalance,
            native_balance: solBalanceInSol,
            chain: chainConfig.id,
            native_token: chainConfig.nativeCurrency.symbol,
          });
        } else {
          // Fetch Base (EVM) balances
          const evmProvider = await walletsEvm[selectedEvmWalletIdx]?.getEthereumProvider();
          if (!evmProvider) {
            setBalances({ native: 0, usdc: 0, isLoading: false });
            return;
          }

          const provider = new ethers.BrowserProvider(evmProvider);

          // Fetch ETH balance
          const ethBalance = await provider.getBalance(currentWallet.address);
          const ethBalanceInEth = Number(ethers.formatEther(ethBalance));

          // Fetch USDC balance
          let usdcBalance = 0;
          try {
            const usdcContract = new ethers.Contract(
              chainConfig.tokens.usdc,
              ERC20_ABI,
              provider
            );

            const balance = await usdcContract.balanceOf(currentWallet.address);
            const decimals = await usdcContract.decimals();
            usdcBalance = Number(ethers.formatUnits(balance, decimals));
          } catch (error) {
            console.error("Error fetching USDC balance:", error);
          }

          const newBalances = {
            native: ethBalanceInEth,
            usdc: usdcBalance,
            isLoading: false,
          };
          setBalances(newBalances);
          
          // Notify parent component
          onBalancesChange?.({
            usdc_balance: usdcBalance,
            native_balance: ethBalanceInEth,
            chain: chainConfig.id,
            native_token: chainConfig.nativeCurrency.symbol,
          });
        }
      } catch (error) {
      console.error("Error fetching balances:", error);
      setBalances({ native: 0, usdc: 0, isLoading: false });
      onBalancesChange?.(null);
    }
  };

  // Fetch balances on wallet/blockchain change
  useEffect(() => {
    fetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWallet, selectedBlockchain]);

  const handleConnectWallet = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsConnecting(true);
    try {
      // First logout to clear any existing session
      await logout();
      
      // Small delay to ensure logout completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then connect wallet
      await connectWallet();
    } catch (error) {
      console.error("Connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (selectedBlockchain === "solana") {
        const w = walletsSolana[selectedSolWalletIdx] as any;
        if (w && typeof w.disconnect === "function") {
          await w.disconnect();
        }
      }
    } catch (err) {
      console.error("Wallet disconnect failed, falling back to logout", err);
      try {
        await logout();
      } catch (logoutErr) {
        console.error("Privy logout failed", logoutErr);
      }
    } finally {
      setBalances({ native: 0, usdc: 0, isLoading: false });
    }
  };

  const isWalletConnected = !!currentWallet;
  const isReady = evmReady && solanaReady;

  // Get wallet display name
  const getWalletDisplayName = (wallet: WalletInfo) => {
    if (wallet.walletClientType === "phantom") return "Phantom";
    if (wallet.walletClientType === "metamask") return "MetaMask";
    if (wallet.walletClientType === "privy") return "Privy Embedded";
    return wallet.walletClientType || "Unknown";
  };

  // Get blockchain display name
  const getBlockchainDisplayName = () => {
    return chainConfig.name;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-light-primary" />
          <span>Wallet Connection</span>
        </h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-light-tertiary">
            {getBlockchainDisplayName()}
          </span>
          {isWalletConnected && (
            <div className="flex items-center space-x-1 text-green-text">
              <Check className="w-3 h-3" />
              <span className="text-xs">Connected</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-dark-alpha-secondary rounded-lg border border-light-tertiary">
        {!isReady ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-light-primary mx-auto mb-2"></div>
            <p className="text-light-tertiary text-sm">Loading wallet providers...</p>
          </div>
        ) : !isWalletConnected ? (
          <div className="text-center py-4">
            <div className="mb-4">
              {/* <Wallet className="w-4 h-4 text-light-tertiary mx-auto mb-2" /> */}
              <p className="text-light-tertiary mb-2">
                Connect your {getBlockchainDisplayName()} wallet to continue
              </p>
            </div>
            <Button 
              type="button"
              onClick={handleConnectWallet} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect {getBlockchainDisplayName()} Wallet
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected Wallet Info */}
            <div className="p-3 bg-dark-alpha-tertiary rounded border border-light-tertiary">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-text rounded-full"></div>
                  <span className="text-sm font-medium text-light-primary">
                    {getWalletDisplayName(currentWallet)}
                  </span>
                </div>
                <span className="text-xs text-light-tertiary">
                  {getBlockchainDisplayName()}
                </span>
              </div>
              <p className="text-xs font-mono text-light-primary break-all">
                {currentWallet.address}
              </p>
              {/* Wallet Switcher - always show when at least one wallet exists */}
              {selectedBlockchain === "solana" ? (
                walletsSolana.length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-light-tertiary">Select Solana wallet</label>
                    <select
                      className="mt-1 w-full bg-dark-alpha-secondary border border-light-tertiary rounded px-2 py-1 text-xs"
                      value={selectedSolWalletIdx}
                      onChange={(e) => setSelectedSolWalletIdx(Number(e.target.value))}
                    >
                      {walletsSolana.map((w, idx) => (
                        <option key={w.address + idx} value={idx}>
                          {(w.standardWallet?.name || "Wallet")} - {w.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              ) : (
                walletsEvm.length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-light-tertiary">Select EVM wallet</label>
                    <select
                      className="mt-1 w-full bg-dark-alpha-secondary border border-light-tertiary rounded px-2 py-1 text-xs"
                      value={selectedEvmWalletIdx}
                      onChange={(e) => setSelectedEvmWalletIdx(Number(e.target.value))}
                    >
                      {walletsEvm.map((w, idx) => (
                        <option key={w.address + idx} value={idx}>
                          {(w.walletClientType || "Wallet")} - {w.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              )}
            </div>

            {/* Reconnect Button */}
            <Button
              type="button"
              onClick={(e) => handleConnectWallet(e)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Different Wallet
            </Button>

            {/* Solana-only Disconnect */}
            {selectedBlockchain === "solana" && (
              <Button
                type="button"
                onClick={(e) => handleDisconnect(e)}
                variant="outline"
                size="sm"
                className="w-full border-red-text/50 text-red-text hover:bg-red-text/10"
              >
                Disconnect
              </Button>
            )}

            {/* Logout Button */}
            {/* <Button
              type="button"
              onClick={async (e) => {
                if (e) {
                  e.preventDefault();
                  e.stopPropagation();
                }
                try {
                  await logout();
                  showSuccessToast("Logged out successfully!");
                } catch (error) {
                  console.error("Logout failed:", error);
                  showErrorToast("Failed to logout. Please try again.");
                }
              }}
              variant="outline"
              size="sm"
              className="w-full border-red-text/50 text-red-text hover:bg-red-text/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout & Clear Session
            </Button> */}
          </div>
        )}

        {/* Balance & Status */}
        {isWalletConnected && (
          <div className="mt-4 space-y-3">
            {/* Balance Display */}
            <div className="p-3 bg-dark-alpha-tertiary border border-dark-secondary rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-light-tertiary font-medium">Wallet Balance</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    fetchBalances();
                  }}
                  disabled={balances.isLoading}
                  className="p-1 rounded hover:bg-dark-alpha-secondary transition-colors disabled:opacity-50"
                  title="Refresh balance"
                >
                  <RefreshCw 
                    className={`w-3 h-3 text-light-tertiary ${balances.isLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
              {balances.isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-light-primary"></div>
                  <span className="text-xs text-light-tertiary">Loading balances...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-light-tertiary">
                      {chainConfig.nativeCurrency.symbol}:
                    </span>
                    <span className="text-sm font-mono text-light-primary">
                      {balances.native.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-light-tertiary">USDC:</span>
                    <span className="text-sm font-mono text-light-primary">
                      {balances.usdc.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Status Message */}
            <div className={`p-3 rounded-lg border ${
              !balances.isLoading && balances.usdc >= rewardPool && balances.native >= 0.001
                ? "bg-green-500/10 border-green-text"
                : "bg-yellow-500/10 border-yellow-500/50"
            }`}>
              <div className="flex items-start space-x-2">
                {!balances.isLoading && balances.usdc >= rewardPool && balances.native >= 0.001 ? (
                  <>
                    <Check className="w-4 h-4 text-green-text mt-0.5" />
                    <div>
                      <p className="text-green-text text-sm font-medium">
                        ✅ {getBlockchainDisplayName()} Wallet Ready
                      </p>
                      <p className="text-green-text text-xs mt-1">
                        Your wallet has sufficient balance to create this quest.
                      </p>
                      {rewardPool > 0 && (
                        <p className="text-xs text-green-text/80 mt-1">
                          Required: {rewardPool.toFixed(2)} USDC + gas fees
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-yellow-500 text-sm font-medium">
                        ⚠️ Insufficient Balance
                      </p>
                      {balances.usdc < rewardPool && (
                        <p className="text-yellow-400 text-xs mt-1">
                          Need {(rewardPool - balances.usdc).toFixed(2)} more USDC (Required: {rewardPool.toFixed(2)})
                        </p>
                      )}
                      {balances.native < 0.001 && (
                        <p className="text-yellow-400 text-xs mt-1">
                          Need {chainConfig.nativeCurrency.symbol} for gas fees (Min: 0.001)
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Wallets Info */}
        {!isWalletConnected && (
          <div className="mt-4 p-3 bg-dark-alpha-tertiary border border-light-tertiary rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-light-tertiary mt-0.5" />
              <div>
                <p className="text-light-tertiary text-sm font-medium">
                  Supported Wallets
                </p>
                <p className="text-xs text-light-tertiary mt-1">
                  {selectedBlockchain === "solana" 
                    ? "Phantom, Solflare, and other Solana wallets"
                    : "MetaMask, Coinbase Wallet, and other EVM wallets"
                  }
                </p>
                <p className="text-xs text-light-tertiary mt-1">
                  Make sure your wallet is unlocked and ready to connect.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Tips */}
        {!isWalletConnected && (
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 text-blue-400 mt-0.5">💡</div>
              <div>
                <p className="text-blue-400 text-sm font-medium">
                  Connection Tips
                </p>
                <ul className="text-xs text-blue-300 mt-1 space-y-1">
                  <li>• Ensure your wallet extension is installed and unlocked</li>
                  <li>• {selectedBlockchain === "solana" ? "Switch your wallet to the correct Solana cluster" : "Switch to Base network"} if needed</li>
                  <li>• Allow popups for this site if prompted</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedWalletManager;
