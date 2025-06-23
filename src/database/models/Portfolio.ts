import mongoose, { Schema, Document } from "mongoose";
import { RiskProfile } from "../../finance";

export interface HoldingDocument {
  symbol: string;
  amount: number;
  currentPrice: number;
  value: number;
  percentage: number;
  targetPercentage: number;
}

export interface PortfolioDocument extends Document {
  userId: string;
  name: string;
  riskProfile: RiskProfile;
  holdings: HoldingDocument[];
  totalValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const HoldingSchema = new Schema<HoldingDocument>(
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
    currentPrice: {
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
    targetPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  {
    _id: false, // Disable _id for subdocuments
  }
);

const RiskProfileSchema = new Schema(
  {
    category: {
      type: String,
      enum: ["Conservative", "Moderate", "Aggressive"],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const PortfolioSchema = new Schema<PortfolioDocument>(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true, // Index for efficient user queries
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    riskProfile: {
      type: RiskProfileSchema,
      required: true,
    },
    holdings: {
      type: [HoldingSchema],
      default: [],
      validate: {
        validator: function (holdings: HoldingDocument[]) {
          // Ensure total target percentage doesn't exceed 100%
          const totalPercentage = holdings.reduce(
            (sum, holding) => sum + holding.targetPercentage,
            0
          );
          return totalPercentage <= 100;
        },
        message: "Total target percentage cannot exceed 100%",
      },
    },
    totalValue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    collection: "portfolios",
  }
);

// Compound index for user-specific queries
PortfolioSchema.index({ userId: 1, createdAt: -1 });

// Index for portfolio name searches within user scope
PortfolioSchema.index({ userId: 1, name: 1 });

// Virtual for portfolio age
PortfolioSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt.getTime();
});

// Method to calculate current total value
PortfolioSchema.methods.calculateTotalValue = function (): number {
  return this.holdings.reduce(
    (total: number, holding: HoldingDocument) => total + holding.value,
    0
  );
};

// Method to check if rebalancing is needed
PortfolioSchema.methods.needsRebalancing = function (
  threshold: number = 5
): boolean {
  return this.holdings.some(
    (holding: HoldingDocument) =>
      Math.abs(holding.percentage - holding.targetPercentage) > threshold
  );
};

// Static method to find portfolios by risk category
PortfolioSchema.statics.findByRiskCategory = function (category: string) {
  return this.find({ "riskProfile.category": category });
};

// Pre-save middleware to update totalValue
PortfolioSchema.pre("save", function (next) {
  if (this.holdings && this.holdings.length > 0) {
    this.totalValue = this.calculateTotalValue();
  }
  next();
});

// Pre-save middleware to validate holdings
PortfolioSchema.pre("save", function (next) {
  // Ensure no duplicate symbols
  const symbols = this.holdings.map((h) => h.symbol);
  const uniqueSymbols = new Set(symbols);

  if (symbols.length !== uniqueSymbols.size) {
    const error = new Error("Duplicate symbols are not allowed in holdings");
    return next(error);
  }

  next();
});

export const Portfolio = mongoose.model<PortfolioDocument>(
  "Portfolio",
  PortfolioSchema
);
