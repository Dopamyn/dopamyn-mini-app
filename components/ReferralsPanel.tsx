"use client";

import { Button } from "@/components/ui/button";
import { ReferralCard } from "@/components/ReferralCard";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Task } from "@/lib/types";
import { Check, ExternalLink, Gem } from "lucide-react";
import { XIcon } from "@/public/icons/XIcon";
import { TgIcon } from "@/public/icons/TgIcon";

export function ReferralsPanel() {
  const { user } = useUser();
  const { toast } = useToast();
  const [isReferralCopied, setIsReferralCopied] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referralCount, setReferralCount] = useState(
    user?.total_referrals || 0
  );

  const referralUrl = user?.referral_code
    ? `https://dopamyn.fun?referral_code=${user.referral_code}`
    : "";

  const copyReferralLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setIsReferralCopied(true);
    setTimeout(() => setIsReferralCopied(false), 1500);
    toast({ title: "Referral link copied" });
  };

  const shareReferralOnX = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(
      `Join me on @dopamyn_fun and earn 10 DOPE with my referral link!\n\n${referralUrl}`
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareReferralOnTelegram = () => {
    if (!referralUrl) return;
    const shareText = `Dopamyn is doing great by helping you turn your Web3 Influence into $$$$.\n\nJoin me on @dopamyn_fun and earn 10 DOPE upon joining with my referral URL:\n\n${referralUrl}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      referralUrl
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
    toast({ title: "Telegram share opened!" });
  };

  // Tasks (reuse EarnMini behavior)
  const claimXFollow = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/claim-x-follow", {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to claim X follow");
      }
      const updatedTasks = tasks.map((task) =>
        task.id === 1 ? { ...task, completed: task.total } : task
      );
      setTasks(updatedTasks);
      toast({
        title: "X follow claimed successfully",
        description: "50 DOPE have been added to your account",
      });
    } catch (error: any) {
      toast({
        title: "Failed to claim X follow",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      `Join me on @dopamyn_fun and earn 10 DOPE with my referral link!\n\n${referralUrl}`
    )}`;

    const initialTasks: Task[] = [
      {
        id: 1,
        title: "Follow on X",
        description: "Follow @dopamyn_fun on X",
        total: 1,
        completed: (user as any)?.x_follow_claimed ? 1 : 0,
        points: 50,
        action: claimXFollow,
        link: "https://x.com/intent/follow?screen_name=dopamyn_fun",
      },
      {
        id: 2,
        title: "Invite 5 friends",
        description: "And earn added 100 DOPE.",
        total: 5,
        completed: Math.min(user?.total_referrals ?? 0, 5),
        points: 100,
        link: tweetUrl,
      },
    ];
    setTasks(initialTasks);
    setReferralCount(user?.total_referrals || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (referralCount >= 5) {
      setTasks((current) =>
        current.map((task) =>
          task.id === 2 && task.completed < task.total
            ? { ...task, completed: task.total }
            : task
        )
      );
    }
  }, [referralCount]);

  const handleTaskAction = async (task: Task) => {
    if (task.link) window.open(task.link, "_blank");
    if (task.action) await task.action();
  };

  return (
    <div>
      <div className="bg-dark-primary rounded-lg p-4 md:p-0  border-dark-quaternary">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 md:gap-12 items-stretch">
          <div className="md:col-span-4">
            <div className="rounded-lg overflow-hidden border border-dark-quaternary">
              <ReferralCard referralCode={user?.referral_code || ""} />
            </div>
          </div>
          <div className="md:col-span-4 md:col-start-6 md:pr-4 flex flex-col h-full justify-between gap-4 md:gap-0">
            <div className="space-y-2">
              <h3 className="text-2xl md:text-2xl font-semibold text-light-primary">
                When{" "}
                <span className="text-accent-brand">They Earn, You Win</span>{" "}
                too
              </h3>
              <div className="flex items-center gap-2 text-light-tertiary text-base">
                {/* <span className="h-1.5 w-1.5 rounded-full bg-light-tertiary shrink-0"></span> */}
                <p>Earn a % when your referrals complete tasks and win.</p>
              </div>
            </div>
            {/* <div className="text-xs text-light-tertiary space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-light-tertiary shrink-0"></span>
                <p>
                  You and your friend each get{" "}
                  <span className="text-light-primary font-medium">
                    10 DOPE
                  </span>{" "}
                  when they join with your link.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-light-tertiary shrink-0"></span>
                <p>
                  Track your invites in{" "}
                  <span className="text-light-primary font-medium">
                    My Referrals
                  </span>
                  .
                </p>
              </div>
            </div> */}
            <div className="inline-flex flex-col w-fit">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="w-fit shrink-0 text-sm bg-dark-secondary border border-dark-quaternary rounded-md px-4 py-3 text-light-tertiary">
                  {referralUrl || "Generate your referral link by signing in"}
                </div>
                <Button
                  onClick={copyReferralLink}
                  className="bg-light-primary text-dark-primary hover:bg-light-primary/90 h-9 px-3 sm:shrink-0"
                  disabled={!referralUrl}
                >
                  {isReferralCopied ? "Copied" : "Copy Link"}
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full mt-3 sm:mt-4">
                <Button
                  onClick={shareReferralOnX}
                  variant="outline"
                  className="bg-transparent border-dark-alpha-quaternary text-light-tertiary hover:text-light-secondary hover:bg-dark-alpha-secondary w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2"
                  disabled={!referralUrl}
                >
                  <span>Share on</span>
                  <XIcon width={18} height={18} color="#afafaf" />
                </Button>
                <Button
                  onClick={shareReferralOnTelegram}
                  variant="outline"
                  className="bg-transparent border-dark-alpha-quaternary text-light-tertiary hover:text-light-secondary hover:bg-dark-alpha-secondary w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2"
                  disabled={!referralUrl}
                >
                  <span>Share on</span>
                  <TgIcon width={18} height={18} />
                </Button>
              </div>
            </div>
            {/* Buttons row replaced above within width-constrained wrapper */}
          </div>
        </div>
      </div>
      {/* Tasks for $DOPE (from EarnMini), rendered as boxes */}
      {/* <div className="mt-6 md:mt-8">
        <h4 className="text-light-primary text-lg md:text-xl font-semibold mb-3">
          Complete Tasks to earn more $DOPE
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const progressPercent = (task.completed / task.total) * 100;
            const isCompleted = task.completed >= task.total;
            const statusLabel =
              task.total > 1
                ? task.id === 2
                  ? `${task.completed}/${task.total} Referrals`
                  : `${task.completed}/${task.total}`
                : `${task.completed}/${task.total}`;
            return (
              <div
                key={task.id}
                className="rounded-xl p-4 border border-dark-quaternary bg-dark-tertiary flex flex-col h-full"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-light-primary font-semibold mb-1">
                      {task.title}
                    </p>
                    <p className="text-light-tertiary text-xs">
                      {task.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-light-primary text-xs font-medium px-2 py-0.5 rounded-full bg-dark-secondary/50 shrink-0">
                    +{task.points}
                    <Gem className="w-3 h-3 text-light-tertiary" />
                  </div>
                </div>
                {task.total >= 1 && (
                  <div className="mb-3 relative h-2 w-full overflow-hidden rounded-full bg-dark-quaternary">
                    <div
                      className="h-full bg-accent-brand transition-all"
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                )}
                <div className="mt-auto">
                  {isCompleted ? (
                    <div className="text-sm text-light-primary bg-dark-quaternary border border-dark-alpha-quaternary rounded-md py-2.5 px-4 text-center">
                      Completed <Check className="w-3 h-3 ml-1 inline" />
                    </div>
                  ) : task.completed > 0 ? (
                    <div
                      className="text-xs text-light-secondary bg-dark-tertiary border border-dark-alpha-quaternary rounded-md py-2 px-4 text-center cursor-pointer"
                      onClick={() => handleTaskAction(task)}
                    >
                      {statusLabel}
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full bg-dark-tertiary border-dark-alpha-quaternary text-light-primary hover:bg-dark-secondary/80 py-2"
                      onClick={() => handleTaskAction(task)}
                    >
                      Start Task <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div> */}
    </div>
  );
}
