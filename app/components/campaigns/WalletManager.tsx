"use client";

import { Button } from "@/components/ui/button";
import { useWallets } from "@privy-io/react-auth";
import { RefreshCcw, Wallet } from "lucide-react";

interface WalletManagerProps {
  walletAddress: string | null;
  currentNetworkName: string;
  isBaseNetwork: boolean;
  isLoadingBalances: boolean;
  walletBalances: {
    usdc_balance: number;
    native_balance: number;
    chain: string;
    native_token: string;
  } | null;
  fetchWalletBalances: (blockchain: "base" | "solana") => void;
  switchToBaseNetwork: () => void;
  handleConnectWallet: () => void;
  rewardPool: number;
  blockchain: "base" | "solana";
}

export const WalletManager = ({
  walletAddress,
  currentNetworkName,
  isBaseNetwork,
  isLoadingBalances,
  walletBalances,
  fetchWalletBalances,
  switchToBaseNetwork,
  handleConnectWallet,
  rewardPool,
  blockchain,
}: WalletManagerProps) => {
  const { wallets, ready } = useWallets();
  const isConnected = wallets.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold flex items-center space-x-2">
          <Wallet className="w-5 h-5 text-light-primary" />
          <span>Your Wallet</span>
        </h4>
        {isConnected && (
          <Button
            onClick={() => fetchWalletBalances(blockchain)}
            size="sm"
            variant="outline"
            disabled={isLoadingBalances}
            className="text-xs"
          >
            {isLoadingBalances ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-light-primary mr-2"></div>
            ) : (
              <RefreshCcw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        )}
      </div>
      <div className="p-4 bg-dark-alpha-secondary rounded-lg border border-light-tertiary">
        {isConnected && (walletAddress || blockchain === "solana") ? (
          <div className="flex space-y-4 justify-between">
            <div className="p-2 bg-dark-alpha-tertiary rounded border border-light-tertiary">
              <p className="text-xs text-light-tertiary mb-1">
                Connected Wallet ({currentNetworkName})
              </p>
              <p className="text-xs font-mono text-light-primary break-all">
                {walletAddress ||
                  (blockchain === "solana"
                    ? "Solana wallet connected"
                    : walletAddress)}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleConnectWallet} size="sm">
                <Wallet className="w-4 h-4 mr-2" />
                Connect another wallet
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-light-tertiary">
              Connect your wallet to view balances and create quests.
            </p>
            <Button onClick={handleConnectWallet} size="sm" className="mt-2">
              Connect Wallet
            </Button>
          </div>
        )}

        {isConnected && blockchain === "base" && !isBaseNetwork && (
          <div className="mt-4 p-3 bg-dark-alpha-tertiary border border-yellow-text rounded-lg">
            <p className="text-yellow-text text-sm font-medium">
              Wrong Network
            </p>
            <p className="text-yellow-text text-xs mt-1">
              Please switch to the Base network to continue.
            </p>
            <Button onClick={switchToBaseNetwork} size="sm" className="mt-2">
              Switch to Base
            </Button>
          </div>
        )}

        {isConnected && blockchain === "solana" && !isBaseNetwork && (
          <div className="mt-4 p-3 bg-dark-alpha-tertiary border border-green-text rounded-lg">
            <p className="text-green-text text-sm font-medium">
              Solana Wallet Connected
            </p>
            <p className="text-green-text text-xs mt-1">
              Ready to create quest on Solana blockchain.
            </p>
          </div>
        )}

        {walletBalances && blockchain === "base" && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const availableNative = walletBalances.native_balance;
                const hasEnoughNative = availableNative >= 0.001;

                return (
                  <div
                    className={`p-3 rounded-lg border ${
                      hasEnoughNative
                        ? "bg-dark-alpha-tertiary border-success"
                        : "bg-dark-alpha-tertiary border-red-text"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        hasEnoughNative ? "border-success" : "border-red-text"
                      }`}
                    >
                      {hasEnoughNative ? "✅" : "⚠️"}{" "}
                      {walletBalances.native_token} Balance
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        hasEnoughNative ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      Available: {availableNative.toFixed(6)}{" "}
                      {walletBalances.native_token}
                    </p>
                    <p className="text-xs text-light-tertiary mt-1">
                      0.001 {walletBalances.native_token} required for gas
                    </p>
                  </div>
                );
              })()}

              {(() => {
                if (rewardPool <= 0) return null;

                const availableUSDC = walletBalances.usdc_balance;
                const hasEnoughUSDC = availableUSDC >= rewardPool;

                return (
                  <div
                    className={`p-3 rounded-lg border ${
                      hasEnoughUSDC
                        ? "bg-dark-alpha-tertiary border-success"
                        : "bg-dark-alpha-tertiary border-red-text"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        hasEnoughUSDC ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      {hasEnoughUSDC ? "✅" : "⚠️"} USDC Balance
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        hasEnoughUSDC ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      Available: {availableUSDC.toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-light-tertiary mt-1">
                      Required: {rewardPool.toFixed(2)} USDC
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {walletBalances && blockchain === "solana" && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(() => {
                const availableNative = walletBalances.native_balance;
                const hasEnoughNative = availableNative >= 0.001;

                return (
                  <div
                    className={`p-3 rounded-lg border ${
                      hasEnoughNative
                        ? "bg-dark-alpha-tertiary border-success"
                        : "bg-dark-alpha-tertiary border-red-text"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        hasEnoughNative ? "border-success" : "border-red-text"
                      }`}
                    >
                      {hasEnoughNative ? "✅" : "⚠️"}{" "}
                      {walletBalances.native_token} Balance
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        hasEnoughNative ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      Available: {availableNative.toFixed(6)}{" "}
                      {walletBalances.native_token}
                    </p>
                    <p className="text-xs text-light-tertiary mt-1">
                      0.001 {walletBalances.native_token} required for gas
                    </p>
                  </div>
                );
              })()}

              {(() => {
                if (rewardPool <= 0) return null;

                const availableUSDC = walletBalances.usdc_balance;
                const hasEnoughUSDC = availableUSDC >= rewardPool;

                return (
                  <div
                    className={`p-3 rounded-lg border ${
                      hasEnoughUSDC
                        ? "bg-dark-alpha-tertiary border-success"
                        : "bg-dark-alpha-tertiary border-red-text"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        hasEnoughUSDC ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      {hasEnoughUSDC ? "✅" : "⚠️"} USDC Balance
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        hasEnoughUSDC ? "text-green-text" : "text-red-text"
                      }`}
                    >
                      Available: {availableUSDC.toFixed(2)} USDC
                    </p>
                    <p className="text-xs text-light-tertiary mt-1">
                      Required: {rewardPool.toFixed(2)} USDC
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {blockchain === "solana" && isConnected && !walletBalances && (
          <div className="mt-4 p-3 bg-dark-alpha-tertiary border border-green-text rounded-lg">
            <p className="text-green-text text-sm font-medium">
              ✅ Solana Wallet Ready
            </p>
            <p className="text-green-text text-xs mt-1">
              Your Solana wallet is connected and ready to create quests.
            </p>
            <p className="text-xs text-light-tertiary mt-1">
              Required: {rewardPool.toFixed(2)} USDC for rewards
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
