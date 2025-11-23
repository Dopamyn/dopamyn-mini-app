import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE =
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL ||
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL ||
  "https://api.dopamyn.fun";

// const EXTERNAL_API_BASE = "http://localhost:8000";

// Helper function to convert BigInt to string for JSON serialization
function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return data.toString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => serializeData(item));
  }
  
  if (typeof data === 'object') {
    const serialized: any = {};
    for (const key in data) {
      serialized[key] = serializeData(data[key]);
    }
    return serialized;
  }
  
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");
    const chain = searchParams.get("chain");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!chain) {
      return NextResponse.json({ error: "Chain is required" }, { status: 400 });
    }

    const response = await fetch(
      `${EXTERNAL_API_BASE}/user/wallet-balances?wallet_address=${walletAddress}&chain=${chain}`
    ).then((res) => res.json());

    // The API returns { result: ..., message: ... } structure
    const data = response.result;

    // Serialize any BigInt values to strings
    const serializedData = serializeData(data);

    return NextResponse.json(serializedData);
  } catch (error: any) {
    console.error("Error fetching wallet balances:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch wallet balances" },
      { status: error.response?.status || 500 }
    );
  }
}
