import mongoose, { Schema, Document } from "mongoose";

export interface PortfolioSnapshotDocument {
  portfolioId: string;
  totalValue: number;
  holdings: {
    symbol: string;
    amount: number;
    price: number;
    value: number;
    percentage: number;
  }[];
  timestamp: Date;
}

export interface PortfolioHistoryDocument extends Document {
  portfolioId: string;
  snapshots: PortfolioSnapshotDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSnapshotSchema = new Schema<PortfolioSnapshotDocument>(
  {
    portfolioId: {
      type: String,
      required: true,
      index: true,
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },
    holdings: [
      {
        symbol: {
          type: String,
          required: true,
          trim: true,
          uppercase: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        value: {
          type: Number,
          required: true,
          min: 0,
        },
        percentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    _id: false,
  }
);

const PortfolioHistorySchema = new Schema<PortfolioHistoryDocument>(
  {
    portfolioId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    snapshots: {
      type: [PortfolioSnapshotSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "portfolio_history",
  }
);

// Compound index for time-based queries
PortfolioHistorySchema.index({ portfolioId: 1, "snapshots.timestamp": -1 });

// Method to add a new snapshot
PortfolioHistorySchema.methods.addSnapshot = function (
  snapshot: Omit<PortfolioSnapshotDocument, "timestamp">
) {
  this.snapshots.push({
    ...snapshot,
    timestamp: new Date(),
  });

  // Keep only last 1000 snapshots to manage storage
  if (this.snapshots.length > 1000) {
    this.snapshots = this.snapshots.slice(-1000);
  }

  return this.save();
};

// Method to get snapshots within a date range
PortfolioHistorySchema.methods.getSnapshotsInRange = function (
  startDate: Date,
  endDate: Date
) {
  return this.snapshots.filter(
    (snapshot: PortfolioSnapshotDocument) =>
      snapshot.timestamp >= startDate && snapshot.timestamp <= endDate
  );
};

// Static method to get performance data
PortfolioHistorySchema.statics.getPerformanceData = async function (
  portfolioId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await this.findOne({ portfolioId });
  if (!history) return null;

  const snapshots = history.getSnapshotsInRange(startDate, new Date());

  if (snapshots.length < 2) return null;

  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];

  const totalReturn = lastSnapshot.totalValue - firstSnapshot.totalValue;
  const totalReturnPct = (totalReturn / firstSnapshot.totalValue) * 100;

  return {
    startValue: firstSnapshot.totalValue,
    endValue: lastSnapshot.totalValue,
    totalReturn,
    totalReturnPct,
    snapshots: snapshots.map((s: any) => ({
      date: s.timestamp,
      value: s.totalValue,
    })),
  };
};

export const PortfolioHistory = mongoose.model<PortfolioHistoryDocument>(
  "PortfolioHistory",
  PortfolioHistorySchema
);
