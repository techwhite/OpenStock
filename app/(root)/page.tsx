'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EmailList } from '@/components/emails/EmailList';
import { EmailFilter } from '@/components/emails/EmailFilter';
import { EmailCompose } from '@/components/emails/EmailCompose';
import { Button } from '@/components/ui/button';
import type { GmailMessage } from '@/lib/gmail/types';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fetchWithDecryption } from '@/lib/api-helper';

export default function EmailsPage() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    sender?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    isUnread?: boolean;
  }>({
    startDate: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (success === 'true') {
      setIsAuthenticated(true);
      fetchMessages();
    }

    if (errorParam) {
      setError('授权失败，请重试');
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthenticated === true) {
      fetchMessages();
    }
  }, [filter, isAuthenticated]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/gmail/auth');
      const data = await response.json();

      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setAuthUrl(data.authUrl);
      }
    } catch (err) {
      console.error('Error checking auth status:', err);
      setError('无法检查认证状态');
    }
  };

  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filter.sender) params.append('sender', filter.sender);
      if (filter.subject) params.append('subject', filter.subject);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      if (filter.isUnread) params.append('isUnread', 'true');

      const data = await fetchWithDecryption<{ messages: GmailMessage[] }>(`/api/gmail/messages?${params.toString()}`);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.message || '无法加载邮件');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  // 未认证状态
  if (isAuthenticated === false && authUrl) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Mail className="h-16 w-16 text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-2">连接 Gmail</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            要查看您的邮件，请先授权 Openlearn 访问您的 Gmail 账户。
            我们只会读取邮件，不会发送或删除任何内容。
          </p>
          <Button size="lg" asChild>
            <a href={authUrl}>
              <Mail className="mr-2 h-5 w-5" />
              连接 Gmail 账户
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* 页面头部 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">我的邮件</h1>
        <p className="text-muted-foreground">
          查看和管理您的 Gmail 邮件
        </p>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <EmailCompose onSent={handleRefresh} />
          <EmailFilter onFilterChange={setFilter} isLoading={isLoading} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {!isLoading && messages.length > 0 && (
            <span>{messages.length} 封邮件</span>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">错误</p>
            <p className="text-sm text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* 邮件列表 */}
      <div className="rounded-lg border bg-card shadow-sm">
        <EmailList messages={messages} isLoading={isLoading} />
      </div>
    </div>
  );
}
