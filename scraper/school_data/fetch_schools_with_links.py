#!/usr/bin/env python3
"""
爬取台大 OIA 網站交換學校資料（保留連結版本）
使用 Playwright 處理 JavaScript 渲染的頁面，並保留 HTML 中的連結
"""

import json
import time
import re
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import logging
from bs4 import BeautifulSoup

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

def extract_links_from_element(element):
    """從 HTML 元素中提取所有連結，返回格式化的文字+連結"""
    html = element.inner_html()
    soup = BeautifulSoup(html, 'html.parser')

    result = []

    # 遍歷所有文字和連結
    for element in soup.descendants:
        if element.name == 'a':
            text = element.get_text().strip()
            href = element.get('href', '')
            if text and href:
                # 如果是相對路徑，補全為絕對路徑
                if href.startswith('/'):
                    href = f"{BASE_URL}{href}"
                result.append(f"{text} [{href}]")
        elif isinstance(element, str):
            text = element.strip()
            if text and text not in result:
                # 只添加不在 <a> 標籤內的純文字
                parent = element.parent
                if parent and parent.name != 'a':
                    result.append(text)

    return ' '.join(result)

def extract_full_text_with_links(content_element):
    """從內容元素中提取完整文字，並將連結格式化為「文字 [URL]」格式"""
    if not content_element:
        return ""
    
    # 創建一個副本來處理，避免修改原始元素
    content_copy = BeautifulSoup(str(content_element), 'html.parser')
    
    # 處理所有連結，將它們替換為「文字 [URL]」格式
    for link in content_copy.find_all('a'):
        href = link.get('href', '')
        link_text = link.get_text().strip()
        
        if href:
            # 補全相對路徑
            if href.startswith('/'):
                href = f"{BASE_URL}{href}"
            
            # 將連結替換為「文字 [URL]」格式
            if link_text:
                link.replace_with(f"{link_text} [{href}]")
            else:
                link.replace_with(f"[{href}]")
    
    # 提取完整文字內容（已包含格式化後的連結）
    # 對於列表（ol, ul），使用換行符分隔項目
    if content_copy.name in ['ol', 'ul']:
        items = []
        for li in content_copy.find_all('li', recursive=False):
            # 跳過隱藏的 li（有特殊樣式的）
            style = li.get('style', '')
            if 'display: none' in style or 'opacity: 0' in style or 'position: absolute' in style:
                continue
            item_text = li.get_text(separator=' ', strip=True)
            if item_text and item_text.strip():
                items.append(item_text.strip())
        full_text = ' '.join(items)
    else:
        # 對於其他元素，使用空格作為分隔符
        full_text = content_copy.get_text(separator=' ', strip=False)
    
    # 清理多餘的空白字符，但保留基本的空格
    import re
    full_text = re.sub(r'\s+', ' ', full_text)  # 將多個空白字符合併為一個空格
    full_text = full_text.strip()
    
    return full_text

def extract_detail_info_with_links(page, school_url):
    """從詳細頁面提取完整內容（只提取學校年曆、住宿資訊、注意事項的連結）"""
    try:
        page.goto(school_url, timeout=30000)
        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # 獲取頁面 HTML
        html_content = page.content()
        soup = BeautifulSoup(html_content, 'html.parser')

        # 只提取三個特定欄位
        target_fields = {
            '學校年曆': 'academic_calendar',
            '住宿資訊': 'accommodation_info',
            '注意事項': 'notes'
        }

        extracted_data = {}

        # 方法 1: 查找 <h5 class="uninfo-label"> 結構（新結構）
        for target_label, field_name in target_fields.items():
            # 查找包含目標標籤的 h5
            h5_labels = soup.find_all('h5', class_='uninfo-label')
            for h5 in h5_labels:
                span = h5.find('span')
                if span and target_label in span.get_text().strip():
                    # 找到對應的內容區域
                    content_elements = []
                    
                    # 先檢查是否在 uninfo-content div 中
                    parent_div = h5.find_parent('div', class_='uninfo-content')
                    if parent_div:
                        # 在 uninfo-content 中，提取 h5 後面的所有內容
                        for elem in h5.find_next_siblings():
                            if elem.name in ['ol', 'ul', 'div', 'p']:
                                content_elements.append(elem)
                    else:
                        # 不在 uninfo-content 中，先找下一個兄弟元素
                        for sibling in h5.find_next_siblings():
                            if sibling.name in ['ol', 'ul', 'div', 'p']:
                                content_elements.append(sibling)
                                break
                        
                        # 如果沒找到，嘗試找下一個 uninfo-content div
                        if not content_elements:
                            next_content_div = h5.find_next('div', class_='uninfo-content')
                            if next_content_div:
                                # 提取 div 中的所有內容（除了標題）
                                for elem in next_content_div.find_all(['ol', 'ul', 'div', 'p']):
                                    # 跳過標題
                                    if not elem.find('h5', class_='uninfo-label'):
                                        content_elements.append(elem)
                    
                    # 合併所有內容元素
                    if content_elements:
                        # 將所有元素合併成一個字符串
                        full_text_parts = []
                        for elem in content_elements:
                            text = extract_full_text_with_links(elem)
                            if text:
                                full_text_parts.append(text)
                        
                        if full_text_parts:
                            # 用換行符連接多個部分，但先清理空白
                            full_text = ' '.join(full_text_parts)
                            # 清理多餘的空白
                            import re
                            full_text = re.sub(r'\s+', ' ', full_text).strip()
                            if full_text:
                                extracted_data[field_name] = full_text
                    break

        # 方法 2: 查找表格結構 <tr><td>（舊結構，作為備用）
        if not all(extracted_data.get(field) for field in target_fields.values()):
            rows = soup.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    label = cells[0].get_text().strip()
                    
                    # 檢查是否為目標欄位
                    for target_label, field_name in target_fields.items():
                        if target_label in label and not extracted_data.get(field_name):
                            # 提取完整文字內容（包含連結）
                            full_text = extract_full_text_with_links(cells[1])
                            if full_text:
                                extracted_data[field_name] = full_text
                            break

        return {
            'academic_calendar': extracted_data.get('academic_calendar', ''),
            'accommodation_info': extracted_data.get('accommodation_info', ''),
            'notes': extracted_data.get('notes', '')
        }

    except PlaywrightTimeout:
        logger.error(f"載入頁面超時: {school_url}")
        return None
    except Exception as e:
        logger.error(f"提取詳細資訊時出錯 ({school_url}): {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def main():
    """主程式"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("開始爬取台大 OIA 交換學校資料（保留連結版本）")
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
                    detail = extract_detail_info_with_links(page, school['url'])

                    if detail:
                        # 合併基本資訊和詳細資訊
                        school.update(detail)
                        all_schools.append(school)
                        success_count += 1

                        # 顯示找到的欄位
                        found_fields = []
                        for field in ['academic_calendar', 'accommodation_info', 'notes']:
                            if detail.get(field):
                                found_fields.append(field)
                        
                        if found_fields:
                            logger.info(f"  ✓ 找到欄位: {', '.join(found_fields)}")
                        else:
                            logger.info(f"  ✓ 成功提取資料（無連結）")
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
            output_file = 'raw_schools_with_links.json'
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
            import traceback
            logger.error(traceback.format_exc())
            raise

        finally:
            browser.close()

if __name__ == '__main__':
    main()
