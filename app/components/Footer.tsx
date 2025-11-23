"use client";

import { XLogo } from "@/components/icons/x-logo";
import { TgIcon } from "@/public/icons/TgIcon";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  return (
    <footer className="bg-dark-primary opacity-90 fixed bottom-0 left-0 right-0">
      <div className="border-t border-neutral-700 bg-dark-primary ">
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 ${
            isLandingPage ? "" : "md:ml-64"
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 justify-between items-center">
            <p className="text-sm text-secondary-text">
              © {new Date().getFullYear()} Dopamyn. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
              {/* <div className="flex gap-6">
                <a
                  href="#"
                  className="text-sm text-neutral-300 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-sm text-neutral-300 hover:text-white transition-colors"
                >
                  Terms & Conditions
                </a>
              </div> */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-neutral-300 transition-colors">Follow us:</span>
                <a
                  href="https://t.co/NGldDE2RIn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary-text hover:text-white transition-colors p-2 hover:bg-neutral-700/50 rounded-full"
                >
                  <TgIcon width={22} height={22} />
                </a>
                <a
                  href="https://x.com/Dopamyn_fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary-text hover:text-white transition-colors p-2 hover:bg-neutral-700/50 rounded-full"
                >
                  <XLogo width={22} height={22} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
