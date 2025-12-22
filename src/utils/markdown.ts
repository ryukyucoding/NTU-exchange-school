/**
 * 清理 Markdown 內容，移除語法標記，只保留純文字
 */
export function cleanMarkdown(content: string): string {
  if (!content) return '';
  
  let cleaned = content;
  
  // 移除圖片標記: ![alt](url) 或 ![](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  
  // 移除連結標記: [text](url) 但保留文字
  // 先處理有文字的連結: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // 處理沒有文字的連結: [](url) -> 移除整個連結
  cleaned = cleaned.replace(/\[\]\([^\)]+\)/g, '');
  
  // 處理 HTML 實體編碼的連結（如 &amp;）
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  
  // 再次處理可能遺漏的連結格式
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^\)]+\)/g, (match, text) => {
    return text || '';
  });
  
  // 移除粗體/斜體標記: **text** 或 *text* 或 __text__ 或 _text_
  cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // 移除標題標記: # ## ### 等
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // 移除列表標記: - * + 或 1. 2. 等
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^\d+\.\s+/gm, '');
  
  // 移除引用標記: >
  cleaned = cleaned.replace(/^>\s+/gm, '');
  
  // 移除代碼塊: ```code``` 或 `code`
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // 移除水平線: --- 或 ***
  cleaned = cleaned.replace(/^[-*]{3,}$/gm, '');
  
  // 移除多餘的空白行（保留單個換行）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // 移除首尾空白
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * 限制文字行數，最多顯示指定行數
 */
export function truncateLines(text: string, maxLines: number = 3): string {
  if (!text) return '';
  
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  
  return lines.slice(0, maxLines).join('\n') + '...';
}

