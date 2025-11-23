import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task_id, user_x_handle, task_status = "under_review" } = body;

    // Validate required fields
    if (!task_id || !user_x_handle) {
      return NextResponse.json(
        { error: "task_id and user_x_handle are required" },
        { status: 400 }
      );
    }

    // Get Authorization header from the request
    const authHeader = request.headers.get("authorization");

    // Call the backend API
    const backendUrl =
      process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/quests/user-tasks/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify({
        task_id,
        user_x_handle,
        task_status,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to create user task" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating user task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
