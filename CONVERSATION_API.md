# Conversation System API Documentation

## Overview

The CoinAdvisor API now supports a full conversation system where messages are organized into conversations, providing context-aware responses and conversation history management.

## API Endpoints

### 1. Send Message (Chat)
**POST** `/api/copilot/chat`

Send a message to the AI assistant. If no conversationId is provided, a new conversation will be created.

**Request Body:**
```json
{
  "message": "What's the current market sentiment?",
  "conversationId": "optional-conversation-id",
  "searchEnabled": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conversation-id",
    "parts": [
      {
        "type": "text",
        "text": "AI response here..."
      }
    ]
  }
}
```

### 2. Get All Conversations
**GET** `/api/copilot/conversations`

Retrieve all conversations for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "conversation-id",
      "title": "Market Analysis Discussion",
      "lastUpdated": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 3. Get Specific Conversation
**GET** `/api/copilot/conversations/:conversationId`

Retrieve a specific conversation with all its messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "conversation-id",
    "title": "Market Analysis Discussion",
    "createdBy": "user-id",
    "lastUpdated": "2024-01-01T00:00:00.000Z",
    "messages": [
      {
        "_id": "message-id",
        "conversationId": "conversation-id",
        "role": "user",
        "parts": [
          {
            "type": "text",
            "text": "User message"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 4. Get Messages for Conversation
**GET** `/api/copilot/conversations/:conversationId/messages`

Retrieve all messages for a specific conversation.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "message-id",
      "conversationId": "conversation-id",
      "role": "user",
      "parts": [
        {
          "type": "text",
          "text": "Message content"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 5. Vote on Message
**POST** `/api/copilot/conversations/:conversationId/messages/:messageId/vote`

Vote on a specific message (like/dislike feedback).

**Request Body:**
```json
{
  "vote": "like" // or "dislike" or "neutral"
}
```

## Key Features

### 1. Context-Aware Responses
- The AI maintains conversation history (last 20 messages)
- Responses are contextually relevant to the ongoing conversation
- System prompt optimized for cryptocurrency and investment advisory

### 2. Message Structure
Messages support multiple parts and types:
- **text**: Regular text content
- **reasoning**: AI reasoning process
- **tool-result**: Results from tool invocations

### 3. Tool Integration
Available tools in conversations:
- **Weather**: Get weather information
- **Fear & Greed Index**: Cryptocurrency market sentiment
- **Personalized Recommendations**: Investment advice
- **Web Search**: (when enabled) Real-time web search

### 4. Conversation Management
- Automatic conversation creation
- Title generation from first message
- Last updated timestamp tracking
- User-specific conversation isolation

## Usage Examples

### Starting a New Conversation
```javascript
const response = await fetch('/api/copilot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What's the best strategy for crypto investing?",
    searchEnabled: true
  })
});
```

### Continuing an Existing Conversation
```javascript
const response = await fetch('/api/copilot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Can you explain more about DCA strategy?",
    conversationId: "existing-conversation-id"
  })
});
```

## Database Schema

### Conversation Model
```typescript
interface IConversation {
  createdBy: Types.ObjectId;
  title: string;
  lastUpdated: Date;
  metadata?: IConversationMetadata;
  postId?: Types.ObjectId | string;
  campaignId?: Types.ObjectId | string;
}
```

### Message Model
```typescript
interface IMessage {
  conversationId: Types.ObjectId;
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
```

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- **400**: Bad Request (missing required fields)
- **401**: Unauthorized (authentication required)
- **404**: Not Found (conversation/message not found)
- **500**: Internal Server Error
