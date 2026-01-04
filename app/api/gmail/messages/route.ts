import { NextRequest, NextResponse } from 'next/server';
import { gmailClient } from '@/lib/gmail/client';
import { connectToDatabase } from '@/database/mongoose';
import GmailToken from '@/database/models/gmail-token.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import type { GmailFilter } from '@/lib/gmail/types';

/**
 * GET /api/gmail/messages
 * 获取用户的 Gmail 邮件列表
 * 
 * Query Parameters:
 * - sender: 过滤发件人
 * - subject: 过滤主题关键词
 * - startDate: 开始日期 (ISO string)
 * - endDate: 结束日期 (ISO string)
 * - isUnread: 只显示未读邮件 (boolean)
 * - maxResults: 最大返回数量 (number)
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户会话
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // 获取用户的 Gmail tokens
    const tokenDoc = await GmailToken.findOne({ userId: session.user.id });

    if (!tokenDoc) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please authorize first.' },
        { status: 403 }
      );
    }

    // 检查 token 是否过期，如果过期则刷新
    let accessToken = tokenDoc.accessToken;
    let expiryDate = tokenDoc.expiryDate;

    if (tokenDoc.isExpired()) {
      gmailClient.setCredentials(
        tokenDoc.accessToken,
        tokenDoc.refreshToken,
        tokenDoc.expiryDate
      );

      const refreshed = await gmailClient.refreshAccessToken();
      accessToken = refreshed.accessToken;
      expiryDate = refreshed.expiryDate;

      // 更新数据库中的 token
      await GmailToken.findByIdAndUpdate(tokenDoc._id, {
        accessToken,
        expiryDate,
      });
    }

    // 设置 Gmail 客户端凭证
    gmailClient.setCredentials(accessToken, tokenDoc.refreshToken, expiryDate);

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams;
    const filter: GmailFilter = {
      sender: searchParams.get('sender') || undefined,
      subject: searchParams.get('subject') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      isUnread: searchParams.get('isUnread') === 'true' || undefined,
      maxResults: parseInt(searchParams.get('maxResults') || '50'),
    };

    // 获取邮件列表
    const result = await gmailClient.listMessages(filter);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages from Gmail' },
      { status: 500 }
    );
  }
}
