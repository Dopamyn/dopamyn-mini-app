"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import * as d3 from "d3";
import { TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Type definitions
type TimePeriod = "1day" | "7day" | "30day" | "all_time";

interface Token {
  symbol: string;
  marketcap: number;
  icon?: string;
}

interface Bucket {
  bucket: string;
  token_count: number;
  tokens: Token[];
}

interface MarketCapData {
  overall_avg_marketcap: number;
  overall_median_marketcap: number;
  buckets: Bucket[];
}

interface ApiResponse {
  result: MarketCapData;
  message: string;
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  market_cap_usd: number | null;
  current_price_usd: number | null;
  profile_image_url: string | null;
  sector?: string;
}

// Market cap segments configuration
const MARKET_CAP_SEGMENTS = [
  {
    key: "micro",
    label: "Micro-Caps",
    range: "< $10M",
    color: "#EF4444",
    min: 0,
    max: 10_000_000,
  },
  {
    key: "low",
    label: "Low-Caps",
    range: "$10M - $50M",
    color: "#F97316",
    min: 10_000_000,
    max: 50_000_000,
  },
  {
    key: "mid",
    label: "Mid-Caps",
    range: "$50M - $250M",
    color: "#EAB308",
    min: 50_000_000,
    max: 250_000_000,
  },
  {
    key: "large",
    label: "Large-Caps",
    range: "$250M - $1B",
    color: "#22C55E",
    min: 250_000_000,
    max: 1_000_000_000,
  },
  {
    key: "blue",
    label: "Blue-Chips",
    range: ">$1B",
    color: "#06B6D4",
    min: 1_000_000_000,
    max: Infinity,
  },
];

// Time period options
const TIME_PERIODS = [
  { value: "1day", label: "24H" },
  { value: "7day", label: "7D" },
  { value: "30day", label: "30D" },
  { value: "all_time", label: "All Time" },
];

// Constants
const CHART_WIDTH = 1000; // Increased from 850
const CHART_HEIGHT = 260; // Reduced from 280
const MOBILE_CHART_WIDTH = 1000; // Match desktop width
const MOBILE_CHART_HEIGHT = 280; // Reduced from 320
const ICON_SIZE = 32; // Increased from 24
const MOBILE_ICON_SIZE = 28; // Increased from 20
const ICON_SPACING = 3; // Reduced from 4
const MAX_ICONS_PER_SEGMENT = 36;
const MAX_ROWS_PER_SEGMENT = 7;
const COLUMNS_PER_SEGMENT = 5;
const MOBILE_COLUMNS_PER_SEGMENT = 3;
const SEGMENT_HEIGHT = 4; // Increased from 3
const BAR_Y_POSITION = 180; // Reduced from 200
const MOBILE_BAR_Y_POSITION = 200; // Reduced from 240
const VERTICAL_STACK_OFFSET = 20; // Reduced from 24

// Utility functions
const formatMarketCap = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

// Retry function for API calls
const fetchWithRetry = async <T,>(url: string, maxRetries = 3): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("NOT_FOUND");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("An unknown error occurred");
      if (error instanceof Error && error.message === "NOT_FOUND") {
        throw lastError; // Don't retry on 404
      }
      if (i === maxRetries - 1) throw lastError;
    }
  }
  throw lastError;
};

