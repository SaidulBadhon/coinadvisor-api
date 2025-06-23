import Message from "../../../database/models/conversation/message.model";

export const onFinish = async ({
  conversationId,
  parts,
  modelName,
}: {
  conversationId: any;
  parts: any;
  modelName: any;
}) => {
  console.log("We are finishing...");
  const newAssistantMessage = (await Message.create({
    conversationId: conversationId,
    model: modelName,
    role: "assistant",
    parts: parts,
    attachments: [],
  })) as any;

  console.log("NewAssistantMessage: ", newAssistantMessage);
};
