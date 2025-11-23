"use client";

import * as d3 from "d3"; // Import D3
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../lib/constants";

// Type definitions
interface Follower {
  handle: string;
  profile_name: string;
  profile_image_url: string;
  tags: string[];
  followers_count: number;
  smart_followers: number;
  account_created_at: string;
}

interface FollowersData {
  followings: Follower[];
  is_more_data: boolean;
}

interface ApiResponse {
  result: FollowersData;
  message: string;
}

// D3 specific type for nodes
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  follower: Follower;
  size: number;
  radius: number; // Store radius for collision detection
  // Explicitly add x, y, fx, fy as optional for D3 simulation and drag
  x?: number;
  y?: number;
  fx?: number | null; // fx and fy can be null when drag ends
  fy?: number | null;
}

// Color scheme for tags - Updated for Dopamyn theme with distinctive colors
const TAG_COLORS = {
  influencer: "#00D992", // Primary Dopamyn green
  project: "#3B82F6", // Blue for projects
  project_member: "#8B5CF6", // Purple for project members
  project_coin: "#F59E0B", // Amber/orange for project coins
  project_main: "#06B6D4", // Cyan for main projects
  venture_capital: "#EC4899", // Pink for VCs
  unknown: "#6B7280", // Gray for unknown
};

// Constants for physics container - make it responsive and larger
const getContainerDimensions = () => {
  if (typeof window !== "undefined") {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // Make the circular container sized appropriately
    const size = Math.min(screenWidth * 0.6, screenHeight * 0.65, 500);
    return {
      width: size,
      height: size,
    };
  }
  // Default for SSR
  return { width: 600, height: 600 };
};

const CONTAINER_DIMENSIONS = getContainerDimensions();
const CONTAINER_WIDTH = CONTAINER_DIMENSIONS.width;
const CONTAINER_HEIGHT = CONTAINER_DIMENSIONS.height;

