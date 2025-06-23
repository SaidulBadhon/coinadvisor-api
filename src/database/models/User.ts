import mongoose, { Schema, Document } from "mongoose";
import { RiskAnswers, RiskProfile } from "../../finance";

export interface UserDocument extends Document {
  userId: string; // External user ID (from auth system)
  email?: string;
  name?: string;
  riskProfile?: RiskProfile;
  riskAnswers?: RiskAnswers;
  preferences: {
    currency: string;
    timezone: string;
    notifications: {
      rebalanceAlerts: boolean;
      performanceUpdates: boolean;
      marketSentiment: boolean;
    };
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RiskAnswersSchema = new Schema(
  {
    investmentHorizonYears: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDrawdownTolerancePct: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    primaryGoal: {
      type: String,
      enum: ["growth", "income", "preservation"],
      required: true,
    },
  },
  {
    _id: false,
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

const UserPreferencesSchema = new Schema(
  {
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "BTC", "ETH"],
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    notifications: {
      rebalanceAlerts: {
        type: Boolean,
        default: true,
      },
      performanceUpdates: {
        type: Boolean,
        default: true,
      },
      marketSentiment: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    _id: false,
  }
);

const UserSchema = new Schema<UserDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple documents with null email
      validate: {
        validator: function (email: string) {
          if (!email) return true; // Allow empty email
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Invalid email format",
      },
    },
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    riskProfile: {
      type: RiskProfileSchema,
      required: false,
    },
    riskAnswers: {
      type: RiskAnswersSchema,
      required: false,
    },
    preferences: {
      type: UserPreferencesSchema,
      default: () => ({}),
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);


// Method to update last login
UserSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Method to update risk profile
UserSchema.methods.updateRiskProfile = function (
  answers: RiskAnswers,
  profile: RiskProfile
) {
  this.riskAnswers = answers;
  this.riskProfile = profile;
  return this.save();
};

// Virtual for user's portfolio count (would need to be populated separately)
UserSchema.virtual("portfolioCount", {
  ref: "Portfolio",
  localField: "userId",
  foreignField: "userId",
  count: true,
});

// Static method to find users by risk category
UserSchema.statics.findByRiskCategory = function (category: string) {
  return this.find({ "riskProfile.category": category });
};

// Static method to get user stats
UserSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$riskProfile.category",
        count: { $sum: 1 },
        avgScore: { $avg: "$riskProfile.score" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  const totalUsers = await this.countDocuments();

  return {
    totalUsers,
    riskDistribution: stats,
  };
};

export const User = mongoose.model<UserDocument>("User", UserSchema);
