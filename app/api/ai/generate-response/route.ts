import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_API_BASE = process.env.NEXT_PUBLIC_CREDBUZZ_API_URL;

export async function POST(request: NextRequest) {
  try {
    const { userPrompt, curatedContent, stream = true, taskType } = await request.json();
    if (!EXTERNAL_API_BASE) {
      return NextResponse.json({ error: 'Backend API URL not configured' }, { status: 500 });
    }

    // Get authorization header from the incoming request
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Use explicit taskType if provided, otherwise infer from userPrompt
    const normalizedType = typeof taskType === 'string' ? taskType.toLowerCase() : undefined;
    
    let isReply = false;
    let isQuoteTweet = false;
    let isTweet = false;
    
    if (normalizedType) {
      // Use explicit taskType - ignore prompt heuristics
      isReply = normalizedType === 'reply';
      isQuoteTweet = normalizedType === 'quote_tweet';
      isTweet = normalizedType === 'tweet';
    } else {
      // Fallback to prompt heuristics only if taskType not provided
      const promptLower = userPrompt.toLowerCase();
      isReply = promptLower.includes('reply') || promptLower.includes('replying');
      isQuoteTweet = promptLower.includes('quote tweet') || promptLower.includes('quote_tweet') || promptLower.includes('quoting');
      isTweet = !isReply && !isQuoteTweet;
    }
    
    // Build context section conditionally
    let contextSection = `Project: ${curatedContent.token_name || 'Unknown Project'}`;
    
    // Only include guidelines if they exist and are meaningful
    if (curatedContent.one_line_description && curatedContent.one_line_description.trim() && curatedContent.one_line_description !== 'No task guidelines provided') {
      contextSection += `\nTask Guidelines: ${curatedContent.one_line_description.trim()}`;
    }
    
    // Add research data if available (excluding empty/null values)
    const hasResearchData = curatedContent && Object.keys(curatedContent).length > 0 && 
      (curatedContent.token_name || curatedContent.one_line_description || curatedContent.narratives || curatedContent.market_analysis);
    
    if (hasResearchData) {
      contextSection += `\n\nResearch Data: ${JSON.stringify(curatedContent, null, 2)}`;
    }

    // Build task-specific instructions
    let taskInstructions = '';
    if (isReply) {
      taskInstructions = `TASK TYPE: REPLY
- You are writing a reply to an original tweet (provided in the user prompt)
- Directly address the points made in the original tweet in a natural, conversational way
- Engage with the original tweet's content, add your perspective, ask questions, or provide insights
- Keep it conversational and relevant to what was said in the original tweet
- Do NOT repeat the original tweet's content - add new value`;
    } else if (isQuoteTweet) {
      taskInstructions = `TASK TYPE: QUOTE TWEET
- You are writing a quote tweet that adds commentary to an original tweet (provided in the user prompt)
- Provide analysis, commentary, or thoughts that complement the original tweet
- Add your unique perspective or insight about the topic
- Make it clear why you're sharing this tweet with your added commentary
- Do NOT just summarize the original tweet - add meaningful commentary`;
    } else {
      taskInstructions = `TASK TYPE: TWEET
- You are writing a fresh, standalone tweet
- Share your thoughts, insights, or observations about the project
- Make it engaging and valuable to your audience
- This is not a reply or quote - it's your original content`;
    }

    // Build the system prompt
    const systemPrompt = `You are an experienced crypto analyst and content writer. Create natural, human-like content based on this context:

${contextSection}

${taskInstructions}

CRITICAL WRITING RULES:
- Keep the response length to 280 characters or less (this is a hard limit)
- Write in a conversational, natural tone as if explaining to a knowledgeable friend
- NEVER mention missing information (e.g., don't say "without specific guidelines" or "no information available" or "it's tough to pinpoint")
- Write as if you have all the context you need - focus on what IS available, not what's missing
- If guidelines aren't provided, simply write based on the project information available - don't comment on their absence
- Depending on the task requirements, you may need to mention the project's twitter handle, cashtag, or hashtag naturally within the content
- Don't use emojis unless they add significant value (max 1 emoji)
- Write in flowing, natural sentences - avoid bullet points unless absolutely necessary
- Avoid overly promotional or "salesy" language
- Don't use phrases like "revolutionary," "game-changing," "to the moon"
- Use casual but professional language with crypto Twitter jargon and slang
- You can use occasional typos or casual spelling to sound more human (but don't overdo it)
- Do NOT add hashtags at the end unless explicitly required by the task
- Make it sound like genuine human insight, not AI-generated content
- Start directly with your content - no greetings like "Hey" or "So"
- When mentioning Twitter handles, do it naturally within context (e.g., "The team at @projecthandle recently..." or "Worth following @projecthandle for updates...")
- Focus on authentic observations and thoughts about the project based on available information

FORMATTING RULES (IMPORTANT):
- Output plain text only (no quotes around the whole text, no markdown/code blocks).
- Prefer 1–2 short lines separated by a single newline (\n) when you have two distinct ideas; otherwise use a single line.
- Keep sentences short (12–22 words), avoid run‑ons; end with proper punctuation.
- Use standard ASCII quotes (' and ") only. Do not use smart quotes or ellipses.
- Never add extra spaces; no trailing spaces; do not break a sentence in the middle with a newline.
- Weave any handle/hashtag/cashtag naturally into the sentence; never stack them at the end.
- For replies/quotes: first line = key point; optional second line = crisp takeaway.

CRYPTO TWITTER STYLE (USE WHEN NATURAL):
- You may use common CT slang/abbreviations without explaining them (sparingly): AMA, ATH, BTD/BTFD, CT, dApp, DeFi, DEX, DYOR, FOMO, FUD, GM, GMI, HODL, IYKYK, KYC, LFG, NGMI, NFA, PFP, SAFU, WAGMI.
- Keep slang authentic and minimal: 0–2 such terms per tweet; prioritize clarity over jargon.
- If the sentence implies advice/opinion on price or investing, append "NFA" inline (not at the end as a tag), e.g., "Looks early—NFA."
- Tone should feel like CT (concise, punchy, confident) without becoming shill-y.
`;

    // Format request body as shown in curl example
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nUser Request: ${userPrompt}`
            }
          ]
        }
      ]
    };

    const streamParam = stream ? 'true' : 'false';
    const response = await fetch(`${EXTERNAL_API_BASE}/ai/generate-response?stream=${streamParam}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend API error response:', errorText);
      throw new Error(`Backend API error: ${response.status} - ${errorText}`);
    }

    // Handle non-streaming response
    if (!stream) {
      const data = await response.json();
      
      // Extract content from response - check actual backend response structure
      let content = '';
      if (data.result?.text) {
        // Backend returns: { result: { text: "...", full_response: "..." } }
        content = data.result.text;
      } else if (data.result?.full_response) {
        content = data.result.full_response;
      } else if (data.content) {
        content = typeof data.content === 'string' ? data.content : data.content.text || '';
      } else if (data.text) {
        content = data.text;
      } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        content = data.candidates[0].content.parts[0].text;
      }
      
      return NextResponse.json({ content: content || 'No content generated' });
    }

    // Handle streaming response (Server-Sent Events format)
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    // Create a readable stream for the client
    const clientStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
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
            buffer += decodedChunk;
            
            // Parse JSON lines (backend streams JSON objects separated by newlines)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              
              // Handle Server-Sent Events format: strip "data: " prefix
              let jsonLine = line.trim();
              if (jsonLine.startsWith('data: ')) {
                jsonLine = jsonLine.substring(6); // Remove "data: " prefix
              }
              
              if (!jsonLine) continue;
              
              try {
                const jsonData = JSON.parse(jsonLine);
                
                // Check if this is the done marker
                if (jsonData.done === true) {
                  // Send final content
                  if (fullContent.trim()) {
                    controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
                      content: fullContent.trim(),
                      isComplete: true 
                    }) + '\n'));
                  }
                  continue;
                }
                
                // Extract text from SSE format: {"text": "..."}
                let chunkText = '';
                
                // Path 1: direct text property (SSE format)
                if (jsonData.text) {
                  chunkText = jsonData.text;
                  fullContent += chunkText; // Append incrementally
                }
                // Path 2: candidates[0].content.parts[0].text (full content update)
                else if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
                  chunkText = jsonData.candidates[0].content.parts[0].text;
                  fullContent = chunkText; // Full replacement
                }
                // Path 3: candidates[0].content.parts (array of parts)
                else if (jsonData.candidates?.[0]?.content?.parts) {
                  const parts = jsonData.candidates[0].content.parts;
                  for (const part of parts) {
                    if (part.text) {
                      chunkText += part.text;
                    }
                  }
                  if (chunkText) {
                    fullContent = chunkText; // Full replacement
                  }
                }
                // Path 4: delta text (incremental)
                else if (jsonData.candidates?.[0]?.delta?.text) {
                  chunkText = jsonData.candidates[0].delta.text;
                  fullContent += chunkText; // Append
                }
                // Path 5: content property directly
                else if (jsonData.content) {
                  chunkText = typeof jsonData.content === 'string' ? jsonData.content : jsonData.content.text || '';
                  if (chunkText) {
                    fullContent = chunkText; // Full replacement
                  }
                }
                
                // Stream incremental updates to client for typewriter effect
                if (chunkText) {
                  // Stream incremental updates to client
                  controller.enqueue(new TextEncoder().encode(JSON.stringify({ 
                    content: fullContent,
                    isComplete: false 
                  }) + '\n'));
                }
              } catch (parseError) {
                console.warn('⚠️ Failed to parse chunk:', jsonLine.substring(0, 100), parseError);
              }
            }
          }
        } catch (streamError) {
          console.error('❌ Stream error:', streamError);
          controller.error(streamError);
        }
      }
    });

    return new Response(clientStream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('❌ Backend AI API error:', error);
    return NextResponse.json({ 
      error: 'Generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

