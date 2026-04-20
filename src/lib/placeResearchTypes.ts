export type PlaceResearchProduct = { name: string; why: string };
export type PlaceResearchFoundation = { name: string; why: string; url: string };
export type PlaceResearchNewsSnippet = { title: string; url: string };

/** Short awareness brief: local problem + short/long steps + buys + giving. */
export type PlaceResearchPayload = {
  source: "openai" | "gemini" | "fallback";
  localProblem: string;
  problemContext: string;
  shortTerm: string[];
  longTerm: string[];
  productIdeas: PlaceResearchProduct[];
  foundations: PlaceResearchFoundation[];
  disclaimer: string;
  /** Present when OpenAI web search returned citations (max ~4). */
  newsSnippets?: PlaceResearchNewsSnippet[];
};
