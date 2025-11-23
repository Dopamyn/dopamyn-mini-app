import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { community_name: string } }
) {
  try {
    const { community_name } = params;

    // For now, we'll return mock data based on the community name
    // In a real implementation, this would fetch from a database
    const mockCommunity = {
      id: community_name.toLowerCase().replace(/\s+/g, "-"),
      name:
        community_name.charAt(0).toUpperCase() +
        community_name.slice(1).replace(/-/g, " "),
      image: null, // Will use generated avatar
      followers: Math.floor(Math.random() * 1000000) + 100000,
      active_quests: Math.floor(Math.random() * 20) + 1,
      token: "TGE",
      description:
        "A decentralized super app and web3's largest onchain distribution platform.",
      tags: ["NFT", "Web3", "DID", "Social", "Infrastructure"],
      verified: true,
    };

    return NextResponse.json({
      success: true,
      data: mockCommunity,
    });
  } catch (error) {
    console.error("Error fetching community:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch community" },
      { status: 500 }
    );
  }
}
