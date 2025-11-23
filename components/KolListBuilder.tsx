"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Search, X, FileUp, UploadCloud, Globe, Users, Download } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// List Types
interface PredefinedList {
  id: string;
  name: string;
  description: string;
  count: number;
  region: string;
  icon: React.ReactNode;
}

const PREDEFINED_LISTS: PredefinedList[] = [
  {
    id: "korean",
    name: "Top Korean KOLs",
    description: "Curated list of influential Korean creators and influencers",
    count: 50,
    region: "Korea",
    icon: <Globe className="w-4 h-4" />,
  },
];

const COMING_SOON_LISTS: PredefinedList[] = [
  {
    id: "japanese",
    name: "Top Japanese KOLs",
    description: "Curated list of influential Japanese creators and influencers",
    count: 45,
    region: "Japan",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: "chinese",
    name: "Top Chinese KOLs",
    description: "Curated list of influential Chinese creators and influencers",
    count: 60,
    region: "China",
    icon: <Globe className="w-4 h-4" />,
  },
];

// Custom hook for debounced search with throttle
function useDebouncedSearch<T>(
  searchFunction: (term: string) => Promise<T[]>,
  delay: number = 500,
  throttleDelay: number = 1000
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchTimeRef = useRef<number>(0);
  const isThrottledRef = useRef<boolean>(false);

  const debouncedSearch = useCallback(
    async (term: string) => {
      if (!term.trim() || term.trim().length < 3) {
        setSearchResults([]);
        return;
      }

      // Check throttle
      const now = Date.now();
      if (now - lastSearchTimeRef.current < throttleDelay) {
        isThrottledRef.current = true;
        return;
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debouncing
      timeoutRef.current = setTimeout(async () => {
        if (isThrottledRef.current) {
          isThrottledRef.current = false;
          return;
        }

        setIsSearching(true);
        lastSearchTimeRef.current = Date.now();

        try {
          const results = await searchFunction(term);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, delay);
    },
    [searchFunction, delay, throttleDelay]
  );

  // Effect to trigger search when searchTerm changes
  useEffect(() => {
    if (searchTerm.trim().length >= 3) {
      debouncedSearch(searchTerm);
    }
  }, [searchTerm, debouncedSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    setSearchResults,
    isSearching,
    debouncedSearch,
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

interface SelectedKOL {
  handle: string;
  amount: number;
  profile_image_url?: string;
  name?: string;
}

type EligibilityKOL = string | {
  handle: string;
  profile_image_url?: string;
  name?: string;
};

interface KolListBuilderProps {
  mode: "rewards" | "eligibility";
  existingList?: SelectedKOL[] | EligibilityKOL[];
  onApply: (kols: SelectedKOL[] | EligibilityKOL[]) => void;
  onClose: () => void;
}

export default function KolListBuilder({
  mode,
  existingList = [],
  onApply,
  onClose,
}: KolListBuilderProps) {
  const [view, setView] = useState<"search" | "predefined" | "csv">("search");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedKols, setSelectedKols] = useState<SelectedKOL[] | any[]>(
    () => {
      // Initialize with existing list if provided
      if (mode === "rewards" && Array.isArray(existingList)) {
        return existingList as SelectedKOL[];
      } else if (mode === "eligibility" && Array.isArray(existingList)) {
        // Convert string array to object array for eligibility (backward compatible)
        return existingList.map((item: any) => 
          typeof item === 'string' 
            ? { handle: item, profile_image_url: undefined, name: undefined }
            : item
        );
      }
      return [];
    }
  );
  const [kolAmount, setKolAmount] = useState<{ [key: string]: number }>(() => {
    // Initialize amounts for rewards mode
    if (mode === "rewards" && Array.isArray(existingList)) {
      const amounts: { [key: string]: number } = {};
      (existingList as SelectedKOL[]).forEach((kol) => {
        amounts[kol.handle] = kol.amount;
      });
      return amounts;
    }
    return {};
  });

  // Bulk operations states
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set());
  const [bulkAmount, setBulkAmount] = useState<string>("");

  // KOL search function
  const searchKols = useCallback(async (searchTerm: string): Promise<KOL[]> => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) {
      return [];
    }

    try {
      const response = await fetch(
        `/api/user/search-authors?search_term=${searchTerm}&category=KOL&limit=10&start=0`
      );
      const data = await response.json();

      if (data.result && data.result.length > 0) {
        const authors = data.result.map((author: any) => ({
          author_handle: author.author_handle,
          name: author.name,
          score: author.engagement_score || 0,
          followers: author.followers_count || 0,
          smart_followers: author.smart_followers_count || 0,
          avg_views: Math.round(
            author.crypto_tweets_views_all / (author.crypto_tweets_all || 1)
          ),
          profile_image_url: author.profile_image_url,
        }));
        return authors;
      } else {
        return [];
      }
    } catch (err) {
      console.error("Error searching KOLs:", err);
      return [];
    }
  }, []);

  // Use the custom debounced search hook
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    setSearchResults,
    isSearching,
    debouncedSearch,
  } = useDebouncedSearch(searchKols, 500, 1000);

  // Effect to clear results when search term is empty
  useEffect(() => {
    if (searchTerm.trim().length === 0) {
      setSearchResults([]);
    }
  }, [searchTerm, setSearchResults]);

  // Add KOL to selected list
  const addKolToList = (kol: KOL) => {
    const handle = kol.author_handle;

    let updatedList: SelectedKOL[] | string[];

    if (mode === "rewards") {
      const selectedKolsRewards = selectedKols as SelectedKOL[];
      if (!selectedKolsRewards.find((k) => k.handle === handle)) {
        const newKol: SelectedKOL = {
          handle,
          amount: 0, // Always start with 0 amount
          profile_image_url: kol.profile_image_url || undefined,
          name: kol.name || undefined,
        };
        updatedList = [...selectedKolsRewards, newKol];
        setSelectedKols(updatedList);
        setKolAmount({ ...kolAmount, [handle]: 0 }); // Set default amount to 0
        
        // Don't auto-apply - let user continue adding more KOLs
      }
    } else if (mode === "eligibility") {
      // For eligibility, store as objects with profile_image_url for display
      const selectedKolsEligibility = selectedKols as any[];
      if (!selectedKolsEligibility.find((k) => (typeof k === 'string' ? k : k.handle) === handle)) {
        const newKol = {
          handle,
          profile_image_url: kol.profile_image_url || undefined,
          name: kol.name || undefined,
        };
        updatedList = [...selectedKolsEligibility, newKol];
        setSelectedKols(updatedList);
        
        // Don't auto-apply - let user continue adding more KOLs
      }
    }

    // Reset search after adding
    setSearchTerm("");
    setSearchResults([]);

    // Show success toast
    toast({
      title: "KOL Added",
      description: `@${handle} has been added to your list.`,
    });
  };

  // Remove KOL from selected list
  const removeKolFromList = (handle: string) => {
    let updatedList: SelectedKOL[] | any[];
    
    if (mode === "rewards") {
      const selectedKolsRewards = selectedKols as SelectedKOL[];
      updatedList = selectedKolsRewards.filter((k) => k.handle !== handle);
      setSelectedKols(updatedList);
      const newAmounts = { ...kolAmount };
      delete newAmounts[handle];
      setKolAmount(newAmounts);
      
      // Don't auto-apply - let user continue editing
    } else if (mode === "eligibility") {
      const selectedKolsEligibility = selectedKols as any[];
      updatedList = selectedKolsEligibility.filter((item) => {
        const itemHandle = typeof item === 'string' ? item : item.handle;
        return itemHandle !== handle;
      });
      setSelectedKols(updatedList);
      
      // Don't auto-apply - let user continue editing
    }
  };

  // Update KOL amount
  const updateKolAmount = (handle: string, value: string) => {
    if (mode === "rewards") {
      // Allow empty string for better UX
      const amount = value === "" ? 0 : parseFloat(value) || 0;
      setKolAmount({ ...kolAmount, [handle]: amount });
      const selectedKolsRewards = selectedKols as SelectedKOL[];
      const updatedList = selectedKolsRewards.map((k) =>
        k.handle === handle ? { ...k, amount } : k
      );
      setSelectedKols(updatedList);
      
      // Don't auto-apply - let user continue editing amounts
    }
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedHandles.size === selectedKols.length && selectedKols.length > 0) {
      setSelectedHandles(new Set());
    } else {
      const allHandles = selectedKols.map((kol) => {
        if (mode === "rewards") {
          return (kol as SelectedKOL).handle;
        } else {
          // Eligibility mode: handle both string and object formats
          return typeof kol === 'string' ? kol : kol.handle;
        }
      });
      setSelectedHandles(new Set(allHandles));
    }
  };

  const handleToggleSelection = (handle: string) => {
    const newSelection = new Set(selectedHandles);
    if (newSelection.has(handle)) {
      newSelection.delete(handle);
    } else {
      newSelection.add(handle);
    }
    setSelectedHandles(newSelection);
  };

  const handleBulkDelete = () => {
    if (mode === "rewards") {
      const selectedKolsRewards = selectedKols as SelectedKOL[];
      const updatedList = selectedKolsRewards.filter((k) => !selectedHandles.has(k.handle));
      setSelectedKols(updatedList);
      setSelectedHandles(new Set());
      
      toast({
        title: "KOLs Removed",
        description: `Successfully removed ${selectedHandles.size} KOL(s)`,
      });
    } else if (mode === "eligibility") {
      const selectedKolsEligibility = selectedKols as any[];
      const updatedList = selectedKolsEligibility.filter((item) => {
        const itemHandle = typeof item === 'string' ? item : item.handle;
        return !selectedHandles.has(itemHandle);
      });
      setSelectedKols(updatedList);
      setSelectedHandles(new Set());
      
      toast({
        title: "KOLs Removed",
        description: `Successfully removed ${selectedHandles.size} KOL(s)`,
      });
    }
  };

  const handleBulkUpdateAmount = () => {
    if (mode !== "rewards") return;
    
    const amount = parseFloat(bulkAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const selectedKolsRewards = selectedKols as SelectedKOL[];
    const updatedList = selectedKolsRewards.map((k) => {
      if (selectedHandles.has(k.handle)) {
        return { ...k, amount };
      }
      return k;
    });
    
    // Update local amount state
    const newAmounts = { ...kolAmount };
    selectedHandles.forEach((handle) => {
      newAmounts[handle] = amount;
    });
    setKolAmount(newAmounts);
    
    setSelectedKols(updatedList);
    setBulkAmount("");
    
    toast({
      title: "Amounts Updated",
      description: `Successfully updated ${selectedHandles.size} KOL(s) to $${amount} each`,
    });
  };

  // Process parsed KOLs and add to list
  const processAndAddKols = (kols: { handle: string; amount: number; profile_image_url?: string; name?: string }[], sourceName: string) => {
    if (mode === "rewards") {
      const currentList = selectedKols as SelectedKOL[];
      const existingHandles = new Set(currentList.map(k => k.handle));
      
      const newKols = kols
        .filter(k => !existingHandles.has(k.handle))
        .map(k => ({
          handle: k.handle,
          amount: k.amount > 0 ? k.amount : 0
        }));
      
      if (newKols.length === 0) {
        toast({ title: "No New KOLs", description: "All KOLs in the list are already added." });
        return;
      }

      const updatedList = [...currentList, ...newKols];
      
      // Update amount cache
      const newAmounts = { ...kolAmount };
      newKols.forEach(k => {
        newAmounts[k.handle] = k.amount;
      });
      setKolAmount(newAmounts);
      
      setSelectedKols(updatedList);
      
      toast({
        title: "KOLs Added",
        description: `Added ${newKols.length} new KOLs from ${sourceName}`,
      });
    } else {
      // For eligibility mode, store as objects with profile_image_url
      const currentList = selectedKols as any[];
      const existingHandles = new Set(
        currentList.map(item => typeof item === 'string' ? item : item.handle)
      );
      
      const newKols = kols
        .filter(k => !existingHandles.has(k.handle))
        .map(k => ({
          handle: k.handle,
          profile_image_url: k.profile_image_url || undefined,
          name: k.name || undefined,
        }));

      if (newKols.length === 0) {
        toast({ title: "No New KOLs", description: "All KOLs in the list are already added." });
        return;
      }

      const updatedList = [...currentList, ...newKols];
      setSelectedKols(updatedList);
      
      toast({
        title: "KOLs Added",
        description: `Added ${newKols.length} new KOLs from ${sourceName}`,
      });
    }
    // Switch back to search view after successful add
    setView("search");
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV must have a header and at least one data row.",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const handleIndex = headers.indexOf("handle");
      const amountIndex = headers.indexOf("amount");

      if (handleIndex === -1) {
        toast({
          title: "Invalid CSV Format",
          description: 'CSV must include a "handle" column.',
          variant: "destructive",
        });
        return;
      }

      const kols = lines
        .slice(1)
        .map((line) => {
          const values = line.split(",");
          const raw = values[handleIndex]?.trim() || "";
          const handle = raw.replace(/^@+/, "");
          
          let amount = 0;
          if (amountIndex !== -1) {
            const amountValue = values[amountIndex]?.trim();
            amount = parseFloat(amountValue) || 0;
          }
          return { handle, amount };
        })
        .filter((k) => k.handle && k.handle.length > 0);

      processAndAddKols(kols, "CSV Upload");
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePredefinedListSelect = async (listId: string, listName: string) => {
    try {
      let csvFileName = "korean_kol_list.csv"; // Default
      if (listId === "korean") csvFileName = "korean_kol_list.csv";
      // Add others when available

      const response = await fetch(`/files/${csvFileName}`);
      const csvData = await response.text();
      
      const lines = csvData.split(/\r?\n/).filter((line) => line.trim() !== "");
      // Assume predefined lists follow standard format with handle column
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const handleIndex = headers.indexOf("handle");
      const amountIndex = headers.indexOf("amount");

      if (handleIndex === -1) throw new Error("Invalid list format");

      const kols = lines.slice(1).map(line => {
        const values = line.split(",");
        const handle = (values[handleIndex]?.trim() || "").replace(/^@+/, "");
        let amount = 0;
        if (amountIndex !== -1) {
             amount = parseFloat(values[amountIndex]?.trim()) || 0;
        }
        return { handle, amount };
      }).filter(k => k.handle);

      processAndAddKols(kols, listName);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load the selected list.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col lg:flex-row gap-4 flex-1 items-start overflow-hidden  pb-0">
      {/* Left Column: Add KOLs */}
      <div className="lg:w-1/2 space-y-4">
        {/* View Tabs */}
        <div className="flex items-center p-1 bg-dark-secondary rounded-lg border border-dark-tertiary">
        <button
          onClick={() => setView("search")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            view === "search"
              ? "bg-light-primary text-dark-primary shadow-sm"
              : "text-light-tertiary hover:text-light-primary hover:bg-dark-tertiary"
          }`}
        >
          <Search className="w-4 h-4" />
          Search & Add
        </button>
        <div className="w-px h-4 bg-dark-tertiary mx-1" />
        <button
          onClick={() => setView("predefined")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            view === "predefined"
              ? "bg-light-primary text-dark-primary shadow-sm"
              : "text-light-tertiary hover:text-light-primary hover:bg-dark-tertiary"
          }`}
        >
          <Globe className="w-4 h-4" />
          Predefined Lists
        </button>
        <div className="w-px h-4 bg-dark-tertiary mx-1" />
        <button
          onClick={() => setView("csv")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
            view === "csv"
              ? "bg-light-primary text-dark-primary shadow-sm"
              : "text-light-tertiary hover:text-light-primary hover:bg-dark-tertiary"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Upload CSV
        </button>
      </div>

      {/* View Content */}
      {view === "search" && (
        <div className="space-y-6 pt-2 min-h-[400px]">
          <div className="relative">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search KOL by name or Twitter handle (min. 3 characters)..."
                className="block w-full pl-10 pr-10 py-2 bg-dark-secondary border border-dark-alpha-tertiary rounded-lg text-light-primary placeholder-light-tertiary focus:outline-none focus:ring-2 focus:ring-light-primary focus:border-transparent"
              />
              {searchTerm && !isSearching && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:opacity-75 transition-opacity"
                >
                  <X className="h-5 w-5 text-light-tertiary" />
                </button>
              )}
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-brand"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3 max-h-80 overflow-y-auto border border-dark-alpha-tertiary rounded-lg p-2">
              <div className="text-sm text-light-tertiary px-2 py-1 border-b border-dark-alpha-tertiary">
                {searchResults.length} KOL{searchResults.length !== 1 ? "s" : ""}{" "}
                found
              </div>
              {searchResults.map((kol) => (
                <div
                  key={kol.author_handle}
                  className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg border border-dark-alpha-tertiary hover:border-dark-alpha-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={kol.profile_image_url}
                      alt={kol.name}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        e.currentTarget.src =
                          "/placeholder.svg?height=40&width=40";
                      }}
                    />
                    <div>
                      <div className="text-sm font-medium text-light-primary">
                        {kol.name}
                      </div>
                      <div className="text-xs text-light-tertiary">
                        @{kol.author_handle}
                      </div>
                      <div className="text-xs text-light-quaternary">
                        {(kol.followers || 0).toLocaleString()} followers
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addKolToList(kol)}
                    disabled={false}
                    className="bg-light-primary hover:bg-light-secondary text-dark-primary font-medium px-4"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "predefined" && (
        <div className="space-y-6 min-h-[400px]">
          <div className="grid gap-4">
             <h4 className="text-xs font-medium text-light-tertiary uppercase tracking-wider px-1">
              Available Lists
            </h4>
            {PREDEFINED_LISTS.map((list) => (
              <div
                key={list.id}
                className="p-4 rounded-lg cursor-pointer bg-dark-secondary hover:bg-dark-alpha-quaternary border border-dark-tertiary hover:border-light-primary transition-all group"
                onClick={() => handlePredefinedListSelect(list.id, list.name)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-dark-tertiary text-light-primary group-hover:bg-light-primary group-hover:text-dark-primary transition-colors">
                    {list.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-light-primary mb-1">
                      {list.name}
                    </h3>
                    <p className="text-xs text-light-secondary mb-2">
                      {list.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-light-tertiary">
                      <span className="bg-dark-tertiary px-2 py-0.5 rounded">{list.region}</span>
                      <span>•</span>
                      <span>{list.count} KOLs</span>
                    </div>
                  </div>
                  <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity bg-light-primary text-dark-primary">
                    Import
                  </Button>
                </div>
              </div>
            ))}
          </div>
           <div className="grid gap-4">
            <h4 className="text-xs font-medium text-light-tertiary uppercase tracking-wider px-1">
              Coming Soon
            </h4>
            {COMING_SOON_LISTS.map((list) => (
              <div
                key={list.id}
                className="p-4 rounded-lg bg-dark-alpha-tertiary border border-dark-tertiary opacity-60 cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-dark-tertiary text-light-tertiary">
                    {list.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-light-tertiary mb-1">
                      {list.name}
                    </h3>
                    <p className="text-xs text-light-tertiary">
                      {list.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "csv" && (
        <div className="space-y-6 min-h-[400px] flex items-center justify-center">
          <div className="bg-dark-alpha-secondary border border-dark-secondary rounded-lg p-6 text-center w-full max-w-md">
             <div className="w-12 h-12 rounded-full bg-dark-tertiary flex items-center justify-center mx-auto mb-4">
              <FileUp className="w-6 h-6 text-light-primary" />
            </div>
            <h3 className="text-lg font-medium text-light-primary mb-2">Upload CSV File</h3>
            <p className="text-sm text-light-secondary mb-6 max-w-sm mx-auto">
              Upload a CSV file with your KOL list. {mode === 'rewards' 
                ? 'Includes handle and amount columns.' 
                : 'Includes only the handle column.'}
            </p>
            
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleCsvFileChange}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-light-primary hover:bg-light-primary/90 text-dark-primary h-10"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Select CSV File
              </Button>
              
              <a
                href={mode === 'rewards' 
                  ? '/files/kol-template-custom-distribution.csv' 
                  : '/files/kol-template-equal-distribution.csv'}
                download
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-light-primary hover:underline"
              >
                <Download className="w-3 h-3" />
                Download Template
              </a>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Arrow Indicator (Desktop only) */}
      <div className="hidden lg:flex items-center justify-center self-center">
        <div className="flex flex-col items-center gap-2 text-light-tertiary">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {/* <span className="text-xs font-medium">Add to list</span> */}
        </div>
      </div>

      {/* Right Column: Selected KOLs List (Always Visible) */}
      <div className="lg:w-1/2 flex flex-col">
        {selectedKols.length > 0 ? (
        <div className="flex flex-col bg-dark-primary rounded-lg border border-dark-alpha-tertiary overflow-hidden" style={{ maxHeight: "calc(100vh - 300px)" }}>
          <div className="flex items-center justify-between p-4 border-b border-dark-alpha-tertiary bg-dark-alpha-secondary">
            <h3 className="text-sm md:text-lg font-semibold">
              {mode === "rewards"
                ? "Selected KOLs for Rewards"
                : "Selected KOLs for Eligibility"}
            </h3>
            <span className="text-sm text-light-tertiary bg-dark-tertiary px-3 py-1 rounded-full">
              {selectedKols.length} selected
            </span>
          </div>

          {/* Bulk Actions Bar - Always visible but disabled when nothing selected */}
          <div className={`p-2 border-b flex items-center gap-2 flex-wrap transition-all ${
            selectedHandles.size > 0 
              ? "bg-light-primary/10 border-light-primary/30" 
              : "bg-dark-alpha-secondary border-dark-alpha-tertiary"
          }`}>
            <span className="text-xs text-light-tertiary font-medium">
              {selectedHandles.size > 0 ? `${selectedHandles.size} selected` : "Select KOLs for bulk actions"}
            </span>
            {mode === "rewards" && (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  inputMode="decimal"
                  value={bulkAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\.?\d*\.?\d*$/.test(value)) {
                      setBulkAmount(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBulkUpdateAmount();
                    }
                  }}
                  placeholder="Amount"
                  disabled={selectedHandles.size === 0}
                  className="w-20 px-2 py-1 bg-dark-quaternary border border-dark-alpha-quaternary rounded text-center text-xs focus:border-light-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkUpdateAmount}
                  disabled={selectedHandles.size === 0}
                  className="bg-light-primary hover:bg-light-primary/90 text-dark-primary text-xs h-6 px-2"
                >
                  Update
                </Button>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedHandles.size === 0}
              className="text-xs h-6 px-2"
            >
              Delete
            </Button>
            {selectedHandles.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedHandles(new Set())}
                className="text-xs text-light-tertiary hover:text-light-primary"
              >
                Clear
              </button>
            )}
          </div>

          {/* Scrollable Table */}
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-dark-alpha-tertiary z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedHandles.size === selectedKols.length && selectedHandles.size > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-dark-secondary bg-dark-quaternary checked:bg-light-primary focus:ring-light-primary"
                    />
                  </TableHead>
                  <TableHead>Handle</TableHead>
                  {mode === "rewards" && <TableHead>Amount (USDC)</TableHead>}
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {selectedKols.map((kol) => {
                // Handle both rewards mode (SelectedKOL) and eligibility mode (object with handle)
                const handle = mode === "rewards" 
                  ? (kol as SelectedKOL).handle
                  : (typeof kol === 'string' ? kol : kol.handle);
                
                // Get profile image URL for both modes
                const profileImageUrl = mode === "rewards"
                  ? (kol as SelectedKOL).profile_image_url
                  : (typeof kol === 'string' ? null : kol.profile_image_url);
                
                const hasProfileImage = profileImageUrl && profileImageUrl.trim() !== "";
                
                return (
                  <TableRow key={handle} className={selectedHandles.has(handle) ? "bg-light-primary/5" : ""}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedHandles.has(handle)}
                        onChange={() => handleToggleSelection(handle)}
                        className="w-4 h-4 rounded border-dark-secondary bg-dark-quaternary checked:bg-light-primary focus:ring-light-primary"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasProfileImage ? (
                          <img
                            src={profileImageUrl!}
                            alt={handle}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=32&width=32";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-dark-tertiary flex items-center justify-center text-xs text-light-tertiary font-medium">
                            {handle.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>@{handle}</span>
                      </div>
                    </TableCell>
                    {mode === "rewards" && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={kolAmount[handle] === 0 || kolAmount[handle] === undefined ? "" : String(kolAmount[handle])}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string, numbers, decimal points, and leading decimal (e.g., ".5")
                                if (value === "" || /^\.?\d*\.?\d*$/.test(value)) {
                                  updateKolAmount(handle, value);
                                }
                              }}
                              onKeyDown={(e) => {
                                // Prevent Enter from submitting the form
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              className={`w-28 h-9 text-sm text-center ${
                                (kol as SelectedKOL).amount <= 0
                                  ? "border-error focus-error"
                                  : ""
                              }`}
                              placeholder="0.00"
                            />
                            {(kol as SelectedKOL).amount <= 0 && (
                              <div className="absolute -bottom-5 left-0 text-xs text-red-400">
                                Amount required
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-light-tertiary">
                            USDC
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeKolFromList(handle)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-dark-secondary/30 rounded-lg border-2 border-dashed border-dark-tertiary p-8">
            <Users className="w-16 h-16 text-light-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-light-primary mb-2">
              No KOLs Selected Yet
            </h3>
            <p className="text-sm text-light-tertiary text-center max-w-sm">
              {mode === "rewards" 
                ? "Search and add KOLs from the left to assign custom reward amounts."
                : "Search and add KOLs from the left to create your eligibility list."}
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Footer - Always visible at bottom of modal */}
      <div className="border-t border-dark-alpha-tertiary bg-dark-alpha-secondary px-6 py-3">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-light-tertiary">
              <span className="font-medium text-light-primary">{selectedKols.length}</span> KOL{selectedKols.length !== 1 ? "s" : ""}
            </div>
            {mode === "rewards" && selectedKols.length > 0 && (
              <>
                <div className="h-4 w-px bg-dark-tertiary" />
                <div className="text-sm font-semibold text-accent-brand">
                  ${(selectedKols as SelectedKOL[])
                    .reduce((sum, kol) => sum + kol.amount, 0)
                    .toFixed(2)} USDC
                </div>
                {(selectedKols as SelectedKOL[]).some(
                  (kol) => kol.amount <= 0
                ) && (
                  <>
                    <div className="h-4 w-px bg-dark-tertiary" />
                    <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                      ⚠️ Some KOLs have $0
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <Button
            type="button"
            onClick={() => {
              // Apply changes before closing
              onApply(selectedKols);
              onClose();
            }}
            className="bg-light-primary hover:bg-light-primary/90 text-dark-primary font-medium px-4 h-8 text-sm"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
