import { Hono } from "hono";
import { z } from "zod";
import { getPersonalizedRecommendation } from "../investmentAgent";

const app = new Hono();

app.post("/recommend", async (c) => {
  const schema = z.object({
    investmentHorizonYears: z.number().min(0),
    maxDrawdownTolerancePct: z.number().min(0).max(100),
    primaryGoal: z.enum(["growth", "income", "preservation"]),
    startingCapital: z.number().min(0),
    symbols: z.array(z.string()),
  });

  const result = schema.safeParse(await c.req.json());
  if (!result.success) {
    return c.json({ error: result.error.format() }, 400);
  }

  const { startingCapital, symbols, ...answers } = result.data;

  try {
    const recommendation = await getPersonalizedRecommendation(
      answers,
      startingCapital,
      symbols
    );
    return c.json({ recommendation });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default app;
