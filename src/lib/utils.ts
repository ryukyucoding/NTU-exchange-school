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
