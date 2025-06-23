import { Context } from "hono";
import Conversation from "../../database/models/conversation/conversation.model";
import Message from "../../database/models/conversation/message.model";

/**
 * @api {get} /postt/copilot/conversations Get all conversations for a user
 * @apiGroup Copilot
 * @access Private
 */
export const getConversations = async (ctx: Context) => {
  const userId = await ctx.get("userId");

  try {
    if (!userId) {
      return ctx.json({ success: false, message: "Unauthorized" }, 401);
    }

    const conversations = await Conversation.find({ createdBy: userId })
      .select("_id title lastUpdated createdAt")
      .sort({ lastUpdated: -1 })
      .limit(40);

    return ctx.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error("Error in getConversations:", error);
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

/**
 * @api {get} /postt/copilot/conversations/:conversationId/messages Get messages for a specific conversation
 * @apiGroup Copilot
 * @access Private
 */
export const getMessages = async (ctx: Context) => {
  try {
    const userId = await ctx.get("userId");
    if (!userId) {
      return ctx.json({ success: false, message: "Unauthorized" }, 401);
    }

    const conversationId = ctx.req.param("conversationId");
    const messages = await Message.find({
      conversationId,
    }).sort({ createdAt: 1 });

    return ctx.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error("Error in getMessages:", error);
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

/**
 * @api {get} /postt/copilot/conversations/:conversationId Get a specific conversation
 * @apiGroup Copilot
 * @access Private
 */
export const getConversation = async (ctx: Context) => {
  try {
    const userId = await ctx.get("userId");
    if (!userId) {
      return ctx.json({ success: false, message: "Unauthorized" }, 401);
    }

    const conversationId = ctx.req.param("conversationId");
    const conversation = await Conversation.findOne({
      _id: conversationId,
      createdBy: userId,
    });

    if (!conversation) {
      return ctx.json(
        { success: false, message: "Conversation not found" },
        404
      );
    }

    const messages = await Message.find({
      conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    // // Ensure we're not sending too many messages to the client
    // // This helps with performance on the frontend
    // let processedConversation = conversation.toObject();

    // // If there are more than 50 messages, only send the first 10 and last 40
    // if (
    //   processedConversation.messages &&
    //   processedConversation.messages.length > 50
    // ) {
    //   const firstMessages = processedConversation.messages.slice(0, 10);
    //   const lastMessages = processedConversation.messages.slice(-40);
    //   processedConversation.messages = [...firstMessages, ...lastMessages];
    //   // Add a flag to indicate messages were truncated (as a custom property)
    //   (processedConversation as any).messagesTruncated = true;
    // }

    return ctx.json({
      success: true,
      data: {
        ...conversation.toObject(),
        messages,
      },
    });
  } catch (error: any) {
    console.error("Error in getConversation:", error);
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

/**
 * @api {delete} /postt/copilot/conversations/:conversationId Delete a conversation
 * @apiGroup Copilot
 * @access Private
 */
export const deleteConversation = async (ctx: Context) => {
  try {
    const userId = await ctx.get("userId");
    if (!userId) {
      return ctx.json({ success: false, message: "Unauthorized" }, 401);
    }

    const conversationId = await ctx.req.param("conversationId");
    const result = await Conversation.deleteOne({
      _id: conversationId,
      createdBy: userId,
    });

    await Message.deleteMany({
      conversationId,
    });

    return ctx.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error: any) {
    console.error("Error in deleteConversation:", error);
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

/**
 * @api {post} /copilot/conversations/:conversationId/messages/:messageId/vote Confirm action (create post or campaign)
 * @apiGroup Copilot
 * @access Private
 */
export const voteMessage = async (ctx: Context) => {
  try {
    const userId = await ctx.get("userId");
    if (!userId)
      return ctx.json({ success: false, message: "Unauthorized" }, 401);

    const { vote } = await ctx.req.json();

    const { conversationId, messageId } = await ctx.req.param();

    if (!conversationId || !messageId || !vote) {
      return ctx.json(
        {
          success: false,
          message: "Conversation ID, Message ID and Vote are required",
        },
        400
      );
    }

    await Message.findByIdAndUpdate(
      {
        _id: messageId,
        conversationId,
        createdBy: userId,
      },
      {
        $set: {
          vote,
        },
      }
    );

    return ctx.json({
      success: true,
      message: "Vote updated successfully",
    });
  } catch (error: any) {
    console.error("Error in voteMessage:", error);
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
