import { NextRequest, NextResponse } from 'next/server';
import { gmailClient } from '@/lib/gmail/client';
import { connectToDatabase } from '@/database/mongoose';
import GmailToken from '@/database/models/gmail-token.model';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';

/**
 * GET /api/gmail/callback
 * 处理 Google OAuth 回调，交换授权码获取 tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // 处理用户拒绝授权的情况
    if (error) {
      return NextResponse.redirect(
        new URL('/es?error=access_denied', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/es?error=missing_code', request.url)
      );
    }

    // 获取当前用户会话
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/sign-in?redirect=/es', request.url)
      );
    }

    // 用授权码交换 tokens
    const tokens = await gmailClient.getTokensFromCode(code);

    // 保存 tokens 到数据库
    await connectToDatabase();
    
    await GmailToken.findOneAndUpdate(
      { userId: session.user.id },
      {
        userId: session.user.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
      },
      { upsert: true, new: true }
    );

    // 重定向到邮件页面
    return NextResponse.redirect(new URL('/es?success=true', request.url));
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/es?error=auth_failed', request.url)
    );
  }
}
