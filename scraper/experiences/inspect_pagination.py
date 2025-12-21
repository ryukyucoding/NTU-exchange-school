#!/usr/bin/env python3
"""檢查分頁元素結構"""

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
    print("\n選擇交換類型...")
    exchange_checkbox = page.query_selector('input#identityExchange')
    if exchange_checkbox:
        exchange_checkbox.click()
        time.sleep(3)

    # 選擇 113 年度
    print("\n選擇 113 年度...")
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

    # 檢查分頁元素
    print("\n=== 檢查分頁元素 ===")

    # 檢查所有可能的分頁選擇器
    selectors = [
        '.pagination',
        '.pager',
        '.paginator',
        'nav[aria-label*="page" i]',
        'nav[aria-label*="pagination" i]',
        'ul.pagination',
        'div.pagination',
        '.page-numbers',
        '[class*="page"]',
        'a:has-text("下一頁")',
        'a:has-text(">")',
        'a:has-text("Next")',
    ]

    for selector in selectors:
        elements = page.query_selector_all(selector)
        if elements:
            print(f"\n找到元素: {selector} ({len(elements)} 個)")
            for idx, elem in enumerate(elements[:3]):  # 只顯示前 3 個
                try:
                    html = page.evaluate('(el) => el.outerHTML', elem)
                    print(f"  [{idx+1}] {html[:200]}")
                except:
                    pass

    # 檢查頁面總數提示
    print("\n=== 檢查頁面資訊 ===")
    page_info = page.query_selector_all('*:has-text("共"), *:has-text("筆"), *:has-text("頁")')
    for elem in page_info[:5]:
        try:
            text = elem.inner_text()
            if '共' in text or '筆' in text or '頁' in text:
                print(f"  {text.strip()}")
        except:
            pass

    print("\n\n瀏覽器將保持開啟 60 秒...")
    time.sleep(60)

    browser.close()
