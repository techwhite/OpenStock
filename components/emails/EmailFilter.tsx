'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FilterIcon, X } from 'lucide-react';
import { subDays, format } from 'date-fns';

interface EmailFilterProps {
  onFilterChange: (filter: {
    sender?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    isUnread?: boolean;
  }) => void;
  isLoading?: boolean;
}

export function EmailFilter({ onFilterChange, isLoading }: EmailFilterProps) {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 5), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isUnread, setIsUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleApplyFilter = () => {
    onFilterChange({
      sender: sender || undefined,
      subject: subject || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      isUnread: isUnread || undefined,
    });
    setIsOpen(false);
  };

  const handleClearFilter = () => {
    setSender('');
    setSubject('');
    setStartDate(format(subDays(new Date(), 5), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setIsUnread(false);
    onFilterChange({
      startDate: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsOpen(false);
  };

  const hasActiveFilters = sender || subject || isUnread;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <FilterIcon className="mr-2 h-4 w-4" />
          过滤邮件
          {hasActiveFilters && (
            <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">过滤选项</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-8 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                清除
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="sender">发件人</Label>
              <Input
                id="sender"
                placeholder="example@gmail.com"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">主题关键词</Label>
              <Input
                id="subject"
                placeholder="输入关键词"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">结束日期</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isUnread"
                checked={isUnread}
                onChange={(e) => setIsUnread(e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isUnread" className="cursor-pointer">
                只显示未读邮件
              </Label>
            </div>
          </div>

          <Button
            onClick={handleApplyFilter}
            className="w-full"
            disabled={isLoading}
          >
            应用过滤
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
