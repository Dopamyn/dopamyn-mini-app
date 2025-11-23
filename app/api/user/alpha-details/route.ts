import alphaApi from "@/lib/alphaApi";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorHandles, start = 0, limit = 30 } = body;

    if (
      !authorHandles ||
      !Array.isArray(authorHandles) ||
      authorHandles.length === 0
    ) {
      return NextResponse.json(
        { error: "authorHandles array is required and must not be empty" },
        { status: 400 }
      );
    }

    const response = await alphaApi.post(
      `/v1/author-handle-details?start=${start}&limit=${limit}`,
      {
        author_handle: authorHandles,
        sort_by: "followers_count_desc",
      }
    );

    const responseData = response.data;

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to get author details:", error);
    return NextResponse.json(
      { error: "Failed to get author details" },
      { status: 500 }
    );
  }
}
