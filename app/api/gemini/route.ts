import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, curatedContent } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const systemPrompt = `You are an experienced crypto analyst and content writer. Create natural, human-like content (50-100 words) based on this research data:

Project: ${curatedContent.token_name || 'Unknown Project'}
Description: ${curatedContent.one_line_description || ''}

Research Data: ${JSON.stringify(curatedContent, null, 2)}

Writing Guidelines:
- Write in a conversational, natural tone as if explaining to a knowledgeable friend
- MUST mention the project's official Twitter handle (find it in the research data) at least once in the content
- Use emojis naturally when they add value - don't overdo it but don't be overly restrictive either
- Only use bullet points or short lists if they help organize thoughts clearly
- Write in flowing paragraphs with natural transitions
- Avoid overly promotional or "salesy" language
- Don't use phrases like "revolutionary," "game-changing," "to the moon"
- Focus on factual insights and genuine analysis
- Use casual but professional language
- Do NOT add hashtags at the end
- Make it sound like genuine human insight, not AI-generated content
- Write as if sharing authentic thoughts and observations about the project
- When mentioning the Twitter handle, do it naturally within the context (e.g., "The team at @projecthandle recently..." or "Worth following @projecthandle for updates...")`;

    console.log('🚀 Starting Gemini API request...');
    console.log('📝 User prompt:', userPrompt);
    console.log('🔑 API Key exists:', !!apiKey);

    const requestBody = {
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }] }],
        generationConfig: { 
          temperature: 1, 
          topK: 35, 
          topP: 0.9, 
        maxOutputTokens: 500,
          candidateCount: 1
        },
    };

    console.log('📤 REQUEST BODY BEING SENT TO GOOGLE:');
    console.log(JSON.stringify(requestBody, null, 2));
    console.log('📤 Full prompt text length:', `${systemPrompt}\n\nUser Request: ${userPrompt}`.length);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let rawChunks: string[] = [];

    console.log('📦 Starting to read stream...');

    // Create a readable stream for the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('✅ Stream completed');
              console.log('📊 Final content length:', fullContent.length);
              console.log('📝 Final content:', fullContent);
              console.log('📋 Total raw chunks received:', rawChunks.length);
              console.log('📋 Raw buffer at end:', buffer);
              
              // Log all raw chunks for debugging
              if (rawChunks.length > 0) {
                console.log('📋 All raw chunks:');
                rawChunks.forEach((chunk, idx) => {
                  console.log(`  Chunk ${idx + 1}:`, chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''));
                });
              }
              
              // Send final content if we have any
              if (fullContent.trim()) {
                controller.enqueue(new TextEncoder().encode(JSON.stringify({ content: fullContent.trim() })));
              } else {
                controller.enqueue(new TextEncoder().encode(JSON.stringify({ content: 'No content generated' })));
              }
              controller.close();
              break;
            }

            // Decode the chunk
            const decodedChunk = decoder.decode(value, { stream: true });
            console.log('📥 Raw chunk received (length:', decodedChunk.length, '):', decodedChunk.substring(0, 500) + (decodedChunk.length > 500 ? '...' : ''));
            rawChunks.push(decodedChunk);
            
            buffer += decodedChunk;
            
            // Parse JSON lines (Gemini streams JSON objects separated by newlines)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            console.log('🔍 Processing', lines.length, 'lines from buffer');
            console.log('🔍 Remaining buffer:', buffer.substring(0, 100));

            for (const line of lines) {
              if (!line.trim()) continue;
              
              console.log('🔍 Processing line:', line.substring(0, 200) + (line.length > 200 ? '...' : ''));
              
              try {
                const jsonData = JSON.parse(line);
                console.log('📦 Received chunk:', JSON.stringify(jsonData, null, 2));
                
                // Gemini streaming format: chunks can have different structures
                // Try multiple paths to extract text
                let chunkText = '';
                
                // Path 1: candidates[0].content.parts[0].text (full content update)
                if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
                  chunkText = jsonData.candidates[0].content.parts[0].text;
                  fullContent = chunkText; // Full replacement
                  console.log('✅ Got full content update');
                }
                // Path 2: candidates[0].content.parts (array of parts)
                else if (jsonData.candidates?.[0]?.content?.parts) {
                  const parts = jsonData.candidates[0].content.parts;
                  for (const part of parts) {
                    if (part.text) {
                      chunkText += part.text;
                    }
                  }
                  if (chunkText) {
                    fullContent = chunkText; // Full replacement
                    console.log('✅ Got content from parts array');
                  }
                }
                // Path 3: delta text (incremental)
                else if (jsonData.candidates?.[0]?.delta?.text) {
                  chunkText = jsonData.candidates[0].delta.text;
                  fullContent += chunkText; // Append
                  console.log('➕ Got delta text, appending');
                }
                // Path 4: direct text property
                else if (jsonData.text) {
                  chunkText = jsonData.text;
                  fullContent += chunkText; // Append
                  console.log('➕ Got direct text, appending');
                }
                // Path 5: Check if there's a finishReason but empty content (might be metadata)
                else if (jsonData.candidates?.[0]?.finishReason) {
                  console.log('ℹ️ Chunk has finishReason:', jsonData.candidates[0].finishReason);
                }
                
                if (chunkText) {
                  console.log('✏️ Content chunk:', chunkText.substring(0, 50) + (chunkText.length > 50 ? '...' : ''));
                  console.log('✏️ Accumulated content so far:', fullContent.substring(0, 100) + (fullContent.length > 100 ? '...' : ''));
                  
                  // Stream incremental updates to client
                  controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
                    content: fullContent,
                    isComplete: false 
                  }) + '\n'));
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse chunk:', line.substring(0, 100), parseError);
              }
            }
          }
        } catch (streamError) {
          console.error('❌ Stream error:', streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return NextResponse.json({ 
      error: 'Generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
