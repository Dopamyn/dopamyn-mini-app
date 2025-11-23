"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore
import * as d3 from "d3";
import MindshareHistoryChart from "./MindshareHistoryChart";

interface UserInfo {
  name: string;
  handle: string;
  profile_image_url: string | null;
  followers_count: number;
  followings_count: number;
  smart_followers_count: number;
  engagement_score: number;
}

interface MindshareData {
  author_handle: string;
  author_buzz: number;
  mindshare_percent: number;
  user_info: UserInfo;
  profile_image_url?: string;
  y?: number;
  twitter_name?: string;
  followers_count?: number;
  followings_count?: number;
  smart_followers_count?: number;
  engagement_score?: number;
}

interface Site {
  x: number;
  y: number;
  data: MindshareData;
  value: number;
}

type Period = "1d" | "7d" | "30d";
type ViewType = "treemap" | "voronoi";
type HistoryDataType = {
  [key in Period]: any[];
};

interface MindshareVisualizationProps {
  data: MindshareData[];
  selectedTimePeriod?: string;
  onTimePeriodChange?: (period: string) => void;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
  projectName: string;
  projectHandle: string;
}

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-800/50 rounded-lg animate-pulse">
      <div className="max-w-[320px] md:max-w-full h-full w-full grid grid-cols-3 gap-3 p-4">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-700/50 rounded-lg animate-shimmer"
            style={{
              animationDelay: `${i * 100}ms`,
              height: `${Math.max(50, Math.random() * 100)}%`,
            }}
          />
        ))}
      </div>
    </div>
  ),
});

