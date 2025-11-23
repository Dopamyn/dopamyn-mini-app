"use client";

import { useState, useRef, useEffect } from "react";

interface TweetHoverLinkProps {
  url: string; // full tweet URL like https://x.com/i/status/123
  children?: React.ReactNode;
  className?: string;
}

// Lightweight hover-preview for X/Twitter posts using embed iframe
export default function TweetHoverLink({ url, children, className }: TweetHoverLinkProps) {
  const [showPreview, setShowPreview] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Ensure the URL looks like a tweet
  const isTweetUrl = /(?:x\.com|twitter\.com)\/(?:i\/status|[^/]+\/status)\/\d+/.test(url);

  // Normalize to twitter.com for embeds
  const normalizedUrl = url.replace("https://x.com", "https://twitter.com");

  // Extract tweet id
  const tweetId = (() => {
    const m = normalizedUrl.match(/status\/(\d+)/);
    return m ? m[1] : "";
  })();

  // Load widgets.js once
  useEffect(() => {
    if (!isTweetUrl) return;
    if (typeof window === "undefined") return;
    const existing = document.querySelector("script[src='https://platform.twitter.com/widgets.js']");
    if (!existing) {
      const s = document.createElement("script");
      s.async = true;
      s.src = "https://platform.twitter.com/widgets.js";
      s.charset = "utf-8";
      document.body.appendChild(s);
    }
  }, [isTweetUrl]);

  // Position popover near anchor (above if space, else below). Recompute on show.
  const positionPopover = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const width = 320; // desired width
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default place above using approximate height; refine after render
    const approxHeight = 360;
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

  // Render embed on show and position
  useEffect(() => {
    if (!showPreview || !(window as any)?.twttr?.widgets || !previewRef.current || !tweetId) return;
    previewRef.current.innerHTML = "";
    // Create compact tweet with width control
    (window as any).twttr.widgets
      .createTweet(tweetId, previewRef.current, {
        theme: "dark",
        conversation: "none",
        align: "center",
        width: 320,
        dnt: true,
      })
      .then(() => positionPopover());
  }, [showPreview, tweetId]);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      positionPopover();
      setShowPreview(true);
    }, 200);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPreview(false), 150);
  };

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <a ref={anchorRef} href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children || url}
      </a>
      {isTweetUrl && showPreview && (
        <div
          ref={previewRef}
          className="fixed z-[1000] bg-black/90 border border-neutral-700 rounded-xl shadow-xl overflow-hidden p-1"
          style={{ top: coords.top, left: coords.left, width: 320 }}
        />
      )}
    </span>
  );
}


