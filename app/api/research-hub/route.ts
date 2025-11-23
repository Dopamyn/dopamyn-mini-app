import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json(
      { error: 'Handle parameter is required' },
      { status: 400 }
    );
  }

  // Get API credentials from environment variables
  const apiKey = process.env.API_KEY;
  const authToken = process.env.X_ALPHA_AUTH_TOKEN;

  console.log('Environment check:', {
    apiKeyExists: !!apiKey,
    authTokenExists: !!authToken,
    apiKeyLength: apiKey?.length || 0,
    authTokenLength: authToken?.length || 0,
  });

  if (!apiKey || !authToken) {
    console.error('Missing X-Alpha API credentials:', {
      apiKey: apiKey ? 'Present' : 'Missing',
      authToken: authToken ? 'Present' : 'Missing',
    });
    return NextResponse.json(
      { 
        error: 'API credentials not configured',
        details: {
          apiKey: apiKey ? 'Present' : 'Missing',
          authToken: authToken ? 'Present' : 'Missing',
        }
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.x-alpha.ai/token/curated-analysis?handle=${handle}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Authorization': authToken, // JWT token
          'api-key': apiKey,
          'Referer': 'https://dopamyn.fun/',
          'source': 'web app',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok) {
      console.error(`X-Alpha API responded with status ${response.status}`);
      return NextResponse.json(
        { error: `API request failed with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Return the data with CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching X-Alpha analysis:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      handle,
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch analysis data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
