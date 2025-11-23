"use client";

import CollaborateDialog from "@/components/CollaborateDialog";
import { Button } from "@/components/ui/button";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface ProfileData {
  name: string;
  author_handle: string;
  bio: string;
  profile_image_url: string;
  followers_count: number;
  smart_followers_count: number;
  mindshare: number;
  account_created_at?: string;
}

interface KOLProfileHeaderProps {
  profile: ProfileData;
  accountCreatedText: string;
}

export default function KOLProfileHeader({
  profile,
  accountCreatedText,
}: KOLProfileHeaderProps) {
  // Use the Twitter database sync hook
  const { isAuthenticated, user, isProcessing, login } =
    useTwitterDatabaseSync();

  // Render collaborate button based on authentication and user state
  const renderCollaborateButton = () => {
    if (!isAuthenticated) {
      return (
        <Button
          disabled
          className="bg-gray-600 text-gray-300 cursor-not-allowed"
        >
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    if (!isAuthenticated) {
      return (
        <Button
          onClick={login}
          disabled={isProcessing}
          className="bg-accent-brand hover:bg-[#00C080] text-gray-900 font-medium"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect X to Collaborate"
          )}
        </Button>
      );
    }

    if (isProcessing) {
      return (
        <Button
          disabled
          className="bg-gray-600 text-gray-300 cursor-not-allowed"
        >
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </Button>
      );
    }

    // User is authenticated and account is set up
    return (
      <CollaborateDialog influencerHandle={profile.author_handle}>
        <Button className="bg-accent-brand hover:bg-[#00C080] text-gray-900 font-medium">
          Collaborate
        </Button>
      </CollaborateDialog>
    );
  };

  return (
    <div className="card-trendsage group mb-6 lg:mb-8 bg-neutral-800 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4 lg:gap-6 relative">
        {/* Collaborate Button - Responsive positioning */}
        <div className="absolute top-0 right-0 hidden sm:block">
          {renderCollaborateButton()}
        </div>

        <Link
          href={`https://twitter.com/${profile.author_handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer hover:opacity-80 transition-opacity mx-auto sm:mx-0"
        >
          <img
            src={
              profile.profile_image_url ||
              "/placeholder.svg?height=200&width=200"
            }
            alt={profile.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-transparent group-hover:ring-accent-brand/50 transition-all"
          />
        </Link>
        <div className="flex-1 text-center sm:text-left sm:pr-36">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100 mb-1 group-hover:text-accent-brand transition-colors">
            {profile.name}
          </h1>
          <p className="text-base sm:text-lg text-gray-400 mb-1">
            @{profile.author_handle}
          </p>
          {accountCreatedText && (
            <p className="text-xs text-gray-500 mb-2 sm:mb-3">
              {accountCreatedText}
            </p>
          )}
          {profile.bio && (
            <p className="text-sm text-gray-300 leading-snug">{profile.bio}</p>
          )}
        </div>
        {/* Mobile Collaborate Button */}
        <div className="flex justify-center w-full sm:hidden">
          {renderCollaborateButton()}
        </div>
      </div>
    </div>
  );
}
