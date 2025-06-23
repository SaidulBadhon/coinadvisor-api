// models/Conversation.ts
import { Schema, model, Types } from "mongoose";

interface IConversationMetadata {
  pendingAction?: boolean;
  draftId?: Types.ObjectId | string;
  contentType?: "post" | "campaign";
  contentFormat?: "text" | "image" | "video" | "carousel";
  topic?: {
    title?: string;
    description?: string;
  };
  [key: string]: any;
}

interface IConversation {
  title: string;
  lastUpdated: Date;
  metadata?: IConversationMetadata;
  postId?: Types.ObjectId | string;
  campaignId?: Types.ObjectId | string;
}

const ConversationSchema = new Schema<IConversation>(
  {
    title: {
      type: String,
      default: "New Conversation",
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Object,
      default: {},
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
    },
  },
  { timestamps: true }
);

const Conversation = model<IConversation>("Conversation", ConversationSchema);
export default Conversation;
