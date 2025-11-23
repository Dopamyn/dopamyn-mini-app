"use client";

import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { TgIcon } from "@/public/icons/TgIcon";
import { useToast } from "@/hooks/use-toast";
import { useMiniApp } from "@/hooks/useMiniApp";

export default function TelegramBotJoin() {
  const { isAuthenticated, login, isProcessing, getTwitterHandle } =
    useTwitterDatabaseSync();
  const { toast } = useToast();
  const { isMiniApp } = useMiniApp();

  const handleTelegramJoin = async () => {
    if (!isAuthenticated) {
      // User not logged in, ask to login first
      toast({
        title: "Login Required",
        description:
          "Please login with X to get quest and campaign notifications",
        duration: 3000,
      });
      login();
      return;
    }

    // User is authenticated, get their x_handle and redirect to telegram bot
    const twitterHandle = getTwitterHandle();

    if (!twitterHandle) {
      toast({
        title: "Error",
        description:
          "Unable to get your X handle. Please try logging in again.",
        duration: 3000,
      });
      return;
    }

    try {
      // Encrypt the x_handle using the API route
      const response = await fetch("/api/encrypt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: twitterHandle }),
      });

      if (!response.ok) {
        throw new Error("Failed to encrypt handle");
      }

      const { encryptedText } = await response.json();

      // Redirect to telegram bot with encrypted handle as start parameter
      const telegramBotUrl = `https://t.me/dopamynfunbot?start=${encryptedText}`;
      
      // In mini app, window.open() doesn't work, use window.location.href instead
      if (isMiniApp) {
        // In mini app, navigate directly to the URL
        window.location.href = telegramBotUrl;
        toast({
          title: "Opening Telegram",
          description: "Redirecting to Telegram bot...",
          duration: 2000,
        });
      } else {
        // In regular browser, open in new tab
        window.open(telegramBotUrl, "_blank");
        toast({
          title: "Redirecting to Telegram",
          description: "Opening Telegram bot in a new tab...",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to encrypt handle:", error);
      toast({
        title: "Error",
        description: "Failed to prepare secure connection. Please try again.",
        duration: 3000,
      });
    }
  };

  return (
    <div className="bg-[radial-gradient(circle_at_center_top,#2AABEE40_0%,rgba(42,171,238,0.2)_20%,rgba(42,171,238,0.1)_50%,transparent_100%)] backdrop-blur-lg border border-neutral-600/50 rounded-lg p-3 sm:p-4 text-center">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2AABEE] rounded-full flex items-center justify-center flex-shrink-0">
            <TgIcon width={20} height={20} color="#ffffff" />
          </div>

          <div className="text-left">
            <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
              Stay Updated on Campaigns
            </h3>
            <p className="text-neutral-300 text-xs sm:text-sm leading-tight">
              Get instant notifications about new campaigns and more
            </p>
          </div>
        </div>

        <button
          onClick={handleTelegramJoin}
          disabled={isProcessing}
          className="btn-primarynew inline-flex items-center justify-center px-3 sm:px-4 py-2 gap-2 text-xs sm:text-sm flex-shrink-0 w-full sm:w-auto"
        >
          {isProcessing ? (
            "Processing..."
          ) : !isAuthenticated ? (
            <>
              <TgIcon width={14} height={14} color="#000000" />
              <span className="hidden sm:inline">
                Login & Get Notifications
              </span>
              <span className="sm:hidden">Login & Join</span>
            </>
          ) : (
            <>
              <TgIcon width={14} height={14} color="#000000" />
              <span className="hidden sm:inline">Get Notifications</span>
              <span className="sm:hidden">Join Bot</span>
            </>
          )}
        </button>
      </div>

      {!isAuthenticated && (
        <p className="text-xs text-neutral-400 mt-2 text-center sm:text-left">
          Login with X to receive campaign updates
        </p>
      )}
    </div>
  );
}
