import { Context } from "hono";
import { getWeather } from "./tools/get-weather";
import { webSearch } from "./tools/web-search";
import { streamText } from "ai";
import { modelSelector } from "./_components/modelSelector";
import { onFinish } from "./_components/onFinish";
import { getConversation } from "./_components/getConversation";
import Message from "../../database/models/conversation/message.model";
import Conversation from "../../database/models/conversation/conversation.model";
import { getFearGreedIndexTool } from "./tools/fear-greed-index";
import { getPersonalizedRecommendationTool } from "./tools/get-personalized-recommendation";

const systemPrompt = `You are CoinAdvisor, an expert cryptocurrency and investment advisor AI assistant. You help users with:

- Cryptocurrency investment strategies and portfolio management
- Market analysis and trend insights
- Risk assessment and personalized recommendations
- Fear & Greed Index interpretation
- Portfolio diversification advice
- Investment education and guidance

You have access to real-time market data, fear & greed index, and personalized recommendation tools. Always provide well-reasoned, data-driven advice while emphasizing the importance of risk management and diversification.`;

export const sendMessage = async (ctx: Context) => {
  console.log("sendMessage: start");
  const user = await ctx.get("user");
  const {
    message,
    conversationId,
    searchEnabled = false,
  } = await ctx.req.json();

  try {
    if (!message?.trim()) {
      return ctx.json({ success: false, message: "Message is required" }, 400);
    }

    if (!user) {
      return ctx.json({ success: false, message: "Unauthorized" }, 401);
    }

    // Get or create conversation
    const conversationResult = await getConversation({
      conversationId,
      newConversationId: conversationId || "new",
      message,
      user,
    });

    if (conversationResult.error || !conversationResult.data) {
      return ctx.json(
        { success: false, message: "Failed to create/load conversation" },
        500
      );
    }

    const conversation = conversationResult.data;

    // Load conversation history for context
    const previousMessages = await Message.find({
      conversationId: conversation._id,
    })
      .sort({ createdAt: 1 })
      .limit(20); // Limit to last 20 messages for performance

    // Create user message
    await Message.create({
      conversationId: conversation._id,
      role: "user",
      parts: [{ type: "text", text: message }],
      attachments: [],
    });

    const selected = modelSelector();
    const allParts: any = [];

    // Configure tools based on search preference
    const tools: any = {
      getWeather,
      getFearGreedIndexTool,
      getPersonalizedRecommendationTool,
    };
    if (searchEnabled) {
      tools.webSearch = webSearch;
    }

    // Convert previous messages to AI format
    const conversationHistory = previousMessages.map((msg) => {
      const textPart = msg.parts.find((part) => part.type === "text");
      return {
        role: msg.role,
        content: textPart?.text || "",
      };
    });

    // Add current user message to history
    conversationHistory.push({
      role: "user" as const,
      content: message,
    });

    const result = await streamText({
      ...selected,
      system: systemPrompt,
      messages: conversationHistory,
      temperature: 1,
      maxSteps: 3,
      tools,
    });

    const { fullStream } = result;

    // Process all chunks and collect the final result
    for await (const chunk of fullStream) {
      switch (chunk.type) {
        case "reasoning":
          const reasoningPart = allParts.find(
            (part: any) => part.type === "reasoning"
          );
          if (reasoningPart) {
            reasoningPart.text += chunk.textDelta;
          } else {
            allParts.push({
              type: "reasoning",
              text: chunk.textDelta,
            });
          }
          break;

        case "text-delta":
          const textPart = allParts?.find((part: any) => part.type === "text");
          if (textPart) {
            textPart.text += chunk.textDelta;
          } else {
            allParts.push({
              type: "text",
              text: chunk.textDelta,
            });
          }
          break;

        case "tool-result":
          allParts.push({
            type: "tool-result",
            toolInvocation: chunk,
          });
          break;
      }
    }

    // Save the final message
    await onFinish({
      conversationId: conversation._id,
      parts: allParts,
      modelName: "unknown",
    });

    // Update conversation lastUpdated timestamp
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastUpdated: new Date(),
    });

    // Return the complete response
    return ctx.json({
      success: true,
      data: {
        conversationId: conversation._id,
        parts: allParts,
      },
    });
  } catch (error: any) {
    console.error("Error in sendMessage:", error);
    return ctx.json(
      {
        success: false,
        message: "An error occurred",
        error: error.message,
      },
      500
    );
  }
};
