import { QuestDetails } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Activity, BarChart3, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ResultData } from "./CampaignResultsTab";

interface PerformanceStats {
  totalFollowers: number;
  totalSmartFollowers: number;
  totalViews: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  avgFollowers: number;
  avgSmartFollowers: number;
  avgViews: number;
  medianViews: number;
  avgLikes: number;
  avgRetweets: number;
  avgReplies: number;
  totalTokensEarned: number;
  avgTokensEarned: number;
}

interface CampaignSummaryTabProps {
  quest: QuestDetails;
  results: ResultData[];
}

export default function CampaignSummaryTab({
  quest,
  results,
}: CampaignSummaryTabProps) {
  // Calculate target averages from eligible users
  const targetStats = useMemo(() => {
    // For target: use all loaded users
    const allUsers = results;
    const totalUsers = allUsers.length;

    // For achieved: use only users who have earned tokens (completed at least one task)
    const paidUsers = results.filter((r) =>
      r.tasks.some((task) => (task.tokens_earned || 0) > 0)
    );
    const totalPaid = paidUsers.length;

    if (totalUsers === 0) {
      return {
        targetFollowers: 0,
        targetSmartFollowers: 0,
        targetViews: 0,
        achievedFollowers: 0,
        achievedSmartFollowers: 0,
        achievedViews: 0,
        avgBudget: quest.reward_pool / quest.total_users_to_reward,
      };
    }

    // Calculate target metrics (from all loaded users)
    const targetTotals = allUsers.reduce(
      (acc, user) => ({
        followers: acc.followers + (user.followers_count || 0),
        smartFollowers: acc.smartFollowers + (user.smart_followers_count || 0),
        views: acc.views + (user.engagement_score || 0), // 30d average views
      }),
      { followers: 0, smartFollowers: 0, views: 0 }
    );

    // Calculate achieved metrics (from paid users)
    const achievedTotals = paidUsers.reduce(
      (acc, user) => ({
        followers: acc.followers + (user.followers_count || 0),
        smartFollowers: acc.smartFollowers + (user.smart_followers_count || 0),
        // For views, we use engagement score
        views: acc.views + (user.engagement_score || 0),
      }),
      { followers: 0, smartFollowers: 0, views: 0 }
    );

    return {
      targetFollowers: targetTotals.followers / totalUsers,
      targetSmartFollowers: targetTotals.smartFollowers / totalUsers,
      targetViews: targetTotals.views / totalUsers,
      achievedFollowers:
        totalPaid > 0 ? achievedTotals.followers / totalPaid : 0,
      achievedSmartFollowers:
        totalPaid > 0 ? achievedTotals.smartFollowers / totalPaid : 0,
      achievedViews: totalPaid > 0 ? achievedTotals.views / totalPaid : 0,
      avgBudget: quest.reward_pool / quest.total_users_to_reward,
    };
  }, [quest]);
  const [performanceStats, setPerformanceStats] =
    useState<PerformanceStats | null>(null);

  useEffect(() => {
    const stats = {
      totalFollowers: 0,
      totalSmartFollowers: 0,
      totalViews: 0,
      totalLikes: 0,
      totalRetweets: 0,
      totalReplies: 0,
      avgFollowers: 0,
      avgSmartFollowers: 0,
      avgViews: 0,
      medianViews: 0,
      avgLikes: 0,
      avgRetweets: 0,
      avgReplies: 0,
      totalTokensEarned: 0,
      avgTokensEarned: 0,
    };

    results.forEach((result: ResultData) => {
      stats.totalFollowers += result.followers_count || 0;
      stats.totalSmartFollowers += result.smart_followers_count || 0;

      // Calculate total views from engagement score
      stats.totalViews += result.engagement_score || 0;

      // Calculate total tokens earned across all tasks for this user
      const userTokensEarned = result.tasks.reduce(
        (sum, task) => sum + (task.tokens_earned || 0) / 1e6,
        0
      );
      stats.totalTokensEarned += userTokensEarned;

      // Calculate engagement metrics from all tasks
      result.tasks.forEach((task) => {
        task.found_tweet_ids_details?.forEach((tweet) => {
          stats.totalLikes += tweet.like_count || 0;
          stats.totalRetweets += tweet.retweet_count || 0;
          stats.totalReplies += tweet.reply_count || 0;
        });
      });
    });

    const numResults = results.length;
    if (numResults > 0) {
      stats.avgFollowers = stats.totalFollowers / numResults;
      stats.avgSmartFollowers = stats.totalSmartFollowers / numResults;
      stats.avgViews = stats.totalViews / numResults;
      stats.avgLikes = stats.totalLikes / numResults;
      stats.avgRetweets = stats.totalRetweets / numResults;
      stats.avgReplies = stats.totalReplies / numResults;
      stats.avgTokensEarned = stats.totalTokensEarned / numResults;

      // Calculate median views from actual tweet views across all tasks
      const allViews = results
        .flatMap((r) =>
          r.tasks.flatMap(
            (task) =>
              task.found_tweet_ids_details?.map(
                (tweet) => tweet.view_count || 0
              ) || []
          )
        )
        .sort((a, b) => a - b);
      const mid = Math.floor(allViews.length / 2);
      stats.medianViews =
        allViews.length % 2 === 0
          ? (allViews[mid - 1] + allViews[mid]) / 2
          : allViews[mid];
    }

    setPerformanceStats(stats);
  }, [results]);

  if (!performanceStats) return null;

  return (
    <div className="space-y-8 p-6">
      {/* Performance Stats - Modern Banner Style */}
      <div className="bg-gradient-to-r from-dark-secondary to-dark-quaternary rounded-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-8 h-8 text-light-primary" />
          <h2 className="text-2xl font-bold">Performance Stats</h2>
        </div>

        <div className="bg-dark-primary p-6 rounded-lg border border-dark-secondary">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-secondary">
                  <th className="text-left py-3 text-light-tertiary">Metric</th>
                  <th className="text-right py-3 text-light-tertiary">
                    Target
                  </th>
                  <th className="text-right py-3 text-light-tertiary">
                    Achieved
                  </th>
                  <th className="text-right py-3 text-light-tertiary">
                    Per User Target
                  </th>
                  <th className="text-right py-3 text-light-tertiary">
                    Avg Achieved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-secondary">
                <tr>
                  <td className="py-4 text-light-tertiary">
                    Reach (Followers)
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(
                      targetStats.targetFollowers * results.length,
                      0
                    )}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(
                      targetStats.achievedFollowers *
                        results.filter((r) =>
                          r.tasks.some((task) => (task.tokens_earned || 0) > 0)
                        ).length,
                      0
                    )}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.targetFollowers, 0)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.achievedFollowers, 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Smart Reach</td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(
                      targetStats.targetSmartFollowers * results.length,
                      0
                    )}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(
                      targetStats.achievedSmartFollowers *
                        results.filter((r) =>
                          r.tasks.some((task) => (task.tokens_earned || 0) > 0)
                        ).length,
                      0
                    )}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.targetSmartFollowers, 0)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.achievedSmartFollowers, 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Total Views</td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.targetViews * results.length, 0)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.totalViews, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.targetViews, 0)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgViews, 0)
                      : 0}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Average Views</td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.targetViews, 0)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgViews, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Median Views</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.medianViews, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Likes</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.totalLikes, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgLikes, 0)
                      : 0}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Retweets</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.totalRetweets, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgRetweets, 0)
                      : 0}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Replies</td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.totalReplies, 0)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">-</td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgReplies, 0)
                      : 0}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-light-tertiary">Budget (USDC)</td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(quest.reward_pool, 2)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.totalTokensEarned, 2)
                      : 0}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {formatNumber(targetStats.avgBudget, 2)}
                  </td>
                  <td className="py-4 text-right text-light-primary">
                    {performanceStats
                      ? formatNumber(performanceStats.avgTokensEarned, 2)
                      : 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Engagement Stats - Horizontal List Style */}
      <div className="bg-dark-primary rounded-xl p-8 border border-dark-secondary">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-8 h-8 text-light-primary" />
          <h2 className="text-2xl font-bold">Engagement Stats</h2>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          <div className="flex-1 flex items-center gap-4">
            <div className="h-16 w-1 bg-light-primary rounded-full"></div>
            <div>
              <p className="text-light-tertiary mb-1">Total Likes</p>
              <p className="text-3xl font-bold">
                {performanceStats
                  ? formatNumber(performanceStats.totalLikes, 0)
                  : 0}
              </p>
              <p className="text-sm text-light-tertiary">
                Avg:{" "}
                {performanceStats
                  ? formatNumber(performanceStats.avgLikes, 0)
                  : 0}
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4">
            <div className="h-16 w-1 bg-light-primary rounded-full"></div>
            <div>
              <p className="text-light-tertiary mb-1">Total Retweets</p>
              <p className="text-3xl font-bold">
                {performanceStats
                  ? formatNumber(performanceStats.totalRetweets, 0)
                  : 0}
              </p>
              <p className="text-sm text-light-tertiary">
                Avg:{" "}
                {performanceStats
                  ? formatNumber(performanceStats.avgRetweets, 0)
                  : 0}
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center gap-4">
            <div className="h-16 w-1 bg-light-primary rounded-full"></div>
            <div>
              <p className="text-light-tertiary mb-1">Total Replies</p>
              <p className="text-3xl font-bold">
                {performanceStats
                  ? formatNumber(performanceStats.totalReplies, 0)
                  : 0}
              </p>
              <p className="text-sm text-light-tertiary">
                Avg:{" "}
                {performanceStats
                  ? formatNumber(performanceStats.avgReplies, 0)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Participation Stats - Modern Grid Style */}
      <div className="bg-dark-primary rounded-xl p-8 border border-dark-secondary">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-8 h-8 text-light-primary" />
          <h2 className="text-2xl font-bold">Participation Stats</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-light-primary to-light-primary rounded-lg blur opacity-30"></div>
            <div className="relative bg-dark-primary p-4 rounded-lg">
              <p className="text-light-tertiary mb-2">Total Users</p>
              <p className="text-3xl font-bold">{results.length}</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-light-primary to-light-primary rounded-lg blur opacity-30"></div>
            <div className="relative bg-dark-primary p-4 rounded-lg">
              <p className="text-light-tertiary mb-2">Interacted</p>
              <p className="text-3xl font-bold">
                {
                  results.filter((r) =>
                    r.tasks.some((task) => task.task_status !== "todo")
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-light-primary to-light-primary rounded-lg blur opacity-30"></div>
            <div className="relative bg-dark-primary p-4 rounded-lg">
              <p className="text-light-tertiary mb-2">Completed</p>
              <p className="text-3xl font-bold">
                {
                  results.filter((r) =>
                    r.tasks.every((task) => task.task_status === "completed")
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-light-primary to-light-primary rounded-lg blur opacity-30"></div>
            <div className="relative bg-dark-primary p-4 rounded-lg">
              <p className="text-light-tertiary mb-2">Completion Rate</p>
              <p className="text-3xl font-bold">
                {(
                  (results.filter((r) =>
                    r.tasks.every((task) => task.task_status === "completed")
                  ).length /
                    results.length) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
