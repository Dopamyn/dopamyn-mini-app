"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useMiniApp } from "@/hooks/useMiniApp";
import { useToast } from "@/hooks/use-toast";

interface WorldcoinVerificationProps {
  onVerificationSuccess?: (proof: any) => void;
  onVerificationError?: (error: string) => void;
  action?: string; // Your incognito action ID from Developer Portal
  signal?: string; // Optional additional data
  className?: string;
}

export default function WorldcoinVerification({
  onVerificationSuccess,
  onVerificationError,
  action = "dopamyn-human-verify",
  signal,
  className = "",
}: WorldcoinVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMiniApp, miniKit } = useMiniApp();
  const { toast } = useToast();

  useEffect(() => {
    if (!isMiniApp || !miniKit) return;

    // Listen for verification responses
    const handleVerification = async (response: any) => {
      if (response.status === "error") {
        const errorMsg =
          response.error_code || response.error || "Verification failed";
        setError(errorMsg);
        setIsVerifying(false);
        onVerificationError?.(errorMsg);
        toast({
          title: "Verification Failed",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      try {
        // Verify proof on backend
        const verifyResponse = await fetch("/api/worldcoin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: response,
            action,
            signal,
          }),
        });

        const result = await verifyResponse.json();

        if (result.success) {
          setIsVerified(true);
          setError(null);
          setIsVerifying(false);
          onVerificationSuccess?.(response);
          toast({
            title: "Verification Successful",
            description: "You are now verified as human!",
          });
        } else {
          const errorMsg = result.error || "Proof verification failed";
          setError(errorMsg);
          setIsVerifying(false);
          onVerificationError?.(errorMsg);
          toast({
            title: "Verification Failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        const errorMsg = "Network error during verification";
        setError(errorMsg);
        setIsVerifying(false);
        onVerificationError?.(errorMsg);
        toast({
          title: "Verification Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    };

    // Subscribe to verification events
    if (miniKit && miniKit.subscribe) {
      const { ResponseEvent } = require("@worldcoin/minikit-js");
      miniKit.subscribe(ResponseEvent.MiniAppVerifyAction, handleVerification);

      return () => {
        miniKit.unsubscribe(ResponseEvent.MiniAppVerifyAction);
      };
    }
  }, [isMiniApp, miniKit, action, signal, onVerificationSuccess, onVerificationError, toast]);

  const handleVerify = async () => {
    if (!isMiniApp || !miniKit) {
      const errorMsg = "World App not detected. Please open this in World App.";
      setError(errorMsg);
      onVerificationError?.(errorMsg);
      toast({
        title: "Not in World App",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { VerifyCommandInput, VerificationLevel } = await import(
        "@worldcoin/minikit-js"
      );

      const verifyPayload: VerifyCommandInput = {
        action,
        signal,
        verification_level: VerificationLevel.Orb, // Use Orb for highest security
      };

      await miniKit.commandsAsync.verify(verifyPayload);
    } catch (error: any) {
      const errorMsg = error.message || "Failed to initiate verification";
      setError(errorMsg);
      setIsVerifying(false);
      onVerificationError?.(errorMsg);
      toast({
        title: "Verification Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  if (isVerified) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">Human Verified</span>
      </div>
    );
  }

  if (!isMiniApp) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Verification available in World App
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        onClick={handleVerify}
        disabled={isVerifying}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Verify as Human
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <XCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
