import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_API_BASE = 
  process.env.NEXT_PUBLIC_TRENDSAGE_API_URL || 
  process.env.NEXT_PUBLIC_CREDBUZZ_API_URL || 
  'https://api.dopamyn.fun';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, researchData } = body;

    if (!prompt || !researchData) {
      return NextResponse.json(
        { error: 'Prompt and research data are required' },
        { status: 400 }
      );
    }
    
    try {
      // Forward the request to the external API
      const response = await fetch(`${EXTERNAL_API_BASE}/research-hub/generate-content`, {
        method: 'POST',
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000), // Longer timeout for AI generation
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      } else if (response.status === 404) {
        // External API endpoint doesn't exist yet, use fallback
        throw new Error('External API not available');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
    } catch (apiError) {
      // Fallback to structured content generation
      console.log('Using fallback content generation:', apiError);
      const generatedContent = generateStructuredContent(prompt, researchData);
      return NextResponse.json({
        content: generatedContent,
        wordCount: generatedContent.split(' ').length,
      });
    }
  } catch (error) {
    console.error('Failed to generate content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateStructuredContent(prompt: string, researchData: any): string {
  const {
    projectName,
    description,
    competitive_advantage,
    market_analysis,
    core_technology,
    narratives,
  } = researchData;

  // Create a structured 300-word response based on the prompt and research data
  let content = '';

  // Analyze the prompt to determine the focus
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('investment') || promptLower.includes('thesis') || promptLower.includes('buy')) {
    content = `🔍 Investment Analysis: ${projectName}

${description}

💡 Key Investment Highlights:

🚀 Market Opportunity
${market_analysis?.tam ? `The total addressable market reaches ${market_analysis.tam}, indicating massive growth potential.` : 'Significant market opportunity in emerging sectors.'} ${projectName} targets ${market_analysis?.target_audience || 'key market segments'} with a differentiated approach.

⚔️ Competitive Edge
${competitive_advantage?.technological_edge ? competitive_advantage.technological_edge.substring(0, 200) + '...' : 'Strong technological foundations set this project apart.'}

🔧 Technical Innovation
${core_technology?.analytics_infrastructure ? core_technology.analytics_infrastructure.substring(0, 180) + '...' : 'Built on robust technical infrastructure designed for scale.'}

📊 Market Position
${competitive_advantage?.market_positioning_and_strategy ? competitive_advantage.market_positioning_and_strategy.substring(0, 150) + '...' : 'Well-positioned in the competitive landscape.'}

🎯 Conclusion
With strong fundamentals across ${narratives?.slice(0, 3).join(', ') || 'multiple sectors'}, ${projectName} presents a compelling investment opportunity for those seeking exposure to next-generation blockchain infrastructure.

#${projectName?.replace(/\s+/g, '')} #Crypto #Investment #Blockchain`;

  } else if (promptLower.includes('technical') || promptLower.includes('technology') || promptLower.includes('how')) {
    content = `⚙️ Technical Deep Dive: ${projectName}

${description}

🔧 Core Technology Stack:

${core_technology?.analytics_infrastructure || 'Advanced technical architecture designed for scalability and performance.'}

💻 Key Features:
${core_technology?.core_features ? 
  core_technology.core_features.slice(0, 3).map((feature: any) => 
    `• ${feature.name}: ${feature.description.substring(0, 100)}...`
  ).join('\n') : 
  '• Scalable infrastructure\n• Enterprise-grade security\n• High-performance processing'}

🛡️ Security & Trust:
${competitive_advantage?.security_and_trust_features ? competitive_advantage.security_and_trust_features.substring(0, 200) + '...' : 'Built with enterprise-grade security standards and decentralized trust mechanisms.'}

🔄 Innovation Edge:
${competitive_advantage?.technological_edge ? competitive_advantage.technological_edge.substring(0, 180) + '...' : 'Cutting-edge technology stack that addresses current market limitations.'}

🎯 Technical Conclusion:
${projectName} demonstrates strong technical fundamentals with a focus on ${narratives?.slice(0, 2).join(' and ') || 'innovation and scalability'}.

#TechAnalysis #${projectName?.replace(/\s+/g, '')} #Blockchain #Development`;

  } else if (promptLower.includes('compare') || promptLower.includes('versus') || promptLower.includes('competition')) {
    content = `⚖️ Competitive Analysis: ${projectName}

${description}

🏆 Competitive Advantages:

📈 Market Positioning:
${competitive_advantage?.market_positioning_and_strategy || 'Strategically positioned to capture significant market share through innovative approach.'}

🔥 Key Differentiators:
${competitive_advantage?.other_distinct_advantages ? competitive_advantage.other_distinct_advantages.substring(0, 250) + '...' : 'Unique value proposition that sets it apart from traditional solutions.'}

💪 Ecosystem Benefits:
${competitive_advantage?.ecosystem_and_network_effects || 'Strong network effects and ecosystem partnerships drive sustainable competitive advantages.'}

🎯 User Experience:
${competitive_advantage?.usability_and_accessibility || 'Focus on user-friendly design and accessibility compared to complex legacy systems.'}

📊 Market Impact:
Operating in the ${narratives?.slice(0, 3).join(', ') || 'emerging technology'} space, ${projectName} addresses key market gaps that competitors have struggled to solve effectively.

🚀 Conclusion:
${projectName} stands out through its combination of technical innovation, strategic positioning, and strong execution capabilities.

#${projectName?.replace(/\s+/g, '')} #Competitive #Analysis #Crypto`;

  } else {
    // General overview content
    content = `🌟 ${projectName}: ${prompt}

${description}

🔍 Project Overview:
${projectName} operates in the ${narratives?.slice(0, 2).join(' and ') || 'blockchain'} sector${narratives?.length > 2 ? `, with additional focus on ${narratives.slice(2, 4).join(' and ')}` : ''}.

💡 Key Strengths:
• ${competitive_advantage?.technological_edge ? competitive_advantage.technological_edge.substring(0, 120) + '...' : 'Strong technological foundation'}
• ${competitive_advantage?.market_positioning_and_strategy ? competitive_advantage.market_positioning_and_strategy.substring(0, 120) + '...' : 'Strategic market positioning'}
• ${competitive_advantage?.security_and_trust_features ? competitive_advantage.security_and_trust_features.substring(0, 120) + '...' : 'Enterprise-grade security'}

📈 Market Opportunity:
${market_analysis?.market_trends ? market_analysis.market_trends.substring(0, 200) + '...' : 'Positioned to capitalize on growing market trends and emerging opportunities.'}

🎯 Target Market:
${market_analysis?.target_audience || 'Focused on serving key market segments with specialized solutions.'}

🚀 Looking Ahead:
${projectName} is well-positioned to capitalize on the evolving ${narratives?.[0] || 'blockchain'} landscape with its innovative approach and strong fundamentals.

#${projectName?.replace(/\s+/g, '')} #Crypto #Blockchain #Innovation`;
  }

  return content;
}
