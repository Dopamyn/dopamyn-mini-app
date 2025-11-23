"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { SERVICE_FEE_PERCENT, getServiceFeeLabel } from "@/lib/constants";
import { Gift, Sparkles, X } from "lucide-react";
import { useState } from "react";

interface PromotionalBannerProps {
  /** Optional: Allow users to dismiss the banner */
  dismissible?: boolean;
  /** Optional: Custom message */
  message?: string;
  /** Optional: Show countdown or end date */
  endDate?: string;
  /** Optional: Variant style */
  variant?: "default" | "gradient" | "minimal";
  /** Optional: Size */
  size?: "sm" | "md" | "lg";
}

export function PromotionalBanner({
  dismissible = false,
  message,
  endDate,
  variant = "gradient",
  size = "md",
}: PromotionalBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if service fee is active (not 0%)
  if (SERVICE_FEE_PERCENT > 0 || isDismissed) {
    return null;
  }

  const defaultMessage = endDate
    ? `🎉 Launch Special: 0% service fee until ${endDate}! Regular 10% fee applies after.`
    : "🎉 Launch Special: 0% service fee for a limited time! Regular 10% fee applies later.";

  const displayMessage = message || defaultMessage;

  // Size classes
  const sizeClasses = {
    sm: "p-2 text-xs",
    md: "p-3 text-sm",
    lg: "p-4 text-base",
  };

  // Variant styles - matching app theme (#FF8080 accent)
  const variantStyles = {
    default: "bg-[#FF8080]/10 border-[#FF8080]/50 text-light-primary",
    gradient:
      "bg-gradient-to-r from-[#FF8080]/10 via-[#FF8080]/15 to-[#FF8080]/10 border-[#FF8080]/50 text-light-primary",
    minimal: "bg-dark-alpha-secondary border-[#FF8080]/30 text-light-primary",
  };

  return (
    <Alert
      className={`relative ${variantStyles[variant]} ${sizeClasses[size]} animate-in fade-in-0 slide-in-from-top-2 duration-500`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {variant === "gradient" ? (
            <Sparkles className="w-5 h-5 text-[#FF8080] animate-pulse" />
          ) : (
            <Gift className="w-5 h-5 text-[#FF8080]" />
          )}
        </div>

        {/* Message */}
        <AlertDescription className="flex-1 font-medium">
          {displayMessage}
        </AlertDescription>

        {/* Dismiss button */}
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 p-1 rounded-md hover:bg-[#FF8080]/20 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4 text-light-tertiary hover:text-light-primary" />
          </button>
        )}
      </div>
    </Alert>
  );
}

// Compact inline version for tight spaces
export function InlinePromoBadge() {
  if (SERVICE_FEE_PERCENT > 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FF8080]/10 border border-[#FF8080]/30 text-[#FF8080] text-xs font-medium animate-pulse">
      <Sparkles className="w-3 h-3" />
      0% Fee - Limited Time!
    </span>
  );
}

