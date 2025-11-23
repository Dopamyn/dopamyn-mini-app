import { NextRequest, NextResponse } from 'next/server';
import { encryptHandleCompact } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text parameter is required and must be a string' },
        { status: 400 }
      );
    }

    const encryptedText = encryptHandleCompact(text);
    
    return NextResponse.json({ encryptedText });
  } catch (error) {
    console.error('Encryption API error:', error);
    return NextResponse.json(
      { error: 'Failed to encrypt text' },
      { status: 500 }
    );
  }
}
