import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 計算字元數（支援中文字元）
 * @param text 要計算的文字
 * @returns 包含字元數的物件
 */
export function countCharacters(text: string): { count: number } {
  // 計算字元數（中文字元算一個字元）
  const count = text.length;
  return { count };
}

/**
 * 解析內容中的看板標記（#看板名稱）
 * @param content 貼文內容
 * @returns 看板名稱陣列
 */
export function parseBoards(content: string): string[] {
  // 匹配 #看板名稱 格式（支援中文、英文、數字、底線）
  const boardRegex = /#([\w\u4e00-\u9fa5]+)/g;
  const matches = content.matchAll(boardRegex);
  const boards: string[] = [];
  
  for (const match of matches) {
    const boardName = match[1];
    if (boardName && !boards.includes(boardName)) {
      boards.push(boardName);
    }
  }
  
  return boards;
}

/**
 * 將 Markdown 轉換為 HTML（用於顯示）
 * @param markdown Markdown 文字
 * @returns HTML 字串
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // 轉換標題
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // 轉換粗體 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // 先轉換圖片 ![alt](url) - 必須在處理連結之前，避免被誤移除
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; display: block; margin: 1rem 0;" />');
  
  // 移除空連結 [](url) - 沒有文字的普通連結（不包含圖片，因為圖片已經被轉換了）
  html = html.replace(/\[\]\([^)]+\)/g, '');
  
  // 轉換連結 [text](url) - 只處理有文字的連結
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
  
  // 轉換 HTML 標籤（如果有的話）
  html = html.replace(/<small>(.+?)<\/small>/g, '<small style="font-size: 0.875em;">$1</small>');
  html = html.replace(/<big>(.+?)<\/big>/g, '<big style="font-size: 1.25em;">$1</big>');
  
  // 轉換換行
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

/**
 * 將 HTML 轉換回 Markdown（用於保存）
 * @param html HTML 字串
 * @returns Markdown 字串
 */
export function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // 先處理換行，避免影響其他標籤的匹配
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // 轉換標題
  markdown = markdown.replace(/<h1>(.+?)<\/h1>/gi, '# $1\n');
  markdown = markdown.replace(/<h2>(.+?)<\/h2>/gi, '## $1\n');
  markdown = markdown.replace(/<h3>(.+?)<\/h3>/gi, '### $1\n');
  
  // 轉換粗體（需要遞迴處理嵌套情況和換行）
  // 先處理包含換行的粗體標籤
  markdown = markdown.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (match, content) => {
    // 移除內容中的 HTML 標籤，保留換行
    const processedContent = content
      .replace(/<[^>]+>/g, '')
      .replace(/\n/g, '\n'); // 保留換行
    // 如果內容包含換行，需要分段處理
    if (processedContent.includes('\n')) {
      return processedContent.split('\n').map((line: string) => 
        line.trim() ? `**${line.trim()}**` : ''
      ).join('\n');
    }
    return `**${processedContent}**`;
  });
  markdown = markdown.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (match, content) => {
    const processedContent = content.replace(/<[^>]+>/g, '');
    if (processedContent.includes('\n')) {
      return processedContent.split('\n').map((line: string) => 
        line.trim() ? `**${line.trim()}**` : ''
      ).join('\n');
    }
    return `**${processedContent}**`;
  });
  
  // 轉換連結
  markdown = markdown.replace(/<a[^>]+href="([^"]+)"[^>]*>(.+?)<\/a>/gi, (match, url, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '');
    return `[${cleanText}](${url})`;
  });
  
  // 轉換圖片
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi, (match, url, alt) => {
    return `![${alt || ''}](${url})`;
  });
  
  // 轉換 HTML 標籤
  markdown = markdown.replace(/<small[^>]*>(.+?)<\/small>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, '');
    return `<small>${cleanContent}</small>`;
  });
  markdown = markdown.replace(/<big[^>]*>(.+?)<\/big>/gi, (match, content) => {
    const cleanContent = content.replace(/<[^>]+>/g, '');
    return `<big>${cleanContent}</big>`;
  });
  
  // 處理段落標籤
  markdown = markdown.replace(/<\/p>/gi, '\n');
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  
  // 移除其他 HTML 標籤但保留文字內容
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // 清理多餘的換行和空白
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/[ \t]+\n/g, '\n'); // 移除行尾空白
  
  return markdown.trim();
}
