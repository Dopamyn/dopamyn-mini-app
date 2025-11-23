"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <>
      {!isLandingPage && <Sidebar />}
      <main className={isLandingPage ? "" : "md:ml-64 md:pb-0"}>
        <div
          className={
            isLandingPage
              ? ""
              : "mx-auto max-w-6xl 3xl:max-w-7xl px-2 sm:px-4 "
          }
        >
          {children}
        </div>
      </main>
      {!isLandingPage && <MobileBottomNav />}
    </>
  );
}
