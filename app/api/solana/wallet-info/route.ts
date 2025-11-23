import { NextRequest, NextResponse } from "next/server";

// Public Solana RPC endpoint. In production, prefer a dedicated RPC for reliability.
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
// Canonical USDC mint on Solana mainnet
const USDC_MINT = process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    // 1) Fetch SOL balance (lamports)
    const balanceRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [address],
      }),
      // 10s timeout safeguard
      signal: AbortSignal.timeout(10000),
    });
    const balanceJson = await balanceRes.json();
    const lamports: number = balanceJson?.result?.value ?? 0;
    const balanceSol = lamports / 1_000_000_000;

    // 2) Check for USDC ATA existence via getTokenAccountsByOwner filtered by mint
    const tokenAccountsRes = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { mint: USDC_MINT },
          { encoding: "jsonParsed" },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    const tokenAccountsJson = await tokenAccountsRes.json();
    const hasUsdcAta = Array.isArray(tokenAccountsJson?.result?.value)
      ? tokenAccountsJson.result.value.length > 0
      : false;

    return NextResponse.json({ balanceSol, hasUsdcAta });
  } catch (error: any) {
    console.error("Solana wallet info error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Solana wallet info" },
      { status: 500 }
    );
  }
}


