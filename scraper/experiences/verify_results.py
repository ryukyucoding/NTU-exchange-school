#!/usr/bin/env python3
"""
驗證爬取的結果是否正確
"""

from playwright.sync_api import sync_playwright
import time

BASE_URL = "https://oia.ntu.edu.tw"
EXPERIENCE_URL = f"{BASE_URL}/students/outgoing.students.experience.do/"

with sync_playwright() as p:
    # 使用非 headless 模式，這樣你可以看到瀏覽器操作
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print(f"載入頁面: {EXPERIENCE_URL}")
    page.goto(EXPERIENCE_URL, timeout=60000)
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 選擇「交換」
    print("\n選擇交換類型...")
    exchange_checkbox = page.query_selector('input#identityExchange')
    if exchange_checkbox:
        is_checked = page.evaluate('(element) => element.checked', exchange_checkbox)
        if not is_checked:
            exchange_checkbox.click()
            print("已點擊交換 checkbox")
            time.sleep(2)

    # 選擇 113 年度
    print("選擇 113 年度...")
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

    # 檢查結果
    print("\n=== 查詢結果 ===\n")
    table = page.query_selector('table tbody')
    if table:
        rows = table.query_selector_all('tr')
        print(f"總共找到 {len(rows)} 位學生\n")

        # 顯示所有結果
        for i, row in enumerate(rows, 1):
            cells = row.query_selector_all('td')
            if len(cells) >= 8:
                year_info = cells[0].inner_text().strip()
                country = cells[1].inner_text().strip()
                school = cells[2].inner_text().strip()
                name = cells[6].inner_text().strip()

                print(f"{i}. {name} - {school} ({country}) - {year_info}")

    print("\n\n瀏覽器將保持開啟 30 秒，請檢查結果是否與你在網頁上看到的一致...")
    print("你可以在瀏覽器中手動操作來比對結果。")
    time.sleep(30)

    browser.close()
