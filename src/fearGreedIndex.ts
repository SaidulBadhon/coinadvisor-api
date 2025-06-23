const CMC_API_KEY = Bun.env.CMC_API_KEY;
const CMC_BASE_URL = "https://pro-api.coinmarketcap.com/v3";
const ALTERNATIVE_API_URL = "https://api.alternative.me/fng";

export type FearGreedData = {
  timestamp: string;
  value: number;
  valueClassification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  source: "coinmarketcap" | "alternative";
};

export type FearGreedResponse = {
  current: FearGreedData;
  historical: FearGreedData[];
};

export type RebalanceSignal = "buy" | "sell" | "hold";

export function classifyFearGreed(value: number): FearGreedData["valueClassification"] {
  if (value <= 20) return "Extreme Fear";
  if (value <= 40) return "Fear";
  if (value <= 60) return "Neutral";
  if (value <= 80) return "Greed";
  return "Extreme Greed";
}

export function getRebalanceSignal(fearGreedValue: number, riskProfile: "Conservative" | "Moderate" | "Aggressive"): RebalanceSignal {
  // Conservative investors should be more cautious
  if (riskProfile === "Conservative") {
    if (fearGreedValue <= 25) return "buy";  // Buy during extreme fear
    if (fearGreedValue >= 75) return "sell"; // Sell during extreme greed
    return "hold";
  }
  
  // Moderate investors can take more risk
  if (riskProfile === "Moderate") {
    if (fearGreedValue <= 30) return "buy";
    if (fearGreedValue >= 70) return "sell";
    return "hold";
  }
  
  // Aggressive investors are contrarian
  if (riskProfile === "Aggressive") {
    if (fearGreedValue <= 35) return "buy";
    if (fearGreedValue >= 65) return "sell";
    return "hold";
  }
  
  return "hold";
}

export async function fetchCMCFearGreedIndex(limit: number = 7): Promise<FearGreedData[]> {
  if (!CMC_API_KEY) {
    throw new Error("CMC_API_KEY environment variable is required");
  }

  const url = `${CMC_BASE_URL}/fear-and-greed/historical?limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      "X-CMC_PRO_API_KEY": CMC_API_KEY,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`CMC API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.status?.error_code !== 0) {
    throw new Error(`CMC API error: ${data.status?.error_message || "Unknown error"}`);
  }

  return data.data.map((item: any) => ({
    timestamp: item.timestamp,
    value: item.value,
    valueClassification: item.value_classification || classifyFearGreed(item.value),
    source: "coinmarketcap" as const,
  }));
}

export async function fetchAlternativeFearGreedIndex(limit: number = 7): Promise<FearGreedData[]> {
  const url = `${ALTERNATIVE_API_URL}/?limit=${limit}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Alternative.me API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return data.data.map((item: any) => ({
    timestamp: new Date(parseInt(item.timestamp) * 1000).toISOString(),
    value: parseInt(item.value),
    valueClassification: item.value_classification || classifyFearGreed(parseInt(item.value)),
    source: "alternative" as const,
  }));
}

export async function getFearGreedIndex(limit: number = 7): Promise<FearGreedResponse> {
  try {
    // Try CMC API first
    const data = await fetchCMCFearGreedIndex(limit);
    return {
      current: data[0],
      historical: data,
    };
  } catch (error) {
    console.warn("CMC Fear & Greed API failed, falling back to Alternative.me:", error);
    
    try {
      // Fallback to Alternative.me API
      const data = await fetchAlternativeFearGreedIndex(limit);
      return {
        current: data[0],
        historical: data,
      };
    } catch (fallbackError) {
      console.error("Both Fear & Greed APIs failed:", fallbackError);
      throw new Error("Unable to fetch Fear & Greed Index from any source");
    }
  }
}

export function calculateSentimentAdjustment(
  fearGreedValue: number,
  riskProfile: "Conservative" | "Moderate" | "Aggressive"
): {
  adjustment: number;
  reasoning: string;
} {
  const signal = getRebalanceSignal(fearGreedValue, riskProfile);
  
  if (signal === "buy") {
    // During fear periods, suggest buying more aggressive assets
    const adjustment = riskProfile === "Conservative" ? 0.05 : riskProfile === "Moderate" ? 0.10 : 0.15;
    return {
      adjustment,
      reasoning: `Market sentiment shows ${classifyFearGreed(fearGreedValue).toLowerCase()}, suggesting potential buying opportunity`,
    };
  }
  
  if (signal === "sell") {
    // During greed periods, suggest taking profits/reducing risk
    const adjustment = riskProfile === "Conservative" ? -0.10 : riskProfile === "Moderate" ? -0.08 : -0.05;
    return {
      adjustment,
      reasoning: `Market sentiment shows ${classifyFearGreed(fearGreedValue).toLowerCase()}, suggesting profit-taking opportunity`,
    };
  }
  
  return {
    adjustment: 0,
    reasoning: "Market sentiment is neutral, maintaining current allocation",
  };
}

export async function getEnhancedRebalanceRecommendation(
  portfolioId: string,
  riskProfile: "Conservative" | "Moderate" | "Aggressive"
): Promise<{
  fearGreedData: FearGreedData;
  sentimentSignal: RebalanceSignal;
  sentimentAdjustment: ReturnType<typeof calculateSentimentAdjustment>;
}> {
  const fearGreedResponse = await getFearGreedIndex(1);
  const currentSentiment = fearGreedResponse.current;
  
  const signal = getRebalanceSignal(currentSentiment.value, riskProfile);
  const adjustment = calculateSentimentAdjustment(currentSentiment.value, riskProfile);
  
  return {
    fearGreedData: currentSentiment,
    sentimentSignal: signal,
    sentimentAdjustment: adjustment,
  };
}