// Comprehensive prompt library for content generation
// Each task type has 40-50 unique prompts that are randomly selected per session

export const TWEET_PROMPTS = [
  "Write an engaging tweet that shows genuine interest and adds value to the conversation.",
  "Share your thoughts on what makes this account interesting and worth following.",
  "Create a tweet that highlights something specific that caught your attention.",
  "Share what caught your attention and why others should pay attention.",
  "Write about a real-world problem or topic that matters to you.",
  "Explain what you find valuable in simple terms.",
  "Share your perspective on what makes this content or account innovative or interesting.",
  "Discuss why this stands out and what differentiates it.",
  "Write about what gives you confidence in following or engaging with this account.",
  "Share your thoughts on who would find this valuable and why.",
  "Explain what you understand about the topic and why it matters.",
  "Discuss what upcoming developments or content you're looking forward to.",
  "Compare this to similar accounts or approaches and why this makes sense.",
  "Talk about the connections or relationships that make this interesting.",
  "Share your thoughts on the community around this and how it might grow.",
  "Describe the approach being taken and why you think it's smart.",
  "Look at what trends you're seeing and how this fits in.",
  "Discuss how challenges are being handled and what that means.",
  "Talk about the growth strategy and whether you think it will work.",
  "Share your thoughts on what matters in today's landscape.",
  "Write about what real problem or topic this addresses and why that matters.",
  "Explain what makes this technically or creatively interesting.",
  "Share your thoughts on how this compares to similar accounts you've been following.",
  "Give an honest assessment of what you find compelling and what questions you have.",
  "Break down what you understand and what it means for those interested.",
  "Write a tweet that captures the essence of why this caught your attention.",
  "Share insights about who would benefit most from following or engaging.",
  "Discuss what gives this an edge or makes it unique.",
  "Write about the vision you see and where you think this is heading.",
  "Share your perspective on how accessible this is for newcomers.",
  "Explain what makes the approach sustainable and how it creates value.",
  "Discuss what security or quality measures matter to you.",
  "Write about the community engagement and how active supporters are.",
  "Share thoughts on transparency and communication with the community.",
  "Explain why this matters in the broader context.",
  "Discuss the potential impact this could have.",
  "Write about what excites you most about the future potential.",
  "Share your perspective on the approach to innovation and staying ahead of trends.",
  "Explain how this addresses a gap you've noticed.",
  "Discuss the approach to growth and engagement strategy.",
  "Write about the commitment to long-term value creation.",
  "Share insights on how this fits into the evolving landscape.",
  "Explain what makes this approach unique compared to alternatives.",
  "Discuss the track record and what it tells you about execution ability.",
  "Write about the vision for the future and how it aligns with trends.",
  "Share your thoughts on the approach to building sustainable value.",
  "Explain why this deserves attention from those interested.",
  "Discuss what makes the community special and engaged.",
  "Write about the potential to create meaningful change or impact.",
  "Share your perspective on why this is positioned well for long-term success.",
  "Write about what resonates with you and why you're sharing this.",
];

export const REPLY_PROMPTS = [
  "Write a thoughtful reply that adds meaningful context or insight to the conversation.",
  "Share your perspective in a way that engages constructively with the original post.",
  "Add a valuable point that builds on what was said in the original tweet.",
  "Ask a thoughtful question that deepens the conversation.",
  "Share a related experience or insight that complements the original post.",
  "Provide additional context or information that adds value to the discussion.",
  "Express agreement while adding your own unique perspective or nuance.",
  "Offer a different angle or viewpoint that enriches the conversation.",
  "Share a relevant example or case study that supports or expands on the point.",
  "Ask for clarification on an interesting point that caught your attention.",
  "Add a practical tip or actionable insight related to the topic.",
  "Share your thoughts on why this point matters and what implications it has.",
  "Connect this to a broader trend or pattern you've noticed.",
  "Express genuine interest and ask a follow-up question that shows engagement.",
  "Share a counterpoint or alternative perspective in a respectful way.",
  "Add context from your own experience that relates to the topic.",
  "Highlight an aspect of the post that you found particularly insightful.",
  "Share a resource or reference that others might find helpful.",
  "Express appreciation for the post while adding your own thoughts.",
  "Build on the original idea with a related concept or application.",
  "Share what resonated with you and why it matters.",
  "Add a practical example that illustrates the point being made.",
  "Ask about the implications or next steps related to the topic.",
  "Share your perspective on how this relates to current market conditions.",
  "Express curiosity about a specific aspect mentioned in the post.",
  "Add nuance to the discussion by sharing a related consideration.",
  "Share what you've learned from similar situations or experiences.",
  "Connect this post to a larger trend or movement you've been following.",
  "Express agreement and share why this perspective matters.",
  "Add a thought-provoking question that encourages further discussion.",
  "Share your take on the practical implications of what was shared.",
  "Express interest in learning more about a specific aspect mentioned.",
  "Add context about how this fits into the broader industry landscape.",
  "Share a related insight that complements the original point.",
  "Express appreciation for the perspective while adding your own angle.",
  "Ask about the reasoning behind a specific point that interests you.",
  "Share what you find compelling about this perspective.",
  "Add a practical consideration that others might find useful.",
  "Express curiosity about how this applies in different contexts.",
  "Share your thoughts on why this matters for the community.",
  "Add a related point that expands on the original idea.",
  "Express interest in the topic and share what you'd like to learn more about.",
  "Share a perspective that adds depth to the conversation.",
  "Add context about how this relates to your own experience.",
  "Express agreement while highlighting an aspect that particularly resonates.",
  "Share a question that could lead to interesting follow-up discussion.",
  "Add your perspective on what makes this point valuable or important.",
  "Express curiosity about the implications of what was shared.",
  "Share a related insight that others might find interesting.",
  "Add context that helps others understand why this matters.",
];

