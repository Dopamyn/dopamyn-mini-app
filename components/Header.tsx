"use client";

import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { Briefcase, Menu, Power, X, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { XLogo } from "@/components/icons/x-logo";
import { TgIcon } from "@/public/icons/TgIcon";
import { FarcasterIcon } from "@/public/icons/FarcasterIcon";
import LogoFullIcon from "@/public/icons/LogoFullIcon";
import UpdateWalletDialog from "@/app/components/UpdateWalletDialog";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";

const navItems = [
  {
    label: "Campaigns",
    href: "/campaigns",
    active: true,
  },
  {
    label: "Docs",
    href: "/docs",
    active: false,
  },
  // {
  //   label: "Earn DOPE",
  //   href: "/communities",
  //   active: true,
  // },
];

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileProfileDropdownOpen, setIsMobileProfileDropdownOpen] =
    useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        mobileDropdownRef.current &&
        !mobileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMobileProfileDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header
      className={`absolute md:sticky top-0 left-0 w-full z-50 transition-all duration-300  ${
        scrolled
          ? "bg-dark-primary backdrop-blur-lg shadow-lg border-b border-dark-tertiary/60"
          : "bg-dark-primary backdrop-blur-xl border-b border-dark-tertiary/50"
      }`}
    >
      <div className="w-full max-w-none px-4 md:px-8 lg:px-12 xl:px-12 2xl:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Left side */}
          <Link href="/" className="flex items-center gap-2 group">
            <LogoFullIcon width="172" height="48" />
          </Link>

          {/* Right side - Navigation and Authentication */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Navigation Links */}
            <nav className="flex items-center space-x-6">
              {navItems.map((item) =>
                !item.active ? (
                  <div
                    key={item.href}
                    className="relative font-medium transition-colors duration-300 px-4 py-1 rounded-md cursor-not-allowed text-gray-500 hover:text-gray-400 group"
                    title="Coming Soon"
                  >
                    {item.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-dark-primary text-accent-brand text-xs px-3 py-2 rounded shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                      Coming Soon
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative font-medium transition-colors duration-300 px-4 py-1 rounded-md after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0  after:transition-all after:duration-300 hover:text-light-primary hover:after:w-full ${
                      pathname?.startsWith(item.href)
                        ? "text-accent-brand after:w-full "
                        : "text-light-tertiary hover:text-accent-brand"
                    }`}
                  >
                    {item.label}
                    {/* {(item.href === "/campaigns" || item.href === "/my-quests") && (
                      <span className="absolute -top-1 -right-3 w-2 h-2 bg-light-primary rounded-full animate-pulse"></span>
                    )} */}
                  </Link>
                )
              )}
            </nav>

            {/* Social Links - Commented out for now */}
            {/* <div className="flex items-center gap-2">
              <a
                href="https://t.me/Xalpha_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-tertiary hover:text-light-primary transition-colors p-2 hover:bg-dark-alpha-secondary rounded-full"
              >
                <TgIcon width={20} height={20} />
              </a>
              <a
                href="https://x.com/dopamyn_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="text-light-tertiary hover:text-light-primary transition-colors p-2 hover:bg-dark-alpha-secondary rounded-full"
              >
                <XLogo width={20} height={20} />
              </a>
            </div> */}

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
              <div className="flex items-center gap-3">
                {/* Wallet Management Button */}
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

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() =>
                    setIsProfileDropdownOpen(!isProfileDropdownOpen)
                  }
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
                      href="/my-campaigns"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                    >
                      <Briefcase className="w-4 h-4" />
                      Profile
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
              </div>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 md:hidden">
            {/* Mobile Wallet Button - only show when authenticated and not loading */}
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-dark-secondary animate-pulse"></div>
            ) : (
              isAuthenticated && (
                <>
                  {/* Mobile Wallet Management Button */}
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

                  {/* Mobile Profile Dropdown */}
                  <div className="relative" ref={mobileDropdownRef}>
                  <button
                    onClick={() =>
                      setIsMobileProfileDropdownOpen(
                        !isMobileProfileDropdownOpen
                      )
                    }
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
                  {isMobileProfileDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-dark-primary border border-light-tertiary rounded-lg shadow-lg py-1 z-50">
                      <div className="px-4 py-2 text-xs text-light-tertiary border-b border-light-tertiary truncate">
                        {getDisplayName()}
                      </div>
                      <Link
                        href="/my-campaigns"
                        onClick={() => {
                          setIsMobileProfileDropdownOpen(false);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        Profile
                      </Link>

                      <button
                        onClick={() => {
                          logout();
                          setIsMobileProfileDropdownOpen(false);
                          setIsMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-light-primary hover:bg-dark-secondary hover:text-light-primary transition-colors flex items-center gap-2"
                      >
                        <Power className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                  </div>
                </>
              )
            )}
            {/* Hamburger - always show in mobile */}
            <button
              className="text-light-primary hover:text-light-primary transition-colors duration-300 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <div
          className={`md:hidden overflow-hidden  w-full  transition-all duration-300 ease-in-out z-[100] ${
            isMenuOpen ? "h-screen" : "max-h-0"
          }`}
          style={{ transitionProperty: "max-height" }}
        >
          {isMenuOpen && (
            <div className="py-4 flex flex-col border-t  border-light-tertiary  animate-fade-in">
              {navItems.map((item) =>
                !item.active ? (
                  <div
                    key={item.href}
                    className="text-gray-500 hover:text-gray-400 transition-colors font-medium text-2xl mt-0 py-6 px-4 border-b border-light-tertiary relative cursor-not-allowed group"
                    title="Coming Soon"
                  >
                    {item.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-dark-primary text-light-primary text-xs px-2 py-1 rounded shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                      Coming Soon
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-light-tertiary hover:text-light-primary transition-colors font-medium text-2xl mt-0 py-6 px-4 border-b border-light-tertiary relative ${
                      pathname?.startsWith(item.href)
                        ? "!text-light-primary"
                        : ""
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                    {item.href === "/raids" && (
                      <span className="absolute top-6 right-6 w-2 h-2 bg-light-primary rounded-full animate-pulse"></span>
                    )}
                  </Link>
                )
              )}
              {!isLoading && !isAuthenticated && (
                <button
                  className="btn-primarynew w-full mx-4 mt-4"
                  onClick={() => {
                    login();
                    setIsMenuOpen(false);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Connecting..." : "Login with X"}
                </button>
              )}

              {/* Mobile Social Links - Commented out for now */}
              {/* <div className="flex items-center justify-center gap-4 mt-6 px-4">
                <a
                  href="https://t.me/Xalpha_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-light-tertiary hover:text-light-primary transition-colors p-3 hover:bg-dark-alpha-secondary rounded-full"
                >
                  <TgIcon width={24} height={24} />
                </a>
                <a
                  href="https://x.com/dopamyn_fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-light-tertiary hover:text-light-primary transition-colors p-3 hover:bg-dark-alpha-secondary rounded-full"
                >
                  <XLogo width={24} height={24} />
                </a>
              </div> */}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
