import { NextRequest, NextResponse } from "next/server";

const sampleSpaces = [
  {
    id: "1",
    name: "DeFi Protocol",
    image: "/placeholder-logo.png",
    followers: 12500,
    active_quests: 33,
    token: "DEFI",
    description: "Decentralized finance protocol for yield farming and staking",
  },
  {
    id: "2",
    name: "NFT Marketplace",
    image: "/placeholder-logo.png",
    followers: 8900,
    active_quests: 27,
    token: "NFTM",
    description: "Cross-chain NFT marketplace with social features",
  },
  {
    id: "3",
    name: "Layer 2 Solution",
    image: "/placeholder-logo.png",
    followers: 15600,
    active_quests: 41,
    token: "L2SOL",
    description: "Scalable layer 2 solution for Ethereum ecosystem",
  },
  {
    id: "4",
    name: "DAO Governance",
    image: "/placeholder-logo.png",
    followers: 7200,
    active_quests: 19,
    token: "DAOG",
    description: "Decentralized autonomous organization platform",
  },
  {
    id: "5",
    name: "Web3 Gaming",
    image: "/placeholder-logo.png",
    followers: 18300,
    active_quests: 52,
    token: "GAME3",
    description: "Play-to-earn gaming platform with NFT integration",
  },
  {
    id: "6",
    name: "Cross-Chain Bridge",
    image: "/placeholder-logo.png",
    followers: 9400,
    active_quests: 28,
    token: "BRIDGE",
    description: "Secure cross-chain bridge for asset transfers",
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = parseInt(searchParams.get("start") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Simulate pagination
    const paginatedSpaces = sampleSpaces.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: paginatedSpaces,
      total: sampleSpaces.length,
      hasMore: start + limit < sampleSpaces.length,
    });
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
