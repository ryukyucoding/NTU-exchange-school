import { addHours } from 'date-fns';

/**
 * 將 UTC 時間轉換為台灣時間 (UTC+8)
 */
export const toTaiwanTime = (date: Date | string): Date => {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  return addHours(utcDate, 8);
};

/**
 * 格式化日期為台灣格式 (MM/dd)
 */
export const formatDate = (dateString: string): string => {
  const taiwanDate = toTaiwanTime(dateString);
  return taiwanDate.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/**
 * 格式化時間為台灣格式 (MM/dd HH:mm)
 */
export const formatDateTime = (dateString: string): string => {
  const taiwanDate = toTaiwanTime(dateString);
  const month = taiwanDate.getMonth() + 1;
  const day = taiwanDate.getDate();
  const hours = taiwanDate.getHours().toString().padStart(2, '0');
  const minutes = taiwanDate.getMinutes().toString().padStart(2, '0');

  return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')} ${hours}:${minutes}`;
};





