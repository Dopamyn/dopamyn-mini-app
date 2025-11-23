import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dynamic from "next/dynamic";
import React from "react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export interface MindshareHistoryData {
  created_at: string;
  mindshare_percent: number;
  tweet_count: number;
  author_buzz: number;
  project_buzz: number;
}

interface MindshareHistoryChartProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    "1d": MindshareHistoryData[];
  };
  projectName: string;
  authorHandle: string;
}

export default function MindshareHistoryChart({
  isOpen,
  onClose,
  data,
  projectName,
  authorHandle,
}: MindshareHistoryChartProps) {
  const chartData = React.useMemo(() => {
    if (!data) {
      return [];
    }

    const periodData = data["1d"] || [];
    const sortedData = [...periodData].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return [
      {
        name: "Last 24 Hours",
        data: sortedData.map((item) => ({
          x: new Date(item.created_at).getTime(),
          y: parseFloat(item.mindshare_percent.toFixed(2)),
          tweet_count: item.tweet_count,
          author_buzz: item.author_buzz,
          project_buzz: item.project_buzz,
        })),
      },
    ];
  }, [data]);

  const hasData = data["1d"]?.length > 0;

  if (!hasData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-800 text-gray-100 border-gray-700">
          <DialogHeader>
            <DialogTitle>No Mindshare History</DialogTitle>
            <DialogDescription className="text-gray-400">
              No mindshare history data available for @{authorHandle}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      background: "transparent",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true,
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
      fontFamily: "Inter, sans-serif",
      height: "100%",
      parentHeightOffset: 0,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    theme: {
      mode: "dark",
    },
    markers: {
      size: 0,
      hover: {
        size: 4,
        sizeOffset: 0,
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["#00D992"],
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          colors: "#9CA3AF",
          fontSize: "11px",
          fontFamily: "Inter, sans-serif",
        },
        format: "HH:mm",
        datetimeUTC: false,
        hideOverlappingLabels: true,
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      crosshairs: {
        show: true,
        position: "back",
        stroke: {
          color: "#374151",
          width: 1,
          dashArray: 0,
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#9CA3AF",
          fontSize: "11px",
          fontFamily: "Inter, sans-serif",
        },
        formatter: (value) => value.toFixed(1) + "%",
      },
      min: 0,
      max: (maxValue) => Math.ceil(maxValue + maxValue * 0.1),
      tickAmount: 4,
      forceNiceScale: true,
      floating: false,
    },
    grid: {
      show: true,
      borderColor: "#1f2937",
      strokeDashArray: 0,
      position: "back",
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    tooltip: {
      enabled: true,
      shared: false,
      intersect: false,
      custom: function ({ series, seriesIndex, dataPointIndex }: any) {
        const point = chartData[seriesIndex].data[dataPointIndex];
        return `
          <div class="p-2.5 bg-[#111827] border border-gray-800 rounded-lg shadow-xl">
            <div class="flex items-baseline gap-1.5">
              <span class="font-medium text-[#10B981] text-base">${series[
                seriesIndex
              ][dataPointIndex].toFixed(2)}%</span>
              <span class="text-xs text-gray-500">${new Date(
                point.x
              ).toLocaleTimeString()}</span>
            </div>
            <div class="mt-2 space-y-1 text-xs">
              <div class="flex justify-between items-center gap-4">
                <div class="text-gray-400">Tweets</div>
                <div class="text-white">${point.tweet_count}</div>
              </div>
              <div class="flex justify-between items-center gap-4">
                <div class="text-gray-400">Author Buzz</div>
                <div class="text-white">${point.author_buzz.toFixed(1)}</div>
              </div>
              <div class="flex justify-between items-center gap-4">
                <div class="text-gray-400">Project Buzz</div>
                <div class="text-white">${point.project_buzz.toFixed(1)}</div>
              </div>
            </div>
          </div>
        `;
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        opacityFrom: 0.2,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    legend: {
      show: false,
    },
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
      active: {
        filter: {
          type: "none",
        },
      },
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111827] text-gray-100 border-gray-800/50 max-w-3xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-semibold">
            Mindshare History
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Historical mindshare data for @{authorHandle}
          </DialogDescription>
        </DialogHeader>
        <div className="h-[400px] pb-6">
          <ReactApexChart
            options={chartOptions}
            series={chartData}
            type="area"
            height="100%"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
