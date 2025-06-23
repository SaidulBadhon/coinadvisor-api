import { tool } from "ai";
import { z } from "zod";
import { createPortfolio } from "../../../portfolio";

export const addPortfolioTool = tool({
  description:
    "Create a new investment portfolio for a specific user. Requires a valid userId, portfolio name, risk profile (category and score), and an initial capital amount.",
  parameters: z.object({
    userId: z.string().min(1, "userId cannot be empty"),
    name: z.string().min(1, "name cannot be empty"),
    riskProfile: z.object({
      category: z.enum(["Conservative", "Moderate", "Aggressive"]),
      score: z.number(),
    }),
    initialCapital: z.number().min(0, "initialCapital cannot be negative"),
  }),
  execute: async ({ userId, name, riskProfile, initialCapital }) => {
    if (!userId || userId.trim() === "" || userId === "user123") {
      return {
        error: "userId is required. Please provide a valid userId.",
      };
    }

    const portfolio = await createPortfolio(
      userId,
      name,
      riskProfile,
      initialCapital
    );

    console.log("portfolios", portfolio);

    return portfolio;
  },
});
