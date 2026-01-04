// Gmail API 相关的 TypeScript 类型定义

export interface GmailMessage {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds?: string[];
  isUnread: boolean;
}

export interface GmailMessageDetail extends GmailMessage {
  body: {
    text?: string;
    html?: string;
  };
  attachments: GmailAttachment[];
  to: string[];
  cc?: string[];
  bcc?: string[];
}

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface GmailFilter {
  sender?: string;
  subject?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  isUnread?: boolean;
  maxResults?: number;
}

export interface GmailAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

export interface GmailListResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}
