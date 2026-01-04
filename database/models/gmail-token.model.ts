import { Schema, model, models, Document } from 'mongoose';

export interface IGmailToken extends Document {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  createdAt: Date;
  updatedAt: Date;
}

const GmailTokenSchema = new Schema<IGmailToken>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 在token过期前自动刷新（提前5分钟）
GmailTokenSchema.methods.isExpired = function() {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return this.expiryDate < fiveMinutesFromNow;
};

const GmailToken = models.GmailToken || model<IGmailToken>('GmailToken', GmailTokenSchema);

export default GmailToken;
