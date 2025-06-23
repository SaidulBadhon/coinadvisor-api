import Conversation from "../../../database/models/conversation/conversation.model";
import generateSecureObjectId from "../../../utils/generateSecureObjectId";

export const getConversation = async ({
  conversationId,
  newConversationId,
  message,
}: {
  conversationId?: string;
  newConversationId: string;
  message: string;
}) => {
  try {
    // Load or create conversation
    let conversation: any;

    console.log("getConversation: conversationId=", conversationId);

    if (!conversationId) {
      const xs = generateSecureObjectId();

      console.log(
        "sendMessage: creating new conversation: ",
        newConversationId,
        xs
      );

      conversation = await Conversation.create({
        _id: xs,
        title: message?.slice(0, 24) || "New Conversation",
        metadata: {},
        lastUpdated: new Date(),
      });
    } else {
      console.log("sendMessage: loading conversation");
      conversation = await Conversation.findOne({
        _id: conversationId || generateSecureObjectId(),
      });
    }

    console.log("conversation: ", conversation);

    return {
      data: conversation,
      error: null,
    };
  } catch (error: any) {
    console.error("Error in getConversation:", error);
    return {
      data: {},
      error: error,
    };
  }
};
