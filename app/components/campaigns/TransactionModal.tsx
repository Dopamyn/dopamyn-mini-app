"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type StepStatus = "pending" | "processing" | "success" | "error";

export interface Step {
  title: string;
  status: StepStatus;
  message?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: Step[];
  error?: string | null;
  onRetry?: () => void;
}

export const TransactionModal = ({
  isOpen,
  onClose,
  steps,
  error,
  onRetry,
}: TransactionModalProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isAllSuccess = steps.every((step) => step.status === "success");
  const isProcessing = steps.some((step) => step.status === "processing");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (isProcessing && !error) {
        setIsConfirmOpen(true); // Show confirmation dialog instead of closing
        return;
      }
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setIsConfirmOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-[#23262E] border border-[#2D313A]">
          <DialogHeader>
            <DialogTitle className="text-center text-white">
              {isAllSuccess
                ? "Transaction Successful"
                : error
                ? "Transaction Failed"
                : "Confirm Transaction"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative py-4">
            {/* Vertical timeline line - matching Dopamyn theme */}
            <div className="absolute left-[18px] top-6 bottom-6 w-[1px] bg-[#2D313A] z-0">
              {/* Animated progress line */}
              {(() => {
                const completedCount = steps.filter(s => s.status === "success").length;
                const processingIndex = steps.findIndex(s => s.status === "processing");
                const progressSteps = processingIndex >= 0 ? processingIndex : completedCount;
                const progressPercent = (progressSteps / steps.length) * 100;
                
                return progressPercent > 0 ? (
                  <div 
                    className="absolute top-0 w-full bg-[#FF8080] transition-all duration-500 ease-out z-0"
                    style={{ height: `${progressPercent}%` }}
                  />
                ) : null;
              })()}
            </div>

            {/* Steps */}
            <div className="relative space-y-6">
              {steps.map((step, index) => {
                const isCompleted = step.status === "success";
                const isProcessing = step.status === "processing";
                const isError = step.status === "error";
                const isPending = step.status === "pending";
                
                return (
                  <div key={index} className="relative flex items-start gap-4">
                    {/* Step Icon Container - matching Dopamyn stepper style */}
                    <div className="relative z-20 flex-shrink-0">
                      {/* Pulsing ring for processing state */}
                      {isProcessing && (
                        <div className="absolute inset-0 rounded-full bg-[#FF8080] animate-ping opacity-20" />
                      )}
                      <div
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          isProcessing
                            ? "bg-[#FF8080] text-white shadow-lg shadow-[#FF8080]/40"
                            : isCompleted
                            ? "bg-[#FF8080] text-white shadow-[#FF8080]/20"
                            : isError
                            ? "bg-destructive/10 text-destructive border border-destructive"
                            : "bg-[#1E2025] text-[#6B7280] border border-[#2D313A] shadow-sm"
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 
                            className="w-6 h-6 animate-spin text-white z-10" 
                            strokeWidth={2.5}
                          />
                        ) : isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : isError ? (
                          <XCircle className="w-5 h-5 text-destructive" />
                        ) : (
                          <span className="text-sm">{index + 1}</span>
                        )}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 pt-0.5">
                      <div className="space-y-1">
                        <p className={`font-semibold text-sm transition-colors duration-300 ${
                          isProcessing || isCompleted
                            ? "text-[#FF8080]"
                            : isError
                            ? "text-destructive"
                            : "text-[#6B7280]"
                        }`}>
                          {step.title}
                        </p>
                        {step.message && (
                          <p className="text-xs text-[#6B7280]">
                            {step.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {error && (
            <div className="p-4 bg-destructive/20 border border-destructive/30 rounded-lg text-center">
              <p className="text-destructive font-medium">{error}</p>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="link"
                  className="text-white hover:underline text-sm mt-2"
                >
                  Retry Transaction
                </Button>
              )}
            </div>
          )}
          {(isAllSuccess || error) && (
            <Button 
              onClick={onClose} 
              className="w-full bg-[#FF8080] hover:bg-[#FF8080]/90 text-white font-semibold"
            >
              {isAllSuccess ? "Done" : "Dismiss"}
            </Button>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Closing this window will cancel the transaction. Are you sure you
              want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, continue transaction</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
