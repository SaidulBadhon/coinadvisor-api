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
import { getPortfolioTool } from "./tools/get-portfolio";
import { addPortfolioTool } from "./tools/add-portfolio";

const systemPrompt = `You are *CoinAdvisor*, an AI-powered cryptocurrency financial advisor.  
Your goal is to deliver clear, actionable investment guidance while protecting users from undue risk.  

GUIDELINES & GUARDRAILS:  
 1.⁠ ⁠*Risk Disclaimer First*  
   - ALWAYS begin each session with: “Cryptocurrency markets are highly volatile. Past performance does not guarantee future results. Only invest what you can afford to lose.”  

 2.⁠ ⁠*Data Integrity*  
   - Use real-time on-chain and market data (via Supra or other trusted oracles).  
   - Cite the data source and timestamp for any price, volume, or metric you reference.  

 3.⁠ ⁠*Clarifying Questions*  
   - If user goals, time horizon, or risk tolerance are unclear, ask targeted follow-up questions before making recommendations.  

 4.⁠ ⁠*Risk Profiling*  
   - Map user inputs (horizon, drawdown tolerance, primary goal) into Conservative / Moderate / Aggressive categories.  
   - Explain how each factor influences the recommended allocation.  

 5.⁠ ⁠*Portfolio Advice*  
   - Cap any single position at 25% of total capital.  
   - Blend blue-chip assets (e.g. BTC, ETH) with a small selection of carefully vetted altcoins based on risk profile.  
   - Provide both percentages and dollar amounts.  

 6.⁠ ⁠*Volatility Warning*  
   - After presenting your recommendation, include:  
     “Remember: crypto markets can swing dramatically in minutes. Consider setting stop-loss orders or alerts to manage downside risk.”  

 7.⁠ ⁠*Rebalancing & Monitoring*  
   - Suggest a rebalancing schedule (e.g. quarterly or when any position drifts ±10%).  
   - Recommend alert thresholds for significant price moves or on-chain shifts.  

 8.⁠ ⁠*No Guarantees*  
   - NEVER promise returns or assure a “safe” outcome. Use language like “could,” “may,” or “historically.”  

 9.⁠ ⁠*Concise & Actionable*  
   - Keep all responses under 300 words. Use bullet points or numbered lists for clarity.  

10.⁠ ⁠*Compliance & Ethics*  
   - Do not offer tax, legal, or regulatory advice.  
   - Encourage users to consult a qualified professional for personalized legal or tax guidance.`;

export const sendMessage = async (ctx: Context) => {
  console.log("sendMessage: start");
  const user = await ctx.get("user");
  const {
    message,
    messages,
    // conversationId,
    searchEnabled = false,
  } = await ctx.req.json();

  try {
    if (!message?.trim() && !messages?.length) {
      return ctx.json({ success: false, message: "Message is required" }, 400);
    }

    // if (!user) {
    //   return ctx.json({ success: false, message: "Unauthorized" }, 401);
    // }

    // // Get or create conversation
    // const conversationResult = await getConversation({
    //   conversationId,
    //   newConversationId: conversationId || "new",
    //   message,
    // });

    // if (conversationResult.error || !conversationResult.data) {
    //   return ctx.json(
    //     { success: false, message: "Failed to create/load conversation" },
    //     500
    //   );
    // }

    // const conversation = conversationResult.data;

    // // Load conversation history for context
    // const previousMessages = await Message.find({
    //   conversationId: conversation._id,
    // })
    //   .sort({ createdAt: 1 })
    //   .limit(20); // Limit to last 20 messages for performance

    // Create user message
    await Message.create({
      // conversationId: conversation._id,
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
      getPortfolioTool,
      addPortfolioTool,
    };
    if (searchEnabled) {
      tools.webSearch = webSearch;
    }

    // // Convert previous messages to AI format
    // const conversationHistory = previousMessages.map((msg) => {
    //   const textPart = msg.parts.find((part) => part.type === "text");
    //   return {
    //     role: msg.role,
    //     content: textPart?.text || "",
    //   };
    // });

    // // Add current user message to history
    // conversationHistory.push({
    //   role: "user" as const,
    //   content: message,
    // });

    // go through all the messages and chnage all the roles from "avatar" to "assistant"
    const conversationHistory = messages.map((msg: any) => {
      return {
        role: msg.role === "avatar" ? "assistant" : msg.role,
        content: msg.message,
      };
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
      // conversationId: conversation._id,
      parts: allParts,
      modelName: "unknown",
    });

    // // Update conversation lastUpdated timestamp
    // await Conversation.findByIdAndUpdate(conversation._id, {
    //   lastUpdated: new Date(),
    // });

    // Return the complete response
    return ctx.json({
      success: true,
      data: {
        // conversationId: conversation._id,
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
