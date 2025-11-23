"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, DollarSign, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import LogoFullIcon from "@/public/icons/LogoFullIcon";
import { TgIcon } from "@/public/icons/TgIcon";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAuthenticated } = useTwitterAuth();

  const sidebarItems = [
    {
      label: "My Profile",
      href: "/my-profile",
      icon: User,
      active: true,
      showWhenAuthenticated: true,
    },
    {
      label: "Campaigns",
      href: "/campaigns",
      icon: Trophy,
      active: true,
      showWhenAuthenticated: false,
    },
    {
      label: "My Earnings",
      href: "/my-earnings",
      icon: DollarSign,
      active: false,
      showWhenAuthenticated: true,
    },
  ].filter((item) => !item.showWhenAuthenticated || isAuthenticated);

  return (
    <aside className="hidden md:fixed md:left-0 md:top-0 md:h-screen md:w-64 md:bg-dark-primary border-r border-dark-alpha-quaternary md:z-40 md:block md:overflow-y-auto md:overflow-x-hidden md:rounded-lg">
      {/* Logo at the top */}
      <div className="py-4 px-8 ">
        <Link href="/" className="flex items-center group">
          <LogoFullIcon width="160" height="48" />
        </Link>
      </div>
      <nav className="p-4 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href) && item.href !== "#";

          if (!item.active) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-3 text-white/60 cursor-not-allowed group relative text-sm"
                title="Coming Soon"
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 bg-dark-primary text-accent-brand text-xs px-2 py-1 rounded shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  Coming Soon
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 group relative text-sm",
                isActive
                  ? "text-light-primary"
                  : "text-light-primary hover:text-light-primary hover:bg-dark-quaternary/50"
              )}
              style={
                isActive
                  ? {
                      background: `radial-gradient(ellipse at center top, #FF808045 0%, #FF808040 15%, #FF808035 25%, #FF808025 40%, #FF808015 70%, #FF808015 85%, transparent 105%)`,
                    }
                  : undefined
              }
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-brand rounded-r-full"></div>
              )}
              {item.label === "My Account" && user?.profile_image_url ? (
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={user.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-accent-brand" : "text-light-primary"
                  )}
                />
              )}
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Social Media Section */}
        {/* <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 text-light-tertiary text-sm mb-3">
            <span className="font-semibold">Follow us</span>
            <div className="flex items-center gap-3 ml-auto">
              
              <a
                href="https://x.com/dopamyn_fun"
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 rounded-sm flex items-center justify-center  transition-colors"
              >
                <svg
                  className="w-6 h-6 text-light-tertiary"
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
                className="w-6 h-6 rounded-sm flex items-center justify-center  transition-colors"
              >
                <TgIcon
                  width={24}
                  height={24}
                  className="text-light-tertiary"
                />
              </a>
            </div>
          </div>
        </div> */}
      </nav>
    </aside>
  );
}
