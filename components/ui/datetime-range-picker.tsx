"use client";

import * as React from "react";
import { addDays, addMonths, format, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateTimeRangePickerProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
}

// Preset options
const presets = [
  { label: "1 Day", days: 1 },
  { label: "3 Days", days: 3 },
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "1 Month", days: 30 },
  { label: "3 Months", days: 90 },
];

export function DateTimeRangePicker({
  start,
  end,
  onStartChange,
  onEndChange,
  className,
}: DateTimeRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    const from = start ? new Date(start) : undefined;
    const to = end ? new Date(end) : undefined;
    return { from, to };
  });

  // Detect mobile and tablet for responsive behavior
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  
  React.useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width < 1200);
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Update internal state when props change
  React.useEffect(() => {
    const from = start ? new Date(start) : undefined;
    const to = end ? new Date(end) : undefined;
    
    // Only update if significantly different to avoid loops
    if (date?.from?.getTime() !== from?.getTime() || date?.to?.getTime() !== to?.getTime()) {
      setDate({ from, to });
    }
  }, [start, end]);

  const handlePresetClick = (days: number) => {
    const now = new Date();
    const from = now; // Start from now
    const to = endOfDay(addDays(now, days));
    
    setDate({ from, to });
    onStartChange(from.toISOString());
    onEndChange(to.toISOString());
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range);
    
    if (range?.from) {
      // Preserve time from previous start date if available, else use current start time
      const currentStart = start ? new Date(start) : new Date();
      const newStart = new Date(range.from);
      newStart.setHours(currentStart.getHours(), currentStart.getMinutes());
      
      // Don't allow start date in the past
      const now = new Date();
      if (newStart < now) {
        newStart.setTime(now.getTime());
      }
      
      onStartChange(newStart.toISOString());
    }

    if (range?.to) {
      // Preserve time from previous end date if available, else use current end time
      const currentEnd = end ? new Date(end) : new Date();
      const newEnd = new Date(range.to);
      newEnd.setHours(currentEnd.getHours(), currentEnd.getMinutes());
      
      // Don't allow end date in the past
      const now = new Date();
      if (newEnd < now) {
        newEnd.setTime(now.getTime());
      }
      
      onEndChange(newEnd.toISOString());
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    if (date?.from && !isNaN(hours) && !isNaN(minutes)) {
      const newStart = new Date(date.from);
      newStart.setHours(hours, minutes);
      
      // Don't allow start time in the past
      const now = new Date();
      if (newStart < now) {
        newStart.setTime(now.getTime());
      }
      
      onStartChange(newStart.toISOString());
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = e.target.value.split(":").map(Number);
    if (date?.to && !isNaN(hours) && !isNaN(minutes)) {
      const newEnd = new Date(date.to);
      newEnd.setHours(hours, minutes);
      
      // Don't allow end time in the past
      const now = new Date();
      if (newEnd < now) {
        newEnd.setTime(now.getTime());
      }
      
      onEndChange(newEnd.toISOString());
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "00:00";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "00:00";
    return format(date, "HH:mm");
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return format(date, "MMM dd, yyyy HH:mm");
  };

  const calculateDays = () => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Reset time to start of day for accurate day counting
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    const diffTime = endDay.getTime() - startDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Add 1 to include both start and end days (e.g., Nov 19 to Nov 26 = 8 days inclusive)
    // But if you want it to show the difference (7 days between them), return diffDays
    return diffDays;
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal bg-[#1E2025] border-[#2D313A] rounded-md text-white hover:bg-[#23262E] hover:text-white h-10 text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-[#FF8080]" />
            {date?.from ? (
              date.to ? (
                <span className="text-sm truncate">
                  {isMobile ? (
                    <>
                      {format(new Date(start), "MMM dd")} → {format(new Date(end), "MMM dd")} 
                      <span className="text-[#FF8080] ml-1">({calculateDays()}d)</span>
                    </>
                  ) : isTablet ? (
                    <>
                      {format(new Date(start), "MMM dd")} → {format(new Date(end), "MMM dd, yyyy")} 
                      <span className="text-[#FF8080] ml-1">({calculateDays()}d)</span>
                    </>
                  ) : (
                    <>
                      {formatDisplayDate(start)} → {formatDisplayDate(end)} 
                      <span className="text-[#FF8080] ml-1">({calculateDays()} {calculateDays() === 1 ? 'day' : 'days'})</span>
                    </>
                  )}
                </span>
              ) : (
                <span className="text-sm truncate">
                  {isMobile ? format(new Date(start), "MMM dd") : 
                   isTablet ? format(new Date(start), "MMM dd, yyyy") : 
                   formatDisplayDate(start)}
                </span>
              )
            ) : (
              <span className="text-sm text-[#6B7280]">Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn(
          "p-0 bg-[#1E2025] border-[#2D313A]", 
          isMobile ? "w-[min(calc(100vw-2rem),280px)]" : 
          isTablet ? "w-[min(calc(100vw-3rem),300px)]" : "w-auto"
        )} align="start">
          {/* Presets */}
          <div className={cn("border-b border-[#2D313A]", isMobile ? "p-1.5" : "p-2")}>
            <div className={cn("flex flex-wrap", isMobile ? "gap-1" : "gap-1.5")}>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset.days)}
                  className={cn(
                    "bg-[#23262E] border-[#2D313A] text-white hover:bg-[#FF8080] hover:text-white hover:border-[#FF8080] transition-all",
                    isMobile ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={isMobile ? 1 : 2}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
            className="bg-[#1E2025] text-white text-sm"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-3 sm:space-x-3 sm:space-y-0",
              month: "space-y-3",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium text-white",
              nav: cn("space-x-1 flex items-center justify-center", isMobile ? "px-2" : ""),
              nav_button: cn(
                "bg-transparent p-0 opacity-50 hover:opacity-100 border-[#2D313A] hover:bg-[#2D313A] text-white",
                isMobile ? "h-5 w-5 mx-1" : "h-6 w-6"
              ),
              nav_button_previous: cn("absolute left-0", isMobile ? "left-1" : "left-2"),
              nav_button_next: cn("absolute right-0", isMobile ? "right-1" : "right-2"),
              table: "w-full border-collapse space-y-1 mx-auto max-w-full",
              head_row: "flex justify-center",
              head_cell: cn(
                "text-[#6B7280] rounded-md font-normal text-xs",
                isMobile ? "w-7" : "w-8"
              ),
              row: "flex w-full mt-1.5 justify-center",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[#FF8080]/10 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                isMobile ? "min-w-7" : ""
              ),
              day: cn(
                "h-8 w-8 p-0 font-normal text-sm rounded-md hover:bg-[#2D313A] hover:text-white transition-colors",
                isMobile ? "h-7 w-7 text-xs" : ""
              ),
              day_range_start: "day-range-start bg-[#FF8080] text-white hover:bg-[#FF8080] hover:text-white focus:bg-[#FF8080] focus:text-white rounded-md",
              day_range_end: "day-range-end bg-[#FF8080] text-white hover:bg-[#FF8080] hover:text-white focus:bg-[#FF8080] focus:text-white rounded-md",
              day_selected: "bg-[#FF8080] text-white hover:bg-[#FF8080] hover:text-white focus:bg-[#FF8080] focus:text-white rounded-md",
              day_today: "bg-[#2D313A] text-white font-semibold rounded-md",
              day_outside: "text-[#6B7280] opacity-50",
              day_disabled: "text-[#6B7280] opacity-30 cursor-not-allowed",
              day_range_middle: "aria-selected:bg-[#FF8080]/10 aria-selected:text-white rounded-none",
              day_hidden: "invisible",
            }}
          />

          {/* Time Inputs */}
          <div className={cn("border-t border-[#2D313A] bg-[#1E2025] flex", isMobile ? "gap-2 p-1.5" : "gap-3 p-2")}>
            <div className="flex-1 space-y-0.5">
              <Label className={cn("text-[#6B7280]", isMobile ? "text-[10px]" : "text-xs")}>Start Time</Label>
              <Input 
                type="time" 
                value={formatTime(start)} 
                onChange={handleStartTimeChange}
                className={cn("bg-[#23262E] border-[#2D313A] text-white", isMobile ? "h-6 text-[10px]" : "h-7 text-xs")}
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <Label className={cn("text-[#6B7280]", isMobile ? "text-[10px]" : "text-xs")}>End Time</Label>
              <Input 
                type="time" 
                value={formatTime(end)} 
                onChange={handleEndTimeChange}
                disabled={!date?.to}
                className={cn("bg-[#23262E] border-[#2D313A] text-white disabled:opacity-50", isMobile ? "h-6 text-[10px]" : "h-7 text-xs")}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

