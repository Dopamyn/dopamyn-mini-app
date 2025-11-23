import { NextRequest, NextResponse } from 'next/server';
import { getCashtagLeaderboard } from '@/lib/cashtag';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters from query string
    const start = searchParams.get('start');
    const limit = searchParams.get('limit');
    const requestedDataParam = searchParams.get('requestedData');
    
    if (!start || !limit) {
      return NextResponse.json(
        { error: 'start and limit parameters are required' },
        { status: 400 }
      );
    }

    let requestedData;
    try {
      requestedData = requestedDataParam ? JSON.parse(requestedDataParam) : {};
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid requestedData JSON format' },
        { status: 400 }
      );
    }

    const params = {
      requestedData,
      start: parseInt(start),
      limit: parseInt(limit),
    };

    const data = await getCashtagLeaderboard(params);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cashtag leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
