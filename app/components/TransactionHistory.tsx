import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionEntry } from "@/lib/types";
import { format, isValid } from "date-fns";
import { ArrowUpDown, ExternalLink, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TransactionHistoryProps {
  initialTransactions: TransactionEntry[];
  onLoadMore: (
    start: number,
    limit: number
  ) => Promise<{
    transactions: TransactionEntry[];
  }>;
}

type SortConfig = {
  key: keyof TransactionEntry;
  direction: "asc" | "desc";
};

export function TransactionHistory({
  initialTransactions,
  onLoadMore,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "created_at",
    direction: "desc",
  });

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore) {
        const loadMore = async () => {
          setIsLoading(true);
          try {
            const result = await onLoadMore(transactions.length, 10);

            if (result.transactions.length === 0) {
              setHasMore(false);
            } else {
              setTransactions((prev) => [...prev, ...result.transactions]);
            }
          } catch (error) {
            console.error("Error loading more transactions:", error);
          } finally {
            setIsLoading(false);
          }
        };
        loadMore();
      }
    },
    [isLoading, hasMore, onLoadMore, transactions.length]
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
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  // Filter and sort the transactions (only show completed ones)
  const sortedTransactions = useMemo(() => {
    return [...transactions]
      .filter((transaction) => transaction.status === "completed")
      .sort((a, b) => {
        if (sortConfig.key === "created_at") {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
        }

        if (sortConfig.key === "amount") {
          const valueA = a[sortConfig.key] || 0;
          const valueB = b[sortConfig.key] || 0;
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
  }, [transactions, sortConfig.key, sortConfig.direction]);

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

  const getTransactionTypeLabel = (type: TransactionEntry["type"]) => {
    const typeMap = {
      quest_earning: "Quest Earning",
      referral_bonus: "Referral Bonus",
    };
    return typeMap[type] || type;
  };

  const getTransactionTypeIcon = (type: TransactionEntry["type"]) => {
    const iconMap = {
      quest_earning: "🎯",
      referral_bonus: "👥",
    };
    return iconMap[type] || "💰";
  };

  const getChainIcon = (chain: TransactionEntry["chain"]) => {
    const iconSize = "w-4 h-4";
    if (chain === "base") {
      return <img src="/base_circle.svg" alt="Base" className={iconSize} />;
    } else if (chain === "solana") {
      return <img src="/sol.svg" alt="Solana" className={iconSize} />;
    } else if (chain === "ethereum") {
      return <img src="/eth.svg" alt="Ethereum" className={iconSize} />;
    }
    return <img src="/eth.svg" alt="Ethereum" className={iconSize} />;
  };

  const renderDescription = (transaction: TransactionEntry) => {
    if (transaction.type === "referral_bonus") {
      // Parse "@username - Quest Name" format
      const parts = transaction.description.split(" - ");
      if (parts.length === 2) {
        const [handle, questName] = parts;
        return (
          <div className="text-sm text-light-primary max-w-[250px]">
            <a
              href={`https://x.com/${handle.substring(1)}`} // Remove @ from handle
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-brand hover:text-accent-brand/80 transition-colors underline"
            >
              {handle}
            </a>
            {" - "}
            {questName}
          </div>
        );
      }
    }

    // Default rendering for quest earnings and other types
    return (
      <div className="text-sm text-light-primary max-w-[250px]">
        {transaction.description}
      </div>
    );
  };

  if (sortedTransactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <ExternalLink className="w-12 h-12 text-light-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-light-primary mb-2">
            No Transactions Yet
          </h3>
          <p className="text-sm text-light-tertiary">
            Your transaction history will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {isLoading && sortedTransactions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-light-primary">
            <Loader2 className="w-6 h-6 animate-spin text-accent-brand" />
            <span className="text-lg font-medium">Loading transactions...</span>
          </div>
        </div>
      )}
      <Table
        className={
          isLoading && sortedTransactions.length === 0
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
              onClick={() => handleSort("type")}
            >
              <div className="flex items-center gap-2 group-hover:text-accent-brand">
                <span>Type</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-light-primary font-semibold">
              Description
            </TableHead>
            <TableHead className="text-center text-light-primary font-semibold">
              Chain
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("created_at")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Date</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead
              className="text-center text-light-primary font-semibold cursor-pointer hover:bg-dark-secondary/20 transition-colors select-none group"
              onClick={() => handleSort("amount")}
            >
              <div className="flex items-center justify-center gap-2 group-hover:text-accent-brand">
                <span>Rewards Earned</span>
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction, index) => (
            <TableRow
              key={transaction.id}
              className="border-dark-quaternary hover:bg-dark-secondary/30"
            >
              <TableCell className="text-center">
                <span className="text-sm text-light-tertiary font-medium">
                  {index + 1}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {getTransactionTypeIcon(transaction.type)}
                  </span>
                  <span className="text-sm text-light-primary font-medium">
                    {getTransactionTypeLabel(transaction.type)}
                  </span>
                </div>
              </TableCell>
              <TableCell>{renderDescription(transaction)}</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  {getChainIcon(transaction.chain)}
                  <span className="text-sm text-light-primary">
                    {transaction.chain.toUpperCase()}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm text-light-primary">
                  {formatDate(transaction.created_at)}
                </span>
              </TableCell>
              <TableCell className="text-center py-4">
                <div className="flex justify-center items-center gap-2">
                  <span
                    className={`font-semibold text-sm px-4 py-2 rounded-full min-w-[100px] ${
                      transaction.amount > 0
                        ? "bg-light-primary/10 text-light-primary border border-light-primary/30"
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                    }`}
                  >
                    {transaction.amount > 0
                      ? `💰 ${formatNumber(transaction.amount)}`
                      : "💰 0"}
                  </span>
                  {transaction.tx_hash ? (
                    <a
                      href={
                        transaction.chain === "base"
                          ? `https://basescan.org/tx/${transaction.tx_hash}`
                          : transaction.chain === "solana"
                          ? `https://solscan.io/tx/${transaction.tx_hash}`
                          : `https://etherscan.io/tx/${transaction.tx_hash}`
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
