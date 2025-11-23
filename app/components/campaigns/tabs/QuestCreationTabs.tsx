"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadCloud, Users, Gift, Clock, Dices, ListChecks } from "lucide-react";

interface QuestCreationTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  isMobile: boolean;
}

export default function QuestCreationTabs({
  value,
  onValueChange,
  isMobile,
}: QuestCreationTabsProps) {
  const getDescription = (tabValue: string) => {
    switch (tabValue) {
      case "first_come":
        return "First people to complete tasks win - rewards distributed immediately";
      case "raffle":
        return "Everyone who completes tasks enters a random drawing - fair for all participants";
      case "custom":
        return "Choose specific influencers to reward - target your ideal audience";
      default:
        return "";
    }
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList
        className={`grid w-full grid-cols-3 bg-dark-alpha-secondary border border-light-tertiary ${
          isMobile ? "p-0.5" : "p-1"
        }`}
      >
        <TabsTrigger
          value="first_come"
          className={`flex items-center ${
            isMobile ? "space-x-1" : "space-x-2"
          } data-[state=active]:bg-light-primary data-[state=active]:text-black data-[state=active]:font-medium transition-all duration-200 ${
            isMobile ? "text-xs px-2 py-1" : "text-sm"
          }`}
          title={getDescription("first_come")}
        >
          <Clock className={`${isMobile ? "w-3 h-3" : "w-4 h-4"}`} />
          <span>{isMobile ? "Instant" : "Instant Rewards"}</span>
        </TabsTrigger>
        <TabsTrigger
          value="raffle"
          className={`flex items-center ${
            isMobile ? "space-x-1" : "space-x-2"
          } data-[state=active]:bg-light-primary data-[state=active]:text-black data-[state=active]:font-medium transition-all duration-200 ${
            isMobile ? "text-xs px-2 py-1" : "text-sm"
          }`}
          title={getDescription("raffle")}
        >
          <Dices className={`${isMobile ? "w-3 h-3" : "w-4 h-4"}`} />
          <span>{isMobile ? "Raffle" : "Raffle Rewards"}</span>
        </TabsTrigger>
        <TabsTrigger
          value="custom"
          className={`flex items-center ${
            isMobile ? "space-x-1" : "space-x-2"
          } data-[state=active]:bg-light-primary data-[state=active]:text-black data-[state=active]:font-medium transition-all duration-200 ${
            isMobile ? "text-xs px-2 py-1" : "text-sm"
          }`}
          title={getDescription("custom")}
        >
          <ListChecks className={`${isMobile ? "w-3 h-3" : "w-4 h-4"}`} />
          <span>{isMobile ? "Targeted" : "Targeted Rewards"}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
