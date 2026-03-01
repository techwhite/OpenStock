'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithDecryption } from '@/lib/api-helper';

interface EmailComposeProps {
  onSent?: () => void;
  initialData?: {
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmailCompose({ onSent, initialData, trigger, open, onOpenChange }: EmailComposeProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [isSending, setIsSending] = useState(false);
  const [to, setTo] = useState(initialData?.to || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');

  // 当初始数据变化时（例如点击不同的回复按钮），更新状态
  useEffect(() => {
    if (initialData) {
      setTo(initialData.to || '');
      setSubject(initialData.subject || '');
      setBody(initialData.body || '');
    }
  }, [initialData]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast.error('请填写收件人、主题和正文');
      return;
    }

    setIsSending(true);

    try {
      await fetchWithDecryption('/api/gmail/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          body: body.replace(/\n/g, '<br>'), // 简单的换行转 HTML
          cc: cc || undefined,
          bcc: bcc || undefined,
          threadId: initialData?.threadId,
        }),
      });

      toast.success('邮件已发送');
      setIsOpen(false);
      resetForm();
      if (onSent) onSent();
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || '发送失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setTo('');
    setSubject('');
    setBody('');
    setCc('');
    setBcc('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : !onOpenChange && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            写邮件
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>撰写新邮件</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="to" className="text-right">
              收件人
            </Label>
            <Input
              id="to"
              placeholder="example@gmail.com"
              className="col-span-3"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cc" className="text-right">
              抄送
            </Label>
            <Input
              id="cc"
              placeholder="抄送地址 (可选)"
              className="col-span-3"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              主题
            </Label>
            <Input
              id="subject"
              placeholder="邮件主题"
              className="col-span-3"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="body">内容</Label>
            <textarea
              id="body"
              className="flex min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="写下您的邮件内容..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={isSending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
            取消
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在发送...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                发送
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
