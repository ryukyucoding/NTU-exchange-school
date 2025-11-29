#!/usr/bin/env python3
"""
爬取台大 OIA 網站交換學校資料
使用 Playwright 處理 JavaScript 渲染的頁面
"""

import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "https://oia.ntu.edu.tw"
LIST_URL = f"{BASE_URL}/outgoing/school.list"
DELAY_BETWEEN_REQUESTS = 0.01  # 秒

def extract_school_links(page):
    """從列表頁面提取所有學校的連結和基本資訊"""
    logger.info("正在提取學校列表...")

    # 等待表格載入
    page.wait_for_selector('table', timeout=10000)
    time.sleep(2)  # 等待 JavaScript 完全執行

    # 提取所有學校行
    schools = []
    rows = page.query_selector_all('tbody tr')

    logger.info(f"找到 {len(rows)} 個表格行")

    current_country = ""

    for row in rows:
        try:
            cells = row.query_selector_all('td')

            # 檢查是否為國家標題行 (只有一個 td 且有 colspan)
            if len(cells) == 1:
                country_cell = cells[0]
                colspan = country_cell.get_attribute('colspan')
                if colspan and int(colspan) > 1:
                    current_country = country_cell.inner_text().strip()
                    logger.debug(f"找到國家: {current_country}")
                continue

            # 必須有5個欄位才是學校資料行
            if len(cells) != 5:
                continue

            # 第一欄是學校名稱
            name_cell = cells[0]
            name_link = name_cell.query_selector('span.lang a')

            if not name_link:
                continue

            school_name = name_link.inner_text().strip()

            # 第五欄是「申請資料」連結
            link_cell = cells[4]
            detail_link = link_cell.query_selector('a[href*="/outgoing/view/"]')

            if not detail_link:
                continue

            href = detail_link.get_attribute('href')

            # 提取學校ID
            sn_match = re.search(r'/sn/(\d+)', href)
            if not sn_match:
                continue

            school_id = sn_match.group(1)

            schools.append({
                'id': school_id,
                'name_zh': school_name,
                'country': current_country,
                'url': f"{BASE_URL}{href}" if href.startswith('/') else href
            })

        except Exception as e:
            logger.warning(f"提取學校資訊時出錯: {e}")
            continue

    return schools

def extract_detail_info(page, school_url):
    """從詳細頁面提取完整內容"""
    try:
        page.goto(school_url, timeout=30000)
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # 提取頁面的文字內容（移除 HTML 標籤，保留結構化文字）
        text_content = page.inner_text('body')

        return {
            'text_content': text_content
        }

    except PlaywrightTimeout:
        logger.error(f"載入頁面超時: {school_url}")
        return None
    except Exception as e:
        logger.error(f"提取詳細資訊時出錯 ({school_url}): {e}")
        return None

# 所有舊的欄位提取函數已移除
# 現在只提取完整的頁面內容，交由 LLM 處理

def main():
    """主程式"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("開始爬取台大 OIA 交換學校資料")
    logger.info(f"開始時間: {start_time}")
    logger.info("=" * 60)

    all_schools = []

    with sync_playwright() as p:
        # 啟動瀏覽器
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        try:
            # Step 1: 提取學校列表
            logger.info(f"正在載入列表頁面: {LIST_URL}")
            page.goto(LIST_URL, timeout=30000)
            schools = extract_school_links(page)
            logger.info(f"成功提取 {len(schools)} 個學校連結")

            # Step 2: 逐個提取詳細資訊
            total = len(schools)
            success_count = 0
            fail_count = 0

            for idx, school in enumerate(schools, 1):
                logger.info(f"[{idx}/{total}] 正在處理: {school['name_zh']} ({school['country']})")

                try:
                    detail = extract_detail_info(page, school['url'])

                    if detail:
                        # 合併基本資訊和詳細資訊
                        school.update(detail)
                        all_schools.append(school)
                        success_count += 1
                        logger.info(f"  ✓ 成功提取資料")
                    else:
                        logger.warning(f"  ✗ 無法提取詳細資訊")
                        all_schools.append(school)  # 仍保留基本資訊
                        fail_count += 1

                    # 延遲避免對伺服器造成負擔
                    time.sleep(DELAY_BETWEEN_REQUESTS)

                except Exception as e:
                    logger.error(f"  ✗ 處理失敗: {e}")
                    all_schools.append(school)  # 保留基本資訊
                    fail_count += 1
                    time.sleep(DELAY_BETWEEN_REQUESTS)

            # Step 3: 儲存原始資料
            output_file = 'raw_schools.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_schools, f, ensure_ascii=False, indent=2)

            logger.info("=" * 60)
            logger.info("爬取完成！")
            logger.info(f"總學校數: {total}")
            logger.info(f"成功: {success_count}")
            logger.info(f"失敗: {fail_count}")
            logger.info(f"耗時: {datetime.now() - start_time}")
            logger.info(f"資料已儲存至: {output_file}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"發生嚴重錯誤: {e}")
            raise

        finally:
            browser.close()

if __name__ == '__main__':
    main()
