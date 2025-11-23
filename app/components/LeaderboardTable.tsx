import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ExternalLink, Trophy, Medal, Award } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useMemo, useState } from "react";

export interface LeaderboardEntry {
  rank: number;
  x_handle: string;
  name: string;
  followers_count: number | null;
  smart_followers_count: number | null;
  total_earning: number;
  total_points: number;
  profile_image_url: string;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

type SortConfig = {
  key: keyof LeaderboardEntry;
  direction: "asc" | "desc";
};

// Helper function to get sortable value
const getSortableValue = (entry: LeaderboardEntry, key: keyof LeaderboardEntry): number | string => {
  const value = entry[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.toLowerCase();
  return 0; // for null values
};

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "total_earning",
    direction: "desc",
  });

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const valueA = getSortableValue(a, sortConfig.key);
      const valueB = getSortableValue(b, sortConfig.key);

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortConfig.direction === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (valueA < valueB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
      }

      return 0;
    });
  }, [entries, sortConfig.key, sortConfig.direction]);

  const handleSort = (key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-light-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-light-primary mb-2">
            No Leaderboard Data
          </h3>
          <p className="text-sm text-light-tertiary">
            Leaderboard data will appear here when available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-dark-quaternary hover:bg-dark-secondary/30">
            <TableHead className="text-light-primary font-semibold w-16">
              Rank
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("x_handle")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-brand">
                <span>User</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("followers_count")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Followers</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("smart_followers_count")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Smart Followers</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("total_points")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Points</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("total_earning")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Total Earning</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => (
            <TableRow
              key={entry.x_handle + entry.rank}
              className="border-dark-quaternary hover:bg-dark-secondary/30"
            >
              <TableCell className="text-center">
                {entry.rank <= 3 ? (
                  <div className="flex items-center justify-center">
                    {entry.rank === 1 && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                    {entry.rank === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                    {entry.rank === 3 && (
                      <Award className="h-6 w-6 text-amber-600" />
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-light-tertiary font-medium">
                    {entry.rank}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-left py-4">
                <div className="flex items-center gap-3">
                  <img
                    src={entry.profile_image_url}
                    alt={entry.name}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder-user.jpg"; // fallback image
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-light-primary">
                      {entry.name}
                    </span>
                    <a
                      href={`https://x.com/${entry.x_handle?.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-light-tertiary hover:text-accent-brand transition-colors flex items-center gap-1"
                    >
                      @{entry.x_handle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center">
                  <span className="text-sm text-light-primary font-medium">
                    {entry.followers_count ? formatNumber(entry.followers_count) : "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center">
                  <span className="text-sm text-light-primary font-medium">
                    {entry.smart_followers_count ? formatNumber(entry.smart_followers_count) : "-"}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center">
                  <span className="text-sm text-light-primary font-medium">
                    {formatNumber(entry.total_points)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center">
                  <span
                    className={`font-semibold text-sm px-4 py-2 rounded-full min-w-[100px] ${
                      entry.total_earning > 0
                        ? "bg-light-primary/10 text-light-primary border border-light-primary/30"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                    }`}
                  >
                    {entry.total_earning > 0
                      ? `💰 ${formatNumber(entry.total_earning)}`
                      : "💰 0"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
