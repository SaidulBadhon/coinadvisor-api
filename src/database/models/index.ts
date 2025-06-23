// Export all models from a single file for easier imports
export { Portfolio } from "./Portfolio";
export { PortfolioHistory } from "./PortfolioHistory";
export { User } from "./User";

// Export types separately for TypeScript usage
export type { PortfolioDocument, HoldingDocument } from "./Portfolio";
export type { PortfolioHistoryDocument, PortfolioSnapshotDocument } from "./PortfolioHistory";
export type { UserDocument } from "./User";

// Re-export connection utilities
export { connectToDatabase, disconnectFromDatabase, isConnectedToDatabase } from "../connection";