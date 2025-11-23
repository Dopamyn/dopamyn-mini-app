"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useTwitterDatabaseSync } from "@/hooks/useTwitterDatabaseSync";
import { Button } from "@/components/ui/button";
import {
  LikeIcon,
  ReplyIcon,
  RetweetIcon,
  ViewIcon,
} from "@/components/icons/twitter-icons";
import { ExternalLink, Clock } from "lucide-react";

// Amorphous Bubble Component
const AmorphousBubble = ({
  size = "default",
  color = "accent-brand",
  delay = 0,
}: {
  size?: "small" | "default" | "large";
  color?: string;
  delay?: number;
}) => {
  const sizeClasses = {
    small: "w-3 h-3",
    default: "w-5 h-5",
    large: "w-8 h-8",
  };

  return (
    <div
      className={`absolute ${sizeClasses[size]} bg-${color} animate-bubble-morph animate-bubble-float animate-bubble-glow opacity-70`}
      style={{
        animationDelay: `${delay}s`,
        borderRadius: "50% 60% 40% 70% / 60% 30% 70% 40%",
      }}
    />
  );
};

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
        {/* Main droplet with glow effect */}
        <div
          className={`${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-glow`}
        ></div>

        {/* Distortion waves with custom animations */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-ripple opacity-30`}
        ></div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-ripple opacity-20`}
          style={{ animationDelay: "0.8s" }}
        ></div>

        {/* Perturbation effects with distortion */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-distort opacity-25`}
        ></div>
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-bounce opacity-20`}
          style={{ animationDelay: "0.5s" }}
        ></div>

        {/* Ripple effect with custom timing */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} border-2 border-accent-brand rounded-full animate-droplet-ripple opacity-40`}
          style={{ animationDelay: "1.2s" }}
        ></div>

        {/* Additional subtle distortion layer */}
        <div
          className={`absolute inset-0 ${sizeClasses[size]} bg-accent-brand rounded-full animate-droplet-distort opacity-15`}
          style={{ animationDelay: "1.5s" }}
        ></div>

        {/* Amorphous bubbles around the main droplet */}
        <AmorphousBubble size="small" color="accent-brand/50" delay={0.3} />
        <AmorphousBubble size="small" color="[#00F5A8]/60" delay={1.1} />
        <AmorphousBubble size="small" color="accent-brand/40" delay={1.8} />
      </div>
      {text && <span className="text-sm text-neutral-300">{text}</span>}
    </div>
  );
};

interface ResearchHubProps {
  authorHandle?: string;
  paymentToken?: string;
  targetXHandle?: string;
}

interface Tweet {
  tweet_id: string;
  author_handle: string;
  profile_image_url: string;
  body: string;
  tweet_create_time: string;
  reply_count: number;
  retweet_count: number;
  like_count: number;
  view_count: number;
  sentiment: number;
  tweet_category: string;
}

interface TweetFeedResponse {
  result: {
    original_tweets: Tweet[];
    mentions: Tweet[];
    pagination: {
      start: number;
      limit: number;
      has_more: boolean;
      next_start: number;
    };
  };
}

interface CompetitiveAdvantage {
  ecosystem_and_network_effects: string;
  market_positioning_and_strategy: string;
  other_distinct_advantages: string;
  security_and_trust_features: string;
  technological_edge: string;
  usability_and_accessibility: string;
}

interface CoreFeature {
  name: string;
  description: string;
}

interface CoreTechnology {
  analytics_infrastructure: string;
  core_features: CoreFeature[];
}

interface MarketAnalysis {
  market_trends: string;
  tam: string;
  target_audience: string;
}

interface APIResponse {
  data: {
    competitive_advantage: CompetitiveAdvantage;
    core_technology: CoreTechnology;
    market_analysis: MarketAnalysis;
    one_line_description: string;
    narratives: string[];
    token_name?: string;
    token_symbol?: string;
    token_type?: string;
    token_utility?: string;
    token_economics?: string;
    team_and_leadership?: {
      core_team_members: {
        name_or_handle: string;
        role: string;
        profile_summary?: string;
      }[];
    };
    swot_analysis?: {
      strengths?: string[];
      weaknesses?: string[];
      opportunities?: string[];
      threats?: string[];
    };
  };
  success: boolean;
}

export default function ResearchHub({
  authorHandle,
  paymentToken,
  targetXHandle,
}: ResearchHubProps) {
  const { isAuthenticated, login, getTwitterHandle } = useTwitterDatabaseSync();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<APIResponse["data"] | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("overview");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [randomPrompts, setRandomPrompts] = useState<string[]>([]);
  const [dynamicPrompts, setDynamicPrompts] = useState<string[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] =
    useState<boolean>(false);
  const [dailyGenerations, setDailyGenerations] = useState<number>(0);
  const [lastResetDate, setLastResetDate] = useState<string>("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tweetsLoading, setTweetsLoading] = useState<boolean>(false);
  const [tweetsError, setTweetsError] = useState<string | null>(null);
  const [tweetInterval, setTweetInterval] = useState<"1day" | "7day" | "30day">(
    "7day"
  );
  const [tweetSortBy, setTweetSortBy] = useState<
    | "tweet_create_time_desc"
    | "like_count_desc"
    | "retweet_count_desc"
    | "reply_count_desc"
    | "view_count_desc"
  >("tweet_create_time_desc");

  const DAILY_LIMIT = 3;

  // Rate limiting helper functions
  const getTodayDateString = () => {
    return new Date().toDateString();
  };

  const getRateLimitKey = (userHandle: string) => {
    return `ai_generations_${userHandle}`;
  };

  const loadRateLimitData = (userHandle: string) => {
    if (typeof window === "undefined") return;

    const key = getRateLimitKey(userHandle);
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        const today = getTodayDateString();

        if (data.date === today) {
          setDailyGenerations(data.count || 0);
          setLastResetDate(data.date);
        } else {
          // Reset for new day
          setDailyGenerations(0);
          setLastResetDate(today);
          localStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
        }
      } catch (error) {
        console.error("Error parsing rate limit data:", error);
        resetRateLimit(userHandle);
      }
    } else {
      resetRateLimit(userHandle);
    }
  };

  const resetRateLimit = (userHandle: string) => {
    const today = getTodayDateString();
    setDailyGenerations(0);
    setLastResetDate(today);
    if (typeof window !== "undefined") {
      const key = getRateLimitKey(userHandle);
      localStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
    }
  };

  const incrementGenerationCount = (userHandle: string) => {
    const newCount = dailyGenerations + 1;
    const today = getTodayDateString();

    setDailyGenerations(newCount);

    if (typeof window !== "undefined") {
      const key = getRateLimitKey(userHandle);
      localStorage.setItem(
        key,
        JSON.stringify({ date: today, count: newCount })
      );
    }
  };

  const canGenerate = () => {
    return dailyGenerations < DAILY_LIMIT;
  };

  const getRemainingGenerations = () => {
    return Math.max(0, DAILY_LIMIT - dailyGenerations);
  };

  const allPrompts = [
    "Write about why this project caught your attention as an investment and what makes it stand out from the crowd.",
    "Explain the technology behind this project in a way that shows you understand what makes it technically interesting.",
    "Share your thoughts on how this project compares to similar ones you've been following in the space.",
    "Discuss the market opportunity you see for this project and who you think would actually use it.",
    "Give an honest assessment of the risks and challenges this project might face, along with what they're doing to address them.",
    "Share what you find interesting about this project and why you think others should pay attention to it.",
    "Talk about the team behind this project and what in their background gives you confidence in their ability to execute.",
    "Break down how the tokenomics work and what it means for people who decide to hold the token.",
    "Discuss the upcoming milestones on their roadmap and which ones you think are most important to watch.",
    "Compare this to how traditional finance handles the same problems and explain why this approach makes more sense.",
    "Explain what real problem this project is trying to solve and why that problem matters.",
    "Talk about the partnerships they've formed and how those relationships could help them succeed.",
    "Share your thoughts on the community around this project and how it might grow over time.",
    "Describe the technical approach they're taking and why you think it's a smart way to build this.",
    "Look at how adoption has been going so far and what trends you're seeing in the data.",
    "Explain what this project does in simple terms and why that's valuable.",
    "Discuss how they're handling regulatory challenges and what that means for their future.",
    "Talk about how they're planning to scale and whether you think their approach will work.",
    "Share your thoughts on their environmental approach and why that matters in today's crypto landscape.",
    "Explain where this fits in the broader DeFi space and what trends it's riding or creating.",
    "Talk about how easy this is to actually use and whether regular people could adopt it.",
    "Discuss their security approach and what the audit results tell you about the project's safety.",
    "Share your thoughts on how they're planning to get users and whether their strategy makes sense.",
    "Talk about their funding situation and what the investor backing says about the project's potential.",
    "Explain what's interesting about their technical innovation and how it differs from other projects.",
    "Discuss how they're handling the scalability challenges that plague most blockchain projects.",
    "Share your thoughts on their cross-chain capabilities and why interoperability matters here.",
    "Talk about how governance works in this project and what decentralization means in practice.",
    "Explain their approach to privacy and data protection and why that matters for users.",
    "Discuss their mobile strategy and how they're making crypto more accessible to everyday users.",
    "Create content about the project's layer 2 solutions and transaction efficiency.",
    "Explain how this project enables new business models or use cases.",
    "Write about the project's developer ecosystem and building tools.",
    "Create content about the project's oracle solutions and data reliability.",
    "Explain the project's approach to MEV protection and fair transaction ordering.",
    "Write about the project's integration with traditional financial institutions.",
    "Create content about the project's NFT and digital asset capabilities.",
    "Explain how this project democratizes access to financial services.",
    "Write about the project's AI integration and smart automation features.",
    "Create content about the project's gaming and metaverse applications.",
    "Explain the project's supply chain and transparency solutions.",
    "Write about the project's identity verification and KYC innovations.",
    "Create content about the project's lending and borrowing mechanisms.",
    "Explain how this project reduces transaction costs and improves efficiency.",
    "Write about the project's staking rewards and passive income opportunities.",
    "Create content about the project's insurance and risk management features.",
    "Explain the project's prediction markets and betting mechanisms.",
    "Write about the project's decentralized exchange and trading features.",
    "Create content about the project's payment processing and merchant adoption.",
    "Explain how this project bridges traditional and crypto economies.",
    "Write about the project's educational initiatives and community building.",
    "Create content about the project's enterprise solutions and B2B applications.",
    "Explain the project's compliance tools and regulatory reporting features.",
    "Write about the project's carbon offset and environmental initiatives.",
    "Create content about the project's social impact and humanitarian applications.",
    "Explain how this project empowers creators and content monetization.",
    "Write about the project's real estate and property tokenization features.",
    "Create content about the project's healthcare and medical data applications.",
    "Explain the project's supply chain transparency and product traceability.",
    "Write about the project's voting and governance participation mechanisms.",
    "Create content about the project's microfinance and financial inclusion efforts.",
    "Explain how this project enables programmable money and smart contracts.",
    "Write about the project's cross-border payments and remittance solutions.",
    "Create content about the project's asset management and portfolio tools.",
    "Explain the project's derivatives and financial instruments innovations.",
    "Write about the project's algorithmic trading and market making features.",
    "Create content about the project's wallet integration and user interface design.",
    "Explain how this project handles network congestion and gas optimization.",
    "Write about the project's backup and recovery mechanisms for user funds.",
    "Create content about the project's multi-signature and security protocols.",
    "Explain the project's atomic swaps and cross-chain trading capabilities.",
    "Write about the project's liquidity mining and yield farming opportunities.",
    "Create content about the project's flash loans and capital efficiency tools.",
    "Explain how this project prevents front-running and ensures fair trading.",
    "Write about the project's aggregation services and best price execution.",
    "Create content about the project's portfolio tracking and analytics tools.",
    "Explain the project's tax reporting and compliance automation features.",
    "Write about the project's institutional custody and security solutions.",
    "Create content about the project's API integration and developer resources.",
    "Explain how this project enables composability and protocol integration.",
    "Write about the project's testing and simulation environments.",
    "Create content about the project's documentation and learning resources.",
    "Explain the project's bug bounty and security audit programs.",
    "Write about the project's community governance and proposal mechanisms.",
    "Create content about the project's treasury management and fund allocation.",
    "Explain how this project balances decentralization with user experience.",
    "Write about the project's mobile app features and offline capabilities.",
    "Create content about the project's hardware wallet integration and security.",
    "Explain the project's privacy features and anonymous transaction options.",
    "Write about the project's batch processing and transaction optimization.",
    "Create content about the project's emergency procedures and circuit breakers.",
    "Explain how this project handles upgrades and protocol evolution.",
    "Write about the project's incentive alignment and token distribution model.",
    "Create content about the project's partnerships with academic institutions.",
    "Explain the project's open source philosophy and code transparency.",
    "Write about the project's testing in different market conditions and stress scenarios.",
    "Create content about the project's user onboarding and education programs.",
    "Explain how this project contributes to the broader blockchain ecosystem.",
    "Write about the project's long-term vision and sustainable development goals.",
    "Create content about the project's innovation in user interface and experience design.",
    "Explain the project's approach to handling black swan events and market crashes.",
    "Write about the project's research and development initiatives for future features.",
    "Create content about the project's collaboration with regulators and policymakers.",
    "Explain how this project addresses the needs of institutional versus retail users.",
    "Write about the project's contribution to financial literacy and crypto education.",
  ];

  // Function to randomly select 5 prompts
  const getRandomPrompts = () => {
    const shuffled = [...allPrompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  };

  // Generate dynamic prompts based on project data
  const generateDynamicPrompts = (projectData: any): string[] => {
    const prompts: string[] = [];
    const projectName = projectData.token_name || "this project";
    const hasTeam =
      projectData.team_and_leadership?.core_team_members?.length > 0;
    const hasTokenomics =
      projectData.token_utility || projectData.token_economics;
    const hasCompetitive =
      projectData.competitive_advantage &&
      Object.keys(projectData.competitive_advantage).length > 0;
    const hasMarketAnalysis = projectData.market_analysis;
    const hasTech = projectData.core_technology;
    const hasNarratives = projectData.narratives?.length > 0;
    const hasSwot = projectData.swot_analysis;

    // Investment & Financial prompts
    if (hasMarketAnalysis?.tam) {
      prompts.push(
        `Analyze the ${projectData.market_analysis.tam} market opportunity that ${projectName} is targeting and why this timing makes sense.`
      );
    }
    if (hasTokenomics) {
      prompts.push(
        `Break down ${projectName}'s tokenomics and explain what value accrual mechanisms exist for token holders.`
      );
    }
    prompts.push(
      `Share your thoughts on ${projectName} as an investment opportunity and what fundamentals caught your attention.`
    );

    // Technical prompts
    if (hasTech?.analytics_infrastructure) {
      prompts.push(
        `Explain the technical architecture behind ${projectName} and why their approach to building this is interesting.`
      );
    }
    if (hasTech?.core_features?.length > 0) {
      const mainFeature = hasTech.core_features[0].name;
      prompts.push(
        `Dive into ${projectName}'s ${mainFeature} feature and how it differentiates them technically.`
      );
    }
    if (projectData.competitive_advantage?.technological_edge) {
      prompts.push(
        `Discuss the technological advantages that ${projectName} has over existing solutions in the space.`
      );
    }

    // Market & Competitive prompts
    if (hasCompetitive) {
      prompts.push(
        `Compare ${projectName} to its main competitors and explain what gives them a competitive edge.`
      );
    }
    if (hasMarketAnalysis?.target_audience) {
      prompts.push(
        `Analyze who ${projectName} is building for and whether their target market strategy makes sense.`
      );
    }
    if (hasNarratives) {
      const mainNarrative = projectData.narratives[0];
      prompts.push(
        `Explain how ${projectName} fits into the ${mainNarrative} narrative and what trends they're capitalizing on.`
      );
    }

    // Team & Execution prompts
    if (hasTeam) {
      const teamSize = projectData.team_and_leadership.core_team_members.length;
      prompts.push(
        `Share your thoughts on ${projectName}'s team of ${teamSize} members and what in their background gives you confidence.`
      );
    }
    prompts.push(
      `Discuss ${projectName}'s execution capability and what milestones you're watching for.`
    );

    // Risk & Analysis prompts
    if (hasSwot?.weaknesses) {
      prompts.push(
        `Give an honest assessment of the main risks and challenges facing ${projectName} right now.`
      );
    }
    if (hasSwot?.strengths) {
      prompts.push(
        `Highlight the key strengths that ${projectName} has going for them and why those matter.`
      );
    }

    // Ecosystem & Adoption prompts
    if (projectData.competitive_advantage?.ecosystem_and_network_effects) {
      prompts.push(
        `Analyze ${projectName}'s ecosystem strategy and how they're building network effects.`
      );
    }
    if (hasMarketAnalysis?.market_trends) {
      prompts.push(
        `Explain how ${projectName} is positioned to benefit from current market trends you're seeing.`
      );
    }

    // Innovation & Future prompts
    prompts.push(
      `Share what's most innovative about ${projectName}'s approach and why that innovation matters.`
    );
    prompts.push(
      `Discuss ${projectName}'s long-term vision and whether you think they can execute on it.`
    );

    // User Experience & Adoption
    if (projectData.competitive_advantage?.usability_and_accessibility) {
      prompts.push(
        `Talk about ${projectName}'s user experience and how easy it would be for mainstream users to adopt.`
      );
    }

    // Governance & Community
    if (
      projectData.narratives?.includes("DAO") ||
      projectData.competitive_advantage?.ecosystem_and_network_effects
    ) {
      prompts.push(
        `Explain ${projectName}'s community and governance approach and how sustainable you think it is.`
      );
    }

    // Security & Trust
    if (projectData.competitive_advantage?.security_and_trust_features) {
      prompts.push(
        `Analyze ${projectName}'s security model and what gives you confidence in their approach.`
      );
    }

    // Partnerships & Ecosystem
    if (projectData.competitive_advantage?.market_positioning_and_strategy) {
      prompts.push(
        `Discuss ${projectName}'s strategic partnerships and how they're positioning themselves in the market.`
      );
    }

    return prompts;
  };

  // Generate and store dynamic prompts when project data is available
  useEffect(() => {
    if (apiData && !isGeneratingPrompts) {
      setIsGeneratingPrompts(true);

      // Generate dynamic prompts
      const generatedPrompts = generateDynamicPrompts(apiData);

      // Store prompts locally (simulate localStorage for this session)
      setDynamicPrompts(generatedPrompts);

      // Select 5 random prompts from the generated ones
      const shuffled = [...generatedPrompts].sort(() => 0.5 - Math.random());
      setRandomPrompts(shuffled.slice(0, 5));

      setIsGeneratingPrompts(false);
    }
  }, [apiData]);

  // Fallback to static prompts if no dynamic prompts available
  useEffect(() => {
    if (!apiData && randomPrompts.length === 0) {
      setRandomPrompts(getRandomPrompts());
    }
  }, [apiData]);

  // Load rate limit data when user authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      const userHandle = getTwitterHandle();
      if (userHandle) {
        loadRateLimitData(userHandle);
      }
    } else {
      // Reset when user logs out
      setDailyGenerations(0);
      setLastResetDate("");
    }
  }, [isAuthenticated, getTwitterHandle]);

  const toggleExpanded = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const truncateText = (text: string, limit: number, sectionKey: string) => {
    if (!text || text.length <= limit) return text;

    const isExpanded = expandedSections[sectionKey];
    if (isExpanded) {
      return (
        <span>
          {text}
          <button
            onClick={() => toggleExpanded(sectionKey)}
            className="ml-2 text-accent-brand hover:text-[#00F5A8] text-xs underline cursor-pointer"
          >
            Show less
          </button>
        </span>
      );
    }

    return (
      <span>
        {text.substring(0, limit)}...
        <button
          onClick={() => toggleExpanded(sectionKey)}
          className="ml-2 text-accent-brand hover:text-[#00F5A8] text-xs underline cursor-pointer"
        >
          Read more
        </button>
      </span>
    );
  };

  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!targetXHandle) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Extract handle without @ symbol
        const handle = targetXHandle.replace("@", "");

        const response = await fetch(`/api/research-hub?handle=${handle}`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data: APIResponse = await response.json();

        if (data.success && data.data) {
          setApiData(data.data);
        } else {
          throw new Error("Invalid API response");
        }
      } catch (err) {
        console.error("Error fetching analysis data:", err);

        // Try to extract more detailed error information
        let errorMessage = "Failed to fetch analysis data";
        if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysisData();
  }, [targetXHandle]);

  // Fetch recent tweets
  useEffect(() => {
    const fetchRecentTweets = async () => {
      if (!targetXHandle || !paymentToken) {
        return;
      }

      try {
        setTweetsLoading(true);
        setTweetsError(null);

        // Extract handle without @ symbol
        const handle = targetXHandle.replace("@", "");

        const response = await fetch(
          `/api/raids/tweet-feed?symbol=${paymentToken}&twitter_handle=${handle}&feed_type=original&limit=20&sort_by=${tweetSortBy}&interval=${tweetInterval}&start=0`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch tweets: ${response.status}`);
        }

        const data: TweetFeedResponse = await response.json();

        // Extract original tweets from the response
        if (data.result && data.result.original_tweets) {
          setTweets(data.result.original_tweets);
        } else {
          setTweets([]);
        }
      } catch (err) {
        console.error("Error fetching recent tweets:", err);
        setTweetsError(
          err instanceof Error ? err.message : "Failed to fetch tweets"
        );
        setTweets([]);
      } finally {
        setTweetsLoading(false);
      }
    };

    if (selectedSection === "tweets") {
      fetchRecentTweets();
    }
  }, [
    targetXHandle,
    paymentToken,
    selectedSection,
    tweetInterval,
    tweetSortBy,
  ]);

  const handlePromptSelect = (promptValue: string) => {
    setSelectedPrompt(promptValue);
    setUserPrompt(promptValue);
  };

  const regeneratePrompts = () => {
    if (dynamicPrompts.length > 0) {
      // Shuffle and select 5 different prompts from the dynamic ones
      const shuffled = [...dynamicPrompts].sort(() => 0.5 - Math.random());
      setRandomPrompts(shuffled.slice(0, 5));
    } else {
      // Fallback to static prompts
      setRandomPrompts(getRandomPrompts());
    }
    setSelectedPrompt("");
    setUserPrompt("");
  };

  const generateContent = async () => {
    const finalPrompt = userPrompt.trim() || selectedPrompt;
    if (!finalPrompt || !apiData) return;

    // Check rate limit
    if (!canGenerate()) {
      return; // Rate limit exceeded, don't generate
    }

    const userHandle = getTwitterHandle();
    if (!userHandle) return;

    setIsGenerating(true);
    try {
      const generatedText = await generateContentWithGemini(
        finalPrompt,
        apiData
      );
      setGeneratedContent(generatedText);

      // Increment the generation count only on successful generation
      incrementGenerationCount(userHandle);
    } catch (error) {
      console.error("Error generating content:", error);
      setGeneratedContent("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateContentWithGemini = async (
    userPrompt: string,
    curatedContent: any
  ): Promise<string> => {
    try {
      // Use the unified AI route which proxies to the external service
      const response = await fetch("/api/ai/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt, researchData: curatedContent, stream: false }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      // Support multiple possible shapes
      return (
        data?.content ||
        data?.data?.content ||
        data?.text ||
        data?.generated ||
        "No content generated"
      );
    } catch (error) {
      console.error("AI generation failed:", error);
      return `Failed to generate content: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  };

  const renderSectionContent = () => {
    if (!apiData) return null;

    switch (selectedSection) {
      case "overview":
        return (
          <div className="space-y-4">
            {/* Project Summary */}
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  Project Summary
                </h4>
              </div>
              <p className="text-neutral-300 text-sm leading-relaxed">
                {truncateText(
                  apiData.one_line_description || "",
                  200,
                  "overview-description"
                )}
              </p>
            </div>

            {/* Key Information */}
            {(apiData.token_name || apiData.token_symbol) && (
              <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                  <h4 className="text-lg font-semibold text-white">
                    Token Information
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {apiData.token_name && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                        Token Name
                      </p>
                      <p className="text-neutral-200 text-sm font-medium">
                        {apiData.token_name}
                      </p>
                    </div>
                  )}
                  {apiData.token_symbol && (
                    <div>
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                        Symbol
                      </p>
                      <p className="text-neutral-200 text-sm font-medium">
                        ${apiData.token_symbol}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Market Categories */}
            {apiData.narratives && apiData.narratives.length > 0 && (
              <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                  <h4 className="text-lg font-semibold text-white">
                    Market Categories
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {apiData.narratives.slice(0, 12).map((narrative, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-accent-brand/15 border border-accent-brand/30 text-accent-brand rounded-full text-xs font-medium"
                    >
                      #{narrative}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "competitive":
        return (
          <div className="space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  Competitive Advantages
                </h4>
              </div>
              <div className="space-y-5">
                {Object.entries(apiData.competitive_advantage || {}).map(
                  ([key, value]) => (
                    <div key={key} className="relative">
                      <div className="border-l-2 border-accent-brand/40 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-accent-brand rounded-full"></div>
                          <h5 className="text-sm font-semibold text-neutral-200 capitalize">
                            {key.replace(/_/g, " ")}
                          </h5>
                        </div>
                        <p className="text-neutral-400 text-sm leading-relaxed">
                          {truncateText(
                            String(value || ""),
                            250,
                            `competitive-${key}`
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        );

      case "technology":
        return (
          <div className="space-y-4">
            {/* Core Technology Infrastructure */}
            {apiData.core_technology?.analytics_infrastructure && (
              <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                  <h4 className="text-lg font-semibold text-white">
                    Technology Infrastructure
                  </h4>
                </div>
                <p className="text-neutral-300 text-sm leading-relaxed">
                  {truncateText(
                    apiData.core_technology.analytics_infrastructure,
                    300,
                    "tech-infrastructure"
                  )}
                </p>
              </div>
            )}

            {/* Core Features */}
            {apiData.core_technology?.core_features &&
              apiData.core_technology.core_features.length > 0 && (
                <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                    <h4 className="text-lg font-semibold text-white">
                      Key Features
                    </h4>
                  </div>
                  <div className="grid gap-4">
                    {apiData.core_technology.core_features
                      .slice(0, 8)
                      .map((feature, index) => (
                        <div
                          key={index}
                          className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-accent-brand rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <h5 className="text-sm font-semibold text-neutral-200 mb-2">
                                {feature.name}
                              </h5>
                              <p className="text-neutral-400 text-sm leading-relaxed">
                                {truncateText(
                                  feature.description || "",
                                  200,
                                  `feature-${index}`
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        );

      case "market":
        return (
          <div className="space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  Market Analysis
                </h4>
              </div>

              <div className="grid gap-5">
                {/* Market Trends */}
                {apiData.market_analysis?.market_trends && (
                  <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-accent-brand rounded-full"></div>
                      <h5 className="text-sm font-semibold text-accent-brand">
                        Market Trends
                      </h5>
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {truncateText(
                        apiData.market_analysis.market_trends,
                        250,
                        "market-trends"
                      )}
                    </p>
                  </div>
                )}

                {/* TAM */}
                {apiData.market_analysis?.tam && (
                  <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-accent-brand rounded-full"></div>
                      <h5 className="text-sm font-semibold text-accent-brand">
                        Total Addressable Market
                      </h5>
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {apiData.market_analysis.tam}
                    </p>
                  </div>
                )}

                {/* Target Audience */}
                {apiData.market_analysis?.target_audience && (
                  <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-accent-brand rounded-full"></div>
                      <h5 className="text-sm font-semibold text-accent-brand">
                        Target Audience
                      </h5>
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {truncateText(
                        apiData.market_analysis.target_audience,
                        200,
                        "target-audience"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "tokenomics":
        return (
          <div className="space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  Token Economics
                </h4>
              </div>

              <div className="grid gap-4">
                {/* Token Details */}
                <div className="grid grid-cols-2 gap-4">
                  {apiData.token_name && (
                    <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                        Token Name
                      </p>
                      <p className="text-neutral-200 text-sm font-medium">
                        {apiData.token_name}
                      </p>
                    </div>
                  )}
                  {apiData.token_symbol && (
                    <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                        Symbol
                      </p>
                      <p className="text-neutral-200 text-sm font-medium">
                        ${apiData.token_symbol}
                      </p>
                    </div>
                  )}
                  {apiData.token_type && (
                    <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                      <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                        Token Type
                      </p>
                      <p className="text-neutral-200 text-sm font-medium">
                        {apiData.token_type}
                      </p>
                    </div>
                  )}
                </div>

                {/* Token Utility */}
                {apiData.token_utility && (
                  <div className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-accent-brand rounded-full"></div>
                      <h5 className="text-sm font-semibold text-accent-brand">
                        Token Utility
                      </h5>
                    </div>
                    <p className="text-neutral-300 text-sm leading-relaxed">
                      {truncateText(
                        apiData.token_utility,
                        300,
                        "token-utility"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "team":
        return (
          <div className="space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  Team & SWOT Analysis
                </h4>
              </div>

              {/* Team Members */}
              {apiData.team_and_leadership?.core_team_members &&
                apiData.team_and_leadership.core_team_members.length > 0 && (
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-accent-brand mb-4">
                      Leadership Team
                    </h5>
                    <div className="grid gap-4">
                      {apiData.team_and_leadership.core_team_members
                        .slice(0, 4)
                        .map((member, index) => (
                          <div
                            key={index}
                            className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-accent-brand rounded-full mt-2 flex-shrink-0"></div>
                              <div className="flex-1">
                                <h6 className="text-sm font-semibold text-neutral-200 mb-1">
                                  {member.name_or_handle} - {member.role}
                                </h6>
                                <p className="text-neutral-400 text-sm leading-relaxed">
                                  {truncateText(
                                    member.profile_summary || "",
                                    150,
                                    `team-${index}`
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* SWOT Analysis */}
              {apiData.swot_analysis && (
                <div>
                  <h5 className="text-sm font-semibold text-accent-brand mb-4">
                    SWOT Analysis
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {apiData.swot_analysis.strengths && (
                      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                        <h6 className="text-sm font-semibold text-green-400 mb-3">
                          Strengths
                        </h6>
                        <ul className="space-y-2">
                          {apiData.swot_analysis.strengths
                            .slice(0, 4)
                            .map((item, index) => (
                              <li
                                key={index}
                                className="text-neutral-300 text-sm flex items-start gap-2"
                              >
                                <span className="text-green-400 mt-1 flex-shrink-0">
                                  •
                                </span>
                                <span>
                                  {truncateText(item, 80, `strength-${index}`)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    {apiData.swot_analysis.weaknesses && (
                      <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                        <h6 className="text-sm font-semibold text-red-400 mb-3">
                          Weaknesses
                        </h6>
                        <ul className="space-y-2">
                          {apiData.swot_analysis.weaknesses
                            .slice(0, 4)
                            .map((item, index) => (
                              <li
                                key={index}
                                className="text-neutral-300 text-sm flex items-start gap-2"
                              >
                                <span className="text-red-400 mt-1 flex-shrink-0">
                                  •
                                </span>
                                <span>
                                  {truncateText(item, 80, `weakness-${index}`)}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "tweets":
        return (
          <div className="space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">
                  {tweetSortBy === "tweet_create_time_desc"
                    ? "Latest"
                    : tweetSortBy === "like_count_desc"
                    ? "Most Liked"
                    : tweetSortBy === "retweet_count_desc"
                    ? "Most Shared"
                    : tweetSortBy === "reply_count_desc"
                    ? "Most Discussed"
                    : "Most Viewed"}{" "}
                  Tweets
                </h4>
                <div className="flex items-center gap-2 ml-3">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span className="text-xs text-neutral-500">
                    {tweetInterval === "1day"
                      ? "Last 24 hours"
                      : tweetInterval === "7day"
                      ? "Last 7 days"
                      : "Last 30 days"}{" "}
                    • Original only
                  </span>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Time Period Filter */}
                <div className="flex gap-1 bg-transparent rounded-lg border border-neutral-600">
                  {[
                    { value: "1day", label: "24H" },
                    { value: "7day", label: "7D" },
                    { value: "30day", label: "30D" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() =>
                        setTweetInterval(value as "1day" | "7day" | "30day")
                      }
                      className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        tweetInterval === value
                          ? "bg-neutral-700 text-neutral-100"
                          : "text-neutral-300 hover:text-neutral-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Sort Options */}
                <div className="flex gap-1 bg-transparent rounded-lg border border-neutral-600">
                  {[
                    { value: "tweet_create_time_desc", label: "Latest" },
                    { value: "like_count_desc", label: "Most Liked" },
                    { value: "retweet_count_desc", label: "Most Shared" },
                    { value: "reply_count_desc", label: "Most Discussed" },
                    { value: "view_count_desc", label: "Most Viewed" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setTweetSortBy(value as any)}
                      className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        tweetSortBy === value
                          ? "bg-neutral-700 text-neutral-100"
                          : "text-neutral-300 hover:text-neutral-100"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {tweetsLoading ? (
                <div className="flex items-center justify-center py-4 mb-4">
                  <WaterDropletLoader
                    size="default"
                    text={`Loading ${
                      tweetInterval === "1day"
                        ? "24H"
                        : tweetInterval === "7day"
                        ? "7D"
                        : "30D"
                    } tweets...`}
                  />
                </div>
              ) : null}

              {tweetsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-neutral-800/50 border border-neutral-700/30 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <div className="flex gap-4 mt-3">
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-12" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : tweetsError ? (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-2">Failed to load tweets</div>
                  <div className="text-sm text-neutral-500">{tweetsError}</div>
                </div>
              ) : tweets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-neutral-400 mb-2">
                    No recent tweets found
                  </div>
                  <div className="text-sm text-neutral-500">
                    No original tweets in the last 7 days
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {tweets.map((tweet) => (
                    <Card
                      key={tweet.tweet_id}
                      className="bg-neutral-800/50 border-neutral-700/30 hover:bg-neutral-800/70 hover:border-neutral-600/50 transition-all duration-200 cursor-pointer group"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <img
                              src={
                                tweet.profile_image_url ||
                                "/placeholder-user.jpg"
                              }
                              alt={tweet.author_handle}
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-neutral-600/50"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder-user.jpg";
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-neutral-200 text-sm">
                                  @{tweet.author_handle}
                                </span>
                                <span className="text-neutral-500 text-xs">
                                  {new Date(
                                    tweet.tweet_create_time
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    `https://twitter.com/${tweet.author_handle}/status/${tweet.tweet_id}`,
                                    "_blank"
                                  );
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-accent-brand h-6 w-6 p-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                            <p className="text-neutral-300 text-sm leading-relaxed mb-3 break-words whitespace-pre-wrap">
                              {tweet.body}
                            </p>
                            <div className="flex items-center gap-4 text-neutral-500 text-xs">
                              <div className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                                <ReplyIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {tweet.reply_count.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 hover:text-green-400 transition-colors">
                                <RetweetIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {tweet.retweet_count.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 hover:text-pink-400 transition-colors">
                                <LikeIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {tweet.like_count.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ViewIcon className="w-3.5 h-3.5" />
                                <span className="font-medium">
                                  {tweet.view_count.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="bg-neutral-900/50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-neutral-200 mb-3">
                Project Overview
              </h4>
              <p className="text-neutral-300 text-sm leading-relaxed">
                {apiData.one_line_description}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 mt-8 pb-8">
      <h2 className="py-4 text-3xl font-semibold text-neutral-100 mb-4">
        Research Hub
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - 2/3 width */}
        <div className="lg:col-span-2">
          <Card className="bg-neutral-800/50 border-neutral-700 p-6 h-full">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-neutral-100 mb-4">
                  Research Analysis
                </h3>

                {/* Section Pills Navigation */}
                {apiData && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { id: "overview", label: "Overview" },
                      { id: "competitive", label: "Competitive" },
                      { id: "technology", label: "Technology" },
                      { id: "market", label: "Market" },
                      { id: "tokenomics", label: "Tokenomics" },
                      { id: "team", label: "Team & SWOT" },
                      { id: "tweets", label: "Tweets" },
                    ].map((section) => (
                      <button
                        key={section.id}
                        onClick={() => setSelectedSection(section.id)}
                        className={`px-4 py-2 text-xs rounded-full transition-colors ${
                          selectedSection === section.id
                            ? "bg-accent-brand text-neutral-900 font-medium"
                            : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                        }`}
                      >
                        {section.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-red-400">
                    <div className="text-lg mb-2">
                      Failed to load analysis data
                    </div>
                    <div className="text-sm text-neutral-400">{error}</div>
                  </div>
                </div>
              ) : apiData ? (
                <div className="flex-1">{renderSectionContent()}</div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-neutral-400">
                    <div className="text-lg mb-2">
                      No analysis data available
                    </div>
                    <div className="text-sm">
                      Analysis data for this project is not yet available
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Section - 1/3 width - Content Lab */}
        <div className="lg:col-span-1">
          <Card className="bg-neutral-900/80 border border-neutral-700/50 h-full flex flex-col">
            <div className="p-5 flex flex-col h-full">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-accent-brand rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">
                    Content Lab
                  </h3>
                </div>
              </div>

              {/* Authentication Check */}
              {!isAuthenticated ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
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
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Login Required
                    </h4>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                      Please log in to access Content Labs.
                    </p>
                  </div>

                  <Button
                    onClick={login}
                    className="w-full bg-accent-brand text-neutral-900 hover:bg-[#00F5A8] font-semibold px-6 py-3 rounded-lg transition-colors border border-transparent hover:border-[#00F5A8]"
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

                  <p className="text-xs text-neutral-500 mt-4">
                    Secure authentication powered by Twitter OAuth 2.0
                  </p>
                </div>
              ) : (
                <>
                  {/* Authenticated Content - Original Content Lab */}

                  {/* Prompt Selection */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-neutral-300">
                        {dynamicPrompts.length > 0
                          ? "AI-Generated Prompts"
                          : "Quick Prompts"}
                      </label>
                      <button
                        onClick={regeneratePrompts}
                        disabled={isGeneratingPrompts}
                        className="text-xs text-accent-brand hover:text-[#00F5A8] transition-colors disabled:text-neutral-500"
                      >
                        {isGeneratingPrompts ? (
                          <WaterDropletLoader
                            size="small"
                            text="Generating..."
                          />
                        ) : (
                          "🔄 New Prompts"
                        )}
                      </button>
                    </div>
                    <select
                      value={selectedPrompt}
                      onChange={(e) => handlePromptSelect(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-600 text-white text-sm p-3 rounded-lg focus:border-accent-brand focus:ring-1 focus:ring-accent-brand focus:outline-none"
                      disabled={isGeneratingPrompts}
                    >
                      <option value="">
                        {isGeneratingPrompts
                          ? "Generating prompts..."
                          : "Select a prompt..."}
                      </option>
                      {randomPrompts.map((prompt, index) => (
                        <option key={index} value={prompt}>
                          {prompt.length > 60
                            ? `${prompt.substring(0, 60)}...`
                            : prompt}
                        </option>
                      ))}
                    </select>
                    {dynamicPrompts.length > 0 && (
                      <p className="text-xs text-neutral-500 mt-1">
                        {dynamicPrompts.length} contextual prompts generated
                        from project data
                      </p>
                    )}
                  </div>

                  {/* Custom Prompt Input */}
                  <div className="mb-6">
                    <label className="block text-xs font-medium text-neutral-300 mb-2">
                      Custom Prompt (Optional)
                    </label>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      className="w-full h-20 bg-neutral-800 border border-neutral-600 text-white text-sm p-3 rounded-lg focus:border-accent-brand focus:ring-1 focus:ring-accent-brand focus:outline-none resize-none"
                      placeholder="Customize the prompt or write your own..."
                    />
                  </div>

                  {/* Rate Limit Status */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-neutral-300">
                        Daily Generations
                      </span>
                      <span className="text-xs text-neutral-400">
                        {dailyGenerations}/{DAILY_LIMIT} used
                      </span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-accent-brand h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(dailyGenerations / DAILY_LIMIT) * 100}%`,
                        }}
                      ></div>
                    </div>
                    {getRemainingGenerations() > 0 && (
                      <p className="text-xs text-neutral-500 mt-1">
                        {getRemainingGenerations()} generations remaining today
                      </p>
                    )}
                  </div>

                  {/* Generate Button or Rate Limit Message */}
                  {canGenerate() ? (
                    <button
                      onClick={generateContent}
                      disabled={
                        (!userPrompt.trim() && !selectedPrompt) ||
                        !apiData ||
                        isGenerating
                      }
                      className="w-full mb-6 px-4 py-3 bg-accent-brand text-neutral-900 text-sm font-semibold rounded-lg hover:bg-[#00F5A8] transition-colors disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed border border-transparent hover:border-[#00F5A8]"
                    >
                      {isGenerating ? (
                        <WaterDropletLoader
                          size="small"
                          text="Generating Content..."
                        />
                      ) : (
                        "Generate Content"
                      )}
                    </button>
                  ) : (
                    <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg text-center">
                      <div className="flex items-center justify-center mb-2">
                        <svg
                          className="w-5 h-5 text-amber-400 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <h4 className="text-sm font-semibold text-amber-400">
                          Daily Limit Reached
                        </h4>
                      </div>
                      <p className="text-xs text-amber-300/80 mb-3">
                        You've used all {DAILY_LIMIT} AI generations for today.
                      </p>
                      <p className="text-xs text-amber-300/60">
                        Come back tomorrow for more!
                      </p>
                    </div>
                  )}

                  {/* Generated Content Display */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-neutral-300">
                        Generated Content
                      </label>
                    </div>

                    {loading ? (
                      <div className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg p-4 flex flex-col">
                        <div className="space-y-3">
                          <div className="flex items-center justify-center mb-4">
                            <WaterDropletLoader
                              size="large"
                              text="Analyzing project data..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-full bg-neutral-700" />
                            <Skeleton className="h-3 w-3/4 bg-neutral-700" />
                            <Skeleton className="h-3 w-5/6 bg-neutral-700" />
                          </div>
                        </div>
                      </div>
                    ) : apiData ? (
                      <div className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg p-4 flex flex-col min-h-[300px]">
                        {generatedContent ? (
                          <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-accent-brand font-medium">
                                AI Generated Content
                              </span>
                              <span className="text-xs text-neutral-500">
                                {generatedContent.split(" ").length} words
                              </span>
                            </div>

                            <div className="flex-1 text-neutral-300 text-sm leading-relaxed whitespace-pre-line overflow-y-auto custom-scrollbar">
                              {generatedContent}
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-4 pt-4 border-t border-neutral-700">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      generatedContent
                                    );
                                    // Optional: Add toast notification here
                                  }}
                                  className="px-4 py-2 bg-neutral-700 border border-neutral-600 text-neutral-200 text-sm font-medium rounded-lg hover:bg-neutral-600 transition-colors flex items-center justify-center gap-2"
                                >
                                  <span>📋</span>
                                  Copy
                                </button>
                                <button
                                  className="px-4 py-2 bg-neutral-800 border border-neutral-600 text-neutral-200 text-sm font-medium rounded-lg hover:bg-neutral-700 hover:border-neutral-500 transition-colors flex items-center justify-center gap-2"
                                  onClick={() => {
                                    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                                      generatedContent
                                    )}`;
                                    window.open(tweetUrl, "_blank");
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                  </svg>
                                  Share on X
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                              {/* Animated Water Droplets and Amorphous Bubbles Container */}
                              <div className="relative mb-6">
                                {/* Main large droplet */}
                                <div className="relative mx-auto w-16 h-16 mb-4">
                                  <div className="w-16 h-16 bg-gradient-to-br from-accent-brand to-[#00F5A8] rounded-full animate-droplet-glow shadow-lg"></div>

                                  {/* Floating smaller droplets around the main one */}
                                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-accent-brand/60 rounded-full animate-float-gentle"></div>
                                  <div
                                    className="absolute -top-1 -right-3 w-4 h-4 bg-accent-brand/40 rounded-full animate-float-gentle"
                                    style={{ animationDelay: "0.5s" }}
                                  ></div>
                                  <div
                                    className="absolute -bottom-2 left-2 w-5 h-5 bg-accent-brand/50 rounded-full animate-float-gentle"
                                    style={{ animationDelay: "1s" }}
                                  ></div>
                                  <div
                                    className="absolute -bottom-1 right-1 w-3 h-3 bg-accent-brand/30 rounded-full animate-float-gentle"
                                    style={{ animationDelay: "1.5s" }}
                                  ></div>

                                  {/* Ripple effects */}
                                  <div className="absolute inset-0 w-16 h-16 border-2 border-accent-brand/30 rounded-full animate-droplet-ripple"></div>
                                  <div
                                    className="absolute inset-0 w-16 h-16 border border-accent-brand/20 rounded-full animate-droplet-ripple"
                                    style={{ animationDelay: "0.8s" }}
                                  ></div>

                                  {/* Enhanced glow rings */}
                                  <div
                                    className="absolute inset-0 w-16 h-16 border border-accent-brand/10 rounded-full animate-droplet-ripple"
                                    style={{ animationDelay: "1.5s" }}
                                  ></div>
                                </div>

                                {/* Enhanced text with gradient and animated water droplet */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-center gap-3 mb-2">
                                    {/* Single large animated water droplet */}
                                    <div className="relative w-12 h-12">
                                      {/* Main droplet with morphing shape */}
                                      <div className="w-12 h-12 bg-gradient-to-br from-accent-brand to-[#00F5A8] rounded-full animate-droplet-morph shadow-lg"></div>
                                    </div>

                                    {/* Text with gradient */}
                                    <div className="text-lg font-semibold bg-gradient-to-r from-accent-brand to-[#00F5A8] bg-clip-text text-transparent">
                                      Ready to Generate
                                    </div>
                                  </div>

                                  <div className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
                                    Select a content type or enter a custom
                                    prompt to get started
                                  </div>

                                  {/* Interactive hint with subtle animation */}
                                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-4">
                                    <div className="w-1.5 h-1.5 bg-accent-brand rounded-full animate-pulse"></div>
                                    <span>AI-powered content generation</span>
                                    <div
                                      className="w-1.5 h-1.5 bg-accent-brand rounded-full animate-pulse"
                                      style={{ animationDelay: "0.5s" }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 bg-neutral-800 border border-neutral-600 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                        <div className="text-center">
                          {/* Animated Data Visualization Placeholder */}
                          <div className="relative mb-6">
                            {/* Central data icon with animated elements */}
                            <div className="relative mx-auto w-16 h-16 mb-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-neutral-600 to-neutral-500 rounded-lg animate-pulse shadow-lg flex items-center justify-center">
                                <svg
                                  className="w-8 h-8 text-neutral-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                  />
                                </svg>
                              </div>

                              {/* Animated data points around the icon */}
                              <div className="absolute -top-1 -left-1 w-3 h-3 bg-neutral-500 rounded-full animate-float-gentle"></div>
                              <div
                                className="absolute -top-2 right-2 w-2 h-2 bg-neutral-600 rounded-full animate-float-gentle"
                                style={{ animationDelay: "0.3s" }}
                              ></div>
                              <div
                                className="absolute -bottom-1 left-3 w-2.5 h-2.5 bg-neutral-500 rounded-full animate-float-gentle"
                                style={{ animationDelay: "0.6s" }}
                              ></div>
                              <div
                                className="absolute -bottom-2 right-1 w-1.5 h-1.5 bg-neutral-600 rounded-full animate-float-gentle"
                                style={{ animationDelay: "0.9s" }}
                              ></div>

                              {/* Connecting lines animation */}
                              <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-gradient-to-b from-neutral-500 to-transparent animate-data-flow"></div>
                              <div
                                className="absolute top-1/2 left-1/2 w-8 h-0.5 bg-gradient-to-r from-neutral-500 to-transparent animate-data-flow"
                                style={{ animationDelay: "0.5s" }}
                              ></div>

                              {/* Additional data flow elements */}
                              <div
                                className="absolute top-1/2 left-1/2 w-0.5 h-6 bg-gradient-to-b from-neutral-400 to-transparent animate-data-flow"
                                style={{ animationDelay: "1s" }}
                              ></div>
                              <div
                                className="absolute top-1/2 left-1/2 w-6 h-0.5 bg-gradient-to-r from-neutral-400 to-transparent animate-data-flow"
                                style={{ animationDelay: "1.5s" }}
                              ></div>

                              {/* Amorphous data bubbles */}
                              <AmorphousBubble
                                size="small"
                                color="[#6B7280]"
                                delay={0.2}
                              />
                              <AmorphousBubble
                                size="default"
                                color="[#9CA3AF]"
                                delay={0.8}
                              />
                              <AmorphousBubble
                                size="small"
                                color="[#6B7280]/60"
                                delay={1.4}
                              />
                              <AmorphousBubble
                                size="default"
                                color="[#9CA3AF]/70"
                                delay={2.0}
                              />
                            </div>

                            {/* Floating elements */}
                            <div className="absolute top-0 left-1/4 w-1 h-1 bg-neutral-500 rounded-full animate-pulse"></div>
                            <div
                              className="absolute top-2 right-1/3 w-0.5 h-0.5 bg-neutral-600 rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                            <div
                              className="absolute bottom-0 left-1/3 w-0.5 h-0.5 bg-neutral-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.8s" }}
                            ></div>
                          </div>

                          {/* Enhanced text with better hierarchy */}
                          <div className="space-y-3">
                            <div className="text-lg font-semibold text-neutral-300">
                              No Project Data
                            </div>
                            <div className="text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
                              Enter a project handle to load research data
                            </div>

                            {/* Interactive hint */}
                            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-4">
                              <div className="w-1 h-1 bg-neutral-500 rounded-full animate-pulse"></div>
                              <span>
                                Start by entering a project handle above
                              </span>
                              <div
                                className="w-1 h-1 bg-neutral-500 rounded-full animate-pulse"
                                style={{ animationDelay: "0.5s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
