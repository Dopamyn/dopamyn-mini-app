"use client";

import { Button } from "@/components/ui/button";
import { TASK_TYPES } from "@/lib/types";
import { ChevronDown, Plus, Search, X, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

// Local Modal component to match the one used in the parent file
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-[#23262E] border border-[#2D313A] rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 scale-95 animate-in fade-in-0 zoom-in-95">
        <div className="flex justify-between items-center p-5 border-b border-[#2D313A]">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#2D313A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// Utility function to extract tweet ID from various tweet URL formats
const extractTweetId = (input: string): string => {
  if (!input) return input;

  // If it's already just a numeric ID, return as is
  if (/^\d+$/.test(input.trim())) {
    return input.trim();
  }

  // Handle various Twitter/X URL formats
  const urlPatterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/i\/status\/(\d+)/,
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/status\/(\d+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If no pattern matches, return the original input (user might have entered something else)
  return input.trim();
};

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: any) => void;
  editingTask?: any;
  editingTaskIndex?: number;
  onEditTask?: (task: any, index: number) => void;
}

export const AddTaskModal = ({
  isOpen,
  onClose,
  onAddTask,
  editingTask,
  editingTaskIndex,
  onEditTask,
}: AddTaskModalProps) => {
  const isEditMode = editingTask !== undefined && editingTaskIndex !== undefined;
  const [taskType, setTaskType] = useState(Object.keys(TASK_TYPES)[0]);
  const [taskData, setTaskData] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState("");

  // Search functionality state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<KOL[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<string>("");
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Handle modal close with cleanup
  const handleClose = () => {
    setTaskData({});
    setError("");
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
    setActiveSearchField("");
    setSelectedResultIndex(-1);
    onClose();
  };

  // Handle clicking outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        setActiveSearchField("");
        setSelectedResultIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchResults]);

  // Populate form when editing task
  useEffect(() => {
    if (isEditMode && editingTask) {
      // Determine task type key from task object
      let determinedTaskType = editingTask.task_type;
      
      if (editingTask.task_type === "tweet") {
        if (editingTask.task_image_required) {
          determinedTaskType = "tweet_image";
        } else if (editingTask.task_tweet_hashtag) {
          determinedTaskType = "tweet_hashtag";
        } else if (editingTask.task_tweet_cashtag) {
          determinedTaskType = "tweet_cashtag";
        } else if (editingTask.task_tweet_handle) {
          determinedTaskType = "tweet_handle";
        } else if (editingTask.task_tweet_website) {
          determinedTaskType = "tweet_website";
        }
      }
      
      setTaskType(determinedTaskType);
      
      // Populate task data
      const populatedData: { [key: string]: string } = {};
      if (editingTask.task_follow_handle) {
        populatedData.task_follow_handle = editingTask.task_follow_handle;
      }
      if (editingTask.task_tweet_id) {
        populatedData.task_tweet_id = editingTask.task_tweet_id;
      }
      if (editingTask.task_tweet_cashtag) {
        populatedData.task_tweet_cashtag = editingTask.task_tweet_cashtag;
      }
      if (editingTask.task_tweet_hashtag) {
        populatedData.task_tweet_hashtag = editingTask.task_tweet_hashtag;
      }
      if (editingTask.task_tweet_handle) {
        populatedData.task_tweet_handle = editingTask.task_tweet_handle;
      }
      if (editingTask.task_tweet_website) {
        populatedData.task_tweet_website = editingTask.task_tweet_website;
      }
      if (editingTask.task_count) {
        populatedData.task_count = editingTask.task_count.toString();
      }
      if (editingTask.task_description) {
        populatedData.task_description = editingTask.task_description;
      }
      
      setTaskData(populatedData);
    } else if (!isEditMode) {
      // Reset when not in edit mode
      setTaskType(Object.keys(TASK_TYPES)[0]);
      setTaskData({});
    }
  }, [isEditMode, editingTask]);

  // Keyboard navigation for search results
  const handleSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          selectedResultIndex >= 0 &&
          selectedResultIndex < searchResults.length
        ) {
          const selectedKol = searchResults[selectedResultIndex];
          handleResultClick(selectedKol.author_handle, fieldName);
        }
        break;
      case "Escape":
        setShowResults(false);
        setActiveSearchField("");
        setSelectedResultIndex(-1);
        break;
    }
  };

  const searchAuthors = async (term: string) => {
    if (!term.trim() || term.trim().length < 4) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/user/search-authors?search_term=${encodeURIComponent(
          term
        )}&category=KOL&limit=10&start=0`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.result && data.result.length > 0) {
        const authors = data.result.map((author: any) => ({
          author_handle: author.author_handle || "",
          name: author.name || "",
          score: author.engagement_score || 0,
          followers: author.followers_count || 0,
          smart_followers: author.smart_followers_count || 0,
          avg_views: (() => {
            const views = Math.round(
              (author.crypto_tweets_views_all || 0) /
                Math.max(author.crypto_tweets_all || 1, 1)
            );
            return isNaN(views) || !isFinite(views) ? 0 : views;
          })(),
          profile_image_url: author.profile_image_url || "",
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

  // Unified input handler for search fields
  const handleSearchInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string
  ) => {
    const value = e.target.value;

    // Update both search state and task data
    setSearchTerm(value);
    setActiveSearchField(fieldName);
    setTaskData((prev) => ({ ...prev, [fieldName]: value }));

    // Clear results if input is too short
    if (!value.trim() || value.trim().length < 4) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Trigger search
    debouncedSearch(value);
  };

  const handleResultClick = (handle: string, fieldName: string) => {
    setTaskData((prev) => ({ ...prev, [fieldName]: handle }));
    setSearchTerm("");
    setShowResults(false);
    setActiveSearchField("");
  };

  const clearSearchField = (fieldName: string) => {
    setTaskData((prev) => ({ ...prev, [fieldName]: "" }));
    setSearchResults([]);
    setShowResults(false);
    setActiveSearchField("");
    setSearchTerm("");
    setSelectedResultIndex(-1);
  };

  const handleSearchFocus = (fieldName: string) => {
    setActiveSearchField(fieldName);
    // Show results if there's already a search term
    if (searchTerm && searchTerm.length >= 4 && searchResults.length > 0) {
      setShowResults(true);
    }
  };

  const handleSearchBlur = (fieldName: string) => {
    // Delay hiding results to allow for clicks on suggestions
    setTimeout(() => {
      if (!searchContainerRef.current?.contains(document.activeElement)) {
        setShowResults(false);
        setActiveSearchField("");
        setSelectedResultIndex(-1);
      }
    }, 150);
  };

  const handleDataChange = (field: string, value: string) => {
    setTaskData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddTask = async () => {
    const taskInfo = TASK_TYPES[taskType as keyof typeof TASK_TYPES];

    // Check required fields
    const requiredFields = taskInfo.fields.filter(
      (field) => field.required === true
    );
    const isDataComplete = requiredFields.every((field) => {
      const value = taskData[field.name];
      if (field.type === "number") {
        return value && !isNaN(parseInt(value)) && parseInt(value) > 0;
      }
      return value && value.trim() !== "";
    });

    if (!isDataComplete) {
      setError("Please fill in all required fields for the task.");
      return;
    }

    // if (taskType === "follow" || taskType === "tweet_handle") {
    //   const userdetails = await fetch(
    //     `/api/user/alpha-details?author_handle=${
    //       taskData.task_follow_handle || taskData.task_tweet_handle
    //     }`
    //   );
    //   const userdetailsdata = await userdetails.json();
    //   if (userdetailsdata.result && userdetailsdata.result.length > 0) {
    //     const userdetail = userdetailsdata.result[0];
    //     console.log("userdetail", userdetail);
    //   } else {
    //     setError("User not found.");
    //     return;
    //   }
    // }

    // Additional validation for tweet tasks that require count
    if (taskType === "tweet") {
      const count = parseInt(taskData.task_count);
      if (isNaN(count) || count <= 0) {
        setError("Number of posts must be a positive number.");
        return;
      }
    }

    setError("");

    // Extract tweet ID if this is a tweet-related task that requires it
    let processedTweetId = "";
    if (
      taskType === "retweet" ||
      taskType === "reply" ||
      taskType === "quote_tweet"
    ) {
      if (!taskData.task_tweet_id) {
        setError("Tweet ID is required for this task type.");
        return;
      }

      processedTweetId = extractTweetId(taskData.task_tweet_id);

      // Validate that we got a valid tweet ID
      if (!/^\d+$/.test(processedTweetId)) {
        setError("Please enter a valid post URL.");
        return;
      }
    }

    // Convert to the format expected by the form
    const newTask = {
      id: Date.now(),
      task_type: taskType.startsWith("tweet_") ? "tweet" : taskType,
      task_follow_handle:
        taskType === "follow" ? taskData.task_follow_handle : "",
      task_tweet_id:
        taskType === "retweet" ||
        taskType === "reply" ||
        taskType === "quote_tweet"
          ? processedTweetId
          : "",
      task_tweet_cashtag:
        taskType === "tweet_cashtag" ? taskData.task_tweet_cashtag : "",
      task_tweet_hashtag:
        taskType === "tweet_hashtag" ? taskData.task_tweet_hashtag : "",
      task_tweet_handle:
        taskType === "tweet_handle" ? taskData.task_tweet_handle : "",
      task_tweet_website:
        taskType === "tweet_website" ? taskData.task_tweet_website : "",
      task_count:
        taskType === "tweet_image"
          ? 1
          : taskType.startsWith("tweet_")
          ? parseInt(taskData.task_count)
          : undefined,
      task_description: taskData.task_description || "",
      task_image_required: taskType === "tweet_image" ? true : undefined,
      criteria: editingTask?.criteria || [],
    };

    if (isEditMode && onEditTask && editingTaskIndex !== undefined) {
      onEditTask(newTask, editingTaskIndex);
    } else {
      onAddTask(newTask);
    }
    
    setTaskData({});
    // Reset search state when task is added
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
    setActiveSearchField("");
    handleClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTask();
    }
  };

  const selectedTask = TASK_TYPES[taskType as keyof typeof TASK_TYPES];

  const getProfessionalFieldLabel = (fieldName: string) => {
    switch (fieldName) {
      case "task_follow_handle":
        return "Follow Handle";
      case "task_tweet_id":
        return "Post URL";
      case "task_tweet_cashtag":
        return "Cashtag";
      case "task_tweet_hashtag":
        return "Hashtag";
      case "task_tweet_handle":
        return "Handle to Mention";
      case "task_tweet_website":
        return "Website URL";
      case "task_count":
        return "Number of Posts";
      case "task_description":
        return "Guidelines";
      default:
        return fieldName.replace(/([A-Z])/g, " $1");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Edit Task" : "Add a New Task"}>
      <div className="space-y-5" onKeyDown={handleKeyDown}>
        <div>
          <label
            htmlFor="taskType"
            className="block text-sm font-medium text-white mb-2"
          >
            Task Type
          </label>
          <div className="relative">
            <select
              id="taskType"
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value);
                setTaskData({}); // Reset data when type changes
                setError("");
                // Reset search state when task type changes
                setSearchTerm("");
                setSearchResults([]);
                setShowResults(false);
                setActiveSearchField("");
              }}
              className="w-full bg-[#1E2025] border border-[#2D313A] rounded-lg py-2.5 px-4 pr-10 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#FF8080] focus:border-[#FF8080] transition-all cursor-pointer hover:border-[#FF8080]/50"
            >
              {Object.entries(TASK_TYPES).map(([key, { label }]) => (
                <option key={key} value={key} className="bg-[#1E2025] text-white">
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
          </div>
        </div>

        {selectedTask.fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="block text-sm font-medium text-white mb-2"
            >
              {getProfessionalFieldLabel(field.name)}
              {field.required && <span className="text-red-500">*</span>}
            </label>

            {/* Special handling for handle-related fields */}
            {field.name === "task_follow_handle" ||
            field.name === "task_tweet_handle" ? (
              <div className="relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                    <Search className="h-4 w-4 text-[#6B7280]" />
                  </div>
                  <input
                    type="text"
                    autoComplete="off"
                    id={field.name}
                    value={taskData[field.name] || ""}
                    onChange={(e) =>
                      handleSearchInput(
                        e as React.ChangeEvent<HTMLInputElement>,
                        field.name
                      )
                    }
                    onKeyDown={(e) => handleSearchKeyDown(e, field.name)}
                    onFocus={() => handleSearchFocus(field.name)}
                    onBlur={() => handleSearchBlur(field.name)}
                    placeholder={field.placeholder}
                    className="w-full pl-12 pr-10 py-2.5 bg-[#1E2025] border border-[#2D313A] rounded-lg text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF8080] focus:border-[#FF8080] transition-all"
                  />
                  {taskData[field.name] && (
                    <button
                      onClick={() => clearSearchField(field.name)}
                      className="absolute inset-y-0 right-3 flex items-center text-[#6B7280] hover:text-white transition-colors z-10"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showResults &&
                  searchResults.length > 0 &&
                  activeSearchField === field.name && (
                    <div
                      className="absolute z-50 w-full mt-2 bg-[#1E2025] border border-[#2D313A] rounded-lg shadow-xl max-h-[320px] overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200"
                      ref={searchContainerRef}
                    >
                      {searchResults.map((kol, index) => (
                        <button
                          key={kol.author_handle}
                          onClick={() =>
                            handleResultClick(kol.author_handle, field.name)
                          }
                          className={`w-full px-3 py-2.5 flex items-center gap-3 transition-all duration-150 border-b border-[#2D313A] last:border-0 focus:outline-none ${
                            selectedResultIndex === index
                              ? "bg-[#FF8080]/10 border-l-2 border-l-[#FF8080]"
                              : "hover:bg-[#23262E]"
                          }`}
                          type="button"
                        >
                          <img
                            src={kol.profile_image_url}
                            alt={kol.name}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.src =
                                "/placeholder.svg?height=40&width=40";
                            }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {kol.name}
                            </div>
                            <div className="text-xs text-[#6B7280] truncate">
                              @{kol.author_handle}
                            </div>
                            <div className="text-xs text-[#6B7280] mt-0.5">
                              {(kol.followers || 0).toLocaleString()} followers
                            </div>
                          </div>
                          {selectedResultIndex === index && (
                            <div className="w-2 h-2 rounded-full bg-[#FF8080] flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Loading state */}
                {searchLoading && activeSearchField === field.name && (
                  <div className="absolute z-50 w-full mt-2 bg-[#1E2025] border border-[#2D313A] rounded-lg shadow-xl p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-center gap-2 text-[#6B7280]">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#FF8080]"></div>
                      <span className="text-sm">Searching...</span>
                    </div>
                  </div>
                )}

                {/* No results message */}
                {!searchLoading &&
                  searchTerm &&
                  searchTerm.length >= 4 &&
                  searchResults.length === 0 &&
                  activeSearchField === field.name && (
                    <div className="absolute z-50 w-full mt-2 bg-[#1E2025] border border-[#2D313A] rounded-lg shadow-xl p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <div className="text-center text-[#6B7280]">
                        <p className="text-sm">No users found</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                      </div>
                    </div>
                  )}

                {activeSearchField === field.name &&
                  searchTerm &&
                  searchTerm.length < 4 && (
                    <div className="absolute left-0 right-0 mt-1">
                      <p className="text-xs text-[#FF8080]">
                        Please enter at least 4 characters to search
                      </p>
                    </div>
                  )}
              </div>
            ) : field.type === "textarea" ? (
              <textarea
                id={field.name}
                value={taskData[field.name] || ""}
                onChange={(e) => handleDataChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2.5 bg-[#1E2025] border border-[#2D313A] rounded-lg text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF8080] focus:border-[#FF8080] transition-all resize-none"
              />
            ) : (
              <input
                type={field.type}
                id={field.name}
                value={taskData[field.name] || ""}
                onChange={(e) => handleDataChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 bg-[#1E2025] border border-[#2D313A] rounded-lg text-white text-sm placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#FF8080] focus:border-[#FF8080] transition-all"
              />
            )}

            {field.name === "task_tweet_id" && (
              <p className="text-xs text-[#6B7280] mt-1.5">
                You can paste a post URL (e.g.,
                https://x.com/username/status/123456789)
              </p>
            )}
            {field.name === "task_description" && (
              <p className="text-xs text-[#6B7280] mt-1.5">
                This will guide participants on what to include in their post
              </p>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <Button
          type="button"
          onClick={handleAddTask}
          className="w-full bg-[#FF8080] hover:bg-[#FF8080]/90 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          {isEditMode ? (
            <>
              <Pencil className="w-4 h-4" />
              <span>Update Task</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Task to Campaign</span>
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};
