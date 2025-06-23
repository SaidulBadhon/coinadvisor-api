import { connectToDatabase } from "./connection";
import { Portfolio, PortfolioHistory, User } from "./models";

export async function createDatabaseIndexes(): Promise<void> {
  await connectToDatabase();
  
  try {
    console.log("Creating database indexes...");
    
    // Portfolio indexes
    await Portfolio.collection.createIndex({ userId: 1, createdAt: -1 });
    await Portfolio.collection.createIndex({ userId: 1, name: 1 });
    await Portfolio.collection.createIndex({ "riskProfile.category": 1 });
    await Portfolio.collection.createIndex({ totalValue: -1 });
    await Portfolio.collection.createIndex({ updatedAt: -1 });
    
    // Portfolio History indexes
    await PortfolioHistory.collection.createIndex({ portfolioId: 1 }, { unique: true });
    await PortfolioHistory.collection.createIndex({ portfolioId: 1, "snapshots.timestamp": -1 });
    await PortfolioHistory.collection.createIndex({ "snapshots.timestamp": -1 });
    
    // User indexes
    await User.collection.createIndex({ userId: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { sparse: true });
    await User.collection.createIndex({ "riskProfile.category": 1 });
    await User.collection.createIndex({ createdAt: -1 });
    await User.collection.createIndex({ lastLogin: -1 });
    
    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating database indexes:", error);
    throw error;
  }
}

export async function dropDatabaseIndexes(): Promise<void> {
  await connectToDatabase();
  
  try {
    console.log("Dropping database indexes...");
    
    await Portfolio.collection.dropIndexes();
    await PortfolioHistory.collection.dropIndexes();
    await User.collection.dropIndexes();
    
    console.log("Database indexes dropped successfully");
  } catch (error) {
    console.error("Error dropping database indexes:", error);
    throw error;
  }
}

export async function listDatabaseIndexes(): Promise<void> {
  await connectToDatabase();
  
  try {
    console.log("=== Portfolio Indexes ===");
    const portfolioIndexes = await Portfolio.collection.listIndexes().toArray();
    portfolioIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log("\n=== Portfolio History Indexes ===");
    const historyIndexes = await PortfolioHistory.collection.listIndexes().toArray();
    historyIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log("\n=== User Indexes ===");
    const userIndexes = await User.collection.listIndexes().toArray();
    userIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
  } catch (error) {
    console.error("Error listing database indexes:", error);
    throw error;
  }
}

// Database maintenance functions
export async function getCollectionStats(): Promise<void> {
  await connectToDatabase();
  
  try {
    const portfolioStats = await Portfolio.collection.stats();
    const historyStats = await PortfolioHistory.collection.stats();
    const userStats = await User.collection.stats();
    
    console.log("=== Database Statistics ===");
    console.log(`Portfolios: ${portfolioStats.count} documents, ${(portfolioStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Portfolio History: ${historyStats.count} documents, ${(historyStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Users: ${userStats.count} documents, ${(userStats.size / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error("Error getting collection stats:", error);
    throw error;
  }
}

export async function optimizeDatabase(): Promise<void> {
  await connectToDatabase();
  
  try {
    console.log("Optimizing database...");
    
    // Clean up old portfolio snapshots (keep only last 100 per portfolio)
    const histories = await PortfolioHistory.find({});
    for (const history of histories) {
      if (history.snapshots.length > 100) {
        history.snapshots = history.snapshots.slice(-100);
        await history.save();
      }
    }
    
    console.log("Database optimization completed");
  } catch (error) {
    console.error("Error optimizing database:", error);
    throw error;
  }
}