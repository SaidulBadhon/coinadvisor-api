import { z } from "zod";
import { RiskProfile, Allocation, suggestPortfolio } from "./finance";
import { SpotPrice, fetchLatestPrice } from "./marketData";
import {
  getFearGreedIndex,
  getEnhancedRebalanceRecommendation,
  FearGreedData,
  RebalanceSignal,
  calculateSentimentAdjustment,
  getRebalanceSignal,
} from "./fearGreedIndex";
import {
  Portfolio,
  PortfolioDocument,
  HoldingDocument,
  PortfolioHistory,
  PortfolioHistoryDocument,
  connectToDatabase,
} from "./database/models";

export type PortfolioData = {
  id: string;
  userId: string;
  name: string;
  riskProfile: RiskProfile;
  holdings: Holding[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
};

export type Holding = {
  symbol: string;
  amount: number;
  currentPrice: number;
  value: number;
  percentage: number;
  targetPercentage: number;
};

export type PortfolioPerformance = {
  totalValue: number;
  totalReturn: number;
  totalReturnPct: number;
  dayChange: number;
  dayChangePct: number;
  holdings: HoldingPerformance[];
  sentimentAnalysis?: {
    fearGreedIndex: FearGreedData;
    signal: RebalanceSignal;
    marketSentiment: string;
  };
};

export type HoldingPerformance = {
  symbol: string;
  value: number;
  dayChange: number;
  dayChangePct: number;
  allocation: number;
  targetAllocation: number;
  rebalanceNeeded: boolean;
};

export type RebalanceRecommendation = {
  portfolioId: string;
  recommendations: {
    symbol: string;
    action: "buy" | "sell";
    amount: number;
    reason: string;
  }[];
  totalRebalanceValue: number;
  sentimentAnalysis?: {
    fearGreedIndex: FearGreedData;
    signal: RebalanceSignal;
    adjustment: {
      adjustment: number;
      reasoning: string;
    };
  };
};

// Helper function to convert MongoDB document to PortfolioData
function toPortfolioData(doc: PortfolioDocument): PortfolioData {
  return {
    id: doc._id?.toString() as string,
    userId: doc.userId,
    name: doc.name,
    riskProfile: doc.riskProfile,
    holdings: doc.holdings,
    totalValue: doc.totalValue,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const CreatePortfolioRequest = z.object({
  userId: z.string(),
  name: z.string(),
  riskProfile: z.object({
    category: z.enum(["Conservative", "Moderate", "Aggressive"]),
    score: z.number(),
  }),
  initialCapital: z.number().min(0),
});

export const UpdateHoldingsRequest = z.object({
  holdings: z.array(
    z.object({
      symbol: z.string(),
      amount: z.number().min(0),
    })
  ),
});

export async function createPortfolio(
  userId: string,
  name: string,
  riskProfile: RiskProfile,
  initialCapital: number
): Promise<PortfolioData> {
  await connectToDatabase();

  // Get suggested allocations based on risk profile
  const allocations = suggestPortfolio(riskProfile, initialCapital);

  // Create initial holdings
  const holdings: HoldingDocument[] = [];
  for (const allocation of allocations) {
    try {
      const priceData = await fetchLatestPrice(allocation.symbol);
      const amount = allocation.amount / priceData.currentPrice;

      holdings.push({
        symbol: allocation.symbol,
        amount: amount,
        currentPrice: priceData.currentPrice,
        value: allocation.amount,
        percentage: allocation.percentage,
        targetPercentage: allocation.percentage,
      });
    } catch (error) {
      console.warn(`Failed to fetch price for ${allocation.symbol}:`, error);
      // Skip this holding if price fetch fails
    }
  }

  const portfolio = new Portfolio({
    userId,
    name,
    riskProfile,
    holdings,
    totalValue: initialCapital,
  });

  const savedPortfolio = await portfolio.save();

  // Create portfolio history entry
  const portfolioHistory = new PortfolioHistory({
    portfolioId: (savedPortfolio._id as string).toString(),
    snapshots: [
      {
        portfolioId: (savedPortfolio._id as string).toString(),
        totalValue: initialCapital,
        holdings: holdings.map((h) => ({
          symbol: h.symbol,
          amount: h.amount,
          price: h.currentPrice,
          value: h.value,
          percentage: h.percentage,
        })),
        timestamp: new Date(),
      },
    ],
  });

  await portfolioHistory.save();

  return toPortfolioData(savedPortfolio);
}

export async function getPortfolio(
  portfolioId: string
): Promise<PortfolioData | null> {
  await connectToDatabase();

  try {
    const portfolio = await Portfolio.findById(portfolioId);
    return portfolio ? toPortfolioData(portfolio) : null;
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return null;
  }
}

export async function getUserPortfolios(
  userId: string
): Promise<PortfolioData[]> {
  await connectToDatabase();

  try {
    const portfolios = await Portfolio.find({ userId }).sort({ createdAt: -1 });
    return portfolios.map(toPortfolioData);
  } catch (error) {
    console.error("Error fetching user portfolios:", error);
    return [];
  }
}

export async function updatePortfolioHoldings(
  portfolioId: string,
  newHoldings: { symbol: string; amount: number }[]
): Promise<PortfolioData | null> {
  await connectToDatabase();

  try {
    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) return null;

    const updatedHoldings: HoldingDocument[] = [];
    let totalValue = 0;

    for (const holding of newHoldings) {
      try {
        const priceData = await fetchLatestPrice(holding.symbol);
        const value = holding.amount * priceData.currentPrice;
        totalValue += value;

        // Find target percentage from original allocation
        const existingHolding = portfolio.holdings.find(
          (h) => h.symbol === holding.symbol
        );
        const targetPercentage = existingHolding?.targetPercentage || 0;

        updatedHoldings.push({
          symbol: holding.symbol,
          amount: holding.amount,
          currentPrice: priceData.currentPrice,
          value,
          percentage: 0, // Will be calculated after total value is known
          targetPercentage,
        });
      } catch (error) {
        console.warn(`Failed to update price for ${holding.symbol}:`, error);
      }
    }

    // Calculate actual percentages
    updatedHoldings.forEach((holding) => {
      holding.percentage =
        totalValue > 0 ? (holding.value / totalValue) * 100 : 0;
    });

    portfolio.holdings = updatedHoldings;
    portfolio.totalValue = totalValue;

    const savedPortfolio = await portfolio.save();

    // Add snapshot to history
    const portfolioHistory = await PortfolioHistory.findOne({ portfolioId });
    if (portfolioHistory) {
      await portfolioHistory.addSnapshot({
        portfolioId,
        totalValue,
        holdings: updatedHoldings.map((h) => ({
          symbol: h.symbol,
          amount: h.amount,
          price: h.currentPrice,
          value: h.value,
          percentage: h.percentage,
        })),
      });
    }

    return toPortfolioData(savedPortfolio);
  } catch (error) {
    console.error("Error updating portfolio holdings:", error);
    return null;
  }
}

export async function getPortfolioPerformance(
  portfolioId: string,
  includeSentimentAnalysis: boolean = true
): Promise<PortfolioPerformance | null> {
  await connectToDatabase();

  try {
    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) return null;

    const holdingPerformances: HoldingPerformance[] = [];
    let totalValue = 0;
    let sentimentAnalysis: PortfolioPerformance["sentimentAnalysis"];

    // Get sentiment analysis if requested
    if (includeSentimentAnalysis) {
      try {
        const fearGreedResponse = await getFearGreedIndex(1);
        const currentSentiment = fearGreedResponse.current;

        sentimentAnalysis = {
          fearGreedIndex: currentSentiment,
          signal: getRebalanceSignal(
            currentSentiment.value,
            portfolio.riskProfile.category
          ),
          marketSentiment: getSentimentDescription(currentSentiment.value),
        };
      } catch (error) {
        console.warn(
          "Failed to fetch sentiment analysis for performance:",
          error
        );
      }
    }

    for (const holding of portfolio.holdings) {
      try {
        const currentPrice = await fetchLatestPrice(holding.symbol);
        const currentValue = holding.amount * currentPrice.currentPrice;
        const dayChange = currentValue - holding.value;
        const dayChangePct =
          holding.value > 0 ? (dayChange / holding.value) * 100 : 0;

        totalValue += currentValue;

        holdingPerformances.push({
          symbol: holding.symbol,
          value: currentValue,
          dayChange,
          dayChangePct,
          allocation: (currentValue / totalValue) * 100,
          targetAllocation: holding.targetPercentage,
          rebalanceNeeded:
            Math.abs(
              (currentValue / totalValue) * 100 - holding.targetPercentage
            ) > 5,
        });
      } catch (error) {
        console.warn(`Failed to get performance for ${holding.symbol}:`, error);
      }
    }

    // Recalculate allocations with actual total value
    holdingPerformances.forEach((hp) => {
      hp.allocation = totalValue > 0 ? (hp.value / totalValue) * 100 : 0;
    });

    const totalReturn = totalValue - portfolio.totalValue;
    const totalReturnPct =
      portfolio.totalValue > 0 ? (totalReturn / portfolio.totalValue) * 100 : 0;

    // Calculate day change (simplified - would need historical data for accuracy)
    const dayChange = holdingPerformances.reduce(
      (sum, hp) => sum + hp.dayChange,
      0
    );
    const dayChangePct = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

    return {
      totalValue,
      totalReturn,
      totalReturnPct,
      dayChange,
      dayChangePct,
      holdings: holdingPerformances,
      sentimentAnalysis,
    };
  } catch (error) {
    console.error("Error getting portfolio performance:", error);
    return null;
  }
}

function getSentimentDescription(fearGreedValue: number): string {
  if (fearGreedValue <= 20)
    return "Markets are in extreme fear - potential buying opportunity";
  if (fearGreedValue <= 40)
    return "Markets show fear - may be a good time to accumulate";
  if (fearGreedValue <= 60)
    return "Market sentiment is neutral - maintain current strategy";
  if (fearGreedValue <= 80)
    return "Markets show greed - consider taking some profits";
  return "Markets are in extreme greed - high risk of correction";
}

export async function getRebalanceRecommendations(
  portfolioId: string,
  includeSentimentAnalysis: boolean = true
): Promise<RebalanceRecommendation | null> {
  await connectToDatabase();

  try {
    const portfolio = await Portfolio.findById(portfolioId);
    const performance = await getPortfolioPerformance(portfolioId);
    if (!performance || !portfolio) return null;

    const recommendations: RebalanceRecommendation["recommendations"] = [];
    let totalRebalanceValue = 0;
    let sentimentAnalysis: RebalanceRecommendation["sentimentAnalysis"];

    // Get sentiment analysis if requested
    if (includeSentimentAnalysis) {
      try {
        const enhancedRecommendation = await getEnhancedRebalanceRecommendation(
          portfolioId,
          portfolio.riskProfile.category
        );

        sentimentAnalysis = {
          fearGreedIndex: enhancedRecommendation.fearGreedData,
          signal: enhancedRecommendation.sentimentSignal,
          adjustment: enhancedRecommendation.sentimentAdjustment,
        };
      } catch (error) {
        console.warn("Failed to fetch sentiment analysis:", error);
      }
    }

    for (const holding of performance.holdings) {
      let allocationDifference = holding.allocation - holding.targetAllocation;

      // Apply sentiment adjustment if available
      if (
        sentimentAnalysis &&
        Math.abs(sentimentAnalysis.adjustment.adjustment) > 0
      ) {
        const sentimentAdjustment =
          sentimentAnalysis.adjustment.adjustment * 100; // Convert to percentage

        // For high-risk assets (BTC, ETH), apply more aggressive sentiment adjustments
        const isHighRiskAsset = ["BTC", "ETH", "SOL", "AVAX", "DOT"].includes(
          holding.symbol
        );
        const adjustmentMultiplier = isHighRiskAsset ? 1.5 : 0.5;

        if (sentimentAnalysis.signal === "buy" && holding.symbol !== "USDC") {
          // Increase allocation for non-stablecoin assets during fear
          allocationDifference += sentimentAdjustment * adjustmentMultiplier;
        } else if (
          sentimentAnalysis.signal === "sell" &&
          holding.symbol !== "USDC"
        ) {
          // Decrease allocation for non-stablecoin assets during greed
          allocationDifference -= sentimentAdjustment * adjustmentMultiplier;
        }
      }

      if (Math.abs(allocationDifference) > 5) {
        // 5% threshold for rebalancing
        const targetValue =
          (holding.targetAllocation / 100) * performance.totalValue;
        const rebalanceAmount = Math.abs(holding.value - targetValue);

        let reason =
          allocationDifference > 0
            ? `Overallocated by ${allocationDifference.toFixed(1)}%`
            : `Underallocated by ${Math.abs(allocationDifference).toFixed(1)}%`;

        // Add sentiment reasoning if applicable
        if (
          sentimentAnalysis &&
          Math.abs(sentimentAnalysis.adjustment.adjustment) > 0
        ) {
          reason += ` (${sentimentAnalysis.adjustment.reasoning})`;
        }

        recommendations.push({
          symbol: holding.symbol,
          action: allocationDifference > 0 ? "sell" : "buy",
          amount: rebalanceAmount,
          reason,
        });

        totalRebalanceValue += rebalanceAmount;
      }
    }

    return {
      portfolioId,
      recommendations,
      totalRebalanceValue,
      sentimentAnalysis,
    };
  } catch (error) {
    console.error("Error getting rebalance recommendations:", error);
    return null;
  }
}

export async function deletePortfolio(portfolioId: string): Promise<boolean> {
  await connectToDatabase();

  try {
    const result = await Portfolio.findByIdAndDelete(portfolioId);

    // Also delete portfolio history
    await PortfolioHistory.findOneAndDelete({ portfolioId });

    return !!result;
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return false;
  }
}
