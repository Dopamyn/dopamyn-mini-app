import React from "react";
import {
  ChainConfig,
  getAvailableChains,
  getChainConfig,
} from "@/lib/chain-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { chainIcon } from "@/lib/helper";
import Image from "next/image";

interface ChainSelectorProps {
  selectedChainId: string;
  onChainChange: (chainId: string) => void;
  className?: string;
}

export const ChainSelector: React.FC<ChainSelectorProps> = ({
  selectedChainId,
  onChainChange,
  className = "",
}) => {
  const availableChains = getAvailableChains();


  const getChainDescription = (chain: ChainConfig) => {
    if (chain.id === "base-mainnet") {
      return "Mainnet - Recommended";
    } else if (chain.id === "ethereum-mainnet") {
      return "Coming soon";
    } else if (chain.id === "polygon-mainnet") {
      return "Coming soon";
    } else if (chain.id === "solana-mainnet") {
      return "High performance";
    } else if (chain.id === "solana-devnet") {
      return "Devent - For testing only";
    }
    return `${chain.name} blockchain`;
  };

  const getEstimatedFee = (chain: ChainConfig) => {
    if (chain.id === "base-mainnet") {
      return "~$0.01";
    } else if (chain.id === "solana-mainnet" || chain.id === "solana-devnet") {
      return "~$0.001";
    }
    return "~$0.01";
  };

  let selectedChain: ChainConfig | undefined = availableChains.find(
    (c) => c.id === selectedChainId
  );

  if (!selectedChain) {
    try {
      selectedChain = getChainConfig(selectedChainId);
    } catch {
      selectedChain = undefined;
    }
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-sm font-medium text-light-tertiary">
        Blockchain
      </label>
      <TooltipProvider>
        <Select value={selectedChainId} onValueChange={onChainChange}>
          <SelectTrigger className="w-full h-9">
            <SelectValue placeholder="Choose blockchain">
              {selectedChainId && selectedChain && (
                <div className="flex items-center gap-2">
                  <Image
                    src={chainIcon(selectedChain?.name.toLowerCase() || "base")}
                    alt={selectedChain?.name || "Chain"}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                  <span className="text-sm font-medium">
                    {selectedChain?.name}
                  </span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableChains.map((chain) => (
              <Tooltip key={chain.id}>
                <TooltipTrigger asChild>
                  <SelectItem value={chain.id} className="cursor-pointer">
                    <div className="flex items-center gap-2 py-1">
                      <Image
                        src={chainIcon(chain.name.toLowerCase())}
                        alt={chain.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span className="text-sm font-medium">{chain.name}</span>
                      <span className="text-xs text-light-quaternary ml-auto">
                        {getChainDescription(chain)}
                      </span>
                    </div>
                  </SelectItem>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{chain.name}</p>
                    <p className="text-sm text-gray-300">
                      {getChainDescription(chain)}
                    </p>
                    <div className="text-xs text-gray-400">
                      <p>Transaction fee: {getEstimatedFee(chain)}</p>
                      <p>Native token: {chain.nativeCurrency.symbol}</p>
                      <p>Network: {chain.isTestnet ? "Testnet" : "Mainnet"}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </SelectContent>
        </Select>
      </TooltipProvider>
    </div>
  );
};
