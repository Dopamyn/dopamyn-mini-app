"use client";

import { XLogo } from "@/components/icons/x-logo";
import { useTwitterAuth } from "@/contexts/TwitterAuthContext";
import { ArrowLeft, ExternalLink, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { isAuthenticated, user, logout } = useTwitterAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-brand mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-brand mx-auto mb-4"></div>
          <p className="text-gray-300">Redirecting...</p>
        </div>
      </div>
    );
  }

  const xUser = user.twitter;
  const walletAddress = user.wallet?.address;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </Link>
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-2xl p-8">
              <div className="flex items-start gap-6 mb-6">
                {xUser?.profilePictureUrl && (
                  <img
                    src={xUser.profilePictureUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-2 border-accent-brand/30"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">
                      {xUser?.name || "Twitter User"}
                    </h2>
                    <XLogo className="w-5 h-5" />
                  </div>
                  {xUser?.username && (
                    <p className="text-gray-300 mb-3">@{xUser.username}</p>
                  )}
                  {(xUser as any)?.description && (
                    <p className="text-gray-400 leading-relaxed">
                      {(xUser as any).description}
                    </p>
                  )}
                </div>
              </div>

              {/* X Stats */}
              {((xUser as any)?.numFollowers ||
                (xUser as any)?.numFollowing) && (
                <div className="flex gap-6 mb-6 pb-6 border-b border-gray-700/50">
                  {(xUser as any).numFollowers && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent-brand">
                        {(xUser as any).numFollowers.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Followers</div>
                    </div>
                  )}
                  {(xUser as any).numFollowing && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {(xUser as any).numFollowing.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Following</div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {xUser?.username && (
                  <a
                    href={`https://twitter.com/${xUser.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2"
                  >
                    <XLogo className="w-4 h-4" />
                    View on Twitter
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button onClick={logout} className="btn-secondary">
                  Disconnect Account
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-5 h-5 text-accent-brand" />
                <h3 className="text-lg font-semibold text-white">Wallet</h3>
              </div>
              {walletAddress ? (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Address:</p>
                  <p className="text-sm font-mono text-gray-300 bg-gray-900/50 p-3 rounded-lg break-all">
                    {walletAddress}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400">No wallet connected</p>
              )}
            </div>

            {/* Account Info */}
            <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Account Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">User ID:</p>
                  <p className="text-sm text-gray-300 font-mono">
                    {user.id.slice(0, 8)}...{user.id.slice(-8)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Joined:</p>
                  <p className="text-sm text-gray-300">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
