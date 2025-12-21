#!/usr/bin/env python3
"""
爬取台大 OIA 網站交換學生心得
URL: https://oia.ntu.edu.tw/students/outgoing.students.experience.do/
"""

import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import logging
import sys

# 設定日誌：同時輸出到終端和檔案
log_file = 'fetch_log.txt'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),  # 寫入檔案
        logging.StreamHandler(sys.stdout)  # 輸出到終端
    ]
)
logger = logging.getLogger(__name__)

BASE_URL = "https://oia.ntu.edu.tw"
EXPERIENCE_URL = f"{BASE_URL}/students/outgoing.students.experience.do/"
DELAY_BETWEEN_REQUESTS = 1  # 秒
YEARS = ["113"]  # 要爬取的年度（測試用：只處理 113 年度）

def select_exchange_type(page):
    """選擇「交換」類型"""
    try:
        logger.info("選擇交換類型...")
        # 找到「交換」的 checkbox (value="3")
        exchange_checkbox = page.query_selector('input#identityExchange')
        if exchange_checkbox:
            # 檢查是否已經勾選
            is_checked = page.evaluate('(element) => element.checked', exchange_checkbox)
            if not is_checked:
                exchange_checkbox.click()
                time.sleep(1)  # 等待頁面更新
            logger.info("已選擇「交換」類型")
            return True
        else:
            logger.warning("找不到「交換」選項")
            return False
    except Exception as e:
        logger.error(f"選擇交換類型失敗: {e}")
        return False

def select_experience_only(page):
    """勾選「僅顯示有繳交心得之結果」選項"""
    try:
        logger.info("勾選「僅顯示有繳交心得之結果」...")
        # 通過 name="have_experience" 找到 checkbox
        experience_checkbox = page.query_selector('input[name="have_experience"]')
        if experience_checkbox:
            # 檢查是否已經勾選
            is_checked = page.evaluate('(element) => element.checked', experience_checkbox)
            if not is_checked:
                experience_checkbox.click()
                time.sleep(2)  # 等待頁面更新
                logger.info("已勾選「僅顯示有繳交心得之結果」")
            else:
                logger.info("「僅顯示有繳交心得之結果」已經勾選")
            return True
        else:
            logger.warning("找不到「僅顯示有繳交心得之結果」選項")
            return False
    except Exception as e:
        logger.error(f"勾選「僅顯示有繳交心得之結果」失敗: {e}")
        return False

def select_year(page, year):
    """使用 Select2 選擇年度"""
    try:
        logger.info(f"選擇年度 {year}...")

        # 等待 Select2 元素出現
        page.wait_for_selector('#select2', timeout=10000)
        time.sleep(0.5)

        # 使用 JavaScript 清除所有選項，然後只選擇指定年度
        page.evaluate(f"""
            const yearValue = '{year}';
            const select = document.querySelector('#select2');
            if (select) {{
                // 先清除所有選項
                Array.from(select.options).forEach(opt => {{
                    opt.selected = false;
                }});

                // 只選擇指定的年度
                const targetOption = Array.from(select.options).find(opt => opt.value === yearValue);
                if (targetOption) {{
                    targetOption.selected = true;
                    $(select).trigger('change');
                }}
            }}
        """)

        time.sleep(2)  # 等待頁面重新載入結果
        logger.info(f"已選擇年度 {year}")
        return True
    except Exception as e:
        logger.error(f"選擇年度失敗: {e}")
        return False

def extract_student_list(page):
    """從查詢結果中提取學生列表（處理分頁）"""
    try:
        logger.info("提取學生列表（含分頁）...")
        all_students = []
        page_num = 1

        while True:
            # 等待結果表格載入
            page.wait_for_selector('table tbody tr', timeout=10000)
            time.sleep(1)

            rows = page.query_selector_all('table tbody tr')
            logger.info(f"第 {page_num} 頁: 找到 {len(rows)} 個學生記錄")

            page_students = []
            for row in rows:
                try:
                    cells = row.query_selector_all('td')
                    if len(cells) < 8:
                        continue

                    # 提取基本資訊
                    year_info = cells[0].inner_text().strip()
                    country = cells[1].inner_text().strip()
                    school = cells[2].inner_text().strip()
                    college = cells[3].inner_text().strip()
                    department = cells[4].inner_text().strip()
                    degree = cells[5].inner_text().strip()
                    name = cells[6].inner_text().strip()

                    # 欄位 8: 「查看心得」連結
                    link_cell = cells[7]
                    detail_link = link_cell.query_selector('a')

                    if not detail_link:
                        continue

                    # 連結在 onclick 屬性中
                    onclick = detail_link.get_attribute('onclick')
                    if not onclick:
                        continue

                    # 從 onclick 中提取 URL
                    url_match = re.search(r'window\.open\(["\']([^"\']+)["\']', onclick)
                    if not url_match:
                        continue

                    detail_url = url_match.group(1)

                    student_data = {
                        'year_info': year_info,
                        'country': country,
                        'school': school,
                        'college': college,
                        'department': department,
                        'degree': degree,
                        'name': name,
                        'detail_url': detail_url
                    }

                    page_students.append(student_data)

                except Exception as e:
                    logger.warning(f"提取學生資訊時出錯: {e}")
                    continue

            all_students.extend(page_students)
            logger.info(f"第 {page_num} 頁提取了 {len(page_students)} 位學生")

            # 檢查是否有下一頁按鈕
            try:
                # 尋找下一頁按鈕 (aria-label="Next")
                next_button = page.query_selector('a[aria-label="Next"]')

                if next_button:
                    # 檢查父元素是否有 disabled class
                    is_disabled = page.evaluate(
                        '(el) => el.parentElement.classList.contains("disabled")',
                        next_button
                    )

                    if not is_disabled:
                        logger.info("找到下一頁，繼續爬取...")
                        next_button.click()
                        time.sleep(3)  # 等待下一頁載入
                        page_num += 1
                    else:
                        logger.info("已到達最後一頁")
                        break
                else:
                    logger.info("沒有找到下一頁按鈕")
                    break

            except Exception as e:
                logger.info(f"分頁處理錯誤: {e}")
                break

        logger.info(f"總共提取了 {len(all_students)} 位學生")
        return all_students

    except Exception as e:
        logger.error(f"提取學生列表失敗: {e}")
        return []

