"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, HelpCircle } from "lucide-react";
import LogoFullIcon from "@/public/icons/LogoFullIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AddWalletPage({
  params,
}: {
  params: Promise<{ winnerId: string }>;
}) {
  const { winnerId } = use(params);
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const { toast } = useToast();

  const [evmWallet, setEvmWallet] = useState(user?.evm_wallet || "");
  const [solanaWallet, setSolanaWallet] = useState(user?.solana_wallet || "");
  const [algorandWallet, setAlgorandWallet] = useState(
    user?.algorand_wallet || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setEvmWallet(user.evm_wallet || "");
      setSolanaWallet(user.solana_wallet || "");
      setAlgorandWallet(user.algorand_wallet || "");
    }
  }, [user]);

  const handleGoBack = () => {
    router.push(`/claim/${winnerId}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create payload with only non-empty wallet addresses
      const payload: {
        evm_wallet?: string;
        solana_wallet?: string;
        algorand_wallet?: string;
      } = {};
      if (evmWallet.trim()) {
        payload.evm_wallet = evmWallet.trim();
      }
      if (solanaWallet.trim()) {
        payload.solana_wallet = solanaWallet.trim();
      }
      if (algorandWallet.trim()) {
        payload.algorand_wallet = algorandWallet.trim();
      }

      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found. Please login first.");
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
          description: "Wallet addresses saved successfully",
        });
        await refreshUser();
        // Navigate back to claim page
        router.push(`/claim/${winnerId}`);
      }
    } catch (error: any) {
      // Reset input fields on error
      setEvmWallet(user?.evm_wallet || "");
      setSolanaWallet(user?.solana_wallet || "");
      setAlgorandWallet(user?.algorand_wallet || "");
      toast({
        title: "Failed to save wallet addresses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Header */}
      <header className="w-full px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <LogoFullIcon width="120" height="32" />
        </Link>
        <button className="w-8 h-8 rounded-full border border-light-tertiary/30 flex items-center justify-center hover:bg-dark-secondary transition-colors">
          <HelpCircle className="w-4 h-4 text-light-primary" />
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-light-primary mb-2">
            Add wallet address
          </h1>
          <p className="text-light-tertiary text-sm">
            Add your wallet to receive rewards instantly. You can update or
            replace your wallet later.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Wallet Input Section */}
          <div className="bg-dark-alpha-tertiary rounded-lg border border-dark-tertiary p-6 mb-8">
            <div className="space-y-6">
              {/* EVM Wallet */}
              <div className="pb-6 border-b border-dashed border-light-tertiary/20">
                <label
                  htmlFor="evmWallet"
                  className="block text-sm font-bold text-light-primary mb-3"
                >
                  EVM
                </label>
                <Input
                  id="evmWallet"
                  value={evmWallet}
                  onChange={(e) => setEvmWallet(e.target.value)}
                  placeholder="Paste EVM address.."
                  className="bg-light-primary border-dark-tertiary text-light-primary placeholder:text-light-quaternary"
                />
              </div>

              {/* Algorand Wallet */}
              <div className="pb-6 border-b border-dashed border-light-tertiary/20">
                <label
                  htmlFor="algorandWallet"
                  className="block text-sm font-bold text-light-primary mb-3"
                >
                  ALGORAND
                </label>
                <Input
                  id="algorandWallet"
                  value={algorandWallet}
                  onChange={(e) => setAlgorandWallet(e.target.value)}
                  placeholder="Paste Algorand address.."
                  className="bg-dark-secondary border-dark-tertiary text-light-primary placeholder:text-light-quaternary"
                />
              </div>

              {/* Solana Wallet */}
              <div>
                <label
                  htmlFor="solanaWallet"
                  className="block text-sm font-bold text-light-primary mb-3"
                >
                  SOLANA
                </label>
                <Input
                  id="solanaWallet"
                  value={solanaWallet}
                  onChange={(e) => setSolanaWallet(e.target.value)}
                  placeholder="Paste Solana address.."
                  className="bg-dark-secondary border-dark-tertiary text-light-primary placeholder:text-light-quaternary mb-3"
                />
                <div className="flex items-start gap-2 text-yellow-text text-xs">
                  <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Minimum 0.002 SOL for one-time USDC airdrop fees</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-dashed border-light-tertiary/20 pt-6">
            <div className="flex items-center justify-between">
              {/* Go Back Button */}
              <button
                type="button"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-light-tertiary hover:text-light-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Go back</span>
              </button>

              {/* Save Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-light-primary hover:bg-light-secondary text-dark-primary font-semibold px-8 py-2.5 rounded-full border border-dark-tertiary/50 shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
