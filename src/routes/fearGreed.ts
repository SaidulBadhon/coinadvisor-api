import { Hono } from "hono";
import { getFearGreedIndex } from "../fearGreedIndex";

const app = new Hono();

// Get current Fear & Greed Index
app.get("/", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "1");
    const fearGreedData = await getFearGreedIndex(limit);
    
    return c.json({
      success: true,
      data: fearGreedData,
    });
  } catch (error) {
    console.error("Get Fear & Greed Index error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Fear & Greed Index",
      },
      500
    );
  }
});

// Get historical Fear & Greed Index
app.get("/history", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "30");
    const fearGreedData = await getFearGreedIndex(Math.min(limit, 100)); // Limit to 100 for performance
    
    return c.json({
      success: true,
      data: {
        current: fearGreedData.current,
        historical: fearGreedData.historical,
        stats: {
          average: fearGreedData.historical.reduce((sum, item) => sum + item.value, 0) / fearGreedData.historical.length,
          min: Math.min(...fearGreedData.historical.map(item => item.value)),
          max: Math.max(...fearGreedData.historical.map(item => item.value)),
        }
      },
    });
  } catch (error) {
    console.error("Get Fear & Greed Index history error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch Fear & Greed Index history",
      },
      500
    );
  }
});

export default app;