"use client";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import { useEffect, useState } from "react";

export default function TwitterConnectPrompt() {
  const [show, setShow] = useState(false);
  const { login, isAuthenticated, isLoading } = useTwitterAuth();

  useEffect(() => {
    const dismissed = localStorage.getItem(
      "buzzboard_twitter_prompt_dismissed"
    );
    if (!dismissed && !isAuthenticated && !isLoading) {
      setShow(true);
    }
  }, [isAuthenticated, isLoading]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("buzzboard_twitter_prompt_dismissed", "true");
  };

  if (!show || isAuthenticated) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Centered Card */}
      <div className="relative w-full max-w-md mx-4 sm:mx-0 bg-gray-900/70 rounded-3xl shadow-2xl p-7 flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-200 text-3xl font-bold focus:outline-none"
          onClick={handleDismiss}
          aria-label="Close"
        >
          ×
        </button>
        {/* X Logo */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-black/30 mb-6 mt-2">
          <svg
            width="56"
            height="56"
            viewBox="0 0 1200 1227"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="1200" height="1227" rx="300" fill="#18181B" />
            <path
              d="M860 320H1010L710 650L1050 1060H820L610 800L370 1060H220L540 710L210 320H450L640 560L860 320ZM820 980H890L470 400H400L820 980Z"
              fill="#fff"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-gray-100 mb-3">
          Join the Buzz—Connect X
        </h2>
        <p className="text-gray-300 mb-8 text-base max-w-m mx-auto">
          Access your profile, create campaigns, and collaborate with your
          favorite KOLs. Connect your X account to unlock all features!
        </p>
        <button
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#18181B] hover:bg-[#232329] text-white font-semibold rounded-xl shadow-md border border-[#333] transition-all text-lg focus:outline-none focus:ring-2 focus:ring-accent-brand focus:ring-offset-2 disabled:opacity-60"
          onClick={login}
          disabled={isLoading}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 1200 1227"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="1200" height="1227" rx="300" fill="#18181B" />
            <path
              d="M860 320H1010L710 650L1050 1060H820L610 800L370 1060H220L540 710L210 320H450L640 560L860 320ZM820 980H890L470 400H400L820 980Z"
              fill="#fff"
            />
          </svg>
          Connect X
        </button>
        <button
          className="mt-5 text-xs text-gray-400 hover:text-gray-200 underline"
          onClick={handleDismiss}
        >
          Maybe later
        </button>
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