export default function MarketCapDistribution({
  authorHandle,
}: {
  authorHandle: string;
}) {
  const isMobile = useIsMobile();
  const [marketCapData, setMarketCapData] = useState<MarketCapData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("30day");
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle drag scrolling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !isMobile) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setIsDragging(true);
    setStartX(
      e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0)
    );
    setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !isMobile) return;
    const x =
      e.touches[0].pageX - (scrollContainerRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  // Fetch data
  const fetchData = async (interval: TimePeriod) => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchWithRetry<ApiResponse>(
        `${process.env.NEXT_PUBLIC_CREDBUZZ_API_URL}/user/first-call-marketcap?author_handle=${authorHandle}&interval=${interval}`
      );

      // Handle case where API returns successful response but no data
      if (!data.result) {
        setMarketCapData(null);
        setError("No market cap data found for this author");
        return;
      }

      setMarketCapData(data.result);
    } catch (err) {
      console.error("Error fetching market cap data:", err);
      setMarketCapData(null);

      if (err instanceof Error) {
        if (err.message === "NOT_FOUND") {
          setError("No data found");
        } else {
          setError("Unable to load");
        }
      } else {
        setError("Unable to load");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorHandle) {
      fetchData(timePeriod);
    }
  }, [authorHandle, timePeriod]);

  // Handle time period change
  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period);
  };

  // D3 Visualization
  useEffect(() => {
    if (!svgRef.current || !marketCapData || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Use mobile dimensions when on mobile
    const chartWidth = isMobile ? MOBILE_CHART_WIDTH : CHART_WIDTH;
    const chartHeight = isMobile ? MOBILE_CHART_HEIGHT : CHART_HEIGHT;
    const iconSize = isMobile ? MOBILE_ICON_SIZE : ICON_SIZE;
    const columnsPerSegment = isMobile
      ? MOBILE_COLUMNS_PER_SEGMENT
      : COLUMNS_PER_SEGMENT;
    const barYPosition = isMobile ? MOBILE_BAR_Y_POSITION : BAR_Y_POSITION;

    // Process data
    const allTokens: Token[] = [];
    marketCapData.buckets.forEach((bucket) => {
      bucket.tokens.forEach((token) => {
        allTokens.push(token);
      });
    });

    // Group tokens by segments
    const segmentTokens = MARKET_CAP_SEGMENTS.map(() => [] as Token[]);
    allTokens.forEach((token) => {
      const segmentIndex = MARKET_CAP_SEGMENTS.findIndex(
        (segment) =>
          token.marketcap >= segment.min && token.marketcap < segment.max
      );
      if (segmentIndex !== -1) {
        segmentTokens[segmentIndex].push(token);
      } else {
        segmentTokens[segmentTokens.length - 1].push(token);
      }
    });

    // Create segments data
    const segmentWidth = chartWidth / MARKET_CAP_SEGMENTS.length;
    const segmentData = MARKET_CAP_SEGMENTS.map((segment, index) => ({
      ...segment,
      tokens: segmentTokens[index]
        .sort((a, b) => a.marketcap - b.marketcap)
        .slice(0, MAX_ICONS_PER_SEGMENT),
      allTokens: segmentTokens[index],
      x: index * segmentWidth,
      width: segmentWidth,
    }));

    // Create tooltip with adjusted padding
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "market-cap-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#1f2937")
      .style("border", "1px solid #00D992")
      .style("color", "#f3f4f6")
      .style("padding", isMobile ? "10px 14px" : "12px 16px") // Reduced padding
      .style("border-radius", "12px")
      .style("font-size", isMobile ? "13px" : "14px") // Slightly reduced
      .style("pointer-events", "none")
      .style("z-index", "9999")
      .style("max-width", isMobile ? "220px" : "none") // Slightly reduced
      .style("word-wrap", "break-word")
      .style(
        "box-shadow",
        "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      )
      .style("backdrop-filter", "blur(8px)");

    // Create main group
    const g = svg.append("g");

    // Define gradients for each segment
    const defs = svg.append("defs");

    segmentData.forEach((segment, index) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `gradient-${index}`)
        .attr("x1", "0%")
        .attr("y1", "100%") // Start from bottom
        .attr("x2", "0%")
        .attr("y2", "0%"); // End at top

      // Darker color at bottom (base)
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", segment.color)
        .attr("stop-opacity", "0.3");

      // Medium opacity in middle
      gradient
        .append("stop")
        .attr("offset", "50%")
        .attr("stop-color", segment.color)
        .attr("stop-opacity", "0.15");

      // Fade to transparent at top
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", segment.color)
        .attr("stop-opacity", "0");
    });

    // Create background rectangles with gradient
    const backgroundHeight = barYPosition - 20; // Extend from slightly above the bar to top of chart area
    const backgrounds = g
      .selectAll(".segment-background")
      .data(segmentData)
      .enter()
      .append("rect")
      .attr("class", "segment-background")
      .attr("x", (d) => d.x)
      .attr("y", 20) // Start from top of chart area
      .attr("width", (d) => d.width)
      .attr("height", backgroundHeight)
      .attr("fill", (d, i) => `url(#gradient-${i})`);

    // Create segmented bar with proper alignment
    const segments = g
      .selectAll(".segment")
      .data(segmentData)
      .enter()
      .append("rect")
      .attr("class", "segment")
      .attr("x", (d) => d.x)
      .attr("y", barYPosition)
      .attr("width", (d) => d.width)
      .attr("height", SEGMENT_HEIGHT)
      .attr("fill", (d) => d.color);

    // Add rounded corners only to first and last segments
    segments
      .filter((d, i) => i === 0)
      .attr("rx", 6)
      .attr("ry", 6);
    segments
      .filter((d, i) => i === segmentData.length - 1)
      .attr("rx", 6)
      .attr("ry", 6);

    // Create token icons
    segmentData.forEach((segment, segmentIndex) => {
      segment.tokens.forEach((token, tokenIndex) => {
        const row = Math.floor(tokenIndex / columnsPerSegment);
        const col = tokenIndex % columnsPerSegment;

        if (row >= MAX_ROWS_PER_SEGMENT) return;

        const startX = segment.x + 5;
        const availableWidth = segment.width - 10; // Reduced padding
        const totalRowWidth =
          columnsPerSegment * iconSize + (columnsPerSegment - 1) * ICON_SPACING;
        const rowStartX = startX + (availableWidth - totalRowWidth) / 2;

        const x = rowStartX + col * (iconSize + ICON_SPACING);
        const y = barYPosition - 20 - row * 18; // Adjusted base position and spacing

        // Create icon group with higher z-index for front rows
        const iconGroup = g
          .append("g")
          .attr("class", "token-icon")
          .attr("transform", `translate(${x}, ${y})`)
          .style("cursor", "pointer")
          .style("z-index", MAX_ROWS_PER_SEGMENT - row); // Front rows have higher z-index

        // Add background circle
        iconGroup
          .append("circle")
          .attr("cx", iconSize / 2)
          .attr("cy", iconSize / 2)
          .attr("r", iconSize / 2)
          .attr("fill", token.icon ? "transparent" : segment.color)
          .attr("stroke", "rgba(255,255,255,0.9)")
          .attr("stroke-width", 1.5)
          .style(
            "filter",
            `drop-shadow(0 ${1 + row * 1.5}px ${2 + row * 1.5}px rgba(0,0,0,${
              0.12 + row * 0.03
            }))`
          );

        // Add token icon or symbol
        if (token.icon) {
          iconGroup
            .append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", iconSize)
            .attr("height", iconSize)
            .attr("href", token.icon)
            .attr("clip-path", "circle(50% at 50% 50%)");
        } else {
          iconGroup
            .append("text")
            .attr("x", iconSize / 2)
            .attr("y", iconSize / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("fill", "white")
            .attr("font-size", isMobile ? "12px" : "14px") // Increased font size
            .attr("font-weight", "bold")
            .text(token.symbol.substring(0, 2).toUpperCase());
        }

        // Add hover effects
        iconGroup
          .on("mouseenter", function (event) {
            d3.select(this)
              .select("circle")
              .transition()
              .duration(200)
              .attr("r", (iconSize / 2) * 1.1)
              .attr("stroke", segment.color)
              .attr("stroke-width", 3)
              .style("filter", `drop-shadow(0 0 20px ${segment.color}80)`);

            tooltip.style("visibility", "visible").html(`
                <div style="font-weight: bold; color: #f3f4f6; margin-bottom: 4px;">${token.symbol.toUpperCase()}</div>
                <div style="color: #9ca3af;">Market Cap: <span style="color: #00D992; font-weight: 600;">${formatMarketCap(
                  token.marketcap
                )}</span></div>
              `);
          })
          .on("mousemove", function (event) {
            const tooltipWidth = parseInt(tooltip.style("width")) || 200;
            const tooltipHeight = parseInt(tooltip.style("height")) || 70;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.pageX + 15;
            let top = event.pageY - tooltipHeight - 10;

            // Adjust if tooltip would go off screen
            if (left + tooltipWidth > viewportWidth) {
              left = event.pageX - tooltipWidth - 15;
            }
            if (top < 0) {
              top = event.pageY + 20;
            }

            tooltip.style("left", left + "px").style("top", top + "px");
          })
          .on("mouseleave", function () {
            d3.select(this)
              .select("circle")
              .transition()
              .duration(200)
              .attr("r", iconSize / 2)
              .attr("stroke", "rgba(255,255,255,0.8)")
              .attr("stroke-width", 2)
              .style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.1))");

            tooltip.style("visibility", "hidden");
          });
      });

      // Add overflow indicator if needed
      const overflowCount = segment.allTokens.length - MAX_ICONS_PER_SEGMENT;
      if (overflowCount > 0) {
        const overflowX = segment.x + segment.width - 20;
        const overflowY = barYPosition - 50;

        const overflowGroup = g
          .append("g")
          .attr("transform", `translate(${overflowX}, ${overflowY})`);

        overflowGroup
          .append("circle")
          .attr("cx", 10)
          .attr("cy", 10)
          .attr("r", 10)
          .attr("fill", "#4b5563")
          .style("filter", "drop-shadow(0 1px 4px rgba(0,0,0,0.15))");

        overflowGroup
          .append("text")
          .attr("x", 10)
          .attr("y", 10)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("fill", "white")
          .attr("font-size", "9px")
          .attr("font-weight", "bold")
          .text(`+${overflowCount}`)
          .append("title")
          .text(`${overflowCount} more tokens in this segment`);
      }
    });

    // Add labels
    const labelGroup = g
      .append("g")
      .attr("class", "labels")
      .attr("transform", `translate(0, ${barYPosition + 25})`);

    // Update label sizes in the D3 visualization
    labelGroup
      .selectAll(".segment-label")
      .data(segmentData)
      .enter()
      .append("text")
      .attr("x", (d) => d.x + d.width / 2)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", isMobile ? "15px" : "16px") // Slightly reduced
      .attr("font-weight", "700")
      .attr("fill", "#f3f4f6")
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.7)")
      .text((d) => d.label);

    // Range labels
    labelGroup
      .selectAll(".range-label")
      .data(segmentData)
      .enter()
      .append("text")
      .attr("x", (d) => d.x + d.width / 2)
      .attr("y", 20) // Reduced from 24
      .attr("text-anchor", "middle")
      .attr("font-size", isMobile ? "13px" : "14px") // Slightly reduced
      .attr("font-weight", "500")
      .attr("fill", "#9ca3af")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.5)")
      .text((d) => d.range);

    // Cleanup function
    return () => {
      tooltip.remove();
    };
  }, [marketCapData, loading, isMobile]);

  // Loading state
  if (loading) {
    return null;
  }

  // Error state
  if (error) {
    return null;
  }

  // No data state
  if (!marketCapData) {
    return null;
  }

  return (
    <div className="card-trendsage bg-neutral-900">
      {/* Header */}
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center justify-between mb-4">
        {" "}
        {/* Reduced spacing */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent-brand" />
          <h3 className="text-lg font-semibold text-gray-100">
            Market Cap Distribution
          </h3>
        </div>
        {/* Time Period Filter */}
        <div className="flex bg-neutral-800 rounded-lg p-1 w-full md:w-auto">
          {TIME_PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => handleTimePeriodChange(period.value as TimePeriod)}
              className={`px-3 py-1 text-xs md:text-sm rounded-md font-medium transition-colors flex-1 md:flex-none ${
                timePeriod === period.value
                  ? "bg-accent-brand text-gray-900"
                  : "text-gray-300 hover:text-accent-brand hover:bg-gray-600"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Market Cap Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {" "}
        {/* Reduced gap and margin */}
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          {" "}
          {/* Reduced padding */}
          <div className="text-sm text-gray-400 mb-1">
            Average Market Cap
          </div>{" "}
          {/* Reduced margin */}
          <div className="text-base md:text-lg font-semibold text-accent-brand">
            {formatMarketCap(marketCapData.overall_avg_marketcap)}
          </div>
        </div>
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          {" "}
          {/* Reduced padding */}
          <div className="text-sm text-gray-400 mb-1">
            Median Market Cap
          </div>{" "}
          {/* Reduced margin */}
          <div className="text-base md:text-lg font-semibold text-accent-brand">
            {formatMarketCap(marketCapData.overall_median_marketcap)}
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <div
          ref={scrollContainerRef}
          className={`overflow-x-auto pb-4 md:pb-2 hide-scrollbar ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            maxWidth: "100%",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
            scrollBehavior: isDragging ? "auto" : "smooth",
            userSelect: "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <div className="min-w-[1000px]">
            <svg
              ref={svgRef}
              width={isMobile ? MOBILE_CHART_WIDTH : CHART_WIDTH}
              height={isMobile ? MOBILE_CHART_HEIGHT : CHART_HEIGHT}
              viewBox={`0 0 ${isMobile ? MOBILE_CHART_WIDTH : CHART_WIDTH} ${
                isMobile ? MOBILE_CHART_HEIGHT : CHART_HEIGHT
              }`}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        </div>
      </div>

      {/* Add CSS for hiding scrollbar while maintaining functionality */}
      <style jsx>{`
        .hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>
    </div>
  );
}
