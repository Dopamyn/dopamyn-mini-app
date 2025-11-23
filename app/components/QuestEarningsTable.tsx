import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuestEarningEntry } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ArrowUpDown, ExternalLink, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface QuestEarningsTableProps {
  initialEarnings: QuestEarningEntry[];
  onLoadMore: (
    start: number,
    limit: number
  ) => Promise<{
    earnings: QuestEarningEntry[];
  }>;
}

type SortConfig = {
  key: keyof QuestEarningEntry;
  direction: "asc" | "desc";
};

export function QuestEarningsTable({
  initialEarnings,
  onLoadMore,
}: QuestEarningsTableProps) {
  const [earnings, setEarnings] = useState(initialEarnings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "completed_at",
    direction: "desc",
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore) {
        const loadMore = async () => {
          setIsLoading(true);
          try {
            const result = await onLoadMore(earnings.length, 10);

            if (result.earnings.length === 0) {
              setHasMore(false);
            } else {
              setEarnings((prev) => [...prev, ...result.earnings]);
            }
          } catch (error) {
            console.error("Error loading more quest earnings:", error);
          } finally {
            setIsLoading(false);
          }
        };
        loadMore();
      }
    },
    [isLoading, hasMore, onLoadMore, earnings.length]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver]);

  // Initialize with initial data
  useEffect(() => {
    setEarnings(initialEarnings);
  }, [initialEarnings]);

  // Sort the earnings
  const sortedEarnings = useMemo(() => {
    return [...earnings].sort((a, b) => {
      if (sortConfig.key === "completed_at") {
        const dateA = new Date(a.completed_at).getTime();
        const dateB = new Date(b.completed_at).getTime();
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      // Handle numeric fields - support both old and new field names
      if (
        sortConfig.key === "tokens_earned" ||
        sortConfig.key === "rewards_earned" ||
        sortConfig.key === "xp_earned"
      ) {
        // Use rewards_earned if available, otherwise fall back to tokens_earned
        const getValue = (entry: QuestEarningEntry) => {
          if (sortConfig.key === "rewards_earned") {
            return entry.rewards_earned ?? entry.tokens_earned ?? 0;
          }
          return entry[sortConfig.key as keyof QuestEarningEntry] as number || 0;
        };

        const valueA = getValue(a);
        const valueB = getValue(b);
        return sortConfig.direction === "asc"
          ? valueA - valueB
          : valueB - valueA;
      }

      // Handle string fields
      if ((a[sortConfig.key] ?? "") < (b[sortConfig.key] ?? "")) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if ((a[sortConfig.key] ?? "") > (b[sortConfig.key] ?? "")) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [earnings, sortConfig.key, sortConfig.direction]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    if (!isValid(date)) return "Invalid date";
    return format(date, "MMM d, yyyy");
  }, []);

  const handleSort = useCallback((key: SortConfig["key"]) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const getChainIcon = (chain: QuestEarningEntry["chain"]) => {
    const iconSize = "w-4 h-4";
    if (chain === "base") {
      return <img src="/base_circle.svg" alt="Base" className={iconSize} />;
    } else if (chain === "solana") {
      return <img src="/sol.svg" alt="Solana" className={iconSize} />;
    }
    return <img src="/eth.svg" alt="Ethereum" className={iconSize} />;
  };

  if (sortedEarnings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ExternalLink className="w-12 h-12 text-light-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-light-primary mb-2">
            No Quest Earnings Yet
          </h3>
          <p className="text-sm text-light-tertiary">
            Complete quest tasks to start earning rewards
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {isLoading && sortedEarnings.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-light-primary">
            <Loader2 className="w-6 h-6 animate-spin text-accent-brand" />
            <span className="text-lg font-medium">
              Loading quest earnings...
            </span>
          </div>
        </div>
      )}
      <Table
        className={
          isLoading && sortedEarnings.length === 0
            ? "opacity-50 pointer-events-none"
            : ""
        }
      >
        <TableHeader>
          <TableRow className="border-dark-quaternary hover:bg-dark-secondary/30">
            <TableHead className="text-light-primary font-semibold w-12">
              #
            </TableHead>
            <TableHead
              className="text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("quest_title")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-brand">
                <span>Campaign Title</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-center text-light-primary font-semibold">
              Chain
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("completed_at")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Completed At</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("xp_earned")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>XP Earned</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("rewards_earned")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Rewards Earned</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEarnings.map((earning, index) => (
            <TableRow
              key={`${earning.quest_id}-${earning.task_id}-${index}`}
              className="border-dark-quaternary hover:bg-dark-secondary/30"
            >
              <TableCell className="text-center">
                <span className="text-sm text-light-tertiary font-medium">
                  {index + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="text-sm text-light-primary max-w-[200px] truncate">
                  {earning.quest_title}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {getChainIcon(earning.chain)}
                  <span className="text-sm text-light-primary">
                    {earning.chain.toUpperCase()}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary">
                  {formatDate(earning.completed_at)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary font-medium">
                  {earning.xp_earned && earning.xp_earned > 0
                    ? `+${formatNumber(earning.xp_earned)}XP `
                    : earning.xp_earned === 0 ? "0 XP" : "-"}
                </span>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center items-center gap-2">
                  <span
                    className={`font-semibold text-sm px-4 py-2 rounded-full min-w-[100px] ${
                      (earning.rewards_earned ?? earning.tokens_earned ?? 0) > 0
                        ? "bg-light-primary/10 text-light-primary border border-light-primary/30"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                    }`}
                  >
                    {(earning.rewards_earned ?? earning.tokens_earned ?? 0) > 0
                      ? `💰 ${formatNumber(earning.rewards_earned ?? earning.tokens_earned ?? 0)}`
                      : "💰 0"}
                  </span>
                  {(earning.transaction || earning.tx_hash) ? (
                    <a
                      href={
                        earning.chain === "base"
                          ? `https://basescan.org/tx/${earning.transaction || earning.tx_hash}`
                          : `https://solscan.io/tx/${earning.transaction || earning.tx_hash}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-brand hover:text-accent-brand/80 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-light-tertiary text-sm">-</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Infinite Scroll Loading */}
      {hasMore && (
        <div
          ref={observerTarget}
          className="flex items-center justify-center py-4"
        >
          {isLoading && (
            <Loader2 className="w-6 h-6 animate-spin text-accent-brand" />
          )}
        </div>
      )}
    </div>
  );
}
