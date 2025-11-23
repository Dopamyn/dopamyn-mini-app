import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Normalize frontend camelCase -> backend snake_case and prune upload-only fields
  const normalized: any = {
    ...body,
    // Remove file fields that are not sent to backend
    kolListFile: undefined,
    eligibleKolListFile: undefined,
    // Add criteria array if min_followers or min_smart_followers are present
    criteria: [],
    // kol_list_data populated below for both custom and FCFS KOL list flows
    kol_list_data: undefined,
    // Include raffle information
    is_raffle: body.is_raffle || false,
    // Ensure project_id is not included or is null/undefined
    project_id: undefined,
  };

  // Custom rewards: kolListData -> kol_list_data [{ handle, amount }]
  if (body.reward_system === "custom" && Array.isArray(body.kolListData)) {
    normalized.kol_list_data = body.kolListData.map((row: any) => {
      // Handle both string format (legacy) and object format (with profile_image_url, name, amount)
      const handle = typeof row === "string"
        ? row.replace(/^@+/, "")
        : (row?.handle || "").replace(/^@+/, "");
      return {
        handle,
        amount: Number(row?.amount ?? 0),
      };
    });
  }

  // FCFS with KOL list eligibility: eligibleKolListData -> kol_list_data with amount 0
  if (
    body.reward_system === "first_come" &&
    body.eligibility_type === "kol_list" &&
    Array.isArray(body.eligibleKolListData)
  ) {
    normalized.kol_list_data = body.eligibleKolListData.map((h: any) => {
      // Handle both string format (legacy) and object format (with profile_image_url, name)
      const handle = typeof h === "string" 
        ? h.replace(/^@+/, "") 
        : (h?.handle || "").replace(/^@+/, "");
      return {
        handle,
        amount: 0,
      };
    });
  }

  if (body.min_followers && body.min_followers > 0) {
    normalized.criteria.push({
      criteria: "min_followers",
      count: body.min_followers,
    });
  }
  if (body.min_smart_followers && body.min_smart_followers > 0) {
    normalized.criteria.push({
      criteria: "min_smart_followers",
      count: body.min_smart_followers,
    });
  }

  // Set individual criteria fields to undefined after they've been used to construct the criteria array
  normalized.min_followers = undefined;
  normalized.min_smart_followers = undefined;
  // Drop deprecated eligible list field if present
  normalized.eligible_kol_list = undefined;
  normalized.is_raffle = body.is_raffle || false;
  console.log(normalized,'normalized')
  try {
    console.log(EXTERNAL_API_BASE,'api url')
    const response = await fetch(`${EXTERNAL_API_BASE}/quests/create`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(normalized),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error response:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create quest:", error);
    return NextResponse.json(
      { error: "Failed to create quest" },
      { status: 500 }
    );
  }
}