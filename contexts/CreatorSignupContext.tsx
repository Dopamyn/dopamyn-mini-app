"use client";
import { UserType } from "@/lib/types";
import React, { createContext, ReactNode, useContext, useState } from "react";
import { useToast } from "../hooks/use-toast";

interface SignupContextType {
  signupData: UserType;
  updateSignupData: (data: Partial<UserType>) => void;
  fastSignup: (twitterHandle: string) => Promise<string | false>;
}

const initialSignupData: UserType = {
  x_handle: "",
  evm_wallet: "",
  solana_wallet: "",
  referral_code_used: "",
  referral_code: "",
  celo_wallet: "",
  referrals: [],
  partial_referrals: [],
};

const SignupContext = createContext<SignupContextType | undefined>(undefined);

export const SignupProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();
  const [signupData, setSignupData] = useState<UserType>(initialSignupData);

  const updateSignupData = (data: Partial<UserType>) => {
    setSignupData((prev) => ({ ...prev, ...data }));
  };

  const fastSignup = async (x_handle: string) => {
    try {
      const referralCode =
        typeof window !== "undefined"
          ? localStorage.getItem("referral_code")
          : null;

      // Map to create-user endpoint format
      const userData = {
        x_handle: x_handle,
        evm_wallet: "", // Empty wallet address
        solana_wallet: "", // Empty wallet address
        referral_code_used: referralCode ? referralCode : "",
      };

      const response = await fetch("/api/user/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        // Add a small delay to ensure user creation is committed to database
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Generate JWT token for the created user (similar to check-twitter-handle)
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000; // 1 second

        const getUserToken = async (
          handle: string,
          retries: number = 0
        ): Promise<any | false> => {
          try {
            const tokenResponse = await fetch(
              `/api/auth/check-twitter-handle?account_handle=${handle}`
            );

            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              if (tokenData.result?.token) {
                return tokenData.result.token;
              }
            }
            return false;
          } catch (error) {
            console.error(`Attempt ${retries + 1} failed:`, error);
            if (retries < MAX_RETRIES) {
              await new Promise((resolve) =>
                setTimeout(resolve, RETRY_DELAY_MS)
              );
              return getUserToken(handle, retries + 1);
            }
            return false;
          }
        };

        const token = await getUserToken(x_handle);

        if (token) {
          if (typeof window !== "undefined") {
            localStorage.setItem("token", token);
          }

          // Return the x_handle as the user identifier
          return x_handle;
        }
      }
      return false;
    } catch (error) {
      if (error instanceof Error) {
        localStorage.removeItem("referral_code");
        toast({
          title: "Signup failed. Please try again.",
          description: error.message,
        });
      }
      return false;
    }
  };

  return (
    <SignupContext.Provider
      value={{
        signupData,
        updateSignupData,
        fastSignup,
      }}
    >
      {children}
    </SignupContext.Provider>
  );
};

export const useSignup = () => {
  const context = useContext(SignupContext);
  if (context === undefined) {
    throw new Error("useSignup must be used within a SignupProvider");
  }
  return context;
};
