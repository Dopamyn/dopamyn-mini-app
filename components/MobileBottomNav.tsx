"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, DollarSign, User, Menu, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import { useState } from "react";
import { TgIcon } from "@/public/icons/TgIcon";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAuthenticated, login } = useTwitterAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    {
      label: "Campaigns",
      href: "/campaigns",
      icon: Trophy,
      active: true,
    },
    {
      label: "Earnings",
      href: "#",
      icon: DollarSign,
      active: false,
    },
  ];

  const handleLoginClick = () => {
    if (!isAuthenticated) {
      login();
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-primary border-t border-dark-tertiary px-4 py-3">
        <div className="flex items-center justify-around max-w-screen-xl mx-auto">
          <Link
            href="/campaigns"
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-0 flex-1",
              pathname?.startsWith("/campaigns")
                ? "text-accent-brand"
                : "text-light-tertiary hover:text-light-primary"
            )}
          >
            <Trophy className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Campaigns</span>
          </Link>

          {/* Earnings */}
          <div
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-0 flex-1 opacity-60 cursor-not-allowed"
            )}
            title="Coming Soon"
          >
            <DollarSign className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Earnings</span>
          </div>

          {/* Login/Profile */}
          {isAuthenticated && user ? (
            <Link
              href="/my-profile"
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-0 flex-1",
                pathname?.startsWith("/my-profile")
                  ? "text-accent-brand"
                  : "text-light-tertiary hover:text-light-primary"
              )}
            >
              {user.profile_image_url ? (
                <div className="w-6 h-6 rounded-full overflow-hidden mb-2">
                  <img
                    src={user.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <User className="w-6 h-6 mb-2" />
              )}
              <span className="text-sm font-medium">Profile</span>
            </Link>
          ) : (
            <button
              onClick={handleLoginClick}
              className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-0 flex-1 text-light-tertiary hover:text-light-primary"
            >
              <LogIn className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium">Login</span>
            </button>
          )}

          {/* Hamburger Menu */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-w-0 flex-1 text-light-tertiary hover:text-light-primary"
          >
            <Menu className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/50"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-dark-primary border-t border-dark-tertiary rounded-t-2xl p-6 transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1 bg-dark-tertiary rounded-full"></div>
            </div>

            <div className="space-y-4">
              {/* Menu Items */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname?.startsWith(item.href) && item.href !== "#";

                if (!item.active) {
                  return (
                    <div
                      key={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-white/60 cursor-not-allowed"
                    >
                      <Icon className="w-6 h-6" />
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-accent-brand ml-auto">
                        Coming Soon
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-dark-quaternary text-light-primary"
                        : "text-light-primary hover:bg-dark-quaternary/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-4 top-0 bottom-0 w-1 bg-accent-brand rounded-r-full"></div>
                    )}
                    <Icon className="w-6 h-6" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Additional Menu Items */}
              {isAuthenticated && user && (
                <>
                  <Link
                    href="/my-profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      pathname?.startsWith("/my-profile")
                        ? "bg-dark-quaternary text-light-primary"
                        : "text-light-primary hover:bg-dark-quaternary/50"
                    )}
                  >
                    {pathname?.startsWith("/my-profile") && (
                      <div className="absolute left-4 top-0 bottom-0 w-1 bg-accent-brand rounded-r-full"></div>
                    )}
                    <User className="w-6 h-6" />
                    <span className="font-medium">My Account</span>
                  </Link>

                  {/* <Link
                    href="/communities"
                    onClick={() => setIsMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      pathname?.startsWith("/communities")
                        ? "bg-dark-quaternary text-light-primary"
                        : "text-light-primary hover:bg-dark-quaternary/50"
                    )}
                  >
                    {pathname?.startsWith("/communities") && (
                      <div className="absolute left-4 top-0 bottom-0 w-1 bg-accent-brand rounded-r-full"></div>
                    )}
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 8h-2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-4 0H9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4 4H7c-.55 0-1-.45-1-1s.45-1 1-1h10c.55 0 1 .45 1 1s-.45 1-1 1z" />
                    </svg>
                    <span className="font-medium">Communities</span>
                  </Link> */}
                </>
              )}

              {/* Social Links */}
              <div className="border-t border-dark-tertiary pt-4 mt-4">
                <div className="flex items-center gap-3 text-light-tertiary text-sm mb-3">
                  <span className="font-semibold">Follow us</span>
                </div>
                <div className="flex items-center gap-4">
                  <a
                    href="https://x.com/dopamyn_fun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-light-tertiary hover:text-light-primary transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://t.co/NGldDE2RIn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-sm flex items-center justify-center text-light-tertiary hover:text-light-primary transition-colors"
                  >
                    <TgIcon width={24} height={24} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
