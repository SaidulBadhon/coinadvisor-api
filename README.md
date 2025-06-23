# CoinAdvisor API

A comprehensive cryptocurrency portfolio management API that provides intelligent investment recommendations, real-time portfolio tracking, and sentiment-based rebalancing strategies.

## Features

- 🎯 **Risk-Based Portfolio Management** - Personalized allocations based on user risk profiles
- 📊 **Real-Time Market Data** - Live price feeds and performance tracking
- 🧠 **AI-Powered Recommendations** - GPT-4 powered investment advice
- 📈 **Sentiment Analysis** - Fear & Greed Index integration for market-aware decisions
- ⚖️ **Smart Rebalancing** - Automated rebalancing suggestions
- 🔐 **Secure & Scalable** - MongoDB backend with comprehensive validation

## Quick Start

### Development Setup

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Server runs on http://localhost:3000
```

### Docker Setup

```bash
# Build and start with Docker Compose
docker-compose up --build

# API: http://localhost:3000
# MongoDB: localhost:27018
```

## API Documentation

### Base URL
```
http://localhost:3000
```

### Response Format
All endpoints return JSON with consistent structure:
```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null
}
```

---

## Portfolio Management

### Create Portfolio
```http
POST /api/portfolios
```

**Request Body:**
```json
{
  "userId": "user_123",
  "name": "My Crypto Portfolio",
  "riskProfile": {
    "category": "Moderate",
    "score": 65
  },
  "initialCapital": 10000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "portfolio_id",
    "userId": "user_123",
    "name": "My Crypto Portfolio",
    "riskProfile": { "category": "Moderate", "score": 65 },
    "holdings": [
      {
        "symbol": "BTC",
        "amount": 0.15,
        "currentPrice": 45000,
        "value": 6750,
        "percentage": 67.5,
        "targetPercentage": 70
      }
    ],
    "totalValue": 10000,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Get User Portfolios
```http
GET /api/portfolios/user/{userId}
```

### Get Portfolio Details
```http
GET /api/portfolios/{portfolioId}
```

### Update Portfolio Holdings
```http
PUT /api/portfolios/{portfolioId}/holdings
```

**Request Body:**
```json
{
  "holdings": [
    { "symbol": "BTC", "amount": 0.2 },
    { "symbol": "ETH", "amount": 5.0 }
  ]
}
```

### Get Portfolio Performance
```http
GET /api/portfolios/{portfolioId}/performance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValue": 12500,
    "totalGainLoss": 2500,
    "totalGainLossPercentage": 25.0,
    "dayChange": 150,
    "dayChangePercentage": 1.2,
    "holdings": [
      {
        "symbol": "BTC",
        "value": 8750,
        "gainLoss": 1000,
        "gainLossPercentage": 12.9
      }
    ],
    "sentiment": {
      "fearGreedIndex": 65,
      "classification": "Greed",
      "adjustment": {
        "adjustment": 0.1,
        "reasoning": "High greed suggests potential overvaluation"
      }
    }
  }
}
```

### Get Rebalance Recommendations
```http
GET /api/portfolios/{portfolioId}/rebalance
```

**Response:**
```json
{
  "success": true,
  "data": {
    "needsRebalancing": true,
    "recommendations": [
      {
        "symbol": "BTC",
        "action": "sell",
        "amount": 0.05,
        "value": 2250,
        "reason": "Overweight by 5%"
      },
      {
        "symbol": "ETH",
        "action": "buy",
        "amount": 1.2,
        "value": 2400,
        "reason": "Underweight by 8%"
      }
    ],
    "totalRebalanceValue": 4650,
    "sentiment": {
      "fearGreedIndex": 65,
      "adjustment": {
        "adjustment": 0.1,
        "reasoning": "Market greed suggests cautious rebalancing"
      }
    }
  }
}
```

### Delete Portfolio
```http
DELETE /api/portfolios/{portfolioId}
```

---

## Investment Recommendations

### Get Personalized Recommendation
```http
POST /api/recommend
```

**Request Body:**
```json
{
  "investmentHorizonYears": 5,
  "maxDrawdownTolerancePct": 30,
  "primaryGoal": "growth",
  "startingCapital": 10000,
  "symbols": ["BTC", "ETH", "ADA", "SOL"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendation": "Based on your 5-year investment horizon and growth-focused strategy, I recommend a balanced approach with 60% BTC, 25% ETH, 10% ADA, and 5% SOL. This allocation provides strong growth potential while managing risk through diversification...",
    "riskAnalysis": "Your 30% drawdown tolerance aligns well with crypto volatility...",
    "allocation": [
      { "symbol": "BTC", "percentage": 60, "amount": 6000 },
      { "symbol": "ETH", "percentage": 25, "amount": 2500 }
    ]
  }
}
```

---

## Market Sentiment

### Get Current Fear & Greed Index
```http
GET /api/fear-greed?limit=1
```

### Get Historical Fear & Greed Data
```http
GET /api/fear-greed/history?limit=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "value": 65,
      "value_classification": "Greed",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    "history": [
      {
        "value": 63,
        "value_classification": "Greed",
        "timestamp": "2023-12-31T00:00:00Z"
      }
    ],
    "statistics": {
      "average": 58.5,
      "min": 12,
      "max": 89,
      "trend": "bullish"
    }
  }
}
```

---

## Utility Endpoints

### Calculate Risk Profile
```http
POST /risk-profile
```

**Request Body:**
```json
{
  "investmentHorizonYears": 5,
  "maxDrawdownTolerancePct": 30,
  "primaryGoal": "growth"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "category": "Moderate",
    "score": 65
  }
}
```

### Get Portfolio Suggestions
```http
POST /portfolio
```

**Request Body:**
```json
{
  "category": "Moderate",
  "score": 65,
  "startingCapital": 10000
}
```

### Get Oracle Price Feed
```http
POST /price-feed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": [
      { "symbol": "BTC", "price": 45000, "timestamp": "2024-01-01T00:00:00Z" },
      { "symbol": "ETH", "price": 2800, "timestamp": "2024-01-01T00:00:00Z" }
    ]
  }
}
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "data": null,
  "error": {
    "message": "Portfolio not found",
    "code": "PORTFOLIO_NOT_FOUND",
    "details": {}
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Environment Variables

### Required Configuration
```bash
# API Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/coinadvisor

# External Services
OPENAI_API_KEY=your_openai_api_key
SUPRA_API_KEY=your_supra_oracle_key

# Optional Integrations
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
HEYGEN_API_KEY=your_heygen_key
```

---

## Data Models

### Risk Profile
```typescript
interface RiskProfile {
  category: "Conservative" | "Moderate" | "Aggressive";
  score: number; // 0-100
}
```

### Portfolio
```typescript
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  riskProfile: RiskProfile;
  holdings: Holding[];
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}
```

### Holding
```typescript
interface Holding {
  symbol: string;
  amount: number;
  currentPrice: number;
  value: number;
  percentage: number;
  targetPercentage: number;
}
```

---

## Technology Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: MongoDB with Mongoose
- **Validation**: Zod
- **AI**: OpenAI GPT-4
- **Oracle**: Supra Oracle SDK
- **Containerization**: Docker & Docker Compose

---

## License

MIT License - see LICENSE file for details.

---

## Support

For API support or questions, please open an issue in the repository.