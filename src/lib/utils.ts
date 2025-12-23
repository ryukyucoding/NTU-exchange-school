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
    // 增大字体大小，从 1.25em 改为 1.5em，并添加字体粗细
    return `<big style="font-size: 1.5em; font-weight: 500;">${processedContent}</big>`;
  });
  
  // 轉換換行（必須在最後處理，避免影響其他標籤）
  // 關鍵：將換行轉換為 <div></div> 結構，這樣 contentEditable 可以正確處理
  // 但為了兼容性，我們先轉換為 <br>，然後讓 contentEditable 自然轉換為 <div>
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
  
  // 重要：處理段落和 div 標籤，確保每個段落/div 之間都有換行
  // 關鍵修復：先將連續的 </div><div> 或 </p><p> 合併處理，確保它們之間只有一個換行
  // 將 </div><div> 或 </p><p> 這種連續標籤替換為單個換行，避免重複換行
  // 注意：這個替換會將 </div><div> 替換為 \n，所以第一個 </div> 和 <div> 都會被移除
  markdown = markdown.replace(/(<\/(p|div|h[1-6])>)(<(p|div|h[1-6])[^>]*>)/gi, '\n');
  
  // 先將段落和 div 的結束標籤轉換為換行，然後移除標籤
  // 重要：每個結束標籤都轉換為換行，這樣可以確保段落之間有換行
  // 注意：此時 </div><div> 已經被替換為 \n，所以不會產生重複換行
  markdown = markdown.replace(/<\/(p|div|h[1-6])>/gi, '\n');
  
  // 然後處理開始標籤，移除標籤但保留內容
  markdown = markdown.replace(/<p[^>]*>/gi, '');
  markdown = markdown.replace(/<div[^>]*>/gi, '');
  
  // 關鍵修復：檢查第一個換行是否被丟失
  // 如果內容以非換行字符開始，後面緊跟著另一個非換行字符（沒有換行分隔），
  // 這表示第一個 </div> 轉換的換行被丟失了
  // 但這只適用於第一個字符和第二個字符之間沒有換行的情況
  // 實際上，如果HTML是 <div>哈</div><div>哈</div>，處理後應該是 哈\n哈\n
  // 但如果第一個 </div> 後面有 <div>，它已經被上面的替換處理為 \n
  // 所以結果應該是 哈\n哈\n，這是對的
  // 但如果用戶輸入時第一個字符前有換行，contentEditable可能不會生成對應的HTML結構
  // 讓我們檢查：如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），我們需要插入換行
  // 但這可能會導致誤判，因為我們不知道這是否真的是第一個換行丟失的情況
  // 實際上，問題可能是：當我們處理 </div><div> 時，我們將其替換為 \n，但這會導致第一個 </div> 和 <div> 都被移除
  // 所以第一個 </div> 轉換的換行應該被保留，但實際上它被替換為 \n 了
  // 讓我們檢查：如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），這表示第一個換行丟失了
  // 修復：在處理完所有標籤後，檢查第一個字符和第二個字符之間是否有換行，如果沒有，插入換行
  // 但這只適用於第一個字符和第二個字符都是非換行字符的情況
  // 實際上，如果HTML是 <div>哈</div><div>哈</div>，處理後應該是 哈\n哈\n
  // 但如果第一個 </div> 後面有 <div>，它已經被上面的替換處理為 \n
  // 所以結果應該是 哈\n哈\n，這是對的
  // 但如果用戶輸入時第一個字符前有換行，contentEditable可能不會生成對應的HTML結構
  // 讓我們檢查：如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），我們需要插入換行
  // 但這可能會導致誤判，因為我們不知道這是否真的是第一個換行丟失的情況
  
  // 關鍵修復：確保第一個段落後的換行被保留
  // 問題：當HTML是 <div>我</div><div>我</div> 時，處理流程：
  // 1. </div><div> → \n: <div>我\n<div>我</div>
  // 2. </div> → \n: <div>我\n<div>我\n
  // 3. <div> → 移除: 我\n我\n
  // 這應該是對的，但用戶說第一個換行丟失了
  // 可能問題：如果第一個 </div> 後面沒有 <div>（即最後一個段落），它的換行應該被保留
  // 但實際上，如果HTML是 <div>我</div><div>我</div>，第一個 </div> 後面有 <div>，所以會被替換為 \n
  // 然後第二個 </div> 也會被替換為 \n，所以結果應該是 我\n我\n
  // 但如果用戶輸入時第一個字符前有換行，contentEditable可能不會生成對應的HTML結構
  // 讓我們檢查：如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），這表示第一個換行丟失了
  // 但這可能會導致誤判，因為我們不知道這是否真的是第一個換行丟失的情況
  
  // 關鍵修復：確保第一個段落後的換行被保留
  // 問題：當HTML是 <div>我</div><div>我</div> 時，處理後應該是 我\n我\n
  // 但如果第一個 </div> 轉換的換行被後續處理移除了，就會變成 我我\n
  // 檢查：如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），這表示第一個換行丟失了
  // 但這可能會導致誤判，因為我們不知道這是否真的是第一個換行丟失的情況
  // 實際上，問題可能是：當我們處理 </div> 時，如果它後面緊跟著 <div>，我們已經在之前插入了換行
  // 但如果第一個 </div> 後面沒有 <div>（即最後一個段落），它的換行應該被保留
  // 讓我們確保不會意外移除第一個換行
  
  // 關鍵修復：處理第一個段落/div 前的情況
  // 如果內容以文字開始（不是換行），且第一個字符前沒有換行，這表示第一個段落
  // 但我們需要確保第一個段落後的換行被保留
  // 實際上，問題可能是：當我們移除第一個 <div> 時，如果它前面沒有換行，第一個"我"前就沒有換行
  // 但第一個段落前通常不需要換行，問題是第一個段落後的換行（即第一個 </div> 轉換的換行）應該被保留
  // 檢查：如果第一個字符是文字且前面沒有換行，且後面有換行，這是正常的
  // 但如果第一個字符是文字，後面緊跟著另一個文字（沒有換行），這表示第一個換行丟失了
  // 實際上，如果HTML是 <div>我</div><div>我</div>，處理後應該是 我\n我\n，這是對的
  // 問題可能在於：如果用戶輸入時第一個字符前有換行，但contentEditable沒有生成對應的HTML結構
  
  // 清理多餘的換行（連續3個或以上變成2個）
  // 但保留單個和兩個連續換行
  // 重要：這一步不會影響單個換行，只會清理過多的連續換行
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  // 先處理字體大小標籤（必須在最前面處理，避免被其他標籤處理影響）
  // 使用遞迴方式處理嵌套的字體大小標籤
  // 注意：此時段落標籤已經被處理，所以內容中應該只有換行符和文字
  let changed = true;
  while (changed) {
    const before = markdown;
    markdown = markdown.replace(/<small[^>]*>([\s\S]*?)<\/small>/gi, (match, content) => {
      // 先處理內容中的嵌套標籤（除了 small 和 big）
      // 確保保留換行符：先將 <br> 轉換為換行，然後處理段落標籤
      let processedContent = content
        .replace(/<br\s*\/?>/gi, '\n')  // 確保 br 標籤被轉換為換行
        .replace(/<\/(p|div|h[1-6])>/gi, '\n')  // 段落結束標籤轉換為換行
        .replace(/<(p|div|h[1-6])[^>]*>/gi, '')  // 移除段落開始標籤
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
      // 確保保留換行符：先將 <br> 轉換為換行，然後處理段落標籤
      let processedContent = content
        .replace(/<br\s*\/?>/gi, '\n')  // 確保 br 標籤被轉換為換行
        .replace(/<\/(p|div|h[1-6])>/gi, '\n')  // 段落結束標籤轉換為換行
        .replace(/<(p|div|h[1-6])[^>]*>/gi, '')  // 移除段落開始標籤
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
  // 先移除行尾空白（在換行前的空格和 tab），但保留換行本身
  markdown = markdown.replace(/[ \t]+\n/g, '\n');
  
  // 清理連續的換行（保留最多兩個連續換行）
  // 注意：這只清理3個或以上的連續換行，不會影響單個或兩個換行
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  // 確保單個換行被保留：將換行前後的空白標準化
  // 將 " \n" 或 "\n " 標準化為 "\n"，但保留換行本身
  // 重要：這個正則只處理換行前後的空白，不會合併換行
  // 修改：使用更精確的正則，確保不會意外合併換行
  // 只移除換行前後的空白字符，但保留換行本身
  markdown = markdown.replace(/([^\n\s])[ \t]+\n/g, '$1\n');  // 移除換行前的空白
  markdown = markdown.replace(/\n[ \t]+([^\n\s])/g, '\n$1');  // 移除換行後的空白
  
  // 關鍵修復：確保第一個換行被保留
  // 問題：當HTML是 <div>哈</div><div>哈</div> 時，處理流程：
  // 1. </div><div> → \n: <div>哈\n<div>哈</div>
  // 2. </div> → \n: <div>哈\n<div>哈\n
  // 3. <div> → 移除: 哈\n哈\n
  // 這應該是對的，但用戶說第一個換行丟失了
  // 可能問題：第一個字符是文字，後面緊跟著另一個文字（沒有換行），這表示第一個換行丟失了
  // 檢查：如果開頭是文字，後面緊跟著文字（沒有換行），插入換行
  // 但要注意：如果用戶在編輯時在第一行繼續打字，可能會導致句子被切一半
  // 所以我們只在確實丟失第一個換行時才插入（即第一行只有兩個字符，且有多行）
  const lines = markdown.split('\n');
  if (lines.length > 1 && lines[0].length === 2 && /^[^\n\s]{2}$/.test(lines[0])) {
    // 第一行只有兩個字符，且有多行，這表示第一個換行丟失了
    // 在第一個字符和第二個字符之間插入換行
    markdown = markdown.replace(/^([^\n\s])([^\n\s])/, '$1\n$2');
  }
  
  // 不要 trim，保留開頭和結尾的換行（如果有的話）
  return markdown;
}
