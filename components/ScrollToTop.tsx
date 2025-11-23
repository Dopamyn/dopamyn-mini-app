"use client";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

interface ScrollToTopProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  showAfter?: number; // Show after scrolling this many pixels
}

export default function ScrollToTop({
  containerRef,
  showAfter = 300,
}: ScrollToTopProps) {
  const [show, setShow] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // For mobile, we listen to window scroll
    // For desktop, we listen to container scroll if containerRef is provided
    const target = isMobile ? window : containerRef?.current;
    if (!target) return;

    const handleScroll = () => {
      const scrollPosition = isMobile
        ? window.scrollY
        : containerRef?.current?.scrollTop || 0;
      setShow(scrollPosition > showAfter);
    };

    target.addEventListener("scroll", handleScroll);
    return () => target.removeEventListener("scroll", handleScroll);
  }, [containerRef, showAfter, isMobile]);

  const scrollToTop = () => {
    if (isMobile) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  if (!show) return null;

  return (
    <Button
      variant="secondary"
      className={`
        fixed z-[100] shadow-xl transition-all duration-200 ease-in-out
        ${
          isMobile
            ? `bottom-4 right-3 bg-accent-brand hover:bg-[#00C080] text-gray-900 
             px-4 py-2 h-auto rounded-full font-medium text-xs
             hover:shadow-[0_0_15px_rgba(0,217,146,0.5)]
             active:transform active:scale-95`
            : `bottom-4 right-4 bg-neutral-800 hover:bg-neutral-700 text-white
             rounded-full p-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]`
        }
      `}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      {isMobile ? (
        <div className="flex items-center gap-1.5 text-xs">
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>Top</span>
        </div>
      ) : (
        <ChevronUp className="h-4 w-4" />
      )}
    </Button>
  );
}
