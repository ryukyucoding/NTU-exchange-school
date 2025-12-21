#!/usr/bin/env python3
"""
檢查頁面結構
"""

from playwright.sync_api import sync_playwright
import time

EXPERIENCE_URL = "https://oia.ntu.edu.tw/students/outgoing.students.experience.do/"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()

    print(f"載入頁面: {EXPERIENCE_URL}")
    page.goto(EXPERIENCE_URL, timeout=30000)
    page.wait_for_load_state('networkidle')
    time.sleep(2)

    # 儲存頁面截圖
    page.screenshot(path='page_screenshot.png')
    print("截圖已儲存: page_screenshot.png")

    # 儲存頁面 HTML
    html = page.content()
    with open('page_source.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("HTML 已儲存: page_source.html")

    # 查找所有 input radio
    radios = page.query_selector_all('input[type="radio"]')
    print(f"\n找到 {len(radios)} 個 radio buttons:")
    for i, radio in enumerate(radios):
        value = radio.get_attribute('value')
        name = radio.get_attribute('name')
        class_name = radio.get_attribute('class')
        print(f"  {i+1}. name={name}, value={value}, class={class_name}")

    # 查找所有 select
    selects = page.query_selector_all('select')
    print(f"\n找到 {len(selects)} 個 select 元素:")
    for i, select in enumerate(selects):
        select_id = select.get_attribute('id')
        select_name = select.get_attribute('name')
        print(f"  {i+1}. id={select_id}, name={select_name}")
        # 列出選項
        options = select.query_selector_all('option')
        for opt in options[:5]:  # 只顯示前5個選項
            opt_value = opt.get_attribute('value')
            opt_text = opt.inner_text()
            print(f"      - value={opt_value}, text={opt_text}")

    # 查找所有 button
    buttons = page.query_selector_all('button')
    print(f"\n找到 {len(buttons)} 個 buttons:")
    for i, btn in enumerate(buttons):
        btn_type = btn.get_attribute('type')
        btn_text = btn.inner_text()
        btn_class = btn.get_attribute('class')
        print(f"  {i+1}. type={btn_type}, text={btn_text}, class={btn_class}")

    print("\n等待 10 秒以便檢查頁面...")
    time.sleep(10)

    browser.close()
