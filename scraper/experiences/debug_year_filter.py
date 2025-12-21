#!/usr/bin/env python3
"""
Debug year filter
"""

from playwright.sync_api import sync_playwright
import time

BASE_URL = "https://oia.ntu.edu.tw"
EXPERIENCE_URL = f"{BASE_URL}/students/outgoing.students.experience.do/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, slow_mo=500)
    page = browser.new_page()

    print(f"載入頁面: {EXPERIENCE_URL}")
    page.goto(EXPERIENCE_URL, timeout=60000)
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 選擇「交換」
    print("\n1. 選擇交換類型...")
    exchange_checkbox = page.query_selector('input#identityExchange')
    exchange_checkbox.click()
    time.sleep(3)

    # 檢查 Select2 的狀態
    print("\n2. 檢查年度選單...")

    # 嘗試使用 Select2 的 UI 點擊
    print("   嘗試點擊 Select2 下拉選單...")

    # Select2 通常會有一個可點擊的容器
    select2_container = page.query_selector('.select2-selection--multiple')
    if select2_container:
        print("   找到 Select2 容器，點擊以開啟下拉選單...")
        select2_container.click()
        time.sleep(2)

        # 在搜尋框中輸入 113
        search_box = page.query_selector('.select2-search__field')
        if search_box:
            print("   在搜尋框中輸入 113...")
            search_box.type('113')
            time.sleep(1)

            # 選擇第一個結果
            first_result = page.query_selector('.select2-results__option--selectable')
            if first_result:
                print("   點擊搜尋結果...")
                first_result.click()
                time.sleep(3)

    # 檢查結果
    print("\n3. 檢查查詢結果...")
    table = page.query_selector('table tbody')
    if table:
        rows = table.query_selector_all('tr')
        print(f"\n找到 {len(rows)} 位學生")

        if len(rows) > 0:
            for i in range(min(5, len(rows))):
                cells = rows[i].query_selector_all('td')
                if len(cells) >= 7:
                    year_info = cells[0].inner_text().strip()
                    name = cells[6].inner_text().strip()
                    school = cells[2].inner_text().strip()
                    print(f"   {i+1}. {year_info} - {name} - {school}")

    print("\n\n瀏覽器將保持開啟 30 秒...")
    time.sleep(30)

    browser.close()
