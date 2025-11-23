"use client";

import { PrivyProvider as PrivyAuthProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { ReactNode } from "react";

interface PrivyProviderProps {
  children: ReactNode;
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  return (
    <PrivyAuthProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        // Only enable wallet connections, disable social auth
        loginMethods: ["wallet"],
        appearance: {
          theme: "light",
          accentColor: "#676FFF",
          logo: "https://dopamyn.fun/dope.png",
          walletChainType: "ethereum-and-solana",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors({
              shouldAutoConnect: false,
            }),
          },
        },
        // Configure Solana RPCs for devnet and mainnet
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ||
                  "https://api.mainnet-beta.solana.com"
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL?.replace(
                  "http",
                  "ws"
                ) || "wss://api.mainnet-beta.solana.com"
              ),
            },
            "solana:devnet": {
              rpc: createSolanaRpc(
                process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL || 
                "https://api.devnet.solana.com"
              ),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL?.replace(
                  "http",
                  "ws"
                ) || "wss://api.devnet.solana.com"
              ),
            },
          },
        },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
