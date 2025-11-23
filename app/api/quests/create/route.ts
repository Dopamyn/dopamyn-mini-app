import apiClient from "@/lib/api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await apiClient.post("/quests/create", body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create quest" },
      { status: error.response?.status || 500 }
    );
  }
}