def extract_experience_details(page, student_url):
    """從心得頁面提取 PDF 連結和照片"""
    try:
        logger.info(f"正在載入心得頁面: {student_url}")
        page.goto(student_url, timeout=30000)
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        details = {
            'pdf_links': [],
            'image_links': []
        }

        # 提取所有 PDF 連結
        pdf_links = page.query_selector_all('a[href$=".pdf"], a[href*=".pdf"]')
        for link in pdf_links:
            href = link.get_attribute('href')
            if href:
                full_url = f"{BASE_URL}{href}" if href.startswith('/') else href
                link_text = link.inner_text().strip()
                details['pdf_links'].append({
                    'url': full_url,
                    'text': link_text
                })

        logger.info(f"找到 {len(details['pdf_links'])} 個 PDF 連結")

        # 提取所有圖片連結（只抓取學生上傳的照片）
        images = page.query_selector_all('img')
        for img in images:
            src = img.get_attribute('src')
            if src and not src.startswith('data:'):  # 排除 base64 圖片
                full_url = f"{BASE_URL}{src}" if src.startswith('/') else src

                # 只保留學生上傳的照片（通常在 experience 目錄下，檔名包含 photo）
                if 'experience' in full_url.lower() and 'photo' in full_url.lower():
                    alt = img.get_attribute('alt') or ''
                    details['image_links'].append({
                        'url': full_url,
                        'alt': alt
                    })

        logger.info(f"找到 {len(details['image_links'])} 張學生照片")

        return details

    except PlaywrightTimeout:
        logger.error(f"載入頁面超時: {student_url}")
        return None
    except Exception as e:
        logger.error(f"提取心得詳細資訊時出錯 ({student_url}): {e}")
        return None

def main():
    """主程式"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("開始爬取台大 OIA 交換學生心得")
    logger.info(f"開始時間: {start_time}")
    logger.info("=" * 60)

    all_experiences = []

    with sync_playwright() as p:
        # 啟動瀏覽器
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        try:
            # 載入初始頁面
            logger.info(f"正在載入頁面: {EXPERIENCE_URL}")
            page.goto(EXPERIENCE_URL, timeout=60000)
            page.wait_for_load_state('networkidle')
            time.sleep(2)

            # 選擇「交換」類型
            if not select_exchange_type(page):
                logger.error("無法選擇交換類型，終止執行")
                return

            # 對每個年度進行爬取
            for year in YEARS:
                logger.info("=" * 60)
                logger.info(f"開始處理年度: {year}")
                logger.info("=" * 60)

                # 重新載入頁面
                page.goto(EXPERIENCE_URL, timeout=60000)
                page.wait_for_load_state('networkidle')
                time.sleep(1)

                # 選擇交換類型和年度
                if not select_exchange_type(page):
                    logger.error(f"年度 {year}: 無法選擇交換類型")
                    continue

                if not select_year(page, year):
                    logger.error(f"年度 {year}: 無法選擇年度")
                    continue

                # 勾選「僅顯示有繳交心得之結果」
                select_experience_only(page)

                # 等待查詢結果載入（頁面會自動提交）
                time.sleep(2)

                # 提取學生列表
                students = extract_student_list(page)
                logger.info(f"年度 {year}: 找到 {len(students)} 位學生")

                # 對每位學生提取心得詳細資訊
                for idx, student in enumerate(students, 1):
                    logger.info(f"[{idx}/{len(students)}] 處理: {student['name']} - {student['school']}")

                    try:
                        details = extract_experience_details(page, student['detail_url'])

                        if details:
                            student.update(details)
                            logger.info(f"  ✓ 成功提取心得資料 (PDF: {len(details['pdf_links'])}, 圖片: {len(details['image_links'])})")
                        else:
                            logger.warning(f"  ✗ 無法提取心得詳細資訊")

                        all_experiences.append(student)

                        # 延遲避免對伺服器造成負擔
                        time.sleep(DELAY_BETWEEN_REQUESTS)

                    except Exception as e:
                        logger.error(f"  ✗ 處理失敗: {e}")
                        all_experiences.append(student)
                        time.sleep(DELAY_BETWEEN_REQUESTS)

                logger.info(f"年度 {year} 處理完成")

            # 儲存資料
            output_file = 'experiences_data.json'
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_experiences, f, ensure_ascii=False, indent=2)

            logger.info("=" * 60)
            logger.info("爬取完成！")
            logger.info(f"總學生數: {len(all_experiences)}")
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
