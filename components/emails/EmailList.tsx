'use client';

import { useState } from 'react';
import type { GmailMessage } from '@/lib/gmail/types';
import { parseEmailAddress, formatEmailDate } from '@/lib/gmail/utils';
import { EmailDetail } from './EmailDetail';
import { Mail, MailOpen, Loader2 } from 'lucide-react';

interface EmailListProps {
  messages: GmailMessage[];
  isLoading?: boolean;
}

export function EmailList({ messages, isLoading }: EmailListProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">没有找到邮件</p>
        <p className="text-sm text-muted-foreground mt-1">
          尝试调整过滤条件
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border">
        {messages.map((message) => {
          const { name, email } = parseEmailAddress(message.from);
          
          return (
            <div
              key={message.id}
              onClick={() => setSelectedMessageId(message.id)}
              className={`
                p-4 cursor-pointer transition-colors hover:bg-accent
                ${message.isUnread ? 'bg-accent/50' : ''}
              `}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {message.isUnread ? (
                    <Mail className="h-5 w-5 text-primary" />
                  ) : (
                    <MailOpen className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className={`
                      text-sm truncate
                      ${message.isUnread ? 'font-semibold' : 'font-medium'}
                    `}>
                      {name}
                    </h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatEmailDate(message.date)}
                    </span>
                  </div>

                  <p className={`
                    text-sm truncate mb-1
                    ${message.isUnread ? 'font-medium' : 'text-muted-foreground'}
                  `}>
                    {message.subject}
                  </p>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.snippet}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMessageId && (
        <EmailDetail
          messageId={selectedMessageId}
          open={!!selectedMessageId}
          onClose={() => setSelectedMessageId(null)}
        />
      )}
    </>
  );
}
