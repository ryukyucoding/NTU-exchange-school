#!/usr/bin/env python3
"""
詳細檢查「僅顯示有繳交心得之結果」的 checkbox
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

    print("\n3. 詳細檢查 have_experience checkbox...")
    
    # 尋找 name="have_experience" 的 checkbox
    experience_checkbox = page.query_selector('input[name="have_experience"]')
    if experience_checkbox:
        checkbox_id = experience_checkbox.get_attribute('id') or ''
        checkbox_name = experience_checkbox.get_attribute('name') or ''
        checkbox_value = experience_checkbox.get_attribute('value') or ''
        is_checked = page.evaluate('(el) => el.checked', experience_checkbox)
        
        print(f"✓ 找到 checkbox!")
        print(f"  ID: {checkbox_id}")
        print(f"  Name: {checkbox_name}")
        print(f"  Value: {checkbox_value}")
        print(f"  目前狀態: {'已勾選' if is_checked else '未勾選'}")
        
        # 找到對應的 label
        if checkbox_id:
            label_elem = page.query_selector(f'label[for="{checkbox_id}"]')
            if label_elem:
                label_text = label_elem.inner_text().strip()
                print(f"  Label: {label_text}")
        
        # 如果沒有 ID，嘗試找父元素
        if not checkbox_id:
            parent_html = page.evaluate('(el) => el.parentElement.outerHTML', experience_checkbox)
            print(f"  父元素 HTML: {parent_html[:200]}")
        
        # 測試勾選
        print("\n4. 測試勾選這個 checkbox...")
        if not is_checked:
            experience_checkbox.click()
            time.sleep(2)
            is_checked_after = page.evaluate('(el) => el.checked', experience_checkbox)
            print(f"  勾選後狀態: {'已勾選' if is_checked_after else '未勾選'}")
            
            # 檢查結果是否有變化
            time.sleep(3)
            rows = page.query_selector_all('table tbody tr')
            print(f"  勾選後的結果數量: {len(rows)} 筆")
    else:
        print("✗ 找不到 name='have_experience' 的 checkbox")
        
        # 嘗試其他可能的選擇器
        print("\n嘗試其他選擇器...")
        selectors = [
            'input[name*="experience"]',
            'input[name*="心得"]',
            'input[value="1"][name*="experience"]',
            '*:has-text("僅顯示有繳交心得之結果") input',
        ]
        
        for selector in selectors:
            try:
                elem = page.query_selector(selector)
                if elem:
                    print(f"  找到: {selector}")
                    print(f"    Tag: {page.evaluate('(el) => el.tagName', elem)}")
                    print(f"    ID: {elem.get_attribute('id')}")
                    print(f"    Name: {elem.get_attribute('name')}")
            except:
                pass

    print("\n\n瀏覽器將保持開啟 20 秒...")
    time.sleep(20)

    browser.close()

