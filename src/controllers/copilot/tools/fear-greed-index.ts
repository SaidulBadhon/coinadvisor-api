import { tool } from "ai";
import { z } from "zod";
import { getFearGreedIndex } from "../../../fearGreedIndex";

export const getFearGreedIndexTool = tool({
  description: "Get Fear & Greed Index",
  parameters: z.object({
    limit: z.number(),
  }),
  execute: async ({ limit }) => {
    const fearGreedData = await getFearGreedIndex(limit);
    console.log("fearGreedData", fearGreedData);

    return fearGreedData;
  },
});