export const QUOTE_TWEET_PROMPTS = [
  "Quote tweet with your analysis or thoughts on why this post is worth sharing.",
  "Add your perspective to this post and explain what makes it relevant or interesting.",
  "Share your thoughts on why this post matters and what insights it provides.",
  "Add commentary that explains why you're sharing this and what caught your attention.",
  "Provide analysis that adds value to the original post and helps others understand its significance.",
  "Share your perspective on the implications of what was shared in this post.",
  "Add context that helps others understand why this post is relevant right now.",
  "Explain what makes this post insightful and worth amplifying to your audience.",
  "Share your take on the key points and why they matter for the community.",
  "Add commentary that connects this post to broader trends or patterns you've noticed.",
  "Provide your perspective on what makes this post valuable or thought-provoking.",
  "Share analysis that helps others understand the significance of what was shared.",
  "Add your thoughts on why this perspective matters and what it means for the industry.",
  "Explain what caught your attention and why you think others should see this.",
  "Share your perspective on how this post relates to current market conditions or trends.",
  "Add commentary that expands on the original point with your own insights.",
  "Provide context that helps others understand why this post is worth their attention.",
  "Share your analysis of what makes this post particularly relevant or timely.",
  "Add your perspective on the implications of what was shared.",
  "Explain why you're sharing this and what value it adds to the conversation.",
  "Share your thoughts on how this post fits into the broader industry narrative.",
  "Add commentary that highlights what you find most compelling about this post.",
  "Provide your perspective on why this post deserves attention from the community.",
  "Share analysis that helps others understand the practical implications.",
  "Add your thoughts on what makes this post stand out from similar content.",
  "Explain why this perspective matters and what it means for those following the space.",
  "Share your take on the key insights and why they're valuable.",
  "Add commentary that connects this to your own observations or experiences.",
  "Provide context about why this post is relevant for your audience.",
  "Share your perspective on what makes this post worth sharing with others.",
  "Add your analysis of the implications and what they mean for the future.",
  "Explain what caught your attention and why you think it's important.",
  "Share your thoughts on how this post relates to ongoing discussions in the space.",
  "Add commentary that helps others understand why this perspective matters.",
  "Provide your perspective on what makes this post particularly insightful.",
  "Share analysis that expands on the original point with additional context.",
  "Add your thoughts on why this post is timely and relevant right now.",
  "Explain what value this post adds to the conversation and why you're sharing it.",
  "Share your perspective on the key takeaways and why they matter.",
  "Add commentary that highlights what you find most interesting about this post.",
  "Provide context that helps others understand the significance of what was shared.",
  "Share your analysis of what makes this post worth amplifying.",
  "Add your thoughts on how this post contributes to the broader discussion.",
  "Explain why this perspective is valuable and what it means for the community.",
  "Share your take on the implications and why they're worth paying attention to.",
  "Add commentary that connects this post to trends or patterns you've observed.",
  "Provide your perspective on what makes this post particularly relevant.",
  "Share analysis that helps others understand why this matters.",
  "Add your thoughts on what caught your attention and why you're sharing it.",
  "Explain what makes this post insightful and worth spreading to your audience.",
];

// Utility function to shuffle an array (Fisher-Yates algorithm)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get randomized prompts for a specific task type
export function getRandomizedPrompts(
  taskType: "tweet" | "reply" | "quote_tweet",
  count: number = 4
): string[] {
  let allPrompts: string[] = [];
  
  switch (taskType) {
    case "tweet":
      allPrompts = TWEET_PROMPTS;
      break;
    case "reply":
      allPrompts = REPLY_PROMPTS;
      break;
    case "quote_tweet":
      allPrompts = QUOTE_TWEET_PROMPTS;
      break;
    default:
      allPrompts = TWEET_PROMPTS;
  }
  
  // Shuffle all prompts and return the first 'count' items
  const shuffled = shuffleArray(allPrompts);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

