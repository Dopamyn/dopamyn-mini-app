"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function ReferralHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const referralCode = searchParams.get("referral_code");

    console.log(referralCode, ": found referralCode in ReferralHandler");

    if (referralCode && typeof window !== "undefined") {
      localStorage.setItem("referral_code", referralCode);
    }
  }, [searchParams]);

  return null;
}
