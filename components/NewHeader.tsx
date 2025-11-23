/**
 * NewHeader Component
 *
 * A reusable header component that spans the width after the sidebar.
 * Features:
 * - Fixed positioning at the top (starts after sidebar width)
 * - Customizable left side content via HeaderContext
 * - Right side: Authentication UI and Telegram link (same across all pages)
 *
 * Usage:
 * Import and use the `useHeader` hook in any component to customize the left side:
 *
 * ```tsx
 * import { useHeader } from "@/contexts/HeaderContext";
 *
 * function MyPage() {
 *   const { setHeaderContent } = useHeader();
 *
 *   useEffect(() => {
 *     setHeaderContent(
 *       <div className="flex items-center gap-4">
 *         <h1>My Page Title</h1>
 *         <button>Action Button</button>
 *       </div>
 *     );
 *
 *     return () => setHeaderContent(null); // Cleanup
 *   }, [setHeaderContent]);
 * }
 * ```
 */

"use client";

import { Briefcase, Power, Wallet, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TgIcon } from "@/public/icons/TgIcon";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { useHeader } from "@/contexts/HeaderContext";
import { useUser } from "@/contexts/UserContext";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

export default function NewHeader() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileProfileDropdownOpen, setIsMobileProfileDropdownOpen] =
    useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

  const { headerContent } = useHeader();
  const {
    isAuthenticated,
    isLoading,
    user: twitterUser,
    dbUser,
    login,
    logout,
    isProcessing,
    getProfileImage,
    getDisplayName,
  } = useTwitterDatabaseSync();
  const { user } = useUser();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
        setIsMobileProfileDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 z-50 bg-dark-primary backdrop-blur-lg shadow-lg border-b border-dark-tertiary/60 h-16">
      <div className="w-full max-w-none px-4 md:px-8 lg:px-12 xl:px-12 2xl:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo on mobile, Customizable content on desktop */}
          <div className="flex items-center">
            {/* Mobile Logo */}
            <div className="md:hidden mr-4">
              <Link href="/" className="flex items-center">
                <img src="/favicon-dope.svg" alt="Logo" className="w-8 h-8" />
              </Link>
            </div>
            {/* Desktop Custom Content */}
            <div className="hidden md:block">{headerContent}</div>
          </div>

          {/* Right side - Authentication and Social Links */}
          <div className="flex items-center space-x-4 mt-2">
            {/* Telegram Link */}
            <a
              href="https://t.co/NGldDE2RIn"
              target="_blank"
              rel="noopener noreferrer"
              className="text-light-tertiary hover:text-light-primary transition-colors p-2 hover:bg-dark-alpha-secondary rounded-full"
            >
              <TgIcon width={20} height={20} />
            </a>

            {/* Wallet Management Button - only show when authenticated */}
            {isAuthenticated && (
              <Dialog
                open={isWalletDialogOpen}
                onOpenChange={setIsWalletDialogOpen}
              >
                <DialogTrigger asChild>
                  <button
                    className="w-8 h-8 rounded-full border-2 border-accent-brand/50 hover:border-accent-brand transition-all flex items-center justify-center bg-accent-brand/10 hover:bg-accent-brand/20"
                    title="Manage Wallets"
                  >
                    <Wallet className="w-4 h-4 text-accent-brand" />
                  </button>
                </DialogTrigger>
                <UpdateWalletDialog
                  onClose={() => setIsWalletDialogOpen(false)}
                  open={isWalletDialogOpen}
                />
              </Dialog>
            )}

            {/* Authentication UI - only render after loading to prevent hydration mismatch */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-dark-secondary animate-pulse"></div>
            ) : !isAuthenticated ? (
              <button
                className="btn-primarynew sm:inline-flex items-center justify-center min-w-[120px]"
                onClick={login}
                disabled={isProcessing}
              >
                {isProcessing ? "Connecting..." : "Login with X"}
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setIsProfileDropdownOpen(!isProfileDropdownOpen);
                    setIsMobileProfileDropdownOpen(
                      !isMobileProfileDropdownOpen
                    );
                  }}
                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-light-primary/50 transition-all"
                >
                  <img
                    src={getProfileImage()}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/placeholder.svg?height=32&width=32";
                    }}
                  />
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-dark-primary border border-light-tertiary rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-xs text-light-tertiary border-b border-light-tertiary">
                      {getDisplayName()}
                    </div>
                    <Link
                      href="/my-profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      Profile
                    </Link>

                    <Link
                      href="/verify"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                    >
                      {user?.world_id_verified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="flex items-center gap-2">
                            Verified
                            <span className="text-xs text-green-500">✓</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Verify Human
                        </>
                      )}
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                    >
                      <Power className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
