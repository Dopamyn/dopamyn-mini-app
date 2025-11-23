"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Users } from "lucide-react";
import { useState } from "react";

interface TrendSageListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListSelect: (listType: string, listName: string) => void;
}

interface KolList {
  id: string;
  name: string;
  description: string;
  count: number;
  region: string;
  icon: React.ReactNode;
}

const kolLists: KolList[] = [
  {
    id: "korean",
    name: "Top Korean KOLs",
    description: "Curated list of influential Korean creators and influencers",
    count: 50,
    region: "Korea",
    icon: <Globe className="w-4 h-4" />,
  },
  // Future lists can be added here
  // {
  //   id: "japanese",
  //   name: "Top Japanese KOLs",
  //   description: "Curated list of influential Japanese creators and influencers",
  //   count: 45,
  //   region: "Japan",
  //   icon: <Globe className="w-4 h-4" />,
  // },
];

const placeholderLists: KolList[] = [
  {
    id: "japanese",
    name: "Top Japanese KOLs",
    description:
      "Curated list of influential Japanese creators and influencers",
    count: 45,
    region: "Japan",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: "chinese",
    name: "Top Chinese KOLs",
    description: "Curated list of influential Chinese creators and influencers",
    count: 60,
    region: "China",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: "indian",
    name: "Top Indian KOLs",
    description: "Curated list of influential Indian creators and influencers",
    count: 55,
    region: "India",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    id: "brazilian",
    name: "Top Brazilian KOLs",
    description:
      "Curated list of influential Brazilian creators and influencers",
    count: 40,
    region: "Brazil",
    icon: <Globe className="w-4 h-4" />,
  },
];

export default function TrendSageListModal({
  isOpen,
  onClose,
  onListSelect,
}: TrendSageListModalProps) {
  const [selectedList, setSelectedList] = useState<string | null>(null);

  const handleListSelect = (list: KolList) => {
    setSelectedList(list.id);
  };

  const handleConfirm = () => {
    if (selectedList) {
      const list = kolLists.find((l) => l.id === selectedList);
      if (list) {
        onListSelect(list.id, list.name);
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto bg-card border border-border rounded-2xl shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-white flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-light-primary" />
            Select KOL List
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Available Lists */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-light-tertiary uppercase tracking-wider px-1">
              Available Now
            </h4>
            {kolLists.map((list) => (
              <div
                key={list.id}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-150 touch-manipulation ${
                  selectedList === list.id
                    ? "bg-dark-alpha-tertiary border border-light-primary"
                    : "hover:bg-dark-alpha-quaternary border border-transparent"
                }`}
                onClick={() => handleListSelect(list)}
              >
                <div className="flex items-start gap-3">
                  {/* <div
                    className={`p-2.5 rounded-lg flex-shrink-0 ${
                      selectedList === list.id
                        ? "bg-dark-alpha-tertiary text-light-primary"
                        : "bg-dark-alpha-tertiary text-light-tertiary"
                    }`}
                  >
                    {list.icon}
                  </div> */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white mb-1.5 leading-tight">
                      {list.name}
                    </h3>
                    {list.id===selectedList && <p className="text-xs text-light-tertiary leading-relaxed">
                      {list.description}
                    </p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coming Soon Lists */}
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-light-tertiary uppercase tracking-wider px-1">
              Coming Soon
            </h4>
            {placeholderLists.map((list) => (
              <div
                key={list.id}
                className="p-4 rounded-lg border border-light-tertiary bg-dark-alpha-tertiary opacity-60"
              >
                <div className="flex items-start gap-3">
                  {/* <div className="p-2.5 rounded-lg bg-dark-alpha-tertiary text-light-tertiary flex-shrink-0">
                    {list.icon}
                  </div> */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-light-tertiary mb-1.5 leading-tight">
                      {list.name}
                    </h3>
                    {list.id===selectedList && <p className="text-xs text-light-tertiary leading-relaxed">
                      {list.description}
                    </p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-light-tertiary mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            size="sm"
            className="text-light-tertiary hover:text-white hover:bg-dark-alpha-quaternary w-full sm:w-auto order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedList}
            size="sm"
            className="bg-light-primary hover:bg-light-primary/90 text-black font-medium w-full sm:w-auto order-1 sm:order-2"
          >
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
