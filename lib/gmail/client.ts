import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import { subDays, formatISO } from 'date-fns';
import type { GmailMessage, GmailMessageDetail, GmailFilter, GmailListResponse, GmailAttachment } from './types';

/**
 * Gmail API 客户端类
 * 处理所有与 Gmail API 的交互，包括认证和邮件获取
 */
export class GmailClient {
  private oauth2Client;
  private gmail: gmail_v1.Gmail | null = null;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * 设置访问令牌
   */
  setCredentials(accessToken: string, refreshToken: string, expiryDate: number) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * 获取 OAuth 授权 URL
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // 强制显示同意屏幕以获取 refresh token
    });
  }

  /**
   * 用授权码交换访问令牌
   */
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(): Promise<{ accessToken: string; expiryDate: number }> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
    };
  }

  /**
   * 构建 Gmail 查询字符串
   */
  private buildQuery(filter: GmailFilter): string {
    const queryParts: string[] = [];

    // 默认查询最近 5 天的邮件
    const startDate = filter.startDate 
      ? new Date(filter.startDate) 
      : subDays(new Date(), 5);
    
    const endDate = filter.endDate 
      ? new Date(filter.endDate) 
      : new Date();

    // Gmail 查询语法：after:YYYY/MM/DD before:YYYY/MM/DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    };

    queryParts.push(`after:${formatDate(startDate)}`);
    queryParts.push(`before:${formatDate(endDate)}`);

    if (filter.sender) {
      queryParts.push(`from:${filter.sender}`);
    }

    if (filter.subject) {
      queryParts.push(`subject:${filter.subject}`);
    }

    if (filter.isUnread) {
      queryParts.push('is:unread');
    }

    return queryParts.join(' ');
  }

  /**
   * 解析邮件头部信息
   */
  private parseHeaders(headers: gmail_v1.Schema$MessagePartHeader[] | undefined) {
    const headerMap: Record<string, string> = {};
    
    headers?.forEach(header => {
      if (header.name && header.value) {
        headerMap[header.name.toLowerCase()] = header.value;
      }
    });

    return headerMap;
  }

  /**
   * 获取邮件列表
   */
  async listMessages(filter: GmailFilter = {}): Promise<GmailListResponse> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized. Please set credentials first.');
    }

    const query = this.buildQuery(filter);
    const maxResults = filter.maxResults || 50;

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messageList = response.data.messages || [];
      
      // 获取每封邮件的详细信息
      const messages: GmailMessage[] = await Promise.all(
        messageList.map(async (msg) => {
          if (!msg.id) {
            throw new Error('Message ID is missing');
          }

          const details = await this.gmail!.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const headers = this.parseHeaders(details.data.payload?.headers);
          
          return {
            id: msg.id,
            threadId: msg.threadId || '',
            from: headers['from'] || 'Unknown',
            subject: headers['subject'] || '(No Subject)',
            date: headers['date'] || '',
            snippet: details.data.snippet || '',
            labelIds: details.data.labelIds || undefined,
            isUnread: details.data.labelIds?.includes('UNREAD') || false,
          };
        })
      );

      return {
        messages,
        nextPageToken: response.data.nextPageToken || undefined,
        resultSizeEstimate: response.data.resultSizeEstimate || 0,
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages from Gmail');
    }
  }

  /**
   * 获取单封邮件的详细内容
   */
  async getMessage(messageId: string): Promise<GmailMessageDetail> {
    if (!this.gmail) {
      throw new Error('Gmail client not initialized. Please set credentials first.');
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = this.parseHeaders(message.payload?.headers);
      
      // 解析邮件正文
      const body = await this.parseMessageBody(messageId, message.payload);
      
      // 解析附件
      const attachments = this.parseAttachments(message.payload);

      return {
        id: messageId,
        threadId: message.threadId || undefined,
        from: headers['from'] || 'Unknown',
        subject: headers['subject'] || '(No Subject)',
        date: headers['date'] || '',
        snippet: message.snippet || '',
        labelIds: message.labelIds || undefined,
        isUnread: message.labelIds?.includes('UNREAD') || false,
        to: headers['to']?.split(',').map(s => s.trim()) || [],
        cc: headers['cc']?.split(',').map(s => s.trim()),
        bcc: headers['bcc']?.split(',').map(s => s.trim()),
        body,
        attachments,
      };
    } catch (error) {
      console.error('Error fetching message details:', error);
      throw new Error('Failed to fetch message details from Gmail');
    }
  }

  /**
   * 解析邮件正文（递归处理多部分邮件）
   */
  private async parseMessageBody(messageId: string, payload: gmail_v1.Schema$MessagePart | undefined): Promise<{ text?: string; html?: string }> {
    let text = '';
    let html = '';

    const decodeBase64 = (data: string | undefined | null): string => {
      if (!data) return '';
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    };

    const processPart = async (part: gmail_v1.Schema$MessagePart) => {
      const mimeType = part.mimeType?.toLowerCase();
      
      if (mimeType === 'text/plain') {
        if (part.body?.data) {
          text += decodeBase64(part.body.data);
        } else if (part.body?.attachmentId) {
          // 如果数据在附件中（通常是因为内容很大）
          const attachment = await this.gmail!.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: part.body.attachmentId
          });
          text += decodeBase64(attachment.data.data);
        }
      } else if (mimeType === 'text/html') {
        if (part.body?.data) {
          html += decodeBase64(part.body.data);
        } else if (part.body?.attachmentId) {
          const attachment = await this.gmail!.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: part.body.attachmentId
          });
          html += decodeBase64(attachment.data.data);
        }
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          await processPart(subPart);
        }
      }
    };

    if (payload) {
      await processPart(payload);
    }

    return { 
      text: text || undefined, 
      html: html || undefined 
    };
  }

  /**
   * 解析附件信息
   */
  private parseAttachments(payload: gmail_v1.Schema$MessagePart | undefined): GmailAttachment[] {
    const attachments: GmailAttachment[] = [];

    const processPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        part.parts.forEach(processPart);
      }
    };

    if (payload) {
      processPart(payload);
    }

    return attachments;
  }
}

// 导出单例实例
export const gmailClient = new GmailClient();
