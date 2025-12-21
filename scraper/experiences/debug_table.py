#!/usr/bin/env python3
"""
Debug table structure
"""

from playwright.sync_api import sync_playwright
import time

BASE_URL = "https://oia.ntu.edu.tw"
EXPERIENCE_URL = f"{BASE_URL}/students/outgoing.students.experience.do/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print(f"載入頁面: {EXPERIENCE_URL}")
    page.goto(EXPERIENCE_URL, timeout=30000)
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 選擇「交換」
    exchange_checkbox = page.query_selector('input#identityExchange')
    if exchange_checkbox:
        exchange_checkbox.click()
        time.sleep(2)

    # 選擇 113 年度
    page.evaluate("""
        const select = document.querySelector('#select2');
        if (select) {
            const option = Array.from(select.options).find(opt => opt.value === '113');
            if (option) {
                option.selected = true;
                $(select).trigger('change');
            }
        }
    """)
    time.sleep(3)

    # 檢查第一行
    table = page.query_selector('table tbody')
    if table:
        rows = table.query_selector_all('tr')
        print(f"\n找到 {len(rows)} 行")

        if len(rows) > 0:
            first_row = rows[0]
            cells = first_row.query_selector_all('td')
            print(f"\n第一行有 {len(cells)} 個欄位:\n")

            for i, cell in enumerate(cells):
                print(f"=== 欄位 {i+1} ===")
                text = cell.inner_text().strip()
                print(f"文字: {text}")

                # 檢查是否有連結
                links = cell.query_selector_all('a')
                if links:
                    print(f"連結數量: {len(links)}")
                    for j, link in enumerate(links):
                        href = link.get_attribute('href')
                        link_text = link.inner_text().strip()
                        print(f"  連結 {j+1}: text='{link_text}', href='{href}'")

                # 獲取 HTML
                html = page.evaluate('(element) => element.innerHTML', cell)
                print(f"HTML: {html[:200]}")
                print()

    browser.close()
