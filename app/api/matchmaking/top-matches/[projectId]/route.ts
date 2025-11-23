import { NextRequest, NextResponse } from 'next/server'

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_TRENDSAGE_API_URL || process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || 'https://api.dopamyn.fun'

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const { searchParams } = request.nextUrl

  try {
    // Forward all query parameters to the external API
    const queryString = searchParams.toString()
    const url = `${EXTERNAL_API_BASE}/matchmaking/top-matches/${projectId}${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000), // Slightly longer timeout for this endpoint
    })

    if (response.ok) {
      const result = await response.json()
      // The API returns { result: {...}, message: "..." } or { data: {...}, message: "..." }
      return NextResponse.json(result)
    } else {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`Failed to fetch matchmaking results for project ${projectId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch matchmaking results', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
} 