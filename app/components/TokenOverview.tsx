"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import * as d3 from "d3";
import { Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../lib/constants";
import type { TokenData, TokenOverviewResponse } from "../types";

interface TokenOverviewProps {
  authorHandle: string;
}

type Interval = "1day" | "7day" | "30day";

const intervalOptions = [
  { value: "1day" as Interval, label: "24H" },
  { value: "7day" as Interval, label: "7D" },
  { value: "30day" as Interval, label: "30D" },
];

const narrativeColors: Record<string, string> = {
  ai: "#3B82F6",
  defi: "#10B981",
  meme: "#EC4899",
  gamefi: "#8B5CF6",
  nft: "#6366F1",
  rwa: "#F97316",
  dao: "#EAB308",
  "vc-backed": "#6B7280",
  launchpad: "#06B6D4",
  privacy: "#EF4444",
  "yield-farm": "#84CC16",
  dex: "#059669",
  socialfi: "#7C3AED",
  metaverse: "#C026D3",
  zkproof: "#64748B",
};

interface HierarchyNode {
  name: string;
  children?: HierarchyNode[];
  value?: number;
  narrative?: string;
  symbol?: string;
  icon?: string | null;
  volume_24hr?: number;
  first_tweet_time?: string;
  total_tweets?: number;
}

// Constants for visualization
const DESKTOP_WIDTH = 800;
const DESKTOP_HEIGHT = 600;
const MOBILE_WIDTH = 360;
const MOBILE_HEIGHT = 400;
const MOBILE_LEGEND_ITEMS = 5;

export default function TokenOverview({ authorHandle }: TokenOverviewProps) {
  const isMobile = useIsMobile();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  const [data, setData] = useState<TokenOverviewResponse["result"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<Interval>("7day");
  const [selectedNarrative, setSelectedNarrative] = useState<string | null>(
    null
  );
  const [showAllLegends, setShowAllLegends] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchTokenData = async (attempt = 0) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/user/author-token-overview?author_handle=${authorHandle}&interval=${interval}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const result = (await response.json()) as TokenOverviewResponse;
        if (result.result) {
          setData(result.result);
          setRetryCount(0);
        } else {
          throw new Error("Invalid response format");
        }
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error(
        `Failed to fetch token data (attempt ${attempt + 1}):`,
        error
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        setRetryCount(attempt + 1);
        setError(`Retrying... (${attempt + 1}/${MAX_RETRIES})`);

        setTimeout(() => {
          fetchTokenData(attempt + 1);
        }, delay);
        return;
      }

      setError("Failed to fetch token data");
      setRetryCount(0);
      // Fallback data for demo
      setData({
        unique_token_count: 14,
        total_mentions: 309,
        most_mentioned_token: {
          symbol: "btc",
          mention_count: 95,
        },
        narrative_breakdown: {
          ai: 107,
          launchpad: 22,
          "vc-backed": 79,
          dao: 69,
          privacy: 16,
          meme: 30,
          "yield-farm": 48,
          defi: 108,
          dex: 38,
          rwa: 78,
          socialfi: 6,
          gamefi: 72,
          nft: 8,
          metaverse: 8,
          zkproof: 15,
        },
        tokens: [
          {
            symbol: "btc",
            total_tweets: 95,
            first_tweet_time: "2023-12-05T22:43:25",
            last_tweet_time: "2025-05-22T05:55:52",
            icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
            narratives: [],
            volume_24hr: 46490497024,
          },
          {
            symbol: "eth",
            total_tweets: 64,
            first_tweet_time: "2024-10-18T20:26:36",
            last_tweet_time: "2025-05-25T09:15:13",
            icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/32880.png",
            narratives: ["rwa", "ai", "defi", "gamefi"],
            volume_24hr: 8318013.5,
          },
          {
            symbol: "wld",
            total_tweets: 15,
            first_tweet_time: "2024-10-18T17:47:30",
            last_tweet_time: "2025-05-24T10:45:26",
            icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/13502.png",
            narratives: ["vc-backed", "ai", "zkproof", "dao"],
            volume_24hr: 286131360,
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const prepareHierarchyData = (): HierarchyNode => {
    if (!data) return { name: "root", children: [] };

    // Create a map to store narrative nodes
    const narrativeMap = new Map<string, HierarchyNode>();

    // Initialize narrative nodes from narrative_breakdown
    Object.entries(data.narrative_breakdown || {}).forEach(
      ([narrative, count]) => {
        // If a narrative is selected, only include that narrative
        if (selectedNarrative && narrative !== selectedNarrative) return;

        narrativeMap.set(narrative, {
          name: narrative,
          narrative: narrative,
          value: 0, // Will be calculated from children
          children: [],
        });
      }
    );

    // Add tokens to their respective narratives
    data.tokens?.forEach((token: TokenData) => {
      if (token.narratives.length === 0) {
        // If token has no narratives, create an "other" category
        if (!selectedNarrative || selectedNarrative === "other") {
          if (!narrativeMap.has("other")) {
            narrativeMap.set("other", {
              name: "other",
              narrative: "other",
              value: 0,
              children: [],
            });
          }
          narrativeMap.get("other")!.children!.push({
            name: token.symbol,
            symbol: token.symbol,
            value: token.total_tweets,
            icon: token.icon,
            volume_24hr: token.volume_24hr,
            first_tweet_time: token.first_tweet_time,
            total_tweets: token.total_tweets,
          });
        }
      } else {
        // Add token to each of its narratives
        token.narratives.forEach((narrative: string) => {
          // Only include tokens that match the selected narrative (if any)
          if (selectedNarrative && narrative !== selectedNarrative) return;

          if (narrativeMap.has(narrative)) {
            narrativeMap.get(narrative)!.children!.push({
              name: token.symbol,
              symbol: token.symbol,
              // When filtering to a specific narrative, show full mention count
              // When showing all narratives, distribute mentions across narratives
              value: selectedNarrative
                ? token.total_tweets
                : Math.ceil(token.total_tweets / token.narratives.length),
              icon: token.icon,
              volume_24hr: token.volume_24hr,
              first_tweet_time: token.first_tweet_time,
              total_tweets: token.total_tweets,
            });
          }
        });
      }
    });

    // Calculate narrative values from children and filter out empty narratives
    const narratives = Array.from(narrativeMap.values())
      .filter((narrative) => narrative.children!.length > 0)
      .map((narrative) => ({
        ...narrative,
        value: narrative.children!.reduce(
          (sum, child) => sum + (child.value || 0),
          0
        ),
      }));

    return {
      name: "root",
      children: narratives,
    };
  };

  // Update renderCircularPacking to be mobile-responsive
  const renderCircularPacking = () => {
    if (!svgRef.current || !data) return;

    const width = isMobile ? MOBILE_WIDTH : DESKTOP_WIDTH;
    const height = isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Set new dimensions
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    const margin = 10;

    // Create hierarchy and calculate layout
    const root = d3
      .hierarchy(prepareHierarchyData())
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Adjust circle sizes for mobile
    const size = isMobile
      ? d3.scaleLinear().domain([0, 1]).range([3, 40])
      : d3.scaleLinear().domain([0, 1]).range([5, 60]);

    const pack = d3
      .pack<HierarchyNode>()
      .size([width - margin, height - margin])
      .padding(1);

    const packedRoot = pack(root);

    // Create main container group with smaller margin
    const container = svg
      .append("g")
      .attr("transform", `translate(${margin / 2}, ${margin / 2})`);

    // Create zoomable group
    const zoomGroup = container.append("g").attr("class", "zoom-group");

    // Create zoom behavior with better scale range for larger bubbles
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Create tooltip
    // Remove any existing tooltip before creating a new one
    d3.select("body").selectAll(".tooltip").remove();

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    // Draw narrative circles (parent nodes) - now in zoomGroup
    const narrativeNodes = zoomGroup
      .selectAll(".narrative")
      .data(packedRoot.children || [])
      .enter()
      .append("g")
      .attr("class", "narrative")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    narrativeNodes
      .append("circle")
      .attr("r", (d) => d.r!)
      .attr("fill", (d) => {
        const narrative = d.data.narrative || "other";
        return narrativeColors[narrative] || "#6B7280";
      })
      .attr("fill-opacity", 0.8)
      .attr("stroke", (d) => {
        const narrative = d.data.narrative || "other";
        return narrativeColors[narrative] || "#6B7280";
      })
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease")
      .on("click", (event, d) => {
        const narrative = d.data.narrative || "other";
        setSelectedNarrative(
          selectedNarrative === narrative ? null : narrative
        );
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill-opacity", 1.0)
          .attr("stroke-width", 3)
          .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))");

        // Show narrative name in tooltip
        const narrative = d.data.narrative || "other";
        tooltip
          .style("visibility", "visible")
          .html(
            `
            <div style="text-align: center;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; text-transform: capitalize;">
                ${narrative.replace("-", " ")}
              </div>
              <div style="font-size: 11px; color: #ccc;">
                ${d.children?.length || 0} tokens • ${
              d.value || 0
            } total mentions
              </div>
            </div>
          `
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("fill-opacity", 0.8)
          .attr("stroke-width", 2)
          .style("filter", "none");

        tooltip.style("visibility", "hidden");
      });

    // Add subtle floating animation to narrative circles
    narrativeNodes
      .selectAll("circle")
      .transition()
      .duration(2000 + Math.random() * 1000)
      .ease(d3.easeSinInOut)
      .attr("transform", "translate(0, -2)")
      .transition()
      .duration(2000 + Math.random() * 1000)
      .ease(d3.easeSinInOut)
      .attr("transform", "translate(0, 2)")
      .on("end", function repeat() {
        d3.select(this)
          .transition()
          .duration(2000 + Math.random() * 1000)
          .ease(d3.easeSinInOut)
          .attr("transform", "translate(0, -2)")
          .transition()
          .duration(2000 + Math.random() * 1000)
          .ease(d3.easeSinInOut)
          .attr("transform", "translate(0, 2)")
          .on("end", repeat);
      });

    // Draw token circles (child nodes) - now in zoomGroup
    const tokenNodes = zoomGroup
      .selectAll(".token")
      .data(packedRoot.descendants().filter((d) => d.depth === 2))
      .enter()
      .append("g")
      .attr("class", "token")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // Create circle backgrounds
    tokenNodes
      .append("circle")
      .attr("r", (d) => d.r!)
      .attr("fill", (d) => {
        const narrative = d.parent?.data.narrative || "other";
        return narrativeColors[narrative] || "#6B7280";
      })
      .attr("fill-opacity", 0.9)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease");

    // Add token icons
    tokenNodes.each(function (d) {
      const node = d3.select(this);
      const iconUrl = d.data.icon;

      if (iconUrl && iconUrl.trim() !== "") {
        // Create a clip path for circular image
        const clipId = `clip-${d.data.symbol}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        svg
          .append("defs")
          .append("clipPath")
          .attr("id", clipId)
          .append("circle")
          .attr("r", d.r! - 2) // Slightly smaller than the background circle
          .attr("cx", 0)
          .attr("cy", 0);

        // Add the image
        node
          .append("image")
          .attr("href", iconUrl)
          .attr("x", -d.r! + 4)
          .attr("y", -d.r! + 4)
          .attr("width", (d.r! - 4) * 2)
          .attr("height", (d.r! - 4) * 2)
          .attr("clip-path", `url(#${clipId})`)
          .style("cursor", "pointer")
          .on("error", function () {
            // If image fails to load, show fallback
            d3.select(this).remove();
            showTokenFallback(node, d);
          });
      } else {
        // No icon available, show fallback
        showTokenFallback(node, d);
      }
    });

    // Function to show fallback token representation
    function showTokenFallback(
      node: any,
      d: d3.HierarchyCircularNode<HierarchyNode>
    ) {
      node
        .append("circle")
        .attr("r", d.r! - 4)
        .attr("fill", () => {
          const narrative = d.parent?.data.narrative || "other";
          return narrativeColors[narrative] || "#6B7280";
        })
        .attr("fill-opacity", 0.9)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer");

      // Add token symbol text
      node
        .append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", Math.min(d.r! / 2.5, 10))
        .attr("font-weight", "600")
        .attr("fill", "white")
        .style("pointer-events", "none")
        .style("text-shadow", "1px 1px 1px rgba(0,0,0,0.7)")
        .text(() => {
          const symbol = d.data.symbol || "";
          return d.r! > 15 ? symbol.toUpperCase() : "";
        });
    }

    // Add hover effects to all token nodes
    tokenNodes
      .on("mouseover", function (event, d) {
        // Animate the hovered token
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", `translate(${d.x}, ${d.y}) scale(1.2)`)
          .style(
            "filter",
            "brightness(1.2) drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
          );

        // Find the original token data to get narratives
        const originalToken = data.tokens?.find(
          (token) => token.symbol === d.data.symbol
        );
        const narratives = originalToken?.narratives || [];

        tooltip.style("visibility", "visible").html(`
            <div><strong>$${(d.data.symbol || "").toUpperCase()}</strong></div>
            <div>Mentions: ${d.data.total_tweets}</div>
            ${
              d.data.volume_24hr
                ? `<div>24h Volume: ${formatNumber(d.data.volume_24hr!)}</div>`
                : ""
            }
            ${
              d.data.first_tweet_time
                ? `<div>Since: ${formatDate(d.data.first_tweet_time!)}</div>`
                : ""
            }
            ${
              narratives.length > 0
                ? `
              <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px;">
                <div style="font-size: 10px; color: #ccc; margin-bottom: 4px;">Categories:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                  ${narratives
                    .map(
                      (narrative) => `
                    <span style="
                      background: ${narrativeColors[narrative] || "#6B7280"}; 
                      color: white; 
                      padding: 2px 6px; 
                      border-radius: 8px; 
                      font-size: 9px;
                      text-transform: capitalize;
                    ">${narrative.replace("-", " ")}</span>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", function () {
        // Reset the token appearance
        d3.select(this)
          .transition()
          .duration(150)
          .attr("transform", function (d: any) {
            return `translate(${d.x}, ${d.y}) scale(1)`;
          })
          .style("filter", "none");

        tooltip.style("visibility", "hidden");
      })
      .on("click", function (event, d) {
        // Add click animation
        d3.select(this)
          .transition()
          .duration(100)
          .attr("transform", `translate(${d.x}, ${d.y}) scale(0.9)`)
          .transition()
          .duration(100)
          .attr("transform", `translate(${d.x}, ${d.y}) scale(1)`);
      });

    // Add subtle pulsing animation to token circles
    tokenNodes
      .style("opacity", 0)
      .transition()
      .delay((d, i) => i * 50) // Stagger the appearance
      .duration(500)
      .style("opacity", 1);

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  };

  useEffect(() => {
    fetchTokenData();
  }, [interval, authorHandle]);

  useEffect(() => {
    if (data && !loading) {
      renderCircularPacking();
    }
  }, [data, loading, selectedNarrative, isMobile]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return null;
  }

  if (!error && data && Object.keys(data).length === 0) {
    return null;
  }

  if (error || !data) {
    return null;
  }

  return (
    <div className="card-trendsage bg-neutral-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-brand/20 rounded-xl">
            <Coins className="w-5 h-5 text-accent-brand" />
          </div>
          <h3 className="text-lg font-semibold text-gray-100">
            Token Overview
          </h3>
        </div>

        {/* Interval Selector */}
        <div className="flex bg-gray-700 rounded-lg p-1 w-full md:w-auto justify-between md:justify-start">
          {intervalOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setInterval(option.value)}
              className={`px-2 md:px-3 py-1 text-xs md:text-sm font-medium rounded-md transition-all duration-200 flex-1 md:flex-none ${
                interval === option.value
                  ? "bg-accent-brand text-gray-900"
                  : "text-gray-300 hover:text-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400">Unique Tokens</div>
          <div className="text-2xl font-bold text-accent-brand">
            {data.unique_token_count}
          </div>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400">Total Mentions</div>
          <div className="text-2xl font-bold text-accent-brand">
            {data.total_mentions}
          </div>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400">Most Mentioned</div>
          <div className="text-2xl font-bold text-accent-brand">
            {data.most_mentioned_token?.symbol.toUpperCase() || "-"}
          </div>
        </div>
      </div>

      {/* Visualization Container */}
      <div className="relative bg-gray-800/30 rounded-lg p-4 overflow-hidden">
        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 bg-gray-900/90 rounded-lg p-3 backdrop-blur-sm border border-gray-700 max-h-[calc(100%-2rem)] overflow-y-auto">
          <div className="flex flex-col gap-2">
            {Object.entries(narrativeColors)
              .slice(
                0,
                isMobile
                  ? showAllLegends
                    ? undefined
                    : MOBILE_LEGEND_ITEMS
                  : undefined
              )
              .map(([narrative, color]) => (
                <button
                  key={narrative}
                  onClick={() =>
                    setSelectedNarrative(
                      selectedNarrative === narrative ? null : narrative
                    )
                  }
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    selectedNarrative === narrative
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {narrative}
                </button>
              ))}
            {isMobile &&
              Object.keys(narrativeColors).length > MOBILE_LEGEND_ITEMS && (
                <button
                  onClick={() => setShowAllLegends(!showAllLegends)}
                  className="text-xs text-accent-brand hover:text-accent-brand/80 mt-1"
                >
                  {showAllLegends ? "Show Less" : "Show More"}
                </button>
              )}
          </div>
        </div>

        {/* Circular Packing Visualization */}
        <svg
          ref={svgRef}
          className="w-full h-auto"
          style={{
            minHeight: isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT,
            maxHeight: isMobile ? MOBILE_HEIGHT : DESKTOP_HEIGHT,
          }}
        />
      </div>
    </div>
  );
}
