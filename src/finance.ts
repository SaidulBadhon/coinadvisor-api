import { z } from "zod";

export type RiskAnswers = {
  investmentHorizonYears: number;
  maxDrawdownTolerancePct: number;
  primaryGoal: "growth" | "income" | "preservation";
};

export type RiskProfile =
  | { category: "Conservative"; score: number }
  | { category: "Moderate"; score: number }
  | { category: "Aggressive"; score: number };

export function computeRiskProfile(ans: RiskAnswers): RiskProfile {
  const hScore = Math.min(Math.floor(ans.investmentHorizonYears / 5), 3);
  const dScore = Math.min(Math.floor(ans.maxDrawdownTolerancePct / 10), 3);
  const gScore =
    ans.primaryGoal === "growth" ? 1 : ans.primaryGoal === "income" ? 0 : -1;
  const total = hScore + dScore + gScore;

  if (total <= 2) return { category: "Conservative", score: total };
  if (total <= 5) return { category: "Moderate", score: total };
  return { category: "Aggressive", score: total };
}

export type Allocation = {
  symbol: string;
  percentage: number;
  rationale: string;
};

export function suggestPortfolio(
  profile: RiskProfile,
  startingCapital: number
): Array<Allocation & { amount: number }> {
  const base: Record<string, Allocation[]> = {
    Conservative: [
      { symbol: "BTC", percentage: 30, rationale: "store-of-value anchor" },
      { symbol: "ETH", percentage: 20, rationale: "blue-chip smart contract" },
      {
        symbol: "USDC",
        percentage: 50,
        rationale: "stablecoin for preservation",
      },
    ],
    Moderate: [
      { symbol: "BTC", percentage: 25, rationale: "core growth engine" },
      { symbol: "ETH", percentage: 25, rationale: "smart contract exposure" },
      { symbol: "ADA", percentage: 10, rationale: "mid-cap alt exposure" },
      { symbol: "MATIC", percentage: 10, rationale: "layer-2 growth play" },
      {
        symbol: "USDC",
        percentage: 30,
        rationale: "dry powder for rebalancing",
      },
    ],
    Aggressive: [
      { symbol: "BTC", percentage: 20, rationale: "blue-chip growth" },
      { symbol: "ETH", percentage: 20, rationale: "DeFi/DAO exposure" },
      {
        symbol: "SOL",
        percentage: 15,
        rationale: "high-growth smart contracts",
      },
      { symbol: "DOT", percentage: 10, rationale: "interoperability bets" },
      { symbol: "AVAX", percentage: 10, rationale: "new-chain potential" },
      { symbol: "CAKE", percentage: 5, rationale: "DeFi yield farming" },
      { symbol: "USDC", percentage: 20, rationale: "liquidity buffer" },
    ],
  };

  const allocs = base[profile.category];
  return allocs.map((a) => ({
    ...a,
    percentage: Math.min(a.percentage, 25),
    amount: Number(((startingCapital * a.percentage) / 100).toFixed(2)),
  }));
}
