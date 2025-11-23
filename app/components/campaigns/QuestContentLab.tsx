"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { QuestTask } from "@/lib/types";
import { getRandomizedPrompts } from "@/lib/prompts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Water Droplet Loader Component
const WaterDropletLoader = ({
  size = "default",
  text = "Generating...",
}: {
  size?: "small" | "default" | "large";
  text?: string;
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    default: "w-6 h-6",
    large: "w-8 h-8",
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <div className={`relative ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-glow`}
        ></div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-ripple opacity-30`}
        ></div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-ripple opacity-20`}
          style={{ animationDelay: "0.8s" }}
        ></div>
      </div>
      {text && <span className="text-sm text-neutral-300">{text}</span>}
    </div>
  );
};

interface QuestContentLabProps {
  task: QuestTask;
  questCreatorHandle?: string;
  onPost: (content: string) => void;
  onClose: () => void;
  initialContent?: string;
}

export default function QuestContentLab({
  task,
  questCreatorHandle,
  onPost,
  onClose,
  initialContent = "",
}: QuestContentLabProps) {
  const { isAuthenticated, login, getTwitterHandle } = useTwitterDatabaseSync();
  const [content, setContent] = useState<string>(initialContent);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [researchLoading, setResearchLoading] = useState<boolean>(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [tweetContext, setTweetContext] = useState<{ body: string; author_handle: string } | null>(null);
  const [tweetContextLoading, setTweetContextLoading] = useState<boolean>(false);
  const [hasGeneratedContent, setHasGeneratedContent] = useState<boolean>(false);
  const [composerMode, setComposerMode] = useState<"ai" | "manual">("ai");

  // Normalize AI text but preserve intended newlines from backend ("\n" or real newlines)
  const normalizeTweet = (text: string): string => {
    let t = text
      // Normalize different newline types to \n
      .replace(/\r\n|\r/g, "\n")
      // Convert literal backslash-n sequences ("\\n") into actual newlines
      .replace(/\\n/g, "\n")
      // Trim spaces around newlines
      .replace(/[ \t]*\n[ \t]*/g, "\n")
      // Collapse multiple blank lines to a single blank line
      .replace(/\n{3,}/g, "\n\n")
      // Collapse multiple spaces but do NOT collapse newlines
      .replace(/[^\S\n]{2,}/g, " ")
      // Normalize quotes
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
    return t.trim();
  };

  // Try to get project handle from task context
  const getProjectHandle = () => {
    // Try to extract handle from various task fields
    const handle = 
      task.task_tweet_handle ||
      task.task_follow_handle ||
      task.target_author_handle ||
      questCreatorHandle;
    
    return handle ? handle.replace("@", "") : null;
  };

  // Fetch research data if we have a project handle
  useEffect(() => {
    const fetchResearchData = async () => {
      const projectHandle = getProjectHandle();
      if (!projectHandle) {
        return;
      }

      try {
        setResearchLoading(true);
        const response = await fetch(`/api/research-hub?handle=${projectHandle}`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setResearchData(data.data);
          }
        }
      } catch (error) {
        console.error("Error fetching research data:", error);
      } finally {
        setResearchLoading(false);
      }
    };

    fetchResearchData();
  }, [task]);

  // Fetch tweet context for reply and quote_tweet tasks
  useEffect(() => {
    const fetchTweetContext = async () => {
      // Only fetch for reply and quote_tweet tasks that have a tweet_id
      if (
        (task.task_type === "reply" || task.task_type === "quote_tweet") &&
        task.task_tweet_id
      ) {
        try {
          setTweetContextLoading(true);
          
          // Use our backend API which proxies Twitter's oEmbed API
          // This avoids CORS issues
          const response = await fetch(`/api/tweets/${task.task_tweet_id}`, {
            headers: {
              Accept: "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Tweet context API response:", data);
            
            // Handle different response structures
            if (data.body && data.body.trim()) {
              setTweetContext({
                body: data.body.trim(),
                author_handle: data.author_handle || "unknown",
              });
            } else if (data.result?.body) {
              setTweetContext({
                body: data.result.body.trim(),
                author_handle: data.result.author_handle || "unknown",
              });
            } else if (data.data?.body) {
              setTweetContext({
                body: data.data.body.trim(),
                author_handle: data.data.author_handle || "unknown",
              });
            } else {
              console.warn("No tweet body found in response:", data);
            }
            // If no body is found, tweetContext remains null
          } else {
            const errorText = await response.text();
            console.warn("Failed to fetch tweet context:", response.status, response.statusText, errorText);
          }
        } catch (error) {
          console.error("Error fetching tweet context:", error);
          // Silently fail - tweet context is optional
        } finally {
          setTweetContextLoading(false);
        }
      }
    };

    fetchTweetContext();
  }, [task.task_type, task.task_tweet_id]);

  // Generate contextual prompts based on task with randomization
  const generateContextualPrompts = (): string[] => {
    // Get randomized prompts from the comprehensive prompt library
    // We'll show 4 prompts in the dropdown, randomly selected from 40-50 available prompts
    // Each user session will get different prompts due to randomization
    const validTaskType = 
      task.task_type === "tweet" || 
      task.task_type === "reply" || 
      task.task_type === "quote_tweet"
        ? task.task_type
        : "tweet"; // Fallback to tweet if task type is unexpected
    
    let prompts = getRandomizedPrompts(validTaskType, 4);

    // Optionally add task-specific prompts if hashtag/cashtag are present
    // These will be added to the randomized set
    const taskSpecificPrompts: string[] = [];
    
    if (task.task_type === "tweet") {
      if (task.task_tweet_hashtag) {
        taskSpecificPrompts.push(
          `Write a thoughtful tweet about ${task.task_tweet_hashtag} and why it matters.`
        );
      }
      if (task.task_tweet_cashtag) {
        taskSpecificPrompts.push(
          `Share your perspective on ${task.task_tweet_cashtag} and what you find compelling.`
        );
      }
    }

    // If we have task-specific prompts, replace some random prompts with them
    // This ensures we still show 4 prompts total, but prioritize task-specific ones
    if (taskSpecificPrompts.length > 0) {
      // Replace the last N prompts with task-specific ones, keeping total at 4
      prompts = [
        ...prompts.slice(0, 4 - taskSpecificPrompts.length), 
        ...taskSpecificPrompts
      ].slice(0, 4);
    }

    return prompts;
  };

  // Initialize prompts
  useEffect(() => {
    setRandomPrompts(generateContextualPrompts());
  }, [task]);

  // Generate content using unified AI route
  const generateContent = async () => {
    const finalPrompt = userPrompt.trim() || selectedPrompt;
    if (!finalPrompt) return;

    if (!isAuthenticated) {
      login?.();
      return;
    }

    setIsGenerating(true);
    try {
      let curatedContent = researchData;
      
      // If no research data, create a minimal context object
      if (!curatedContent) {
        curatedContent = {
          token_name: getProjectHandle() || "this project",
          one_line_description: task.task_description || "No task guidelines provided",
        };
      }

      // Add task-specific context to the prompt
      let enhancedPrompt = finalPrompt;
      console.log("tweet context", tweetContext);
      // Add tweet context for reply and quote_tweet tasks
      if ((task.task_type === "reply" || task.task_type === "quote_tweet") && tweetContext?.body) {
        enhancedPrompt = `Original tweet by @${tweetContext.author_handle}: "${tweetContext.body}"\n\n${enhancedPrompt}`;
        if (task.task_type === "reply") {
          enhancedPrompt += " Write a thoughtful reply to the above tweet.";
        } else if (task.task_type === "quote_tweet") {
          enhancedPrompt += " Write a quote tweet that adds value or commentary to the above tweet.";
        }
      }
      
      if (task.task_tweet_hashtag) {
        enhancedPrompt += ` Include the hashtag ${task.task_tweet_hashtag}.`;
      }
      if (task.task_tweet_cashtag) {
        enhancedPrompt += ` Include the cashtag ${task.task_tweet_cashtag}.`;
      }
      if (task.task_tweet_handle) {
        enhancedPrompt += ` Mention @${task.task_tweet_handle.replace("@", "")}.`;
      }

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/ai/generate-response", {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          userPrompt: enhancedPrompt, 
          curatedContent,
          stream: false,
          taskType: task.task_type 
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Handle non-streaming response (simple JSON)
      const data = await response.json();
      const generatedContent = data.content || '';
      
      if (generatedContent.trim()) {
        setContent(normalizeTweet(generatedContent.trim()));
        setHasGeneratedContent(true); // Mark that content has been generated
      } else {
        setContent("No content generated");
        setHasGeneratedContent(true); // Still mark as generated even if empty
      }
    } catch (error) {
      console.error("Error generating content:", error);
      // Don't show error to user, just allow them to continue editing
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptSelect = (promptValue: string) => {
    setSelectedPrompt(promptValue);
    setUserPrompt(promptValue);
  };

  const handlePost = () => {
    // Use the content state directly since textarea is controlled
    // The ref is available as fallback, but state should always be in sync
    const currentContent = content || contentTextareaRef.current?.value || '';
    
    if (currentContent.trim()) {
      // Pass the latest content to ensure it's captured correctly
      onPost(currentContent.trim());
    }
  };

  // Build initial content based on task type
  useEffect(() => {
    if (initialContent) {
      setContent(initialContent);
      return;
    }
    
    // Only set default content if content is empty
    if (!content || content.length === 0) {
      let defaultContent = "";
      
      if (task.task_type === "tweet") {
        if (task.task_tweet_cashtag) {
          const cashtag = task.task_tweet_cashtag.startsWith("$")
            ? task.task_tweet_cashtag
            : `$${task.task_tweet_cashtag}`;
          defaultContent += `${cashtag} `;
        }
        if (task.task_tweet_hashtag) {
          const hashtag = task.task_tweet_hashtag.startsWith("#")
            ? task.task_tweet_hashtag
            : `#${task.task_tweet_hashtag}`;
          defaultContent += `${hashtag} `;
        }
        if (task.task_tweet_handle) {
          const handle = task.task_tweet_handle.startsWith("@")
            ? task.task_tweet_handle
            : `@${task.task_tweet_handle}`;
          defaultContent += `${handle} `;
        }
        if (task.task_tweet_website) {
          defaultContent += `${task.task_tweet_website} `;
        }
      } else if (task.task_type === "reply") {
        defaultContent = "Great post! ";
        if (task.task_tweet_hashtag) {
          defaultContent += `#${task.task_tweet_hashtag.replace("#", "")} `;
        }
        if (task.task_tweet_cashtag) {
          defaultContent += `$${task.task_tweet_cashtag.replace("$", "")} `;
        }
      } else if (task.task_type === "quote_tweet") {
        defaultContent = "Share your thoughts about this post. ";
        if (task.task_tweet_hashtag) {
          defaultContent += `#${task.task_tweet_hashtag.replace("#", "")} `;
        }
        if (task.task_tweet_cashtag) {
          defaultContent += `$${task.task_tweet_cashtag.replace("$", "")} `;
        }
      }

      if (defaultContent) {
        setContent(defaultContent.trim());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const tweetEmbedRef = useRef<HTMLDivElement>(null);

  // Load Twitter widgets for tweet embedding - simple and clean
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!tweetEmbedRef.current) return;
    
    // Only load for reply or quote_tweet tasks with tweet_id
    if ((task.task_type === "reply" || task.task_type === "quote_tweet") && task.task_tweet_id) {
      // Load Twitter widgets script
      const existing = document.querySelector("script[src='https://platform.twitter.com/widgets.js']");
      if (!existing) {
        const s = document.createElement("script");
        s.async = true;
        s.src = "https://platform.twitter.com/widgets.js";
        s.charset = "utf-8";
        document.body.appendChild(s);
      }

      // Wait for widgets to be available and create embed
      const checkAndEmbed = () => {
        if ((window as any)?.twttr?.widgets && tweetEmbedRef.current) {
          (window as any).twttr.widgets
            .createTweet(task.task_tweet_id, tweetEmbedRef.current, {
              theme: "dark",
              conversation: "none",
              align: "center",
              width: "100%",
              dnt: true,
            })
            .catch((error: any) => {
              console.error("Error embedding tweet:", error);
            });
        } else {
          // Retry after a short delay if widgets not ready yet
          setTimeout(checkAndEmbed, 500);
        }
      };

      // Start checking after a brief delay
      const timeout = setTimeout(checkAndEmbed, 100);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [task.task_type, task.task_tweet_id]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-dark-primary">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
        <h3 className="text-lg font-semibold text-light-primary">Content Lab</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Context */}
        <div className="space-y-6">

          {/* Project Information Section - render only when we have actual data */}
          {(() => {
            const hasProjectInfo = Boolean(
              researchData && (
                researchData.token_name ||
                researchData.one_line_description ||
                (Array.isArray(researchData.narratives) && researchData.narratives.length > 0) ||
                researchData?.market_analysis?.tam
              )
            );
            if (!hasProjectInfo) return null;
            return (
          <div className="bg-dark-secondary border border-dark-quaternary rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-accent-brand rounded-full"></div>
              <h4 className="text-sm font-semibold text-light-primary">Project Information</h4>
            </div>
              <div className="space-y-3">
                {researchData.token_name && (
                  <div>
                    <p className="text-xs text-light-tertiary mb-1">Token</p>
                    <p className="text-sm text-light-primary font-medium">
                      {researchData.token_name}
                      {researchData.token_symbol && (
                        <span className="text-light-tertiary ml-1">
                          (${researchData.token_symbol})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {researchData.one_line_description && (
                  <div>
                    <p className="text-xs text-light-tertiary mb-1">Description</p>
                    <p className="text-sm text-light-primary leading-relaxed">
                      {researchData.one_line_description}
                    </p>
                  </div>
                )}

                {researchData.narratives && researchData.narratives.length > 0 && (
                  <div>
                    <p className="text-xs text-light-tertiary mb-2">Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {researchData.narratives.slice(0, 6).map((narrative: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-accent-brand/15 border border-accent-brand/30 text-accent-brand rounded-full text-xs font-medium"
                        >
                          #{narrative}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {researchData.market_analysis?.tam && (
                  <div>
                    <p className="text-xs text-light-tertiary mb-1">Market</p>
                    <p className="text-sm text-light-primary">
                      {researchData.market_analysis.tam}
                    </p>
                  </div>
                )}
              </div>
          </div>
            );
          })()}

          {/* Task Requirements and Guidelines */}
          <div className="bg-dark-secondary border border-dark-quaternary rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-accent-brand rounded-full"></div>
              <h4 className="text-sm font-semibold text-light-primary">Task Requirements & Guidelines</h4>
            </div>
            
            {/* Task Description/Guidelines */}
            {task.task_description && (
              <div className="mb-4">
                <p className="text-xs text-light-tertiary mb-2 font-medium">Guidelines:</p>
                <p className="text-sm text-light-primary leading-relaxed">{task.task_description}</p>
              </div>
            )}

          {/* Task Requirements */}
            <div className="space-y-2 text-xs">
              <p className="text-xs text-light-tertiary mb-2 font-medium">Requirements:</p>
            {task.task_count && task.task_count > 1 && (
              (() => {
                const toWords = (n: number) => {
                  const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"];
                  return n <= 10 ? words[n] : String(n);
                };
                const cashtag = task.task_tweet_cashtag
                  ? (task.task_tweet_cashtag.startsWith("$") ? task.task_tweet_cashtag : `$${task.task_tweet_cashtag}`)
                  : null;
                const hashtag = task.task_tweet_hashtag
                  ? (task.task_tweet_hashtag.startsWith("#") ? task.task_tweet_hashtag : `#${task.task_tweet_hashtag}`)
                  : null;
                const handle = task.task_tweet_handle
                  ? (task.task_tweet_handle.startsWith("@") ? task.task_tweet_handle : `@${task.task_tweet_handle}`)
                  : null;
                const descriptor = cashtag || hashtag || handle || "this action";
                const verb = task.task_type === "tweet" ? "Tweet" : task.task_type === "reply" ? "Reply" : task.task_type === "quote_tweet" ? "Quote" : "Complete";
                return (
                  <div className="space-y-2">
                    <div className="text-light-primary">
                      {verb} {descriptor !== "this action" ? `with ${descriptor} ` : ""}
                      {toWords(task.task_count)} time{task.task_count > 1 ? "s" : ""}.
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-light-tertiary">Repeat:</span>
                      <span className="px-2 py-0.5 bg-dark-quaternary rounded text-light-primary font-medium">
                        {task.task_count} time{task.task_count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
              {(!task.task_count || task.task_count === 1) && !task.task_tweet_hashtag && !task.task_tweet_cashtag && !task.task_tweet_handle && !task.task_tweet_website && !task.task_image_required && (
                <div className="text-light-tertiary">No special requirements</div>
              )}
              {task.task_tweet_hashtag && (
                <div className="flex items-center gap-2">
                  <span className="text-light-tertiary">Hashtag:</span>
                  <span className="px-2 py-0.5 bg-dark-quaternary rounded text-light-primary">
                    #{task.task_tweet_hashtag.replace("#", "")}
                  </span>
                </div>
              )}
              {task.task_tweet_cashtag && (
                <div className="flex items-center gap-2">
                  <span className="text-light-tertiary">Cashtag:</span>
                  <span className="px-2 py-0.5 bg-dark-quaternary rounded text-light-primary">
                    ${task.task_tweet_cashtag.replace("$", "")}
                  </span>
                </div>
              )}
              {task.task_tweet_handle && (
                <div className="flex items-center gap-2">
                  <span className="text-light-tertiary">Mention:</span>
                  <span className="px-2 py-0.5 bg-dark-quaternary rounded text-light-primary">
                    @{task.task_tweet_handle.replace("@", "")}
                  </span>
                </div>
              )}
              {task.task_tweet_website && (
                <div className="flex items-center gap-2">
                  <span className="text-light-tertiary">Website:</span>
                  <a
                    href={task.task_tweet_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 bg-dark-quaternary rounded text-accent-brand hover:underline text-xs truncate max-w-[150px]"
                  >
                    {task.task_tweet_website}
                  </a>
                </div>
              )}
              {task.task_image_required && (
                <div className="flex items-center gap-2">
                  <span className="text-light-tertiary">Requires:</span>
                  <span className="px-2 py-0.5 bg-accent-brand/20 border border-accent-brand/30 rounded text-accent-brand">
                    Image/Media
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tweet Preview for Reply/Quote Tasks */}
          {(task.task_type === "reply" || task.task_type === "quote_tweet") && task.task_tweet_id && (
            <div className="bg-dark-secondary border border-dark-quaternary rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-accent-brand rounded-full"></div>
                <h4 className="text-sm font-semibold text-light-primary">
                  {task.task_type === "reply" ? "Replying to" : "Quoting"}
                </h4>
              </div>
              <div className="rounded-lg border border-dark-quaternary/60 overflow-hidden">
                <div className="h-[240px] overflow-y-auto custom-scrollbar">
                  <div ref={tweetEmbedRef} className="px-2 py-2" />
                </div>
              </div>
            </div>
          )}

          {/* Right Column content moved below */}
        </div>

        {/* Right Column - Composer */}
        <div className="space-y-6">

          {/* Composer Title */}
          {(task.task_type === "reply" || task.task_type === "quote_tweet") && (
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-accent-brand rounded-full"></div>
              <h4 className="text-base font-semibold text-light-primary">
                {task.task_type === "reply" ? "Replying" : "Quoting"}
              </h4>
            </div>
          )}

          {/* Authentication Check */}
          {!isAuthenticated ? (
        <div className="text-center py-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-accent-brand/20 border border-accent-brand/30 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg
                className="w-8 h-8 text-accent-brand"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-light-primary mb-3">
              Login Required
            </h4>
            <p className="text-light-tertiary text-sm leading-relaxed mb-6">
              Please log in to use AI content generation.
            </p>
          </div>

          <Button
            onClick={login}
            className="w-full bg-accent-brand text-neutral-900 hover:bg-[#00F5A8] font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Login with X
          </Button>
        </div>
      ) : (
        <>
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setComposerMode("ai")}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                composerMode === "ai"
                  ? "border-accent-brand text-accent-brand bg-accent-brand/10"
                  : "border-dark-quaternary text-light-tertiary hover:text-light-secondary"
              }`}
            >
              AI Assist
            </button>
            <button
              type="button"
              onClick={() => setComposerMode("manual")}
              className={`px-3 py-1.5 rounded-md text-sm border ${
                composerMode === "manual"
                  ? "border-accent-brand text-accent-brand bg-accent-brand/10"
                  : "border-dark-quaternary text-light-tertiary hover:text-light-secondary"
              }`}
            >
              Write Manually
            </button>
          </div>

          {/* Prompt Selection (AI mode) */}
          {composerMode === "ai" && randomPrompts.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-light-secondary mb-2">
                Quick Prompts (Optional)
              </label>
              <Select value={selectedPrompt} onValueChange={handlePromptSelect}>
                <SelectTrigger className="w-full bg-dark-secondary border-2 border-dark-quaternary text-light-primary text-sm p-3 rounded-lg focus:border-accent-brand focus:ring-2 focus:ring-accent-brand/20 focus:outline-none min-h-[44px] h-auto [&>span]:line-clamp-2 [&>span]:text-left shadow-sm">
                  <SelectValue placeholder="Select a prompt to generate content..." />
                </SelectTrigger>
                <SelectContent 
                  className="bg-dark-tertiary border-2 border-dark-quaternary/80 shadow-2xl max-h-[60vh] w-[calc(100vw-2rem)] sm:w-[var(--radix-select-trigger-width)] sm:min-w-[400px] sm:max-w-[500px] [&_[role=option]]:whitespace-normal [&_[role=option]]:break-words p-1.5"
                  position="popper"
                >
                  {randomPrompts.map((prompt, index) => (
                    <SelectItem
                      key={index}
                      value={prompt}
                      className="text-light-primary text-sm py-3.5 px-4 pr-8 cursor-pointer bg-dark-secondary/90 border border-dark-quaternary/60 hover:bg-dark-quaternary hover:border-accent-brand/40 hover:shadow-md focus:bg-dark-quaternary focus:text-light-primary focus:border-accent-brand/60 focus:shadow-md items-start min-h-[48px] transition-all duration-150 rounded-md mb-1.5 last:mb-0"
                    >
                      <span className="whitespace-normal break-words block pr-2 leading-relaxed">{prompt}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-light-tertiary">Pick a prompt or write your own. Then click Generate.</p>
            </div>
          )}

          {/* Custom Prompt Input (AI mode) */}
          {composerMode === "ai" && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-light-secondary mb-2">
                Custom Prompt (Optional)
              </label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full h-20 bg-dark-secondary border border-dark-quaternary text-light-primary text-sm p-3 rounded-lg focus:border-accent-brand focus:ring-1 focus:ring-accent-brand focus:outline-none resize-none"
                placeholder="Describe what you want to write about..."
              />
            </div>
          )}

          {/* Generate Button (AI mode) */}
          {composerMode === "ai" && (
            <div className={`mb-4 ${hasGeneratedContent ? 'flex justify-end' : ''}`}>
              <button
                onClick={generateContent}
                disabled={isGenerating || (!selectedPrompt && !userPrompt.trim())}
                className={`${hasGeneratedContent ? 'w-auto px-3 py-1.5' : 'w-full px-4 py-2'} bg-accent-brand text-neutral-900 hover:bg-accent-brand/90 text-sm font-semibold rounded-lg transition-colors disabled:bg-dark-secondary disabled:text-light-tertiary disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isGenerating ? (
                  <WaterDropletLoader size="small" text="Generating..." />
                ) : (
                  <>
                    <span>✨</span>
                    {hasGeneratedContent ? "Regenerate" : "Generate AI Content"}
                  </>
                )}
              </button>
              {!hasGeneratedContent && (
                <p className="mt-2 text-[11px] text-light-tertiary text-center">
                  or
                  <button
                    type="button"
                    onClick={() => setComposerMode("manual")}
                    className="ml-1 underline text-light-primary hover:text-accent-brand"
                  >
                    write manually
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Content Editor */}
          {(composerMode === "manual" || hasGeneratedContent) ? (
            <div className="mb-4">
              <label className="block text-xs font-medium text-light-secondary mb-2">
                Your Content
              </label>
              <textarea
                ref={contentTextareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-32 bg-dark-secondary border border-dark-quaternary text-light-primary text-sm p-3 rounded-lg focus:border-accent-brand focus:ring-1 focus:ring-accent-brand focus:outline-none resize-none"
                placeholder="Write your tweet, reply, or quote tweet here..."
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-light-tertiary">
                  {content.length} characters
                </span>
                {researchLoading && (
                  <span className="text-xs text-light-tertiary">
                    Loading project data...
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 border border-dark-quaternary rounded-lg bg-dark-secondary/50">
              <p className="text-sm text-light-secondary mb-1">AI is ready to help.</p>
              <p className="text-xs text-light-tertiary">Choose a quick prompt or write your own, then click Generate. You can always switch to manual writing.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {(hasGeneratedContent || composerMode === "manual") && (
              <Button
                onClick={handlePost}
                disabled={!content.trim()}
                className="flex-1 bg-accent-brand hover:bg-accent-brand/90 text-neutral-900 font-semibold px-6 py-3 rounded-lg transition-colors duration-200 disabled:bg-dark-secondary disabled:text-light-tertiary disabled:cursor-not-allowed"
              >
                Post on X
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className={`px-6 py-3 border-dark-quaternary text-light-secondary hover:bg-dark-secondary ${hasGeneratedContent || composerMode === 'manual' ? '' : 'flex-1'}`}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
