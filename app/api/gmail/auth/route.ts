import { NextRequest, NextResponse } from 'next/server';
import { gmailClient } from '@/lib/gmail/client';
import { connectToDatabase } from '@/database/mongoose';
import GmailToken from '@/database/models/gmail-token.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

/**
 * GET /api/gmail/auth
 * 获取 Gmail OAuth 授权 URL 或检查认证状态
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

    // 检查用户是否已有 Gmail token
    const existingToken = await GmailToken.findOne({ userId: session.user.id });

    if (existingToken) {
      return NextResponse.json({
        authenticated: true,
        message: 'Gmail account already connected',
      });
    }

    // 生成授权 URL
    const authUrl = gmailClient.getAuthUrl();

    return NextResponse.json({
      authenticated: false,
      authUrl,
    });
  } catch (error) {
    console.error('Error in Gmail auth check:', error);
    return NextResponse.json(
      { error: 'Failed to check Gmail authentication status' },
      { status: 500 }
    );
  }
}
