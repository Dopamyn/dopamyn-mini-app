"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts";
import type { ChartDataPoint, UserProfileResponse } from "../types";
import FollowersOverview from "./FollowersOverview";

interface MetricChartProps {
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  data: ChartDataPoint[];
  color?: string;
  metricType?: "followers" | "smart_followers" | "mindshare";
}

function CustomTooltip({
  active,
  payload,
  metricType,
}: TooltipProps<number, string> & { metricType?: string; payload?: any }) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload as ChartDataPoint;
    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Format the original value appropriately
    const originalValue = data.originalValue ?? 0; // Default to 0 if undefined
    let formattedValue: string;

    if (metricType === "mindshare") {
      // Show mindshare with 4 decimal places
      formattedValue = originalValue.toFixed(4);
    } else if (originalValue >= 1000000) {
      formattedValue = (originalValue / 1000000).toFixed(1) + "M";
    } else if (originalValue >= 1000) {
      formattedValue = (originalValue / 1000).toFixed(1) + "K";
    } else if (originalValue % 1 === 0) {
      formattedValue = originalValue.toLocaleString();
    } else {
      formattedValue = originalValue.toFixed(1);
    }

    return (
      <div className="bg-gray-800 border border-accent-brand/30 rounded-lg shadow-lg p-3 z-50">
        <p className="text-sm font-medium text-gray-100">{formattedValue}</p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>
    );
  }

  return null;
}

function MetricChart({
  title,
  value,
  change,
  isPositive,
  data,
  color = "#00D992",
  metricType,
}: MetricChartProps) {
  // Scale the data to make trends more visible
  const values = data.map((d) => d.value ?? 0); // Default to 0 if undefined
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;

  // If the range is too small, create artificial scaling for visibility
  const scaledData: ChartDataPoint[] =
    range === 0
      ? data.map((d, i) => ({
          ...d, // Spread existing properties
          value: 50 + Math.sin(i * 0.5) * 20, // Create some variation if data is flat
          originalValue: d.originalValue ?? 0,
        }))
      : data.map((d) => ({
          ...d, // Spread existing properties
          value: range === 0 ? 50 : (((d.value ?? 0) - minValue) / range) * 100,
          originalValue: d.originalValue ?? 0,
        }));

  return (
    <div className="card-trendsage group bg-neutral-900">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-gray-100">{value}</span>
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              isPositive ? "text-accent-brand" : "text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {change}
          </div>
        </div>
      </div>
      <div className="h-12 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={scaledData}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          >
            <Tooltip
              content={<CustomTooltip metricType={metricType} />}
              cursor={{ stroke: "#374151", strokeWidth: 1 }}
              position={{ x: undefined, y: undefined }}
              // coordinate={{ x: 0, y: 0 }}
              isAnimationActive={false}
              wrapperStyle={{ pointerEvents: "none" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={isPositive ? color : "#ef4444"}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                stroke: isPositive ? color : "#ef4444",
                strokeWidth: 2,
                fill: "#1f2937",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  activityData,
}: {
  activityData: UserProfileResponse["result"]["activity_data"];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !activityData.daily_activity.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Prepare data
    const heatmapData: Array<{
      day: string;
      hour: number;
      tweets: number;
      dayIndex: number;
    }> = [];
    days.forEach((day, dayIndex) => {
      const dayData = activityData.daily_activity.find((d) => d.day === day);
      hours.forEach((hour) => {
        const hourData = dayData?.activity.find((a) => a.hour === hour);
        const tweets = hourData?.avg_tweets || 0;
        heatmapData.push({ day, hour, tweets, dayIndex });
      });
    });

    // Dimensions
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const cellSize = 31;
    const width = 24 * cellSize + margin.left + margin.right;
    const height = 7 * cellSize + margin.top + margin.bottom;

    svg.attr("width", width).attr("height", height);

    // Create defs for gradients
    const defs = svg.append("defs");

    // Color scale - Using Dopamyn green
    const maxTweets = d3.max(heatmapData, (d) => d.tweets) || 4;
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, maxTweets])
      .range(["#1f2f37", "#00D992"]);

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "heatmap-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#1f2937")
      .style("color", "#f3f4f6")
      .style("border", "1px solid #00D992")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 4px 12px rgba(0,217,146,0.2)");

    // Add hour labels (top)
    g.selectAll(".hour-label")
      .data(hours.filter((h) => h % 3 === 0)) // Show every 3rd hour
      .enter()
      .append("text")
      .attr("class", "hour-label")
      .attr("x", (d) => d * cellSize + cellSize / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#9ca3af")
      .text((d) => `${d.toString().padStart(2, "0")}:00`);

    // Add day labels (left)
    g.selectAll(".day-label")
      .data(days)
      .enter()
      .append("text")
      .attr("class", "day-label")
      .attr("x", -15)
      .attr("y", (d, i) => i * cellSize + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#9ca3af")
      .text((d) => d.slice(0, 3));

    // Add cells
    g.selectAll(".hour-cell")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("class", "hour-cell")
      .attr("x", (d) => d.hour * cellSize + 1)
      .attr("y", (d) => d.dayIndex * cellSize + 1)
      .attr("width", cellSize - 2)
      .attr("height", cellSize - 2)
      .attr("rx", 3)
      .attr("fill", (d) => colorScale(d.tweets))
      .attr("stroke", "#374151")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible").html(`
            <div>
              <strong>${d.day}</strong><br/>
              ${d.hour.toString().padStart(2, "0")}:00<br/>
              ${d.tweets.toFixed(1)} avg tweets
            </div>
          `);
        d3.select(event.currentTarget)
          .attr("stroke", "#00D992")
          .attr("stroke-width", 2);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", event.pageY - 60 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", (event) => {
        tooltip.style("visibility", "hidden");
        d3.select(event.currentTarget)
          .attr("stroke", "#374151")
          .attr("stroke-width", 1);
      });

    // Add legend - positioned below the heatmap
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + (24 * cellSize - 100) / 2}, ${height - 35})`
      );

    // Create gradient definition for legend
    const legendGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    legendGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#1f2937");

    legendGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#00D992");

    // Add gradient bar
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 100)
      .attr("height", 8)
      .attr("rx", 4)
      .attr("fill", "url(#legend-gradient)")
      .attr("stroke", "#374151")
      .attr("stroke-width", 0.5);

    // Add "Less" label
    legend
      .append("text")
      .attr("x", -5)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .text("Less");

    // Add "More" label
    legend
      .append("text")
      .attr("x", 105)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "start")
      .attr("dominant-baseline", "middle")
      .text("More");

    // Cleanup function
    return () => {
      d3.select("body").selectAll(".heatmap-tooltip").remove();
    };
  }, [activityData]);

  return (
    <div className="card-trendsage bg-neutral-800">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">
        Activity Heatmap
      </h3>
      <div className="overflow-auto">
        <svg ref={svgRef} className="min-w-[800px]" />
      </div>
    </div>
  );
}

