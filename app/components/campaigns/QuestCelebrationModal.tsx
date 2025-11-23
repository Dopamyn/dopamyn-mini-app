import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Quest } from "@/lib/types";
import { Trophy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuestCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quest: Quest | null;
}

export default function QuestCelebrationModal({
  open,
  onOpenChange,
  quest,
}: QuestCelebrationModalProps) {
  const [showModal, setShowModal] = useState(open);
  const isMobile = useIsMobile();

  useEffect(() => {
    setShowModal(open);
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 5000); // Close after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [open, onOpenChange]);

  if (!quest) return null;

  const rewardAmount = (
    quest.reward_pool / quest.total_users_to_reward
  ).toFixed(2);

  return (
    <Dialog open={showModal} onOpenChange={onOpenChange}>
      <DialogContent
        className={`fixed z-50 bg-dark-primary border border-light-primary rounded-lg shadow-xl animate-scale-in ${
          isMobile
            ? "top-1/3 left-[10vw] w-[80vw] m-auto transform -translate-x-1/2 -translate-y-1/2 p-4"
            : "left-[33%] top-[30%] p-6"
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <Trophy
            className={`text-light-primary mb-4 animate-bounce-in ${
              isMobile ? "w-12 h-12" : "w-16 h-16"
            }`}
          />
          <h3
            className={`font-bold text-light-primary mb-2 ${
              isMobile ? "text-xl" : "text-2xl"
            }`}
          >
            Campaign Completed!
          </h3>
          <p
            className={`text-light-tertiary mb-6 ${
              isMobile ? "text-sm" : "text-lg"
            }`}
          >
            You earned {Number(rewardAmount).toFixed(2)} USDC for "{quest.title}
            "!
          </p>
          <Badge
            className={`bg-dark-secondary text-light-primary border-light-primary border-[1px] font-medium rounded-full animate-shining-text ${
              isMobile ? "text-base px-4 py-2" : "text-lg px-6 py-3"
            }`}
          >
            Earned {Number(rewardAmount).toFixed(2)}
            <Trophy
              className={`ml-2 text-yellow-text ${
                isMobile ? "w-4 h-4" : "w-6 h-6"
              }`}
            />
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
