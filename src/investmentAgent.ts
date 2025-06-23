import OpenAI from "openai";
import { RiskAnswers, computeRiskProfile, suggestPortfolio } from "./finance";
import { getMarketData } from "./marketData";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getPersonalizedRecommendation(
  answers: RiskAnswers,
  startingCapital: number,
  symbols: string[]
): Promise<string> {
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

  const resp = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 600,
  });

  return resp.choices[0].message.content || "";
}
