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
    // 设置token在创建4小时后自动过期删除
    // 注意：虽然Google Access Token有效期只有1小时，我们需要Refresh Token来维持这4小时的会话
    // 但是通过由于TTL索引，整个Session会在4小时后强制结束
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 14400, // 4小时 (4 * 60 * 60 秒)
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
