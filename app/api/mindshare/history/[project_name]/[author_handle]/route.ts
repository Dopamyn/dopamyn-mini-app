import { NextRequest } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function GET(
  request: NextRequest,
  { params }: { params: { project_name: string; author_handle: string } }
) {
  try {
    const { project_name, author_handle } = params;
    const period = request.nextUrl.searchParams.get("period") || "1d";

    // Fetch mindshare history from the backend API
    const response = await fetch(
      `${API_BASE_URL}/mindshare/history/${project_name}/${author_handle}?period=${period}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data with proper headers
    return Response.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching mindshare history:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to fetch mindshare history",
      },
      {
        status: 500,
      }
    );
  }
}
