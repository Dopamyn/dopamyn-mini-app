"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface TwitterAuthModalProps {
  isOpen: boolean;
  status: "verifying" | "success" | "error";
  onClose: () => void;
}

export default function TwitterAuthModal({
  isOpen,
  status,
  onClose,
}: TwitterAuthModalProps) {
  const getTitle = () => {
    switch (status) {
      case "verifying":
        return "Connecting to Twitter";
      case "success":
        return "Successfully Connected";
      case "error":
        return "Connection Failed";
      default:
        return "Twitter Authentication";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-sm sm:max-w-md bg-dark-quaternary border-0">
        <DialogTitle className="sr-only">{getTitle()}</DialogTitle>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          {status === "verifying" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Connecting to Twitter
              </h3>
              <p className="text-muted-foreground">
                Verifying your connection to Twitter...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Successfully Connected!
              </h3>
              <p className="text-muted-foreground">
                Your Twitter account has been connected successfully.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-4">
                <span className="text-white text-xl">✕</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Connection Failed
              </h3>
              <p className="text-muted-foreground">
                Failed to connect to Twitter. Please try again.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
