#!/usr/bin/env python3
"""
檢查頁面上是否有「僅顯示有繳交心得之結果」的選項
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

    print("\n3. 檢查所有 checkbox 和 filter 選項...")
    
    # 檢查所有 checkbox
    checkboxes = page.query_selector_all('input[type="checkbox"]')
    print(f"\n找到 {len(checkboxes)} 個 checkbox:")
    for idx, checkbox in enumerate(checkboxes, 1):
        try:
            checkbox_id = checkbox.get_attribute('id') or ''
            checkbox_name = checkbox.get_attribute('name') or ''
            checkbox_value = checkbox.get_attribute('value') or ''
            
            # 嘗試找到對應的 label
            label = None
            if checkbox_id:
                label_elem = page.query_selector(f'label[for="{checkbox_id}"]')
                if label_elem:
                    label = label_elem.inner_text().strip()
            
            # 如果沒有找到 label，嘗試找父元素中的文字
            if not label:
                parent = page.evaluate('(el) => el.parentElement', checkbox)
                if parent:
                    try:
                        label_elem = page.evaluate('(el) => el.querySelector("label")', parent)
                        if label_elem:
                            label = page.evaluate('(el) => el.innerText', label_elem)
                    except:
                        pass
            
            print(f"  [{idx}] ID: {checkbox_id}, Name: {checkbox_name}, Value: {checkbox_value}")
            if label:
                print(f"      Label: {label}")
            
            # 特別檢查是否包含「心得」相關的文字
            if '心得' in (label or '') or 'experience' in checkbox_id.lower():
                print(f"      ⭐ 可能是心得相關的選項！")
        except Exception as e:
            print(f"  [{idx}] 檢查時出錯: {e}")

    # 檢查所有可能的 filter 選項
    print("\n4. 檢查所有包含「心得」文字的元素...")
    experience_elements = page.query_selector_all('*:has-text("心得"), *:has-text("繳交"), *:has-text("顯示")')
    for idx, elem in enumerate(experience_elements[:20], 1):  # 只顯示前 20 個
        try:
            text = elem.inner_text().strip()
            if text and len(text) < 100:  # 只顯示較短的文字
                tag = page.evaluate('(el) => el.tagName', elem)
                print(f"  [{idx}] <{tag}>: {text}")
        except:
            pass

    # 檢查表單中的所有元素
    print("\n5. 檢查表單結構...")
    form = page.query_selector('form#studentSearch')
    if form:
        print("找到表單 #studentSearch")
        # 檢查表單中的所有 input
        inputs = form.query_selector_all('input')
        print(f"表單中有 {len(inputs)} 個 input 元素")
        for inp in inputs:
            inp_type = inp.get_attribute('type') or ''
            inp_id = inp.get_attribute('id') or ''
            inp_name = inp.get_attribute('name') or ''
            if inp_type == 'checkbox' or inp_type == 'radio':
                print(f"  - {inp_type}: id={inp_id}, name={inp_name}")

    print("\n\n瀏覽器將保持開啟 30 秒，請手動檢查頁面...")
    print("請查看是否有「僅顯示有繳交心得之結果」或類似的選項")
    time.sleep(30)

    browser.close()

