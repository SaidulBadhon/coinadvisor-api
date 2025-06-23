import { Context } from "hono";
import { Conversation, Post } from "../../../models";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";
import handleCreateSwitch from "./handleCreateSwitch.copilot";
import handleUpdatePostMetadataSwitch from "./handleUpdatePostMetadataSwitch.copilot";
import handleUpdateCommentary from "./handleUpdateCommentary.copilot";
import handleUpdateCampaignMetadata from "./handleUpdateCampaignMetadata.copilot";

// Shared schema for campaign metadata
const CampaignDuration = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const CampaignMeta = z.object({
  campaignName: z.string().optional(),
  campaignDescription: z.string().optional(),
  campaignGoal: z.string().optional(),
  campaignWritingStyle: z.string().optional(),
  campaignCTA: z.string().optional(),
  campaignDuration: CampaignDuration.optional(),
});

// 1️⃣ Create intent
export const createIntent = tool({
  name: "create_intent",
  description: "User wants to create a post or campaign",
  parameters: z.object({
    action: z.enum(["create_post", "create_campaign"]),
    format: z.enum(["text", "image", "carousel", "video", "document"]),
    prompt: z.string(),
    postTiming: z.enum(["immediate", "scheduled"]).optional(),
    scheduledAt: z.string().optional(),
    estimatedPostCount: z.number().optional(),
    campaign: CampaignMeta.optional(),
  }),
});

// 2️⃣ Update post metadata intent
export const updatePostMetadataIntent = tool({
  name: "update_post_metadata",
  description: "User wants to update post metadata",
  parameters: z.object({
    format: z
      .enum(["text", "image", "carousel", "video", "document"])
      .optional(),
    prompt: z.string().optional(),
    postTiming: z.enum(["immediate", "scheduled"]).optional(),
    scheduledAt: z.string().optional(),
    estimatedPostCount: z.number().optional(),
  }),
});

// 3️⃣ Update campaign metadata intent
export const updateCampaignMetadataIntent = tool({
  name: "update_campaign_metadata",
  description: "User wants to update campaign metadata",
  parameters: CampaignMeta,
});

// 4️⃣ Update commentary intent
export const updateCommentaryIntent = tool({
  name: "update_commentary",
  description: "User wants to update the post commentary",
  parameters: z.object({ prompt: z.string() }),
});

// 5️⃣ Confirmation intent
export const confirmIntent = tool({
  name: "confirm_intent",
  description: "User is confirming the draft",
  parameters: z.object({ summary: z.string() }),
});

// 6️⃣ Rejection intent
export const rejectIntent = tool({
  name: "reject_intent",
  description: "User is rejecting the draft",
  parameters: z.object({ summary: z.string() }),
});

// 7️⃣ Invalid intent
export const invalidIntent = tool({
  name: "invalid_intent",
  description: "User input was not understood",
  parameters: z.object({ summary: z.string() }),
});

// Bundle tools into a ToolSet object
const toolSet = {
  create_intent: createIntent,
  update_post_metadata: updatePostMetadataIntent,
  update_campaign_metadata: updateCampaignMetadataIntent,
  update_commentary: updateCommentaryIntent,
  confirm_intent: confirmIntent,
  reject_intent: rejectIntent,
  invalid_intent: invalidIntent,
};

// System instructions
const SYSTEM_INSTRUCTIONS = `You are an assistant that helps users create posts or campaigns.

Your job is to extract structured intent from freeform user input.

If the message:
- mentions multiple posts, or
- includes a time range (e.g. \"from Friday to Monday\", \"next week\"), or
- suggests a plan across multiple days

→ Then treat it as a campaign, even if the user does not say \"campaign\".

If it's just one topic with no time range or multi-post intent, treat it as a single post.

Use the appropriate tool for each intent:
- **New content**: \`create_inten\` (e.g., "Write a post about X", "Schedule three posts next week").
- **Format conversions or minor tweaks**: \`update_post_metadata\` (e.g., "convert this into a video post", "turn this into an image carousel").
- \`update_campaign_metadata\`
- \`update_commentary\`
- \`confirm_intent\`
- \`reject_intent\`
- \`invalid_intent\`

**Important**: If the user uses verbs like "convert", "turn", "change format", or explicitly mentions an existing piece of content, always map to \`update_post_metadata\` and set \`format\` accordingly.

today's date is: ${new Date().toISOString()}`;

/**
 * Handle sending a message to the copilot, storing messages and dispatching tools
 */
