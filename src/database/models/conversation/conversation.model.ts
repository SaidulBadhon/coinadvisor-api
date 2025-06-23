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
  createdBy: Types.ObjectId;
  title: string;
  lastUpdated: Date;
  metadata?: IConversationMetadata;
  postId?: Types.ObjectId | string;
  campaignId?: Types.ObjectId | string;
}

const ConversationSchema = new Schema<IConversation>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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

// import { Schema, Types, model } from "mongoose";

// interface IMessage {
//   role: "user" | "assistant";
//   content: string;
//   timestamp: Date;
// }

// interface IConversationMetadata {
//   pendingAction?: boolean;
//   draftId?: Types.ObjectId | string;
//   contentType?: "post" | "campaign";
//   contentFormat?: "text" | "image" | "video" | "carousel";
//   topic?: {
//     title?: string;
//     description?: string;
//   };
//   [key: string]: any; // Allow for additional properties
// }

// interface IConversation {
//   createdBy: Types.ObjectId;
//   title: string;
//   messages: IMessage[];
//   lastUpdated: Date;
//   metadata?: IConversationMetadata;
//   postId?: Types.ObjectId | string;
//   campaignId?: Types.ObjectId | string;
// }

// const MessageSchema = new Schema<IMessage>({
//   role: {
//     type: String,
//     required: true,
//     enum: ["user", "assistant"],
//   },
//   content: {
//     type: String,
//     required: true,
//   },
//   timestamp: {
//     type: Date,
//     default: Date.now,
//   },
// });

// const ConversationSchema = new Schema<IConversation>(
//   {
//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     title: {
//       type: String,
//       default: "New Conversation",
//     },
//     messages: [MessageSchema],
//     lastUpdated: {
//       type: Date,
//       default: Date.now,
//     },
//     metadata: {
//       type: Object,
//       default: {},
//     },
//     postId: {
//       type: Schema.Types.ObjectId,
//       ref: "Post",
//     },
//     campaignId: {
//       type: Schema.Types.ObjectId,
//       ref: "Campaign",
//     },
//   },
//   { timestamps: true }
// );

// // Update lastUpdated whenever messages are modified
// ConversationSchema.pre("save", function (next) {
//   if (this.isModified("messages")) {
//     this.lastUpdated = new Date();

//     // Auto-generate title from first user message if not set
//     if (this.messages.length > 0 && this.title === "New Conversation") {
//       const firstUserMessage = this.messages.find((m) => m.role === "user");
//       if (firstUserMessage && firstUserMessage.content) {
//         const content = firstUserMessage.content.trim();
//         if (content) {
//           const title = content.substring(0, 30);
//           this.title = title + (title.length >= 30 ? "..." : "");
//         }
//       }
//     }

//     // Ensure we don't exceed a reasonable message count to prevent performance issues
//     // Keep first 5 messages and last 15 messages if we exceed 20 messages
//     if (this.messages.length > 20) {
//       const firstMessages = this.messages.slice(0, 5);
//       const lastMessages = this.messages.slice(-15);
//       this.messages = [...firstMessages, ...lastMessages];
//       console.log(
//         `Trimmed conversation to ${this.messages.length} messages (from ${
//           this.messages.length + (this.messages.length - 20)
//         } messages)`
//       );
//     }
//   }
//   next();
// });

// const Conversation = model<IConversation>("Conversation", ConversationSchema);
// export default Conversation;
