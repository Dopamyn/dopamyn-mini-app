import { NextRequest, NextResponse } from "next/server";
import { Quest } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { project_name: string } }
) {
  try {
    const { project_name } = params;

    // For now, we'll return mock quest data
    // In a real implementation, this would fetch from a database
    const mockQuests: Quest[] = [
      {
        id: "quest-1",
        creator_x_handle: "@galxe",
        title: "Follow Galxe on Twitter",
        reward_pool: 1000,
        total_users_to_reward: 100,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          {
            task_id: "task-1",
            task_follow_handle: "@galxe",
            task_type: "follow",
            task_tweet_id: "",
            criteria: [
              {
                task_id: "task-1",
                criteria: "min_followers",
                count: 1000,
              },
            ],
          },
        ],
        reward_system: "first_come",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_claimed: 0,
        eligibility_type: "filters",
        celebrated: false,
      },
      {
        id: "quest-2",
        creator_x_handle: "@galxe",
        title: "Tweet about Galxe with #Galxe",
        reward_pool: 2000,
        total_users_to_reward: 50,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          {
            task_id: "task-2",
            task_follow_handle: "",
            task_type: "tweet",
            task_tweet_id: "",
            task_tweet_hashtag: "#Galxe",
            criteria: [
              {
                task_id: "task-2",
                criteria: "min_followers",
                count: 5000,
              },
            ],
          },
        ],
        reward_system: "first_come",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_claimed: 0,
        eligibility_type: "filters",
        celebrated: false,
      },
      {
        id: "quest-3",
        creator_x_handle: "@galxe",
        title: "Retweet Galxe's latest announcement",
        reward_pool: 500,
        total_users_to_reward: 200,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        tasks: [
          {
            task_id: "task-3",
            task_follow_handle: "",
            task_type: "retweet",
            task_tweet_id: "1234567890",
            criteria: [
              {
                task_id: "task-3",
                criteria: "min_followers",
                count: 100,
              },
            ],
          },
        ],
        reward_system: "first_come",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_claimed: 0,
        eligibility_type: "filters",
        celebrated: false,
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockQuests,
    });
  } catch (error) {
    console.error("Error fetching project quests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch project quests" },
      { status: 500 }
    );
  }
}
