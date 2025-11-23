import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_CREDBUZZ_API_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = searchParams.get("page") || "1";
    const per_page = searchParams.get("per_page") || "10";
    const sort_by = searchParams.get("sort_by") || "project_handle";
    const sort_order = searchParams.get("sort_order") || "asc";

    // Build query params for external API
    const params = new URLSearchParams();
    params.append("page", page);
    params.append("per_page", per_page);
    params.append("sort_by", sort_by);
    params.append("sort_order", sort_order);

    const queryString = params.toString();
    const url = `${EXTERNAL_API_BASE}/projects${
      queryString ? `?${queryString}` : ""
    }`;

    // Get Authorization header from the request
    const authHeader = request.headers.get("authorization");

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Transform the response to match our expected format
    // Assuming the external API returns data in a format like { projects: [...], total: number, ... }
    const projects = data.projects || data.data || [];
    const total = data.total || data.total_count || projects.length;

    console.log(projects, "projects");

    // Transform project data to community format - including all fields
    const communities = projects.map((project: any) => ({
      project_name: project.project_name,
      project_handle: project.project_handle,
      project_symbol: project.project_symbol,
      created_by: project.created_by,
      id: project.id,
      created_at: project.created_at,
      updated_at: project.updated_at,
      quest_count: project.quest_count,
      active_quest_count: project.active_quest_count,
      completed_quest_count: project.completed_quest_count,
      total_quests: project.total_quests,
      latest_quest_start: project.latest_quest_start,
      latest_quest_end: project.latest_quest_end,
      total_tasks: project.total_tasks,
      project_twitter_profile: project.project_twitter_profile,
      creator_twitter_profile: project.creator_twitter_profile,
      // Keep the existing transformed fields for backward compatibility
      name:
        project.project_name || project.project_handle || "Untitled Project",
      image:
        project.project_twitter_profile?.profile_image_url ||
        "/placeholder-logo.png",
      followers: project.project_twitter_profile?.followers_count || 0,
      active_quests: project.active_quest_count || 0,
      token: project.project_symbol || "Unknown",
      description: project.project_twitter_profile?.bio || "",
      tags: [],
      verified: project.project_twitter_profile?.is_verified || false,
    }));

    return NextResponse.json({
      success: true,
      data: communities,
      total: total,
      hasMore: projects.length === parseInt(per_page),
    });
  } catch (error: any) {
    console.error("Failed to fetch communities:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities" },
      { status: error.response?.status || 500 }
    );
  }
}
