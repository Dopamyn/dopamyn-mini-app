
import { NextRequest, NextResponse } from "next/server";
import { CREDBUZZ_API_URL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const questId = url.pathname.split("/")[3];
    const { user_id } = await req.json();

    if (!questId || !user_id) {
      return NextResponse.json(
        { error: "Quest ID and User ID are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${CREDBUZZ_API_URL}/celebrate_quest/${questId}/${user_id}/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to mark quest as celebrated:", errorData);
      return NextResponse.json(
        { error: errorData.message || "Failed to mark quest as celebrated" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error marking quest as celebrated:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