export const sendMessage = async (ctx: Context) => {
  console.log("sendMessage: start");
  const user = await ctx.get("user");
  const { message, conversationId } = await ctx.req.json();
  console.log(
    "sendMessage: received message=",
    message,
    "conversationId=",
    conversationId
  );

  if (!user) {
    console.log("sendMessage: unauthorized");
    return ctx.json({ success: false, message: "Unauthorized" }, 401);
  }
  if (!message?.trim()) {
    console.log("sendMessage: empty message");
    return ctx.json({ success: false, message: "Message is required" }, 400);
  }

  // Load or create conversation
  let conversation: any;
  if (!conversationId) {
    console.log("sendMessage: creating new conversation");
    conversation = await Conversation.create({
      createdBy: user._id,
      messages: [],
      metadata: {},
      lastUpdated: new Date(),
    });
  } else {
    console.log("sendMessage: loading conversation");
    conversation = await Conversation.findOne({
      _id: conversationId,
      createdBy: user._id,
    });
    if (!conversation) {
      console.log("sendMessage: conversation not found");
      return ctx.json(
        { success: false, message: "Conversation not found" },
        404
      );
    }
  }
  console.log("sendMessage: conversation id=", conversation._id);

  // Store user message
  conversation.messages.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });
  conversation.lastUpdated = new Date();
  await conversation.save();
  console.log("sendMessage: user message saved");

  try {
    // Add a loading message to indicate processing
    conversation.messages.push({
      role: "assistant",
      content: "Processing your request...",
      timestamp: new Date(),
      isLoading: true,
    });
    await conversation.save();

    // Intent detection with full context
    console.log("sendMessage: detecting intent");
    const result = (await generateText({
      model: openai("gpt-4.1-nano"),
      tools: toolSet,
      toolChoice: "auto",
      system: SYSTEM_INSTRUCTIONS,
      messages: conversation.messages
        .filter((m: any) => !m.isLoading) // Filter out loading messages
        .map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      maxTokens: 2000,
    })) as any;
    console.log("sendMessage: intent detection result=", result);

    // Remove the loading message
    conversation.messages = conversation.messages.filter(
      (m: any) => !m.isLoading
    );
    await conversation.save();

    const toolCall = result.toolCalls?.[0];
    if (toolCall) {
      const { toolName, args } = toolCall;
      console.log(`sendMessage: tool invoked=${toolName}, args=`, args);
      conversation.metadata = { ...conversation.metadata, ...args };

      // Compose assistant response
      let responseText =
        args.summary ||
        args.prompt ||
        "Success! Your request has been processed.";
      // "[Fallback] No summary or prompt provided.";
      console.log("sendMessage: assistant response=", responseText);
      conversation.messages.push({
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      });
      await conversation.save();
      console.log("sendMessage: assistant message saved");

      // Dispatch handler
      const base = {
        ctx,
        conversation,
        args,
        userId: user._id,
        author: ctx.req.header("X-Selected-Profile-Id"),
        authorType: ctx.req.header("X-Selected-Profile-Type"),
      };
      switch (toolName) {
        case "create_intent":
          return handleCreateSwitch(base);
        case "update_post_metadata":
          return handleUpdatePostMetadataSwitch(base);
        case "update_campaign_metadata":
          return handleUpdateCampaignMetadata(base as any);
        case "update_commentary":
          return handleUpdateCommentary(base as any);
        case "confirm_intent":
        case "reject_intent":
        case "invalid_intent":
          return ctx.json({
            success: true,
            data: { message: responseText, conversationId: conversation._id },
          });
        default:
          console.log("sendMessage: unhandled toolName");
      }
    }

    // Fallback Q&A
    console.log("sendMessage: performing fallback Q&A");

    // Add a loading message for fallback
    conversation.messages.push({
      role: "assistant",
      content: "Thinking...",
      timestamp: new Date(),
      isLoading: true,
    });
    await conversation.save();

    const fallback = await generateText({
      model: openai("gpt-4.1-nano"),
      messages: conversation.messages
        .filter((m: any) => !m.isLoading) // Filter out loading messages
        .map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      maxTokens: 1000,
    });

    // Remove the loading message
    conversation.messages = conversation.messages.filter(
      (m: any) => !m.isLoading
    );
    await conversation.save();

    const answer = fallback.text.trim();
    console.log("sendMessage: fallback answer=", answer);
    const fallbackMessage = `${answer}\n\n*This is a fallback response. Please provide more context for better results.*`;
    conversation.messages.push({
      role: "assistant",
      content: fallbackMessage,
      timestamp: new Date(),
    });
    await conversation.save();
    console.log("sendMessage: fallback assistant message saved");

    return ctx.json({
      success: true,
      data: { message: fallbackMessage, conversationId: conversation._id },
    });
  } catch (err: any) {
    console.error("sendMessage: error=", err);
    return ctx.json(
      {
        success: false,
        message: "Oops—an unexpected error occurred. Want to try again?",
      },
      500
    );
  }
};
