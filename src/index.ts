import { Hono } from "hono";
import { z } from "zod";
import SupraOracleClient from "supra-oracle-sdk";
import {
  computeRiskProfile,
  suggestPortfolio,
  RiskAnswers,
  RiskProfile,
  Allocation,
} from "./finance";
import recommendation from "./routes/recommendation";
import portfolio from "./routes/portfolio";
import fearGreed from "./routes/fearGreed";
import { connectToDatabase } from "./database/models";
import copilot from "./routes/copilot.routes";
import { cors } from "hono/cors";

// const avatarId = "a71eb6789ab04568a14e1cf5166a7c5d";
// const voiceId = "6d091fbb994c439eb9d249ba8b0e62da";
// const language = "en";

const app = new Hono();

// Initialize database connection
connectToDatabase().catch(console.error);

// Cors
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);
app.get("/", (ctx) => {
  return ctx.text("Hello Hono!");
});

app.route("/api", recommendation);
app.route("/api/portfolios", portfolio);
app.route("/api/fear-greed", fearGreed);
app.route("/api/copilot", copilot);

// 1️⃣ Risk Profiling endpoint
app.post("/risk-profile", async (c) => {
  const body = await c.req.json();
  // validate incoming answers
  const parsed = z
    .object({
      investmentHorizonYears: z.number().min(0),
      maxDrawdownTolerancePct: z.number().min(0).max(100),
      primaryGoal: z.enum(["growth", "income", "preservation"]),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const answers = parsed.data as RiskAnswers;
  const profile = computeRiskProfile(answers);
  return c.json<RiskProfile>(profile);
});

// 2️⃣ Portfolio Suggestions endpoint
app.post("/portfolio", async (c) => {
  const body = await c.req.json();
  // expect a risk profile and capital
  const parsed = z
    .object({
      category: z.enum(["Conservative", "Moderate", "Aggressive"]),
      score: z.number(),
      startingCapital: z.number().min(0),
    })
    .safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const { category, score, startingCapital } = parsed.data;
  const profile = { category, score };
  const allocations = suggestPortfolio(profile, startingCapital);

  // optionally compute dollar amounts:
  const detailed = allocations.map((a) => ({
    ...a,
    amount: +(startingCapital * (a.percentage / 100)).toFixed(2),
  }));

  return c.json(detailed);
});

app.post("/price-feed", async (c) => {
  const client = new SupraOracleClient({
    restAddress: "https://rpc-testnet-dora-2.supra.com", // optional, defaults to this
    chainType: "evm", // optional, defaults to 'evm'
  });

  const pairIndexes = [0, 21, 49, 61];
  const oracleData = await client.getOracleData(pairIndexes);

  return c.json(oracleData);
});

export default app;
