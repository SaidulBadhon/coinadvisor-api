// lib/postPlanner.ts
import { z } from "zod";
import { tool } from "ai";

/*────────────────────────  ENUMS  ────────────────────────*/
export const KIND = [
  "create",
  "update-post-metadata",
  "update-campaign-metadata",
  "update-commentary",
  "confirmation",
  "rejection",
  "invalid",
] as const;

export const ACTION = ["create_post", "create_campaign", "none"] as const;
export const FORMAT = [
  "text",
  "image",
  "carousel",
  "video",
  "document",
] as const;
export const TIMING = ["immediate", "scheduled"] as const;

/*────────────────────  VALIDATORS  ───────────────────────*/
const ISO_DATE = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
    "Invalid ISO‑8601 date"
  );

const CampaignDuration = z
  .object({
    startDate: ISO_DATE.optional(),
    endDate: ISO_DATE.optional(),
  })
  .refine(
    ({ startDate, endDate }) =>
      !startDate || !endDate || new Date(endDate) >= new Date(startDate),
    { message: "endDate must be ≥ startDate" }
  );

const CampaignMeta = z.object({
  campaignName: z.string().optional(),
  campaignDescription: z.string().optional(),
  campaignGoal: z.string().optional(),
  campaignWritingStyle: z.string().optional(),
  campaignCTA: z.string().optional(),
  campaignDuration: CampaignDuration.optional(),
});

const Params = z
  .object({
    kind: z.enum(KIND),
    summary: z.string().min(4).max(280),

    action: z.enum(ACTION).optional(),
    format: z.enum(FORMAT).optional(),
    prompt: z.string().optional(),
    postTiming: z.enum(TIMING).optional(),
    scheduledAt: ISO_DATE.optional(),
    estimatedPostCount: z.number().int().positive().optional(),
    campaign: CampaignMeta.optional(),
  })
  .strict();

/*───────────────  TOOL FOR AI SDK  ───────────────────────*/
export const postPlannerFunctions = {
  post_planner_action: tool({
    description:
      "Classify the user's intent (create / update / confirm / …). " +
      "Return JSON args + a 1‑2 sentence recap in `summary`. Include a `prompt`.",
    parameters: Params,
  }),
};

/*──────────────  SYSTEM PROMPT BUILDER  ──────────────────*/
export type EditorCtx =
  | { mode: "create" }
  | { mode: "edit"; itemType: "post" | "campaign"; itemId?: string };

export function buildSystemPrompt(ctx: EditorCtx = { mode: "create" }) {
  const today = new Date().toISOString();
  const editHint =
    ctx.mode === "edit"
      ? `You are editing an existing **${ctx.itemType}**${
          ctx.itemId ? ` (id: ${ctx.itemId})` : ""
        }.\n`
      : "";

  return `
${editHint}Convert user input into structured intent for posts or campaigns.

Rules
=====
1. Any request spanning multiple posts **or** a date range → treat as *campaign*.
2. Otherwise → treat as a *single post*.

Return fields
-------------
kind | summary | action | prompt | format | postTiming | scheduledAt | campaign | estimatedPostCount

Examples
--------
User: "Can you convert it into a video post?"
Assistant (tool):
{
  "kind": "update-post-metadata",
  "summary": "You want to turn your existing post into a video.",
  "format": "video"
}

User: "Make the CTA sharper"
→ kind: "update-commentary"

User: "Schedule three posts about AI trends from Monday to Wednesday"
→ kind: "create", action: "create_campaign", estimatedPostCount: 3 …

Today: ${today}
`.trim();
}
