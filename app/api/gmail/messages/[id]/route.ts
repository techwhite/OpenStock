import { NextRequest, NextResponse } from 'next/server';
import { gmailClient } from '@/lib/gmail/client';
import { connectToDatabase } from '@/database/mongoose';
import GmailToken from '@/database/models/gmail-token.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

/**
 * GET /api/gmail/messages/[id]
 * 获取单封邮件的详细内容
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // 检查并刷新过期的 token
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

      await GmailToken.findByIdAndUpdate(tokenDoc._id, {
        accessToken,
        expiryDate,
      });
    }

    // 设置 Gmail 客户端凭证
    gmailClient.setCredentials(accessToken, tokenDoc.refreshToken, expiryDate);

    // 获取邮件详情
    const message = await gmailClient.getMessage(id);

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error fetching Gmail message details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message details from Gmail' },
      { status: 500 }
    );
  }
}
