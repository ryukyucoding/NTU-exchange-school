#!/usr/bin/env python3
"""
簡單檢查「僅顯示有繳交心得之結果」的 checkbox
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
    if exchange_checkbox:
        exchange_checkbox.click()
        time.sleep(3)

    # 選擇 113 年度
    print("\n2. 選擇 113 年度...")
    page.evaluate("""
        const yearValue = '113';
        const select = document.querySelector('#select2');
        if (select) {
            Array.from(select.options).forEach(opt => {
                opt.selected = false;
            });
            const targetOption = Array.from(select.options).find(opt => opt.value === yearValue);
            if (targetOption) {
                targetOption.selected = true;
                $(select).trigger('change');
            }
        }
    """)
    time.sleep(3)

    # 檢查未勾選前的結果數量
    rows_before = page.query_selector_all('table tbody tr')
    print(f"\n3. 未勾選「僅顯示有繳交心得之結果」前的結果數量: {len(rows_before)} 筆")

    # 尋找「僅顯示有繳交心得之結果」的 checkbox
    print("\n4. 尋找「僅顯示有繳交心得之結果」的 checkbox...")
    
    # 方法1: 通過 name="have_experience"
    experience_checkbox = page.query_selector('input[name="have_experience"]')
    
    if not experience_checkbox:
        # 方法2: 通過 label 文字找到對應的 checkbox
        label = page.query_selector('label:has-text("僅顯示有繳交心得之結果")')
        if label:
            label_for = label.get_attribute('for')
            if label_for:
                experience_checkbox = page.query_selector(f'input#{label_for}')
            else:
                # 如果沒有 for 屬性，嘗試找父元素中的 input
                experience_checkbox = label.query_selector('input[type="checkbox"]')
                if not experience_checkbox:
                    parent = page.evaluate('(el) => el.parentElement', label)
                    if parent:
                        experience_checkbox = page.query_selector('input[type="checkbox"]', parent)

    if experience_checkbox:
        checkbox_id = experience_checkbox.get_attribute('id') or '無'
        checkbox_name = experience_checkbox.get_attribute('name') or '無'
        checkbox_value = experience_checkbox.get_attribute('value') or '無'
        is_checked = page.evaluate('(el) => el.checked', experience_checkbox)
        
        print(f"✓ 找到 checkbox!")
        print(f"  ID: {checkbox_id}")
        print(f"  Name: {checkbox_name}")
        print(f"  Value: {checkbox_value}")
        print(f"  目前狀態: {'已勾選' if is_checked else '未勾選'}")
        
        # 勾選這個 checkbox
        print("\n5. 勾選「僅顯示有繳交心得之結果」...")
        if not is_checked:
            experience_checkbox.click()
            time.sleep(3)  # 等待頁面更新
        
        # 檢查勾選後的結果數量
        rows_after = page.query_selector_all('table tbody tr')
        print(f"  勾選後的結果數量: {len(rows_after)} 筆")
        print(f"  減少了 {len(rows_before) - len(rows_after)} 筆（只顯示有繳交心得的）")
        
    else:
        print("✗ 找不到「僅顯示有繳交心得之結果」的 checkbox")
        print("\n嘗試查找所有相關元素...")
        
        # 查找包含「心得」文字的 label
        labels = page.query_selector_all('label')
        for label in labels:
            try:
                text = label.inner_text().strip()
                if '心得' in text:
                    print(f"  找到 label: {text}")
                    label_for = label.get_attribute('for')
                    if label_for:
                        checkbox = page.query_selector(f'input#{label_for}')
                        if checkbox:
                            print(f"    對應的 checkbox ID: {label_for}")
            except:
                pass

    print("\n\n瀏覽器將保持開啟 15 秒...")
    time.sleep(15)

    browser.close()

