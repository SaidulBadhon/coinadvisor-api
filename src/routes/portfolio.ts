import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  createPortfolio,
  getPortfolio,
  getUserPortfolios,
  updatePortfolioHoldings,
  getPortfolioPerformance,
  getRebalanceRecommendations,
  deletePortfolio,
  CreatePortfolioRequest,
  UpdateHoldingsRequest,
} from "../portfolio";
import { z } from "zod";

const app = new Hono();

// Create a new portfolio
app.post(
  "/",
  zValidator("json", CreatePortfolioRequest),
  async (c) => {
    try {
      const { userId, name, riskProfile, initialCapital } = c.req.valid("json");
      
      const portfolio = await createPortfolio(userId, name, riskProfile, initialCapital);
      
      return c.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      console.error("Create portfolio error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create portfolio",
        },
        500
      );
    }
  }
);

// Get all portfolios for a user
app.get("/user/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const portfolios = await getUserPortfolios(userId);
    
    return c.json({
      success: true,
      data: portfolios,
    });
  } catch (error) {
    console.error("Get user portfolios error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch user portfolios",
      },
      500
    );
  }
});

// Get a specific portfolio
app.get("/:portfolioId", async (c) => {
  try {
    const portfolioId = c.req.param("portfolioId");
    const portfolio = await getPortfolio(portfolioId);
    
    if (!portfolio) {
      return c.json(
        {
          success: false,
          error: "Portfolio not found",
        },
        404
      );
    }
    
    return c.json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch portfolio",
      },
      500
    );
  }
});

// Update portfolio holdings
app.put(
  "/:portfolioId/holdings",
  zValidator("json", UpdateHoldingsRequest),
  async (c) => {
    try {
      const portfolioId = c.req.param("portfolioId");
      const { holdings } = c.req.valid("json");
      
      const portfolio = await updatePortfolioHoldings(portfolioId, holdings);
      
      if (!portfolio) {
        return c.json(
          {
            success: false,
            error: "Portfolio not found",
          },
          404
        );
      }
      
      return c.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      console.error("Update holdings error:", error);
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update holdings",
        },
        500
      );
    }
  }
);

// Get portfolio performance
app.get("/:portfolioId/performance", async (c) => {
  try {
    const portfolioId = c.req.param("portfolioId");
    const performance = await getPortfolioPerformance(portfolioId);
    
    if (!performance) {
      return c.json(
        {
          success: false,
          error: "Portfolio not found",
        },
        404
      );
    }
    
    return c.json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error("Get performance error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch portfolio performance",
      },
      500
    );
  }
});

// Get rebalance recommendations
app.get("/:portfolioId/rebalance", async (c) => {
  try {
    const portfolioId = c.req.param("portfolioId");
    const recommendations = await getRebalanceRecommendations(portfolioId);
    
    if (!recommendations) {
      return c.json(
        {
          success: false,
          error: "Portfolio not found",
        },
        404
      );
    }
    
    return c.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    console.error("Get rebalance recommendations error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch rebalance recommendations",
      },
      500
    );
  }
});

// Delete a portfolio
app.delete("/:portfolioId", async (c) => {
  try {
    const portfolioId = c.req.param("portfolioId");
    const success = await deletePortfolio(portfolioId);
    
    if (!success) {
      return c.json(
        {
          success: false,
          error: "Portfolio not found",
        },
        404
      );
    }
    
    return c.json({
      success: true,
      message: "Portfolio deleted successfully",
    });
  } catch (error) {
    console.error("Delete portfolio error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete portfolio",
      },
      500
    );
  }
});

export default app;