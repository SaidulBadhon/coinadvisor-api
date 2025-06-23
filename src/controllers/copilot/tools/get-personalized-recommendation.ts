import { tool, generateText } from "ai";
import { z } from "zod";
import { computeRiskProfile, suggestPortfolio } from "../../../finance";
import { getMarketData } from "../../../marketData";
import { openai } from "@ai-sdk/openai";

export const getPersonalizedRecommendationTool = tool({
  description:
    "Get a personalized crypto investment recommendation based on risk profile, capital, and selected assets.",
  parameters: z.object({
    answers: z.object({
      investmentHorizonYears: z.number(),
      maxDrawdownTolerancePct: z.number(),
      primaryGoal: z.enum(["growth", "income", "preservation"]),
    }),
    startingCapital: z.number(),
    symbols: z.array(z.string()),
  }),
  execute: async ({ answers, startingCapital, symbols }) => {
    const profile = computeRiskProfile(answers);
    const { latest, history } = await getMarketData(symbols);
    const allocations = suggestPortfolio(profile, startingCapital);

    const system =
      `You are CryptoFinAdvisor, a personalized crypto investment assistant. ` +
      `Use the profile, live market data, and allocations to write a concise summary of the user’s risk profile, ` +
      `an asset allocation plan (symbol, %, rationale), and a 2–3 sentence justification per asset based on current price & on-chain metrics. ` +
      `Always include a risk disclaimer.`;

    const user = JSON.stringify(
      { profile, startingCapital, latest, history, allocations },
      null,
      2
    );

    const { text } = await generateText({
      //   model: "gpt-4",
      model: openai("gpt-4.1-nano"),
      temperature: 1,
      maxSteps: 3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    return text || "";
  },
});
