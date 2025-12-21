#!/usr/bin/env python3
"""
測試爬蟲功能
"""

from playwright.sync_api import sync_playwright
import time

BASE_URL = "https://oia.ntu.edu.tw"
EXPERIENCE_URL = f"{BASE_URL}/students/outgoing.students.experience.do/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print(f"載入頁面: {EXPERIENCE_URL}")
    page.goto(EXPERIENCE_URL, timeout=30000)
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 選擇「交換」
    print("選擇交換類型...")
    exchange_checkbox = page.query_selector('input#identityExchange')
    if exchange_checkbox:
        is_checked = page.evaluate('(element) => element.checked', exchange_checkbox)
        print(f"交換 checkbox 是否已勾選: {is_checked}")
        if not is_checked:
            exchange_checkbox.click()
            print("已點擊交換 checkbox")
            time.sleep(2)

        # 檢查是否顯示學校和年度選單
        nav_ask = page.query_selector('#nav-ask')
        if nav_ask:
            is_hidden = page.evaluate('(element) => element.hasAttribute("hidden")', nav_ask)
            print(f"nav-ask 是否隱藏: {is_hidden}")

        # 等待 select2 出現
        time.sleep(2)

        # 檢查 select2 元素
        select2 = page.query_selector('#select2')
        if select2:
            print("找到 select2 (年度選單)")
            # 列出所有選項
            options = select2.query_selector_all('option')
            print(f"年度選項數量: {len(options)}")
            for opt in options[:5]:
                value = opt.get_attribute('value')
                text = opt.inner_text().strip()
                print(f"  - value={value}, text={text}")

            # 選擇 113 年度
            print("\n選擇 113 年度...")
            page.evaluate("""
                const select = document.querySelector('#select2');
                if (select) {
                    const option = Array.from(select.options).find(opt => opt.value === '113');
                    if (option) {
                        option.selected = true;
                        $(select).trigger('change');
                        console.log('已選擇 113 年度');
                    }
                }
            """)
            time.sleep(3)

            # 檢查是否有結果表格
            print("\n檢查結果表格...")
            table = page.query_selector('table tbody')
            if table:
                rows = table.query_selector_all('tr')
                print(f"找到 {len(rows)} 個結果行")

                # 顯示前 3 個結果
                for i, row in enumerate(rows[:3], 1):
                    cells = row.query_selector_all('td')
                    print(f"\n結果 {i}: {len(cells)} 個欄位")
                    for j, cell in enumerate(cells):
                        text = cell.inner_text().strip()[:50]
                        print(f"  欄位 {j+1}: {text}")
            else:
                print("找不到結果表格")
        else:
            print("找不到 select2")
    else:
        print("找不到交換 checkbox")

    print("\n等待 10 秒...")
    time.sleep(10)

    browser.close()
