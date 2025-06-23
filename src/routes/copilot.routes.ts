import { Hono } from "hono";
import { copilotController } from "../controllers";
import { sendMessage } from "../controllers/copilot/sendMessage";

const copilot = new Hono();

// Send a message to the Copilot
copilot.post("/chat", (c) => sendMessage(c));

// Get all conversations for a user
copilot.get("/conversations", (c) => copilotController.getConversations(c));

// Get a specific conversation
copilot.get("/conversations/:conversationId", (c) =>
  copilotController.getConversation(c)
);

// Get messages for a specific conversation
copilot.get("/conversations/:conversationId/messages", (c) =>
  copilotController.getMessages(c)
);

// // Delete a conversation
// copilot.delete("/conversations/:conversationId", (c) =>
//   copilotController.deleteConversation(c)
// );

// Confirm action (create post or campaign)
copilot.post(
  "/conversations/:conversationId/messages/:messageId/vote",

  (c) => copilotController.voteMessage(c)
);

export default copilot;