export default function MindshareVisualization({
  data,
  selectedTimePeriod,
  onTimePeriodChange,
  loading: externalLoading,
  projectName,
  projectHandle,
  setLoading,
}: MindshareVisualizationProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<ViewType>("treemap");
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryDataType>({
    "1d": [],
    "7d": [],
    "30d": [],
  });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Memoize mobile detection to prevent unnecessary re-renders
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const isScrollingRef = useRef<boolean>(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset loading state when data changes
  useEffect(() => {
    if (data) {
      setIsLoading(false);
    }
  }, [data]);

  // Reset loading state when external loading changes
  useEffect(() => {
    if (!externalLoading && isLoading) {
      setIsLoading(false);
    }
  }, [externalLoading, isLoading]);

  // Detect mobile device - memoized to prevent unnecessary re-renders
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();

    // Debounce resize events to prevent excessive re-renders
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkMobile, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Optimized touch event handling with refs to prevent re-renders
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      isScrollingRef.current = false;

      // Clear any existing timeout
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        touchStartRef.current.x !== null &&
        touchStartRef.current.y !== null
      ) {
        const touchEndY = e.touches[0].clientY;
        const touchEndX = e.touches[0].clientX;
        const deltaY = Math.abs(touchEndY - touchStartRef.current.y);
        const deltaX = Math.abs(touchEndX - touchStartRef.current.x);

        // If vertical movement is greater than horizontal and significant, consider it scrolling
        if (deltaY > deltaX && deltaY > 10) {
          isScrollingRef.current = true;
        }
      }
    };

    const handleTouchEnd = () => {
      // Reset scrolling state after a short delay
      touchTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);

      touchStartRef.current = { x: null, y: null };
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current);
      }
    };
  }, []);

  // Validate and clean data - memoized to prevent unnecessary recalculations
  const validData = useMemo<MindshareData[]>(() => {
    return data.filter(
      (item: any): item is MindshareData =>
        Boolean(item) &&
        typeof item === "object" &&
        "user_info" in item &&
        item.user_info &&
        item.user_info.name &&
        typeof item.mindshare_percent === "number" &&
        !isNaN(item.mindshare_percent)
    );
  }, [data]);

  // Use all data for voronoi view - memoized
  const voronoiData = useMemo<MindshareData[]>(() => {
    return validData.sort((a, b) => b.mindshare_percent - a.mindshare_percent);
  }, [validData]);

  // Color scale for voronoi - memoized
  const getColorForMindshare = useCallback((mindshare: number): string => {
    if (mindshare >= 1.8) return "#dc2626"; // 1.8%+ Mindshare
    if (mindshare >= 1.6) return "#ef4444"; // 1.6-1.8% Mindshare
    if (mindshare >= 1.4) return "#f43f5e"; // 1.4-1.6% Mindshare
    if (mindshare >= 1.2) return "#ec4899"; // 1.2-1.4% Mindshare
    if (mindshare >= 1.0) return "#d946ef"; // 1.0-1.2% Mindshare
    if (mindshare >= 0.8) return "#a855f7"; // 0.8-1.0% Mindshare
    if (mindshare >= 0.6) return "#8b5cf6"; // 0.6-0.8% Mindshare
    if (mindshare >= 0.4) return "#6366f1"; // 0.4-0.6% Mindshare
    if (mindshare >= 0.2) return "#3b82f6"; // 0.2-0.4% Mindshare
    return "#0ea5e9"; // 0-0.2% Mindshare
  }, []);

  // Treemap data - memoized
  const chartData = useMemo(() => {
    // Set the maximum allowed block size as a percentage of the total (e.g., 20%)
    const MAX_BLOCK_RATIO = 0.2; // 20%
    const originalValues = validData.map(
      (item) => Number(item.mindshare_percent.toFixed(4)) + 0.0001
    );
    const totalOriginal = originalValues.reduce((a, b) => a + b, 0);
    const maxAllowed = totalOriginal * MAX_BLOCK_RATIO;

    // First, cap values above the max
    const capped = originalValues.map((v) => Math.min(v, maxAllowed));
    const cappedTotal = capped.reduce((a, b) => a + b, 0);
    const overCapSum = capped
      .filter((v, i) => originalValues[i] > maxAllowed)
      .reduce((a, b) => a + b, 0);
    const underCapSum = capped
      .filter((v, i) => originalValues[i] <= maxAllowed)
      .reduce((a, b) => a + b, 0);

    // If any values were capped, scale the uncapped values so total sum remains the same
    let adjusted;
    if (cappedTotal > totalOriginal) {
      // Shouldn't happen, but just in case
      adjusted = capped;
    } else {
      const remaining =
        totalOriginal -
        capped.filter((v, i) => originalValues[i] > maxAllowed).length *
          maxAllowed;
      const scale =
        underCapSum > 0 ? (totalOriginal - overCapSum) / underCapSum : 1;
      adjusted = capped.map((v, i) =>
        originalValues[i] > maxAllowed ? maxAllowed : v * scale
      );
    }

    return [
      {
        data: validData.map((item, i) => ({
          x: item.user_info.name,
          y: adjusted[i],
          originalMindshare: item.mindshare_percent,
          author_handle: item.author_handle || "",
          twitter_name: item.user_info.name || "",
          author_buzz: item.author_buzz || 0,
          profile_image_url: item.user_info.profile_image_url || null,
          followers_count: item.user_info.followers_count || 0,
          followings_count: item.user_info.followings_count || 0,
          smart_followers_count: item.user_info.smart_followers_count || 0,
          engagement_score: item.user_info.engagement_score || 0,
        })),
      },
    ];
  }, [validData]);

  // Create a stable key for the chart to prevent unnecessary re-renders
  const chartKey = useMemo(() => {
    return `treemap-${validData.length}-${currentView}-${
      selectedTimePeriod || "default"
    }`;
  }, [validData.length, currentView, selectedTimePeriod]);

  // Handle loading states properly - moved up to fix hoisting issue
  const hasData = validData.length > 0;
  const isExternalLoading = externalLoading === true;
  // Show loading overlay when either loading state is true
  const showLoadingOverlay = isExternalLoading || isLoading;
  const showNoDataMessage = !isExternalLoading && !hasData;

  // Debounced view change handler to prevent rapid re-renders
  const handleViewChange = useCallback(
    (newView: ViewType) => {
      if (viewChangeTimeoutRef.current) {
        clearTimeout(viewChangeTimeoutRef.current);
      }

      viewChangeTimeoutRef.current = setTimeout(() => {
        setCurrentView(newView);
        if (hasData) setIsLoading(true);
      }, 100);
    },
    [hasData]
  );

  // Treemap options - memoized to prevent re-renders
  const chartOptions = useMemo(
    () => ({
      chart: {
        type: "treemap" as const,
        background: "transparent",
        toolbar: {
          show: false,
        },
        animations: {
          enabled: false, // Disable animations to prevent blinking
        },
        events: {
          mounted: function (chart: any) {
            setIsLoading(false);

            const renderCells = () => {
              try {
                const allCells = chart.el.querySelectorAll(
                  ".apexcharts-treemap-rect"
                );
                const series = chart.el.querySelector(
                  ".apexcharts-treemap-series"
                );

                if (!series || allCells.length === 0) {
                  // Retry after a short delay if elements aren't ready
                  setTimeout(renderCells, 100);
                  return;
                }

                // Clear existing labels
                chart.el
                  .querySelectorAll(".custom-cell-content")
                  .forEach((el: Element) => el.remove());

                allCells.forEach((cell: Element, index: number) => {
                  const dataPoint = chartData[0].data[index];
                  if (!dataPoint) return;

                  const rect = cell as SVGGraphicsElement;
                  const bbox = rect.getBBox();

                  // Check if cell is small
                  const isSmallCell = bbox.width < 65 || bbox.height < 65;

                  const group = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "g"
                  );
                  group.setAttribute("class", "custom-cell-content");
                  group.setAttribute("style", "pointer-events: none;");

                  // Create clip path for the image and overlay
                  const clipPathId = `clip-${index}-${Date.now()}`; // Add timestamp to ensure uniqueness
                  const clipPath = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "clipPath"
                  );
                  clipPath.setAttribute("id", clipPathId);
                  const clipRect = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                  );
                  clipRect.setAttribute("x", String(bbox.x));
                  clipRect.setAttribute("y", String(bbox.y));
                  clipRect.setAttribute("width", String(bbox.width));
                  clipRect.setAttribute("height", String(bbox.height));
                  clipPath.appendChild(clipRect);
                  group.appendChild(clipPath);

                  // Add profile image
                  const image = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "image"
                  );
                  image.setAttribute("x", String(bbox.x));
                  image.setAttribute("y", String(bbox.y));
                  image.setAttribute("width", String(bbox.width));
                  image.setAttribute("height", String(bbox.height));
                  image.setAttribute("clip-path", `url(#${clipPathId})`);
                  image.setAttribute(
                    "href",
                    dataPoint.profile_image_url || "/demoUser.png"
                  );
                  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
                  image.setAttribute(
                    "style",
                    "pointer-events: none; cursor: pointer;"
                  );

                  // Add error handling for image loading
                  image.addEventListener("error", function () {
                    // If image fails to load, remove it and show fallback
                    this.remove();
                    const fallbackRect = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "rect"
                    );
                    fallbackRect.setAttribute("x", String(bbox.x));
                    fallbackRect.setAttribute("y", String(bbox.y));
                    fallbackRect.setAttribute("width", String(bbox.width));
                    fallbackRect.setAttribute("height", String(bbox.height));
                    fallbackRect.setAttribute(
                      "clip-path",
                      `url(#${clipPathId})`
                    );
                    fallbackRect.setAttribute("fill", "#374151");
                    group.appendChild(fallbackRect);
                  });

                  // Add semi-transparent overlay
                  const overlay = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                  );
                  overlay.setAttribute("x", String(bbox.x));
                  overlay.setAttribute("y", String(bbox.y));
                  overlay.setAttribute("width", String(bbox.width));
                  overlay.setAttribute("height", String(bbox.height));
                  overlay.setAttribute("clip-path", `url(#${clipPathId})`);
                  overlay.setAttribute("fill", "rgba(0, 0, 0, 0.3)");
                  overlay.setAttribute("style", "pointer-events: none;");

                  // Add text elements
                  const textGroup = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "g"
                  );
                  textGroup.setAttribute("style", "pointer-events: none;");

                  if (isSmallCell) {
                    // For small cells, only show percentage in top left
                    const mindshareText = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "text"
                    );
                    mindshareText.setAttribute("x", String(bbox.x + 5));
                    mindshareText.setAttribute("y", String(bbox.y + 15));
                    mindshareText.setAttribute("text-anchor", "start");
                    mindshareText.setAttribute("fill", "#00D992");
                    mindshareText.setAttribute(
                      "style",
                      `font-size: ${Math.min(
                        11,
                        bbox.width / 6
                      )}px; font-weight: bold; pointer-events: none; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);`
                    );
                    mindshareText.textContent = `${(
                      dataPoint.originalMindshare || dataPoint.y
                    ).toFixed(2)}%`;
                    textGroup.appendChild(mindshareText);
                  } else {
                    // Background for percentage in top left
                    const percentBg = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "rect"
                    );
                    percentBg.setAttribute("x", String(bbox.x + 5));
                    percentBg.setAttribute("y", String(bbox.y + 5));
                    percentBg.setAttribute("width", "60");
                    percentBg.setAttribute("height", "22");
                    percentBg.setAttribute("rx", "4");
                    percentBg.setAttribute("fill", "rgba(0, 0, 0, 0.6)");

                    // Mindshare percentage text
                    const mindshareText = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "text"
                    );
                    mindshareText.setAttribute("x", String(bbox.x + 8));
                    mindshareText.setAttribute("y", String(bbox.y + 21));
                    mindshareText.setAttribute("text-anchor", "start");
                    mindshareText.setAttribute("fill", "#00D992");
                    mindshareText.setAttribute(
                      "style",
                      "font-size: 15px; font-weight: bold; pointer-events: none;"
                    );
                    mindshareText.textContent = `${(
                      dataPoint.originalMindshare || dataPoint.y
                    ).toFixed(2)}%`;

                    // Author handle text
                    const handleText = document.createElementNS(
                      "http://www.w3.org/2000/svg",
                      "text"
                    );
                    handleText.setAttribute("x", String(bbox.x + 8));
                    handleText.setAttribute("y", String(bbox.y + 42));
                    handleText.setAttribute("text-anchor", "start");
                    handleText.setAttribute("fill", "white");
                    handleText.setAttribute(
                      "style",
                      "font-size: 12px; pointer-events: none; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);"
                    );
                    handleText.textContent = dataPoint.author_handle;

                    textGroup.appendChild(percentBg);
                    textGroup.appendChild(mindshareText);
                    textGroup.appendChild(handleText);
                  }

                  // Append elements in the correct order
                  group.appendChild(image); // Image first
                  group.appendChild(overlay); // Overlay on top of image
                  group.appendChild(textGroup); // Text on top of overlay
                  series.appendChild(group);

                  // Add click handler to the rect element
                  cell.addEventListener("click", async (event) => {
                    // no click enabled for now
                    return;
                    // Prevent click if user is scrolling on mobile
                    if (isMobile && isScrollingRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      return;
                    }

                    if (dataPoint?.author_handle) {
                      try {
                        router.push(`/kols/${dataPoint.author_handle}`);
                        // setSelectedAuthor(dataPoint.author_handle);
                        // await fetchMindshareHistory(dataPoint.author_handle);
                      } catch (error) {
                        console.error("Error handling cell click:", error);
                      }
                    }
                  });
                });
              } catch (error) {
                console.error("Error rendering treemap cells:", error);
                // Retry after a delay if there's an error
                setTimeout(renderCells, 200);
              }
            };

            // Initial render with a small delay to ensure chart is fully ready
            setTimeout(renderCells, 50);

            // Re-render on resize or updates
            chart.addEventListener("updated", () => {
              setTimeout(renderCells, 50);
            });
          },
          click: function (event: any, chartContext: any, config: any) {
            // no click enabled for now
            return;
            // Prevent click if user is scrolling on mobile
            if (isMobile && isScrollingRef.current) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            if (config.dataPointIndex !== -1) {
              const dataPoint = chartData[0].data[config.dataPointIndex];
              if (dataPoint?.author_handle) {
                router.push(`/kols/${dataPoint.author_handle}`);
                // setSelectedAuthor(dataPoint.author_handle);
                // fetchMindshareHistory(dataPoint.author_handle);
              }
            }
          },
        },
      },
      theme: {
        mode: "dark" as const,
        palette: "palette1",
      },
      plotOptions: {
        treemap: {
          enableShades: false,
          distributed: true,
          enabled: true,
        },
      },
      states: {
        hover: {
          filter: {
            type: "lighten",
            value: 0.1,
          },
        },
        active: {
          allowMultipleDataPointsSelection: false,
          filter: {
            type: "none",
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: "0px",
          fontFamily: "inherit",
          fontWeight: "normal",
          colors: ["transparent"],
        },
      },
      tooltip: {
        enabled: !isMobile, // Disable tooltip on mobile
        theme: "dark",
        custom: function ({ seriesIndex, dataPointIndex, w }: any) {
          if (!w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex]) {
            return "";
          }
          const data = w.config.series[seriesIndex].data[dataPointIndex];
          return `
          <div class="p-4 bg-gray-900/95 border border-accent-brand/20 rounded-lg shadow-lg backdrop-blur-sm">
            <div class="flex items-center gap-3 mb-3">
              ${
                data.profile_image_url
                  ? `<img src="${data.profile_image_url}" alt="${
                      data.twitter_name || data.author_handle || "Profile image"
                    }" class="w-10 h-10 rounded-full bg-gray-800 object-cover" />`
                  : '<div class="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-600">👤</div>'
              }
              <div>
                <div class="font-semibold text-white">${
                  data.twitter_name || ""
                }</div>
                <div class="text-sm text-gray-400">@${
                  data.author_handle || ""
                }</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Buzz Score</div>
                <div class="font-medium text-white">${(
                  data.author_buzz || 0
                ).toFixed(2)}</div>
              </div>
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Mindshare</div>
                <div class="font-medium text-white">${(
                  data.originalMindshare ||
                  data.y ||
                  0
                ).toFixed(2)}%</div>
              </div>
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Followers</div>
                <div class="font-medium text-white">${(
                  data.followers_count || 0
                ).toLocaleString()}</div>
              </div>
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Following</div>
                <div class="font-medium text-white">${(
                  data.followings_count || 0
                ).toLocaleString()}</div>
              </div>
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Smart Followers</div>
                <div class="font-medium text-white">${(
                  data.smart_followers_count || 0
                ).toLocaleString()}</div>
              </div>
              <div class="p-2 bg-gray-800/50 rounded-lg">
                <div class="text-sm text-gray-400">Engagement Score</div>
                <div class="font-medium text-white">${(
                  data.engagement_score || 0
                ).toFixed(2)}</div>
              </div>
            </div>
            <div class="text-center text-xs text-gray-400 mt-2">Click to see the mindshare history</div>
          </div>
        `;
        },
      },
      legend: {
        show: false,
      },
    }),
    [isMobile, chartData, router]
  );

  // Voronoi effect with proportional cell sizes
  useEffect(() => {
    if (
      currentView !== "voronoi" ||
      !svgRef.current ||
      voronoiData.length === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const radius = Math.min(width, height) / 2;

    const centerX = width / 2;
    const centerY = height / 2;

    // Create dodecagon path
    const dodecagonPath = (
      centerX: number,
      centerY: number,
      radius: number
    ) => {
      const points = [];
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI / 6) * i;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push([x, y]);
      }
      return "M" + points.join("L") + "Z";
    };

    svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    // Create dodecagon boundary
    const dodecagon = svg
      .append("path")
      .attr("d", dodecagonPath(centerX, centerY, radius))
      .attr("fill", "none")
      .attr("stroke", "#00D992")
      .attr("stroke-width", 3)
      .attr("opacity", 0.8);

    // Create dodecagon vertices
    const dodecagonVertices: [number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      dodecagonVertices.push([
        centerX + radius * 0.95 * Math.cos(angle),
        centerY + radius * 0.95 * Math.sin(angle),
      ]);
    }

    // Strategic positioning for proportional Voronoi cells
    const maxMindshare = Math.max(
      ...voronoiData.map((d) => d.mindshare_percent)
    );
    const sites: Site[] = voronoiData.map((item: MindshareData, i: number) => {
      const normalizedValue = item.mindshare_percent / maxMindshare;

      // Use golden ratio distribution for pleasing visual spacing
      const goldenAngle = i * 2.618034 + normalizedValue * Math.PI;

      // Higher mindshare = closer to center (creates larger cells naturally)
      const baseRadius = radius * 0.75;
      const distance = baseRadius * (0.2 + (1 - normalizedValue) * 0.6);

      return {
        x: centerX + distance * Math.cos(goldenAngle),
        y: centerY + distance * Math.sin(goldenAngle),
        data: item,
        value: item.mindshare_percent,
      };
    });

    // Create Voronoi diagram
    const voronoi = d3.Delaunay.from(
      sites,
      (d: Site) => d.x,
      (d: Site) => d.y
    ).voronoi([0, 0, width, height]);
    const cellsGroup = svg.append("g").attr("class", "voronoi-cells");

    // Helper function to clip polygon to dodecagon
    function clipPolygonToDodecagon(
      polygon: number[][],
      dodecagonVertices: number[][]
    ) {
      let clippedPolygon = [...polygon];

      for (let i = 0; i < dodecagonVertices.length; i++) {
        const clipVertex1 = dodecagonVertices[i];
        const clipVertex2 =
          dodecagonVertices[(i + 1) % dodecagonVertices.length];

        if (clippedPolygon.length === 0) break;

        const inputList = [...clippedPolygon];
        clippedPolygon = [];

        if (inputList.length === 0) continue;

        let s = inputList[inputList.length - 1];

        for (const e of inputList) {
          if (isInside(e, clipVertex1, clipVertex2)) {
            if (!isInside(s, clipVertex1, clipVertex2)) {
              const intersection = getLineIntersection(
                s,
                e,
                clipVertex1,
                clipVertex2
              );
              if (intersection) clippedPolygon.push(intersection);
            }
            clippedPolygon.push(e);
          } else if (isInside(s, clipVertex1, clipVertex2)) {
            const intersection = getLineIntersection(
              s,
              e,
              clipVertex1,
              clipVertex2
            );
            if (intersection) clippedPolygon.push(intersection);
          }
          s = e;
        }
      }

      return clippedPolygon;
    }

    function isInside(point: number[], lineStart: number[], lineEnd: number[]) {
      return (
        (lineEnd[0] - lineStart[0]) * (point[1] - lineStart[1]) -
          (lineEnd[1] - lineStart[1]) * (point[0] - lineStart[0]) >=
        0
      );
    }

    function getLineIntersection(
      p1: number[],
      p2: number[],
      p3: number[],
      p4: number[]
    ) {
      const denom =
        (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
      if (Math.abs(denom) < 1e-10) return null;

      const t =
        ((p1[0] - p3[0]) * (p3[1] - p4[1]) -
          (p1[1] - p3[1]) * (p3[0] - p4[0])) /
        denom;

      return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    }

    // Create cells
    sites.forEach((site, i) => {
      const cell = voronoi.cellPolygon(i);
      if (!cell) return;

      const clippedCell = clipPolygonToDodecagon(cell, dodecagonVertices);
      if (clippedCell.length < 3) return;

      const cellGroup = cellsGroup
        .append("g")
        .attr("class", "cell")
        .style("cursor", "pointer");

      const polygon = cellGroup
        .append("polygon")
        .attr("points", clippedCell.map((d) => d.join(",")).join(" "))
        .attr("fill", getColorForMindshare(site.data.mindshare_percent))
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.8);

      const centroid = d3.polygonCentroid(clippedCell as [number, number][]);
      const area = Math.abs(d3.polygonArea(clippedCell as [number, number][]));

      if (area > 1000) {
        // Replace text with profile image
        const imageSize = Math.min(40, Math.sqrt(area) / 4);

        // Create clip path for circular image
        const clipId = `clip-${i}`;
        cellGroup
          .append("defs")
          .append("clipPath")
          .attr("id", clipId)
          .append("circle")
          .attr("cx", centroid[0])
          .attr("cy", centroid[1])
          .attr("r", imageSize / 2);

        // Add profile image or fallback circle
        if (site.data.user_info.profile_image_url) {
          cellGroup
            .append("image")
            .attr("x", centroid[0] - imageSize / 2)
            .attr("y", centroid[1] - imageSize / 2)
            .attr("width", imageSize)
            .attr("height", imageSize)
            .attr("clip-path", `url(#${clipId})`)
            .attr("href", site.data.user_info.profile_image_url)
            .style("pointer-events", "none");
        } else {
          cellGroup
            .append("circle")
            .attr("cx", centroid[0])
            .attr("cy", centroid[1])
            .attr("r", imageSize / 2)
            .attr("fill", "#374151")
            .attr("stroke", "#4B5563")
            .attr("stroke-width", 2)
            .style("pointer-events", "none");

          // Add user icon emoji as text
          cellGroup
            .append("text")
            .attr("x", centroid[0])
            .attr("y", centroid[1])
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("fill", "#6B7280")
            .attr("font-size", imageSize / 2)
            .text("👤")
            .style("pointer-events", "none");
        }
      }

      cellGroup
        .on("mouseenter", function (event: any) {
          // Only show tooltip on desktop
          if (isMobile) return;

          polygon
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("stroke-width", 2);

          if (tooltipRef.current) {
            const tooltip = d3.select(tooltipRef.current);
            const svgRect = svgRef.current!.getBoundingClientRect();
            const containerRect =
              svgRef.current!.parentElement!.getBoundingClientRect();

            const x = event.clientX - containerRect.left + 15;
            const y = event.clientY - containerRect.top - 10;

            tooltip
              .style("opacity", 1)
              .style("left", x + "px")
              .style("top", y + "px");

            tooltip.select(".tooltip-content").html(`
              <div class="text-center text-sm text-gray-400">Click to see the mindshare history</div>
            `);
          }
        })
        .on("mouseleave", function () {
          // Only hide tooltip on desktop
          if (isMobile) return;

          polygon
            .transition()
            .duration(200)
            .attr("opacity", 0.8)
            .attr("stroke-width", 1.5);

          if (tooltipRef.current) {
            d3.select(tooltipRef.current).style("opacity", 0);
          }
        })
        .on("click", function (event: any) {
          // no click enabled for now
          return;
          // Prevent click if user is scrolling on mobile
          if (isMobile && isScrollingRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          router.push(`/kols/${site.data.author_handle}`);
          // setSelectedAuthor(site.data.author_handle);
          // fetchMindshareHistory(site.data.author_handle);
        });
    });

    // Animation
    cellsGroup
      .selectAll(".cell polygon")
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d: any, i: number) => i * 50)
      .style("opacity", 0.8)
      .on("end", function (d: any, i: number) {
        if (i === sites.length - 1) {
          setIsLoading(false);
        }
      });

    // Add glow effect
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "dodecagon-glow");
    filter
      .append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    dodecagon.attr("filter", "url(#dodecagon-glow)");
  }, [currentView, voronoiData, router, getColorForMindshare]);

  const fetchMindshareHistory = async (authorHandle: string) => {
    try {
      if (!projectHandle) {
        console.error("Project handle is undefined");
        return;
      }
      const handle = projectHandle.replace("@", "").toLowerCase();

      // Set loading state at the start of the fetch
      setIsLoading(true);
      if (setLoading) {
        setLoading(true);
      }

      // Fetch data for all periods
      const periods: Period[] = ["1d", "7d", "30d"];
      const results = await Promise.all(
        periods.map(async (period) => {
          const url = `/api/mindshare/history/${handle}/${authorHandle}?period=${period}`;
          const response = await fetch(url);
          const data = await response.json();
          return { period, data: data.result.mindshare_history || [] };
        })
      );

      // Set data for all periods
      const newHistoryData = results.reduce<HistoryDataType>(
        (acc, { period, data }) => {
          acc[period] = data;
          return acc;
        },
        { "1d": [], "7d": [], "30d": [] }
      );

      setHistoryData(newHistoryData);
      setIsHistoryModalOpen(true);
    } catch (error) {
      console.error("Error fetching mindshare history:", error);
      setHistoryData({ "1d": [], "7d": [], "30d": [] });
      throw error;
    } finally {
      // Reset loading states in finally block
      setIsLoading(false);
      if (setLoading) {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="p-4 max-w-[calc(100vw)] bg-neutral-900 border border-neutral-600 border-dashed border-t-0 border-r-0"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex items-center justify-between ">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-neutral-100">
            Mindshare
          </h3>
          {/* <p className="text-sm text-gray-400">
            {currentView === "treemap"
              ? "Distribution of community engagement and influence"
              : "Community members in dodecagon voronoi representation"}
          </p> */}
        </div>

        {/* View Toggle, Timeline Controls and Download Button */}
        <div className="flex gap-4">
          {/* Timeline Period Filters */}
          {/*onTimePeriodChange && selectedTimePeriod && (
            <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
              {["30d", "7d", "1d"].map((period) => (
                <button
                  key={period}
                  onClick={() => onTimePeriodChange(period)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedTimePeriod === period
                      ? "bg-accent-brand text-gray-900"
                      : "text-gray-300 hover:text-gray-100"
                  }`}
                >
                  {period === "1d" ? "24H" : period.toUpperCase()}
                </button>
              ))}
            </div>
          )} */}

          {/* Map View Toggle */}
          <div className="flex border border-neutral-600 rounded-lg">
            <button
              onClick={() => handleViewChange("treemap")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === "treemap"
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-300 hover:text-neutral-100"
              }`}
            >
              Treemap
            </button>
            <button
              onClick={() => handleViewChange("voronoi")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === "voronoi"
                  ? "bg-neutral-700 text-neutral-100"
                  : "text-neutral-300 hover:text-neutral-100"
              }`}
            >
              Voronoi
            </button>
          </div>
        </div>
      </div>

      <div
        className="w-full h-[513px] relative"
        ref={chartRef}
        style={{ touchAction: "manipulation" }}
      >
        {/* Loading Overlay */}
        {showLoadingOverlay && (
          <div className="absolute inset-0 bg-gray-800/50 rounded-lg animate-pulse flex items-center justify-center mt-2 z-10">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-brand"></div>
              <span className="text-gray-300">Loading visualization...</span>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {showNoDataMessage && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center py-8 text-gray-400">
              <div className="text-lg mb-2">No mindshare data available</div>
              <div className="text-sm">
                for{" "}
                {selectedTimePeriod === "1d"
                  ? "24H"
                  : selectedTimePeriod || "this period"}
              </div>
            </div>
          </div>
        )}

        {/* Visualizations */}
        {hasData && (
          <>
            {currentView === "treemap" ? (
              <ReactApexChart
                key={chartKey}
                options={chartOptions}
                series={chartData}
                type="treemap"
                height="100%"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  ref={svgRef}
                  className="w-full h-full"
                  style={{ maxWidth: "800px", maxHeight: "600px" }}
                />
              </div>
            )}
          </>
        )}

        {/* Voronoi Tooltip */}
        {currentView === "voronoi" && hasData && !isMobile && (
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none z-50 p-4 bg-gray-900/95 border border-accent-brand/20 rounded-lg shadow-lg backdrop-blur-sm opacity-0 transition-opacity duration-200"
            style={{ maxWidth: "320px" }}
          >
            <div className="tooltip-content"></div>
          </div>
        )}
      </div>

      {selectedAuthor && (
        <MindshareHistoryChart
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedAuthor(null);
          }}
          data={historyData}
          projectName={projectName}
          authorHandle={selectedAuthor}
        />
      )}
    </div>
  );
}
