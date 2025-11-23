"use client";

import { useState, useRef, useEffect } from "react";

interface ProfileHoverLinkProps {
  handle: string;
  children: React.ReactNode;
  className?: string;
}

export default function ProfileHoverLink({ handle, children, className }: ProfileHoverLinkProps) {
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Clean handle (remove @ if present)
  const cleanHandle = handle.replace(/^@/, "");
  const profileUrl = `https://twitter.com/${cleanHandle}`;

  // Position popover near anchor (above if space, else below). Recompute on show.
  const positionPopover = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = 300; // desired width for profile card
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default place above using approximate height; refine after render
    const approxHeight = 200;
    let top = rect.top - approxHeight - margin;
    if (top < margin) {
      top = rect.bottom + margin; // place below
    }
    // Center horizontally relative to link, clamp to viewport
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));
    setCoords({ top, left });

    // After embed computes real height, adjust if off-screen
    setTimeout(() => {
      const h = previewRef.current?.offsetHeight || approxHeight;
      let t = rect.top - h - margin;
      if (t < margin) t = rect.bottom + margin;
      setCoords({ top: t, left });
    }, 250);
  };

  // Load Twitter widgets script
  const loadTwitterWidgets = () => {
    if (typeof window !== "undefined" && !(window as any).twttr) {
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      document.body.appendChild(script);
      (window as any).twttr = true; // Mark as loaded
    }
  };

  // Render profile card on show and position
  useEffect(() => {
    if (!showPreview || !(window as any)?.twttr?.widgets || !previewRef.current || !cleanHandle) return;
    
    loadTwitterWidgets();
    
    previewRef.current.innerHTML = "";
    // Create profile card with width control
    (window as any).twttr.widgets
      .createFollowButton(cleanHandle, previewRef.current, {
        size: "large",
        showScreenName: true,
        showCount: true,
      })
      .then(() => {
        // Also try to create a profile card if available
        if ((window as any).twttr.widgets.createTimeline) {
          const timelineContainer = document.createElement("div");
          timelineContainer.style.width = "300px";
          timelineContainer.style.height = "200px";
          timelineContainer.style.overflow = "hidden";
          previewRef.current?.appendChild(timelineContainer);
          
          (window as any).twttr.widgets
            .createTimeline(
              {
                sourceType: "profile",
                screenName: cleanHandle,
              },
              timelineContainer,
              {
                theme: "dark",
                height: 200,
                width: 300,
                chrome: "noheader nofooter noborders transparent",
              }
            )
            .then(() => positionPopover());
        } else {
          positionPopover();
        }
      });
  }, [showPreview, cleanHandle]);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      positionPopover();
      setShowPreview(true);
    }, 200);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowPreview(false);
  };

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <a ref={anchorRef} href={profileUrl} target="_blank" rel="noopener noreferrer" className={className}>
        {children || `@${cleanHandle}`}
      </a>
      {showPreview && (
        <div
          ref={previewRef}
          className="fixed z-[1000] bg-black/90 border border-neutral-700 rounded-xl shadow-xl overflow-hidden p-2"
          style={{ top: coords.top, left: coords.left, width: 300 }}
        />
      )}
    </span>
  );
}