export function ProfileCharts({
  chartData,
  activityData,
  authorHandle,
}: {
  chartData: ChartDataPoint[];
  activityData: UserProfileResponse["result"]["activity_data"];
  authorHandle: string;
}) {
  const [selectedMetric, setSelectedMetric] = useState<
    "followers" | "smart_followers" | "mindshare"
  >("followers");

  // If no chart data, show a placeholder state
  if (!chartData || chartData.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {["followers", "smart_followers", "mindshare"].map((metric) => (
          <div key={metric} className="card-trendsage p-4">
            <div className="text-sm font-medium text-gray-400 mb-2">
              {metric === "followers"
                ? "Followers"
                : metric === "smart_followers"
                ? "Smart Followers"
                : "Mindshare"}
            </div>
            <div className="text-gray-300">No data available</div>
          </div>
        ))}
      </div>
    );
  }

  // Calculate metrics for chart cards
  const calculateMetric = (
    metricType: "followers" | "smart_followers" | "mindshare"
  ) => {
    if (!chartData || chartData.length === 0) {
      return {
        value: "0",
        change: "0%",
        isPositive: true,
        current: 0,
        previous: 0,
      };
    }

    const currentValue = chartData[chartData.length - 1];
    const previousValue =
      chartData.length > 1 ? chartData[chartData.length - 2] : null;

    let current: number, previous: number, formatted: string;

    switch (metricType) {
      case "followers":
        current = currentValue.followers_count;
        previous = previousValue?.followers_count || current;
        formatted =
          current >= 1000000
            ? `${(current / 1000000).toFixed(1)}M`
            : `${(current / 1000).toFixed(1)}K`;
        break;
      case "smart_followers":
        current = currentValue.smart_followers_count;
        previous = previousValue?.smart_followers_count || current;
        formatted =
          current >= 1000000
            ? `${(current / 1000000).toFixed(1)}M`
            : `${(current / 1000).toFixed(1)}K`;
        break;
      case "mindshare":
        current = currentValue.mindshare;
        previous = previousValue?.mindshare || current;
        formatted = current.toFixed(4);
        break;
      default:
        return {
          value: "0",
          change: "0%",
          isPositive: true,
          current: 0,
          previous: 0,
        };
    }

    const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    const isPositive = change >= 0;

    return {
      value: formatted,
      change: `${isPositive ? "+" : ""}${change.toFixed(1)}%`,
      isPositive,
      current,
      previous,
    };
  };

  const followersData = chartData.map((d) => ({
    ...d,
    value: d.followers_count,
    originalValue: d.followers_count,
  }));

  const smartFollowersData = chartData.map((d) => ({
    ...d,
    value: d.smart_followers_count,
    originalValue: d.smart_followers_count,
  }));

  const mindshareData = chartData.map((d) => ({
    ...d,
    value: d.mindshare * 10000, // Scale for visibility
    originalValue: d.mindshare,
  }));

  const followersMetric = calculateMetric("followers");
  const smartFollowersMetric = calculateMetric("smart_followers");
  const mindshareMetric = calculateMetric("mindshare");

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricChart
          title="Followers"
          value={followersMetric.value}
          change={followersMetric.change}
          isPositive={followersMetric.isPositive}
          data={followersData}
          color="#00D992"
          metricType="followers"
        />
        <MetricChart
          title="Smart Followers"
          value={smartFollowersMetric.value}
          change={smartFollowersMetric.change}
          isPositive={smartFollowersMetric.isPositive}
          data={smartFollowersData}
          color="#00D992"
          metricType="smart_followers"
        />
        <MetricChart
          title="Mindshare"
          value={mindshareMetric.value}
          change={mindshareMetric.change}
          isPositive={mindshareMetric.isPositive}
          data={mindshareData}
          color="#00D992"
          metricType="mindshare"
        />
      </div>

      {/* Followers Overview */}
      <FollowersOverview authorHandle={authorHandle} />

      {/* Activity Heatmap */}
      <ActivityHeatmap activityData={activityData} />
    </div>
  );
}

export function GrowthChart({ data }: { data: ChartDataPoint[] }) {
  return null; // Deprecated - use ProfileCharts instead
}

export function ActivityChart({
  activityData,
}: {
  activityData: UserProfileResponse["result"]["activity_data"];
}) {
  return <ActivityHeatmap activityData={activityData} />;
}
