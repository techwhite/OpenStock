'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GmailMessageDetail } from '@/lib/gmail/types';
import { parseEmailAddress, formatEmailDate, sanitizeHtmlContent, formatFileSize } from '@/lib/gmail/utils';
import { Loader2, Paperclip, User, Calendar } from 'lucide-react';

interface EmailDetailProps {
  messageId: string;
  open: boolean;
  onClose: () => void;
}

export function EmailDetail({ messageId, open, onClose }: EmailDetailProps) {
  const [message, setMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && messageId) {
      fetchMessageDetails();
    }
  }, [messageId, open]);

  const fetchMessageDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/gmail/messages/${messageId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch message details');
      }

      const data = await response.json();
      setMessage(data);
    } catch (err) {
      console.error('Error fetching message details:', err);
      setError('无法加载邮件详情');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[90vw] w-[90vw] sm:h-[90vh] h-[90vh] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isLoading ? "正在加载..." : error ? "发生错误" : message?.subject || "邮件详情"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {message ? `${message.from} 发来的邮件详情` : "正在获取邮件内容..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
          </div>
        ) : message ? (
          <>
            <div className="space-y-4">
              {/* 邮件元数据 */}
              <div className="space-y-2 text-sm border-b pb-4">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {parseEmailAddress(message.from).name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {parseEmailAddress(message.from).email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {formatEmailDate(message.date)}
                  </p>
                </div>

                {message.to && message.to.length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">收件人：</span>
                    {message.to.join(', ')}
                  </div>
                )}

                {message.cc && message.cc.length > 0 && (
                  <div className="text-muted-foreground">
                    <span className="font-medium">抄送：</span>
                    {message.cc.join(', ')}
                  </div>
                )}
              </div>

              {/* 附件信息 */}
              {message.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Paperclip className="h-4 w-4" />
                    <span>{message.attachments.length} 个附件</span>
                  </div>
                  <div className="space-y-1">
                    {message.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md bg-accent text-sm"
                      >
                        <span className="truncate">{attachment.filename}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 邮件正文 */}
              <div className="max-w-none bg-white text-black p-4 rounded-md">
                {message.body.html ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtmlContent(message.body.html),
                    }}
                    className="email-content"
                  />
                ) : message.body.text ? (
                  <pre className="whitespace-pre-wrap font-sans">
                    {message.body.text}
                  </pre>
                ) : (
                  <p className="text-muted-foreground italic">
                    此邮件没有内容
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