// Utility function to convert hex to RGBA
const hexToRgba = (hex: string, alpha: number = 1): string => {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Utility functions
const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const getBubbleSize = (
  count: number,
  maxCount: number,
  minSize: number = 10,
  maxSize: number = 80
): number => {
  if (maxCount === 0) return minSize;
  // Use linear scale for more drastic size difference
  const normalized = count / maxCount;
  // Adjust the interpolation to bias towards slightly larger minimum sizes if needed, or keep linear
  // Keeping linear for now as requested for 'more drastic', but increasing max.
  return minSize + (maxSize - minSize) * normalized;
};

// Tooltip component for bubble hover
const BubbleTooltip = ({ follower }: { follower: Follower }) => {
  return (
    <div className="bg-gray-800 border border-accent-brand/30 rounded-lg shadow-lg p-3 z-50 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={follower.profile_image_url}
          alt={follower.profile_name}
          className="w-8 h-8 rounded-full ring-2 ring-accent-brand/50"
        />
        <div>
          <p className="font-medium text-gray-100 text-sm">
            {follower.profile_name}
          </p>
          <p className="text-xs text-gray-400">@{follower.handle}</p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <p className="text-gray-300">
          <span className="font-medium text-accent-brand">Followers:</span>{" "}
          {formatNumber(follower.followers_count)}
        </p>
        <p className="text-gray-300">
          <span className="font-medium text-accent-brand">
            Smart Followers:
          </span>{" "}
          {formatNumber(follower.smart_followers)}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {follower.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full text-xs font-medium text-gray-900"
              style={{
                backgroundColor:
                  TAG_COLORS[tag as keyof typeof TAG_COLORS] ||
                  TAG_COLORS.unknown,
              }}
            >
              {tag.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Sub-component 1: Followers Bubble Map with D3.js
const FollowersBubbleMap = ({
  followers,
  sortBy,
  loading,
  selectedTagForFilter,
}: {
  followers: Follower[];
  sortBy: "followers_count" | "smart_followers";
  loading: boolean;
  selectedTagForFilter: string | null;
}) => {
  const [hoveredFollower, setHoveredFollower] = useState<Follower | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [containerDimensions, setContainerDimensions] = useState(
    getContainerDimensions()
  );
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<D3Node, undefined> | null>(null);
  const nodesRef = useRef<D3Node[]>([]); // This will store the D3 nodes data

  useEffect(() => {
    const handleResize = () => {
      const newDimensions = getContainerDimensions();
      setContainerDimensions(newDimensions);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    // Constants for the outer border offset
    const OUTER_BORDER_WIDTH = 20; // Width of the outer border
    const OUTER_BORDER_OFFSET = OUTER_BORDER_WIDTH / 2; // Half of 50px translucent border, which is the outermost extent
    const OUTER_SHARP_BORDER_WIDTH = 2; // Width of the outer sharp border
    const OUTER_SHARP_BORDER_OFFSET = OUTER_SHARP_BORDER_WIDTH / 2; // Half of 2px sharp border, which is the outermost extent

    const followersToDisplay = selectedTagForFilter
      ? followers.filter((f) =>
          f.tags.includes(selectedTagForFilter.toLowerCase().replace(/ /g, "_"))
        )
      : followers;

    // If loading and there's no specific filter, or if there are no followers to display at all (even without filter)
    // we might want to show a loader or an empty state, which is handled in the return statement.
    // For the D3 logic, if followersToDisplay is empty, we clear the SVG and stop.
    if (followersToDisplay.length === 0) {
      d3.select(svgRef.current).selectAll("*").remove();
      return;
    }

    const { width, height } = containerDimensions;
    const maxCount = Math.max(
      ...followersToDisplay.map((f) =>
        sortBy === "followers_count" ? f.followers_count : f.smart_followers
      ),
      0
    );

    nodesRef.current = followersToDisplay.map((follower): D3Node => {
      const count =
        sortBy === "followers_count"
          ? follower.followers_count
          : follower.smart_followers;
      const size = getBubbleSize(count, maxCount);
      return {
        id: follower.handle,
        follower: follower,
        size: size,
        radius: size / 2,
        x: width / 2 + (Math.random() - 0.5) * width * 0.3, // Spread initial positions a bit more
        y: height / 2 + (Math.random() - 0.5) * height * 0.3,
      };
    });

    d3.select(svgRef.current).selectAll("*").remove(); // Clear before re-render

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`);

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    simulationRef.current = d3
      .forceSimulation<D3Node>(nodesRef.current)
      .alphaDecay(0.01) // Slow down the cooling rate (default is ~0.0228)
      .alpha(0.7) // Start with a higher alpha
      .force("charge", d3.forceManyBody().strength(15))
      .force(
        "collide",
        d3
          .forceCollide<D3Node>((d: D3Node) => d.radius + OUTER_BORDER_OFFSET)
          .strength(0.9)
      ) // Reduced padding from +2 to +1
      .force("x", d3.forceX(width / 2).strength(0.01))
      .force("y", d3.forceY(height / 2).strength(0.01))
      .on("tick", ticked);

    simulationRef.current.restart(); // Ensure it starts/restarts effectively

    // Fixed nodeElements definition and rendering logic with proper types
    const nodeElements = svg
      .selectAll<SVGGElement, D3Node>(".bubble-group")
      .data(nodesRef.current, (d: D3Node) => d.id)
      .join(
        (enter) => {
          const group = enter
            .append("g")
            .attr("class", "bubble-group cursor-pointer")
            .style("transform-origin", "center center")
            .on("mouseover", (event: MouseEvent, d: D3Node) => {
              setHoveredFollower(d.follower);
              setTooltipPosition({ x: event.clientX, y: event.clientY });
              d3.select(event.currentTarget as SVGGElement)
                .select("circle")
                .style("filter", "drop-shadow(0 4px 12px rgba(0,0,0,0.3))");
              d3.select(event.currentTarget as SVGGElement).raise();
            })
            .on("mouseout", (event: MouseEvent, d: D3Node) => {
              setHoveredFollower(null);
              d3.select(event.currentTarget as SVGGElement)
                .select("circle")
                .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.1))");
            })
            .on("click", (event: MouseEvent, d: D3Node) => {
              router.push(`/kols/${d.follower.handle}`);
            })
            .call(drag(simulationRef.current!));

          group
            .append("circle")
            .attr("r", (d: D3Node) => d.radius)
            .attr("fill", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              return (
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown
              );
            })
            .style("stroke-width", OUTER_BORDER_WIDTH) // width of the border
            .style("stroke", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              const colorHex =
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown;
              return hexToRgba(colorHex, 0.5);
            })
            .style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.1))");

          group
            .append("clipPath")
            .attr("id", (d: D3Node) => `clip-${d.id}`)
            .append("circle")
            .attr("r", (d: D3Node) => d.radius);

          group
            .append("image")
            .attr("xlink:href", (d: D3Node) => d.follower.profile_image_url)
            .attr("clip-path", (d: D3Node) => `url(#clip-${d.id})`)
            .attr("x", (d: D3Node) => -d.radius)
            .attr("y", (d: D3Node) => -d.radius)
            .attr("width", (d: D3Node) => d.size)
            .attr("height", (d: D3Node) => d.size)
            .attr("preserveAspectRatio", "xMidYMid slice")
            .on(
              "error",
              function (this: SVGImageElement, event: Event, d: D3Node) {
                d3.select(this).remove();
                group
                  .filter((nodeData: D3Node) => nodeData.id === d.id)
                  .append("text")
                  .attr("text-anchor", "middle")
                  .attr("dy", "0.3em")
                  .style(
                    "font-size",
                    (dNode: D3Node) => `${Math.max(8, dNode.radius / 3)}px`
                  )
                  .style("font-weight", "bold")
                  .style("fill", "#4A5568")
                  .text((dNode: D3Node) =>
                    dNode.follower.profile_name.substring(0, 2).toUpperCase()
                  );
              }
            );

          // New outer sharp border circle
          group
            .append("circle")
            .attr("class", "outer-sharp-border")
            .attr(
              "r",
              (d: D3Node) =>
                d.radius + OUTER_BORDER_OFFSET - OUTER_SHARP_BORDER_OFFSET
            ) // (15px translucent / 2) - (1.5px sharp / 2) = 7.5 - 0.75 = 6.75
            .style("fill", "none")
            .style("stroke-width", OUTER_SHARP_BORDER_OFFSET)
            .style("stroke", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              return (
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown
              ); // Opaque color
            });

          group
            .append("title")
            .text(
              (d: D3Node) =>
                `${d.follower.profile_name} - ${formatNumber(
                  sortBy === "followers_count"
                    ? d.follower.followers_count
                    : d.follower.smart_followers
                )}`
            );

          return group;
        },
        (update) => {
          // Update existing main circle (translucent border)
          update
            .select<SVGCircleElement>("circle:not(.outer-sharp-border)") // Ensure we don't select the new border circle here
            .transition()
            .duration(300)
            .attr("r", (d: D3Node) => d.radius)
            .attr("fill", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              return (
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown
              );
            })
            .style("stroke", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              const colorHex =
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown;
              return hexToRgba(colorHex, 0.5);
            });

          // Update clipPath
          update
            .select<SVGClipPathElement>("clipPath")
            .select("circle")
            .transition()
            .duration(300)
            .attr("r", (d: D3Node) => d.radius);

          // Update image
          update
            .select<SVGImageElement>("image")
            .attr("xlink:href", (d: D3Node) => d.follower.profile_image_url)
            .transition()
            .duration(300)
            .attr("x", (d: D3Node) => -d.radius)
            .attr("y", (d: D3Node) => -d.radius)
            .attr("width", (d: D3Node) => d.size)
            .attr("height", (d: D3Node) => d.size);

          // Update the new outer sharp border circle
          update
            .select<SVGCircleElement>(".outer-sharp-border")
            .transition()
            .duration(300)
            .attr("r", (d: D3Node) => d.radius + 24.75)
            .style("stroke", (d: D3Node) => {
              const primaryTag = d.follower.tags[0] || "unknown";
              return (
                TAG_COLORS[primaryTag as keyof typeof TAG_COLORS] ||
                TAG_COLORS.unknown
              );
            });

          update
            .select("title")
            .text(
              (d: D3Node) =>
                `${d.follower.profile_name} - ${formatNumber(
                  sortBy === "followers_count"
                    ? d.follower.followers_count
                    : d.follower.smart_followers
                )}`
            );
          return update;
        },
        (exit) => exit.remove()
      );

    function ticked() {
      nodeElements // This variable is now defined
        .attr("transform", (d: D3Node) => `translate(${d.x},${d.y})`)
        .each((d: D3Node) => {
          if (
            d.x !== undefined &&
            d.y !== undefined &&
            d.radius !== undefined
          ) {
            // Adjust clamping to account for the full visual extent of the bubble including borders
            const effectiveRadius = d.radius + OUTER_BORDER_OFFSET;
            d.x = Math.max(
              effectiveRadius,
              Math.min(width - effectiveRadius, d.x)
            );
            d.y = Math.max(
              effectiveRadius,
              Math.min(height - effectiveRadius, d.y)
            );
          }
        });
    }

    function drag(simulation: d3.Simulation<D3Node, undefined>) {
      function dragstarted(
        event: d3.D3DragEvent<SVGGElement, D3Node, any>,
        d: D3Node
      ) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(
        event: d3.D3DragEvent<SVGGElement, D3Node, any>,
        d: D3Node
      ) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(
        event: d3.D3DragEvent<SVGGElement, D3Node, any>,
        d: D3Node
      ) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
      return d3
        .drag<SVGGElement, D3Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [
    followers,
    sortBy,
    loading,
    containerDimensions,
    selectedTagForFilter,
    router,
  ]); // Added router to deps for click handler

  const followersToDisplayCount = selectedTagForFilter
    ? followers.filter((f) =>
        f.tags.includes(selectedTagForFilter.toLowerCase().replace(/ /g, "_"))
      ).length
    : followers.length;

  // Initial loading state for the whole component (before any data or when authorHandle changes)
  if (loading && followers.length === 0 && !selectedTagForFilter) {
    const loaderHeight =
      containerDimensions.height > 0
        ? containerDimensions.height
        : CONTAINER_HEIGHT;
    return (
      <div className="card-trendsage">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Followers Overview
          </h3>
        </div>
        <div className="p-6 text-center text-gray-300 h-48">
          Loading followers overview...
        </div>
      </div>
    );
  }

  // State when a filter is active but results in no followers
  if (!loading && selectedTagForFilter && followersToDisplayCount === 0) {
    return (
      <div className="card-trendsage">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Followers Overview
          </h3>
        </div>
        <div className="p-6 text-center text-gray-300">
          No followers match the selected tag: "{selectedTagForFilter}".
        </div>
      </div>
    );
  }

  // Default: Render the SVG container for D3 to draw in
  return (
    <div
      className="relative mx-auto"
      style={{
        width: containerDimensions.width,
        height: containerDimensions.height,
      }}
    >
      <div
        className="bg-gray-800/50 rounded-full border border-gray-700 relative overflow-hidden mx-auto"
        style={{
          width: containerDimensions.width,
          height: containerDimensions.height,
          padding: "10px",
          boxShadow: `
            0 0 0 1px rgba(0, 217, 146, 0.1),
            0 0 20px rgba(0, 217, 146, 0.15),
            0 0 40px rgba(0, 217, 146, 0.1),
            0 0 80px rgba(0, 217, 146, 0.05),
            0 8px 32px rgba(0, 0, 0, 0.12)
          `,
        }}
      >
        <svg
          ref={svgRef}
          className="block rounded-full"
          style={{
            width: containerDimensions.width - 20,
            height: containerDimensions.height - 20,
          }}
        />
      </div>
      {hoveredFollower && (
        <div
          className="fixed z-[1000] pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translateY(-100%)",
          }}
        >
          <BubbleTooltip follower={hoveredFollower} />
        </div>
      )}
    </div>
  );
};

// D3-based Tags Distribution Donut Chart
const TagsDistributionChart = ({
  followers,
  loading,
  selectedTagForFilter,
  setSelectedTagForFilter,
}: {
  followers: Follower[];
  loading: boolean;
  selectedTagForFilter: string | null;
  setSelectedTagForFilter: (tag: string | null) => void;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{
    tag: string;
    data: any;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || loading) return;

    const tagCounts: { [key: string]: number } = {};
    followers.forEach((follower) => {
      follower.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const chartData = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        name: tag.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        originalTag: tag,
        value: count,
        color: TAG_COLORS[tag as keyof typeof TAG_COLORS] || TAG_COLORS.unknown,
      }))
      .sort((a, b) => b.value - a.value);

    if (chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 120;
    const height = 120;
    const radius = Math.min(width, height) / 2;
    const innerRadius = 20;
    const outerRadius = 45;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3
      .pie<any>()
      .value((d: any) => d.value)
      .sort(null);

    const arc = d3
      .arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(2);

    const arcs = g
      .selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (d: any) => d.data.color)
      .attr("stroke", "rgba(0,0,0,0.1)")
      .attr("stroke-width", 1)
      .style("opacity", (d: any) => {
        if (selectedTagForFilter === d.data.name) return 1;
        if (selectedTagForFilter && selectedTagForFilter !== d.data.name)
          return 0.3;
        return 1;
      })
      .style("cursor", "pointer")
      .on(
        "mouseenter",
        function (this: SVGPathElement, event: MouseEvent, d: any) {
          d3.select(this)
            .attr("stroke", d.data.color)
            .attr("stroke-width", 2)
            .style("opacity", 1);

          setHoveredSegment({ tag: d.data.name, data: d.data });
          setTooltipPosition({ x: event.clientX, y: event.clientY });
        }
      )
      .on(
        "mouseleave",
        function (this: SVGPathElement, event: MouseEvent, d: any) {
          d3.select(this)
            .attr("stroke", "rgba(0,0,0,0.1)")
            .attr("stroke-width", 1)
            .style("opacity", (d: any) => {
              if (selectedTagForFilter === d.data.name) return 1;
              if (selectedTagForFilter && selectedTagForFilter !== d.data.name)
                return 0.3;
              return 1;
            });

          setHoveredSegment(null);
        }
      )
      .on("click", function (this: SVGPathElement, event: MouseEvent, d: any) {
        const clickedTagName = d.data.name;
        if (selectedTagForFilter === clickedTagName) {
          setSelectedTagForFilter(null);
        } else {
          setSelectedTagForFilter(clickedTagName);
        }
      });
  }, [followers, loading, selectedTagForFilter, setSelectedTagForFilter]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-brand mx-auto mb-2"></div>
          <p className="text-gray-400 text-xs">Loading...</p>
        </div>
      </div>
    );
  }

  const tagCounts: { [key: string]: number } = {};
  followers.forEach((follower) => {
    follower.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  if (Object.keys(tagCounts).length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-xs text-gray-400">No tags</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <svg ref={svgRef} className="block" />
      {hoveredSegment && (
        <div
          className="fixed z-[1000] pointer-events-none"
          style={{
            left: `${tooltipPosition.x + 15}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: "translateY(-100%)",
          }}
        >
          <div className="bg-gray-800 border border-accent-brand/30 rounded-lg shadow-lg p-2">
            <p className="font-medium text-xs text-gray-100">
              {hoveredSegment.tag}
            </p>
            <p className="text-xs text-gray-300">
              Count: {hoveredSegment.data.value}
            </p>
            {followers.length > 0 && (
              <p className="text-xs text-gray-300">
                {((hoveredSegment.data.value / followers.length) * 100).toFixed(
                  1
                )}
                %
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for fetching with retry
async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  attempt = 0,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch (e) {
        // ignore if can't read body
      }
      // Throw an error to trigger retry logic
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorBody}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      let responseText = "";
      try {
        responseText = await response.text(); // Attempt to read response text
      } catch (e) {
        // ignore
      }
      throw new Error(
        `Invalid content type: ${contentType}. Response: ${responseText.substring(
          0,
          100
        )}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`Fetch failed for ${url} (attempt ${attempt + 1}):`, error);

    if (attempt < maxRetries) {
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1, maxRetries, retryDelay);
    } else {
      throw new Error(
        `Failed to fetch ${url} after ${maxRetries} retries: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// Main component
export default function FollowersOverview({
  authorHandle,
}: {
  authorHandle: string;
}) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"followers_count" | "smart_followers">(
    "smart_followers"
  );
  const [limit, setLimit] = useState<20 | 50 | 100>(50);
  const [currentAuthorHandle, setCurrentAuthorHandle] = useState<string | null>(
    null
  );
  const [selectedTagForFilter, setSelectedTagForFilter] = useState<
    string | null
  >(null);

  // Fetch data
  useEffect(() => {
    const fetchFollowersData = async () => {
      if (!authorHandle) {
        setFollowers([]);
        setLoading(false);
        return;
      }
      if (authorHandle !== currentAuthorHandle) {
        setFollowers([]);
        setCurrentAuthorHandle(authorHandle);
        setSelectedTagForFilter(null); // Clear filter when author changes
      }
      setLoading(true);
      setError(null);
      try {
        const sortParam =
          sortBy === "followers_count"
            ? "followers_count_desc"
            : "smart_followers_count_desc";
        const data = await fetchWithRetry<ApiResponse>(
          `${API_BASE_URL}/user/author-handle-followers?author_handle=${authorHandle}&sort_by=${sortParam}&limit=${limit}&start=0`
        );
        if (data.result && Array.isArray(data.result.followings)) {
          setFollowers(data.result.followings);
        } else {
          setFollowers([]);
          setError("Failed to parse followers data from API.");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while fetching followers."
        );
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowersData();
  }, [authorHandle, sortBy, limit, currentAuthorHandle]);

  // Loading and error states
  if (loading && followers.length === 0) {
    return (
      <div className="card-trendsage bg-neutral-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Followers Overview
          </h3>
        </div>
        <div className="p-6 text-center text-gray-300 h-52 flex items-center justify-center">
          Loading followers overview...
        </div>
      </div>
    );
  }

  if (error && !loading) {
    // Show error only if not actively loading new data
    return (
      <div className="card-trendsage bg-neutral-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100">
            Followers Overview
          </h3>
        </div>
        <div className="p-6 text-center text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className=" bg-neutral-900">
      {/* Header */}
      {/* <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Followers Overview
        </h3>
      </div> */}

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Sort By Toggle */}
        {/* <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-300">Sort by:</label>
          <div className="flex bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSortBy("smart_followers")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === "smart_followers"
                  ? "bg-accent-brand text-gray-900"
                  : "text-gray-300 hover:text-gray-100"
              }`}
            >
              Smart Followers
            </button>
            <button
              onClick={() => setSortBy("followers_count")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === "followers_count"
                  ? "bg-accent-brand text-gray-900"
                  : "text-gray-300 hover:text-gray-100"
              }`}
            >
              Total Followers
            </button>
          </div>
        </div> */}

        {/* Limit Toggle */}
        {/* <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-300">Show:</label>
          <div className="flex bg-gray-700 rounded-lg p-1">
            {([20, 50, 100] as const).map((num) => (
              <button
                key={num}
                onClick={() => setLimit(num)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  limit === num
                    ? "bg-accent-brand text-gray-900"
                    : "text-gray-300 hover:text-gray-100"
                }`}
              >
                Top {num}
              </button>
            ))}
          </div>
        </div> */}
      </div>

      {/* Visualization Container */}
      <div className="relative flex justify-center items-center ">
        <div className="text-center relative">
          <FollowersBubbleMap
            followers={followers}
            sortBy={sortBy}
            loading={loading}
            selectedTagForFilter={selectedTagForFilter}
          />

          {/* Bottom Right Tags Distribution Chart - positioned relative to bubble map */}
          <div className="absolute bottom-0 -right-10">
            {loading && followers.length === 0 ? (
              <div
                className="w-48 h-48 bg-gray-800 rounded-full border border-gray-700 flex items-center justify-center"
                style={{
                  boxShadow: `
                     0 0 0 1px rgba(0, 217, 146, 0.1),
                     0 0 20px rgba(0, 217, 146, 0.15),
                     0 0 40px rgba(0, 217, 146, 0.1),
                     0 0 80px rgba(0, 217, 146, 0.05),
                     0 8px 32px rgba(0, 0, 0, 0.12)
                   `,
                }}
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-brand mx-auto mb-2"></div>
                  <p className="text-gray-400 text-xs">Loading...</p>
                </div>
              </div>
            ) : followers.length > 0 ? (
              <div
                className="w-32 md:w-48 h-32 md:h-48 bg-gray-800 rounded-full border border-gray-700 relative flex items-center justify-center"
                style={{
                  boxShadow: `
                    0 0 0 1px rgba(0, 217, 146, 0.1),
                    0 0 20px rgba(0, 217, 146, 0.15),
                    0 0 40px rgba(0, 217, 146, 0.1),
                    0 0 80px rgba(0, 217, 146, 0.05),
                    0 8px 32px rgba(0, 0, 0, 0.12)
                  `,
                }}
              >
                <div className="absolute top-1 left-0 right-0 text-center z-10">
                  <h5 className="text-xs font-medium text-gray-300">Tags</h5>
                </div>
                <div className="w-28 md:w-40 h-28 md:h-40 flex items-center justify-center">
                  <TagsDistributionChart
                    followers={followers}
                    loading={loading && followers.length === 0}
                    selectedTagForFilter={selectedTagForFilter}
                    setSelectedTagForFilter={setSelectedTagForFilter}
                  />
                </div>
                {selectedTagForFilter && (
                  <div className="absolute bottom-2 left-0 right-0 text-center z-10">
                    <button
                      onClick={() => setSelectedTagForFilter(null)}
                      className="px-2 py-1 bg-accent-brand text-gray-900 rounded-md text-xs hover:bg-[#00C484] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ) : !loading && followers.length === 0 && !error ? (
              <div
                className="w-48 h-48 bg-gray-800 rounded-full border border-gray-700 flex items-center justify-center"
                style={{
                  boxShadow: `
                    0 0 0 1px rgba(0, 217, 146, 0.1),
                    0 0 20px rgba(0, 217, 146, 0.15),
                    0 0 40px rgba(0, 217, 146, 0.1),
                    0 0 80px rgba(0, 217, 146, 0.05),
                    0 8px 32px rgba(0, 0, 0, 0.12)
                  `,
                }}
              >
                <p className="text-gray-400 text-xs text-center px-4">
                  No data
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-x-4 gap-y-2 mt-4 flex-wrap">
        {Object.entries(TAG_COLORS).map(([tag, color]) => (
          <div key={tag} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium text-gray-300">
              {tag.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
