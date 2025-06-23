import { tool } from "ai";
import { z } from "zod";
import { getUserPortfolios } from "../../../portfolio";

export const getPortfolioTool = tool({
  description: "Get user's portfolios with userId. userId is required.",
  parameters: z.object({
    userId: z.string().min(1, "userId cannot be empty"),
  }),
  execute: async ({ userId }) => {
    if (!userId || userId.trim() === "" || userId === "user123") {
      return {
        error: "userId is required. Please provide a valid userId.",
      };
    }

    console.log("========> getPortfolioTool", userId);
    const portfolios = await getUserPortfolios(userId);

    console.log("portfolios", portfolios);

    return portfolios;
  },
});
