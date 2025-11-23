import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const UpdateWalletDialog = ({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) => {
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  const [evmWallet, setEvmWallet] = useState(user?.evm_wallet || "");
  const [solanaWallet, setSolanaWallet] = useState(user?.solana_wallet || "");
  const [celoWallet, setCeloWallet] = useState(user?.celo_wallet || "");
  const [algorandWallet, setAlgorandWallet] = useState(
    user?.algorand_wallet || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with user data when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
      setEvmWallet(user.evm_wallet || "");
      setSolanaWallet(user.solana_wallet || "");
      setCeloWallet(user.celo_wallet || "");
      setAlgorandWallet(user.algorand_wallet || "");
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create payload with only non-empty wallet addresses
      const payload: {
        evm_wallet?: string;
        solana_wallet?: string;
        celo_wallet?: string;
        algorand_wallet?: string;
      } = {};
      if (evmWallet.trim()) {
        payload.evm_wallet = evmWallet;
      }
      if (solanaWallet.trim()) {
        payload.solana_wallet = solanaWallet;
      }
      if (celoWallet.trim()) {
        payload.celo_wallet = celoWallet;
      }
      if (algorandWallet.trim()) {
        payload.algorand_wallet = algorandWallet;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await fetch("/api/user/update-user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }).then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || "Failed to update wallet addresses");
          });
        }
        return res.json();
      });

      if (response.result) {
        toast({
          title: "Success",
          description: "Wallet addresses updated successfully",
        });
        await refreshUser();
        onClose();
      }
    } catch (error: any) {
      // Reset input fields on error
      setEvmWallet(user?.evm_wallet || "");
      setSolanaWallet(user?.solana_wallet || "");
      setCeloWallet(user?.celo_wallet || "");
      setAlgorandWallet(user?.algorand_wallet || "");
      toast({
        title: "Failed to update wallet addresses",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="bg-dark-primary border-dark-quaternary max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-light-primary">
          Update Wallet Addresses
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <label
            htmlFor="evmWallet"
            className="text-sm font-medium text-light-primary min-w-[140px] flex items-center gap-2"
          >
            <img src="/eth.svg" alt="Ethereum" className="w-4 h-4" />
            EVM
          </label>
          <Input
            id="evmWallet"
            value={evmWallet}
            onChange={(e) => setEvmWallet(e.target.value)}
            placeholder="0x..."
            className="bg-dark-secondary border-dark-secondary text-light-primary flex-1"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label
              htmlFor="solanaWallet"
              className="text-sm font-medium text-light-primary min-w-[140px] flex items-center gap-2"
            >
              <img src="/sol.svg" alt="Solana" className="w-4 h-4" />
              Solana
            </label>
            <Input
              id="solanaWallet"
              value={solanaWallet}
              onChange={(e) => setSolanaWallet(e.target.value)}
              placeholder="Solana address..."
              className="bg-dark-secondary border-dark-secondary text-light-primary flex-1"
            />
          </div>
          <div className="text-xs rounded border border-amber-500/20 bg-amber-500/5 text-amber-200 p-2">
            <p className="font-medium">
              💰 Requires minimum 0.002 SOL for USDC airdrop fees (one-time
              only)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="algorandWallet"
            className="text-sm font-medium text-light-primary min-w-[140px] flex items-center gap-2"
          >
            <img
              src="/algorand.svg"
              alt="Algorand"
              className="w-4 h-4 bg-light-primary"
            />
            Algorand
          </label>
          <Input
            id="algorandWallet"
            value={algorandWallet}
            onChange={(e) => setAlgorandWallet(e.target.value)}
            placeholder="Algorand address..."
            className="bg-dark-secondary border-dark-secondary text-light-primary flex-1"
          />
        </div>
        {/* <div>
          <label
            htmlFor="celoWallet"
            className="text-sm text-light-tertiary block mb-2"
          >
            Celo Wallet Address
          </label>
          <Input
            id="celoWallet"
            value={celoWallet}
            onChange={(e) => setCeloWallet(e.target.value)}
            placeholder="Celo address..."
            className="bg-dark-secondary border-dark-secondary text-light-primary"
          />
        </div> */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="bg-transparent border-dark-quaternary text-light-tertiary hover:bg-dark-quaternary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-light-primary text-dark-primary hover:bg-light-secondary"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </form>
    </DialogContent>
  );
};

export default UpdateWalletDialog;
