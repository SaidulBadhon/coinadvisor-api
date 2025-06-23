import { tool } from "ai";
import { z } from "zod";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export const webSearch = tool({
  description: "Search the web for current information and recent events. Use this when you need up-to-date information that might not be in your training data.",
  parameters: z.object({
    query: z.string().describe("The search query to find relevant information"),
    count: z.number().optional().default(5).describe("Number of search results to return (1-10)"),
  }),
  execute: async ({ query, count = 5 }) => {
    try {
      if (!BRAVE_API_KEY) {
        return {
          success: false,
          error: "Web search is not configured. Please contact support.",
          results: [],
        };
      }

      const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(count, 10)}&summary=1`;
      
      const response = await fetch(searchUrl, {
        headers: {
          "x-subscription-token": BRAVE_API_KEY,
          "accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Search API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Format the search results for better readability
      const formattedResults = data.web?.results?.map((result: any) => ({
        title: result.title,
        description: result.description,
        url: result.url,
        published: result.age,
      })) || [];

      return {
        success: true,
        query,
        results: formattedResults,
        summary: data.summarizer?.key || null,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Web search error:", error);
      return {
        success: false,
        error: error.message || "Failed to perform web search",
        results: [],
      };
    }
  },
});
