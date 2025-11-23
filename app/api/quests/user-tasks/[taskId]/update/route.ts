import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { user_x_handle, task_status } = body;

    // Validate required fields
    if (!user_x_handle || !task_status) {
      return NextResponse.json(
        { error: "user_x_handle and task_status are required" },
        { status: 400 }
      );
    }

    // Get Authorization header from the request
    const authHeader = request.headers.get("authorization");

    // Call the backend API
    const backendUrl =
      process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || "http://localhost:8000";
    const response = await fetch(
      `${backendUrl}/quests/user-tasks/${taskId}/update?user_x_handle=${user_x_handle}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader && { Authorization: authHeader }),
        },
        body: JSON.stringify({
          task_status,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.detail || "Failed to update user task" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating user task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
