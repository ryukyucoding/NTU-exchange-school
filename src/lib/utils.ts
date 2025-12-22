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
  
  // 轉換 HTML 標籤（如果有的話）- 必須在換行處理之前
  // 處理字體大小標籤（支援嵌套）
  html = html.replace(/<small>([\s\S]*?)<\/small>/g, (match, content) => {
    // 先處理內容中的其他標籤
    const processedContent = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
    return `<small style="font-size: 0.875em;">${processedContent}</small>`;
  });
  html = html.replace(/<big>([\s\S]*?)<\/big>/g, (match, content) => {
    // 先處理內容中的其他標籤
    const processedContent = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">$1</a>');
    return `<big style="font-size: 1.25em;">${processedContent}</big>`;
  });
  
  // 轉換換行（必須在最後處理，避免影響其他標籤）
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
  // 將 <br> 和 <br/> 轉換為換行符號（必須在處理 div/p 之前）
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
  
  // 處理空段落和空 div（可能包含換行或空白）
  markdown = markdown.replace(/<p[^>]*>\s*<\/p>/gi, '\n');
  markdown = markdown.replace(/<div[^>]*>\s*<\/div>/gi, '\n');
  
  // 處理只包含 <br> 的段落或 div（單個換行的情況）- 此時 <br> 已經被轉換為 \n
  // 使用更寬鬆的匹配，允許空白字符
  markdown = markdown.replace(/<(p|div)[^>]*>[\s\n]*\n[\s\n]*<\/(p|div)>/gi, '\n');
  
  // 處理所有塊級元素的結束標籤（產生換行）- 必須在處理開始標籤之前
  markdown = markdown.replace(/<\/(p|div|h[1-6])>/gi, '\n');
  
  // 處理段落和 div 開始標籤（移除標籤但保留內容）
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  markdown = markdown.replace(/<div[^>]*>/gi, '');
  
  // 先處理字體大小標籤（必須在最前面處理，避免被其他標籤處理影響）
  // 使用遞迴方式處理嵌套的字體大小標籤
  let changed = true;
  while (changed) {
    const before = markdown;
    markdown = markdown.replace(/<small[^>]*>([\s\S]*?)<\/small>/gi, (match, content) => {
      // 先處理內容中的嵌套標籤（除了 small 和 big）
      let processedContent = content
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi, '![$2]($1)')
        .replace(/<h1>([\s\S]*?)<\/h1>/gi, '# $1')
        .replace(/<h2>([\s\S]*?)<\/h2>/gi, '## $1')
        .replace(/<h3>([\s\S]*?)<\/h3>/gi, '### $1')
        .replace(/<[^>]+>/g, ''); // 移除其他 HTML 標籤
      return `<small>${processedContent}</small>`;
    });
    markdown = markdown.replace(/<big[^>]*>([\s\S]*?)<\/big>/gi, (match, content) => {
      // 先處理內容中的嵌套標籤（除了 small 和 big）
      let processedContent = content
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]+src="([^"]+)"[^>]*(?:alt="([^"]*)")?[^>]*>/gi, '![$2]($1)')
        .replace(/<h1>([\s\S]*?)<\/h1>/gi, '# $1')
        .replace(/<h2>([\s\S]*?)<\/h2>/gi, '## $1')
        .replace(/<h3>([\s\S]*?)<\/h3>/gi, '### $1')
        .replace(/<[^>]+>/g, ''); // 移除其他 HTML 標籤
      return `<big>${processedContent}</big>`;
    });
    changed = before !== markdown;
  }
  
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
  
  // 移除其他 HTML 標籤但保留文字內容（但保留 <small> 和 <big>）
  markdown = markdown.replace(/<(?!small|big|\/small|\/big)[^>]+>/g, '');
  
  // 清理多餘的換行和空白
  // 先移除行尾空白（在換行前的空格和 tab）
  markdown = markdown.replace(/[ \t]+\n/g, '\n');
  
  // 清理連續的換行（保留最多兩個連續換行）
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  // 確保單個換行被保留：將換行前後的空白標準化
  // 將 " \n" 或 "\n " 標準化為 "\n"，但保留換行本身
  markdown = markdown.replace(/([^\n])[ \t]*\n[ \t]*([^\n])/g, '$1\n$2');
  
  // 不要 trim，保留開頭和結尾的換行（如果有的話）
  return markdown;
}
