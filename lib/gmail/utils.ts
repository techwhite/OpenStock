/**
 * Gmail 工具函数集合
 */

/**
 * 解析邮件地址，提取显示名称和邮箱地址
 * 例如："John Doe <john@example.com>" => { name: "John Doe", email: "john@example.com" }
 */
export function parseEmailAddress(emailString: string): { name: string; email: string } {
  const match = emailString.match(/^"?([^"]*)"?\s*<(.+)>$/);
  
  if (match) {
    return {
      name: match[1].trim() || match[2],
      email: match[2],
    };
  }
  
  return {
    name: emailString,
    email: emailString,
  };
}

/**
 * 格式化邮件日期为易读格式
 */
export function formatEmailDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} 分钟前`;
    }
    
    if (diffInHours < 24) {
      return `${diffInHours} 小时前`;
    }
    
    if (diffInHours < 48) {
      return '昨天';
    }
    
    if (diffInHours < 7 * 24) {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} 天前`;
    }
    
    // 超过 7 天，显示具体日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 截取邮件摘要
 */
export function extractEmailSnippet(text: string, maxLength: number = 150): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  return cleaned.substring(0, maxLength) + '...';
}

/**
 * 清理 HTML 内容，防止 XSS 攻击
 * 保留基本格式标签，移除脚本和危险属性
 */
export function sanitizeHtmlContent(html: string): string {
  // 移除 script 标签
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除 iframe
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // 移除 on* 事件属性
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^\s>]*/gi, '');
  
  // 移除 javascript: 协议
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"');
  
  return sanitized;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 验证邮箱地址格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
