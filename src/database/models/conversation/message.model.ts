// models/Message.ts
import { Schema, model, Types } from "mongoose";

export interface IMessage {
  // conversationId: Types.ObjectId;
  model: "gpt-4" | "gpt-4o" | "gpt-4.1-nano";
  role: "user" | "assistant";

  content: string;
  parts: {
    type: string;
    text: string;
    toolInvocation?: any;
  }[];
  attachments: {
    type: string;
    url: string;
  }[];

  vote: string;
}

const MessageSchema = new Schema<IMessage>(
  {
    // conversationId: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Conversation",
    //   required: true,
    //   index: true,
    // },
    model: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: false,
    },

    parts: [
      {
        type: {
          type: String,
          required: true,
        },
        text: {
          type: String,
          required: false,
        },
        toolInvocation: {
          type: Schema.Types.Mixed,
          required: false,
        },
      },
    ],
    attachments: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ["image", "video", "audio", "file"] },
            url: String,
          },
          { _id: false } // prevent Mongoose from adding _id to each attachment
        ),
      ],
      default: [],
    },

    vote: {
      type: String,
      enum: ["like", "dislike", "neutral"],
      default: "neutral",
    },
  },
  { timestamps: true }
);

const Message = model<IMessage>("ConversationMessage", MessageSchema);
export default Message;
