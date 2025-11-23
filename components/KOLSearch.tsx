"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

// Add debounce function
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface KOL {
  author_handle: string;
  name: string;
  score: number;
  followers: number;
  smart_followers: number;
  avg_views: number;
  profile_image_url: string;
}

interface KOLSearchProps {
  onSelect?: (handle: string) => void;
  navigateOnSelect?: boolean;
  placeholder?: string;
}

export default function KOLSearch({
  onSelect,
  navigateOnSelect = true,
  placeholder = "Search KOL by name or Twitter handle (min. 4 characters)...",
}: KOLSearchProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<KOL[]>([]);
  const [showResults, setShowResults] = useState(false);

  const searchAuthors = async (term: string) => {
    if (!term.trim() || term.trim().length < 4) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/user/search-authors?search_term=${term}&category=KOL&limit=10&start=0`
      );
      const data = await response.json();

      if (data.result && data.result.length > 0) {
        const authors = data.result.map((author: any) => ({
          author_handle: author.author_handle,
          name: author.name,
          score: author.engagement_score || 0,
          followers: author.followers_count,
          smart_followers: author.smart_followers_count,
          avg_views: Math.round(
            author.crypto_tweets_views_all / (author.crypto_tweets_all || 1)
          ),
          profile_image_url: author.profile_image_url,
        }));
        setSearchResults(authors);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (err) {
      console.error("Error searching authors:", err);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Create debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => searchAuthors(term), 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim() && value.trim().length >= 4) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleResultClick = (handle: string) => {
    if (onSelect) {
      onSelect(handle);
    }
    if (navigateOnSelect) {
      router.push(`/kols/${handle}`);
    }
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <div className="mb-6 relative">
      <div className="relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-lg bg-neutral-900 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-brand/50 focus:border-transparent"
          />
          {searchTerm && !searchLoading && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:opacity-75 transition-opacity"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
          {searchLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-brand"></div>
            </div>
          )}
          {searchTerm && searchTerm.length < 4 && (
            <div className="absolute left-0 right-0 -bottom-6">
              <p className="text-xs text-amber-400">
                Please enter at least 4 characters to search
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-neutral-900 border border-gray-700 rounded-lg shadow-lg max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {searchResults.map((kol) => (
            <button
              key={kol.author_handle}
              onClick={() => handleResultClick(kol.author_handle)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-700 transition-colors border-b border-gray-700 last:border-0"
            >
              <img
                src={kol.profile_image_url}
                alt={kol.name}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg?height=40&width=40";
                }}
              />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-200">
                  {kol.name}
                </div>
                <div className="text-xs text-gray-400">
                  @{kol.author_handle}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
