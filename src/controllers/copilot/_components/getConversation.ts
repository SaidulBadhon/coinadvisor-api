import Conversation from "../../../database/models/conversation/conversation.model";
import generateSecureObjectId from "../../../utils/generateSecureObjectId";

export const getConversation = async ({
  conversationId,
  newConversationId,
  message,
  user,
}: {
  conversationId?: string;
  newConversationId: string;
  message: string;
  user: any;
}) => {
  try {
    // Load or create conversation
    let conversation: any;

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
        createdBy: user._id,
        metadata: {},
        lastUpdated: new Date(),
      });
    } else {
      console.log("sendMessage: loading conversation");
      conversation = await Conversation.findOne({
        _id: conversationId || generateSecureObjectId(),
        createdBy: user._id,
      });
    }

    console.log("conversation: ", conversation);

    return {
      data: conversation,
      error: null,
    };
  } catch (error: any) {
    return {
      data: {},
      error: error,
    };
  }
};
