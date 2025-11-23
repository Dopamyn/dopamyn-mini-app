import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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

interface Community {
  author_handle: string;
  name: string;
  score: number;
  followers: number;
  smart_followers: number;
  avg_views: number;
  profile_image_url: string;
}

export default function CommunitySearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);

  const searchCommunities = useCallback(
    debounce(async (term: string) => {
      if (!term) {
        setCommunities([]);
        return;
      }

      setLoading(true);
      try {
        // Implement community search logic here
        // This is a placeholder - replace with actual API call
        const results: Community[] = [];
        setCommunities(results);
      } catch (error) {
        console.error("Error searching communities:", error);
        setCommunities([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    searchCommunities(term);
  };

  const handleCommunitySelect = (community: Community) => {
    // Navigate to community profile
    router.push(`/communities/${community.name}`);
  };

  return (
    <div className="w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="Search communities..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            {/* Loading indicator */}
          </div>
        )}
      </div>
      {communities.length > 0 && (
        <div className="mt-2 border rounded-md shadow-lg">
          {communities.map((community) => (
            <div
              key={community.name}
              onClick={() => handleCommunitySelect(community)}
              className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
            >
              <img
                src={community.profile_image_url}
                alt={community.name}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <div className="font-semibold">{community.name}</div>
                <div className="text-sm text-gray-500">
                  {community.followers} followers
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
