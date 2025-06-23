// MongoDB initialization script for CoinAdvisor
db = db.getSiblingDB('coinadvisor');

// Create collections with proper indexes
db.createCollection('users');
db.createCollection('portfolios');
db.createCollection('portfolio_history');

// Create indexes for better performance
db.users.createIndex({ "userId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { sparse: true });

db.portfolios.createIndex({ "userId": 1, "createdAt": -1 });
db.portfolios.createIndex({ "userId": 1, "name": 1 });

db.portfolio_history.createIndex({ "portfolioId": 1 }, { unique: true });
db.portfolio_history.createIndex({ "portfolioId": 1, "snapshots.timestamp": -1 });

print('Database initialized successfully!');