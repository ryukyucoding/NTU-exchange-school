#!/usr/bin/env python3
"""
爬取台大 OIA 網站交換學校資料 (v2)
使用結構化 CSS selector 解析，直接輸出結構化資料
輸出: raw_schools_v2.json（不覆蓋原有的 raw_schools.json）

用法:
  python fetch_schools_v2.py              # 爬第二學期（預設）
  python fetch_schools_v2.py --semester 1 # 爬第一學期
  python fetch_schools_v2.py --semester 2 # 爬第二學期
"""

import json
import time
import re
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BASE_URL = "https://oia.ntu.edu.tw"
DELAY_BETWEEN_REQUESTS = 0.5  # 秒

# 從命令列參數取得學期
SEMESTER = 2  # 預設第二學期
if '--semester' in sys.argv:
    idx = sys.argv.index('--semester')
    if idx + 1 < len(sys.argv):
        SEMESTER = int(sys.argv[idx + 1])

LIST_ONLY = '--list-only' in sys.argv   # 只爬列表頁，不爬詳細頁

# --ids 1075,1080  只爬這些 ID 的詳細頁（搭配現有 JSON 使用）
ONLY_IDS = set()
if '--ids' in sys.argv:
    ids_idx = sys.argv.index('--ids')
    if ids_idx + 1 < len(sys.argv):
        ONLY_IDS = set(sys.argv[ids_idx + 1].split(','))

LIST_URL = f"{BASE_URL}/outgoing/school.list/semester/{SEMESTER}"
OUTPUT_FILE = f'raw_schools_v2_sem{SEMESTER}.json'


# ── 列表頁解析 ────────────────────────────────────────────

def extract_school_links(page):
    """
    從列表頁面提取所有學校的基本資訊
    回傳: [{ id, name_zh, country, url, contract_quota, selection_quota }]
    """
    logger.info("正在提取學校列表...")
    page.wait_for_selector('table', timeout=10000)
    time.sleep(2)

    schools = []
    current_country = ""

    rows = page.query_selector_all('tbody tr')
    logger.info(f"找到 {len(rows)} 個表格行")

    for row in rows:
        cells = row.query_selector_all('td')

        # 國家標題行：只有一個 td 且有 colspan
        if len(cells) == 1:
            colspan = cells[0].get_attribute('colspan')
            if colspan and int(colspan) > 1:
                current_country = cells[0].inner_text().strip()
            continue

        # 學校資料行：必須有 5 個欄位
        if len(cells) != 5:
            continue

        # 第一欄：學校名稱
        name_link = cells[0].query_selector('span.lang a')
        if not name_link:
            continue
        # 去掉 "since XXXX ~" 這類後綴
        school_name = re.sub(r'\s*since\s+\d{4}\s*[~～]?\s*$', '', name_link.inner_text().strip())

        # 第二欄：合約名額（文字）
        contract_quota_text = cells[1].inner_text().strip()
        contract_quota_num_match = re.search(r'(\d+)', contract_quota_text)
        contract_quota = int(contract_quota_num_match.group(1)) if contract_quota_num_match else None

        # 第三欄：甄選名額
        # 空字串 = 尚未更新；"0 名" = 已更新但不收；"N 名" = 收 N 人
        selection_quota_text = cells[2].inner_text().strip()
        selection_quota_num_match = re.search(r'(\d+)', selection_quota_text)
        if not selection_quota_text:
            selection_quota = None        # 尚未更新
            is_updated = False
        else:
            selection_quota = int(selection_quota_num_match.group(1)) if selection_quota_num_match else 0
            is_updated = True

        # 第四欄：甄選人次
        selection_count_text = cells[3].inner_text().strip()
        selection_count_num_match = re.search(r'(\d+)', selection_count_text)
        selection_count = int(selection_count_num_match.group(1)) if selection_count_num_match else None

        # 第五欄：「申請資料」連結
        detail_link = cells[4].query_selector('a[href*="/outgoing/view/"]')
        if not detail_link:
            continue

        href = detail_link.get_attribute('href')
        sn_match = re.search(r'/sn/(\d+)', href)
        if not sn_match:
            continue

        school_id = sn_match.group(1)
        full_url = f"{BASE_URL}{href}" if href.startswith('/') else href

        schools.append({
            'id': school_id,
            'name_zh': school_name,
            'country': current_country,
            'url': full_url,
            'semester': SEMESTER,
            'contract_quota': contract_quota,
            'selection_quota': selection_quota,   # int 或 None（未更新）
            'selection_count': selection_count,
            'is_updated': is_updated,             # 本學期是否已更新資料
        })

    return schools


# ── 詳細頁解析 ────────────────────────────────────────────

def extract_links_from_element(element):
    """提取某個 DOM 元素內的所有連結"""
    links = element.query_selector_all('a[href]')
    result = []
    for link in links:
        href = link.get_attribute('href') or ''
        text = link.inner_text().strip()
        if href and not href.startswith('javascript'):
            result.append({'text': text, 'href': href})
    return result


def extract_detail_info(page, school_url):
    """
    從詳細頁面用 CSS selector 提取結構化資料
    回傳:
      name_zh, name_en, sections (dict: label -> {text, links}), raw_sections (list)
    """
    try:
        page.goto(school_url, timeout=30000)
        page.wait_for_load_state('networkidle')
        time.sleep(0.5)

        result = {}

        # ── 校名 ──────────────────────────────────────────
        title_el = page.query_selector('h2.university-title')
        if title_el:
            # 中文名：取 text node（排除 <small> 的內容）
            name_zh = page.evaluate(
                'el => Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join("").trim()',
                title_el
            )
            result['name_zh_detail'] = name_zh

            # 英文名：<small> 標籤
            small_el = title_el.query_selector('small')
            result['name_en'] = small_el.inner_text().strip() if small_el else ''
        else:
            result['name_zh_detail'] = ''
            result['name_en'] = ''

        # ── 所有 section（label → {text, links}）────────────
        sections_dict = {}   # 用於快速查詢
        sections_list = []   # 保留順序

        blocks = page.query_selector_all('.uninfo-awall')
        for block in blocks:
            label_el = block.query_selector('.uninfo-label span')
            content_el = block.query_selector('.uninfo-content')

            label = label_el.inner_text().strip() if label_el else '(no label)'
            text = content_el.inner_text().strip() if content_el else ''
            links = extract_links_from_element(content_el) if content_el else []

            entry = {'label': label, 'text': text, 'links': links}
            sections_list.append(entry)

            # 同名 section 用 list 存（避免覆蓋）
            if label not in sections_dict:
                sections_dict[label] = entry
            else:
                if isinstance(sections_dict[label], list):
                    sections_dict[label].append(entry)
                else:
                    sections_dict[label] = [sections_dict[label], entry]

        result['sections'] = sections_dict
        result['sections_ordered'] = sections_list

        # ── 從 sections 中提取常用欄位（方便後續使用）──────
        result.update(_extract_common_fields(sections_dict))

        return result

    except PlaywrightTimeout:
        logger.error(f"載入頁面超時: {school_url}")
        return None
    except Exception as e:
        logger.error(f"提取詳細資訊時出錯 ({school_url}): {e}")
        return None


def _get_section_text(sections, label):
    """安全取得 section 文字，處理 list 或 dict 的情況"""
    val = sections.get(label, {})
    if isinstance(val, dict):
        return val.get('text', '')
    if isinstance(val, list):
        return val[0].get('text', '') if val else ''
    return ''


def _extract_common_fields(sections):
    """從 sections dict 提取常用欄位"""
    fields = {}

    eligibility_text = _get_section_text(sections, '申請資格')
    quota_text       = _get_section_text(sections, '名額')
    calendar_text    = _get_section_text(sections, '學校年曆')

    # ── 語言組別（可能多組，以 / 連接，如「日語組/一般組」）──────
    GROUP_PATTERN = r'(一般組|日語組|法語組|西語組|德語組|葡語組|韓語組|中語組|中文組|英語組)'
    found_groups: list[str] = list(dict.fromkeys(re.findall(GROUP_PATTERN, eligibility_text)))
    if found_groups:
        # 將「一般組」排到最後（一般組通常是備選條件）
        if '一般組' in found_groups and len(found_groups) > 1:
            found_groups.remove('一般組')
            found_groups.append('一般組')
        fields['language_group'] = '/'.join(found_groups)
    else:
        fields['language_group'] = '一般組'

    # ── GPA ──────────────────────────────────────────────
    gpa_match = re.search(r'GPA\s*[達到需]\s*(\d+\.?\d*)', eligibility_text)
    fields['gpa_min'] = float(gpa_match.group(1)) if gpa_match else None

    # ── 英語檢定 ─────────────────────────────────────────
    # TOEFL iBT
    toefl_match = re.search(r'TOEFL\s*iBT\s*(\d+)', eligibility_text, re.IGNORECASE)
    fields['toefl_ibt'] = int(toefl_match.group(1)) if toefl_match else None

    # IELTS
    ielts_match = re.search(r'IELTS\s*(\d+\.?\d*)', eligibility_text, re.IGNORECASE)
    fields['ielts'] = float(ielts_match.group(1)) if ielts_match else None

    # TOEIC / 多益
    toeic_match = re.search(r'(?:TOEIC|多益)\s*[:：]?\s*(\d+)', eligibility_text, re.IGNORECASE)
    fields['toeic'] = int(toeic_match.group(1)) if toeic_match else None

    # 全民英檢 GEPT（初級 / 中級 / 中高級 / 高級 / 優級）
    gept_match = re.search(r'全民英檢\s*(初級|中級(?!以下)|中高級|高級|優級)', eligibility_text)
    fields['gept'] = gept_match.group(1) if gept_match else None

    # ── 非英語語言檢定 CEFR（B1 / B2 / C1 / C2）────────
    # 例：法語 B2、德文 B1、葡萄牙文 CEFR B1、西班牙語 B2
    cefr_match = re.search(
        r'(?:法[語文]|德[語文]|西班牙[語文]?|葡萄牙[語文]|韓[語文]|日[語文]|中文)'
        r'\s*(?:檢定|能力|CEFR)?\s*(?:成績\s*)?([ABC]\d)',
        eligibility_text
    )
    if not cefr_match:
        # 備用：直接找 CEFR Bx / Cx 格式（例：CEFR B1）
        cefr_match = re.search(r'CEFR\s+([ABC]\d)', eligibility_text)
    fields['language_cefr'] = cefr_match.group(1) if cefr_match else None

    # 日語能力檢定 JLPT（N1~N5 或 舊制 1~4 級）
    jlpt_match = re.search(
        r'(?:日語?(?:能力)?檢定|JLPT)\s*(?:成績\s*)?(?:N(\d)|(\d)\s*級)',
        eligibility_text,
        re.IGNORECASE
    )
    if jlpt_match:
        level = jlpt_match.group(1) or jlpt_match.group(2)
        fields['jlpt'] = f'N{level}'
    else:
        fields['jlpt'] = None

    # ── 名額 ─────────────────────────────────────────────
    quota_match = re.search(r'(\d+)\s*名', quota_text)
    fields['quota'] = int(quota_match.group(1)) if quota_match else None

    # ── 學期 ─────────────────────────────────────────────
    semesters = []
    combined = (calendar_text + ' ' + eligibility_text).lower()
    if any(kw in combined for kw in ['fall', 'winter', 'autumn', '第一學期', 'semester 1', '上學期']):
        semesters.append('Fall')
    if any(kw in combined for kw in ['spring', 'summer', '第二學期', 'semester 2', '下學期']):
        semesters.append('Spring')
    fields['semesters'] = ','.join(semesters) if semesters else 'Fall,Spring'

    # ── 不及格限制 ────────────────────────────────────────
    # 申請資格 或 注意事項 中有任何不及格相關字樣皆算
    notes_text_for_check = _get_section_text(sections, '注意事項')
    fields['no_fail_required'] = (
        '不及格' in eligibility_text or
        '不及格' in notes_text_for_check
    )

    # ── 年級要求 ─────────────────────────────────────────
    # 抓 "本校大X.../碩X.../博X...學生" 格式
    grade_match = re.search(r'本校\s*([^\n。]+?)(?=\s*學生)', eligibility_text)
    if grade_match:
        grade_req = grade_match.group(1).strip()
        # 去掉結尾的標點
        grade_req = re.sub(r'[\s，。；;,]+$', '', grade_req)
        fields['grade_requirement'] = grade_req
    else:
        fields['grade_requirement'] = None

    # ── 不接受申請之學院 ──────────────────────────────────
    # 抓所有 "不接受XXX之學生申請" 句型，以 ；串接
    restricted_matches = re.findall(r'不接受(.{5,300}?)(?:之|的)學生申請', eligibility_text)
    if restricted_matches:
        fields['restricted_colleges'] = '；'.join(
            ['不接受' + m.strip() + '之學生申請' for m in restricted_matches]
        )
    else:
        fields['restricted_colleges'] = '無'

    # ── 開放第二次出國交換 ──────────────────────────────
    # section label 為「此校開放予第二次出國交換之同學選填」（無 .uninfo-content）
    fields['second_exchange_eligible'] = '此校開放予第二次出國交換之同學選填' in sections

    # ── 原始文字（保留供後續使用）────────────────────────
    fields['eligibility_text'] = eligibility_text
    fields['quota_text']       = quota_text
    fields['calendar_text']    = calendar_text
    fields['notes_text']       = _get_section_text(sections, '注意事項')
    fields['housing_text']     = _get_section_text(sections, '住宿資訊')

    return fields


# ── 主程式 ────────────────────────────────────────────────

def main():
    start_time = datetime.now()
    mode = "LIST ONLY" if LIST_ONLY else f"IDS {','.join(ONLY_IDS)}" if ONLY_IDS else "FULL"
    logger.info("=" * 60)
    logger.info("開始爬取台大 OIA 交換學校資料 (v2 - 結構化解析)")
    logger.info(f"學期: Semester {SEMESTER}  模式: {mode}")
    logger.info(f"列表 URL: {LIST_URL}")
    logger.info(f"輸出檔案: {OUTPUT_FILE}")
    logger.info("=" * 60)

    all_schools = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()

        try:
            # Step 1：取得學校列表
            logger.info(f"正在載入列表頁面: {LIST_URL}")
            page.goto(LIST_URL, timeout=30000)
            schools = extract_school_links(page)
            logger.info(f"成功提取 {len(schools)} 個學校連結")

            # --list-only: 存到獨立暫存檔，不覆蓋主 JSON
            if LIST_ONLY:
                list_only_file = OUTPUT_FILE.replace('.json', '_list_only.json')
                with open(list_only_file, 'w', encoding='utf-8') as f:
                    json.dump(schools, f, ensure_ascii=False, indent=2)
                logger.info(f"✅ 列表模式完成，已存 {len(schools)} 筆 → {list_only_file}")
                return

            # --ids: 若有指定 ID，載入既有 JSON 並只更新指定學校的詳細頁
            if ONLY_IDS:
                # 載入既有 JSON 作為基底
                import os
                existing = {}
                if os.path.exists(OUTPUT_FILE):
                    with open(OUTPUT_FILE, encoding='utf-8') as f:
                        for s in json.load(f):
                            existing[s['id']] = s
                # 用列表頁的最新資料更新基底（列表欄位如 is_updated, selection_quota 等）
                for s in schools:
                    if s['id'] in existing:
                        existing[s['id']].update(s)
                    else:
                        existing[s['id']] = s

                # 只爬指定 ID 的詳細頁
                targets = [s for s in schools if s['id'] in ONLY_IDS]
                logger.info(f"將爬取 {len(targets)} 所指定學校的詳細頁")

                success_count = 0
                fail_count = 0
                for idx, school in enumerate(targets, 1):
                    logger.info(f"[{idx}/{len(targets)}] {school['name_zh']} ({school['country']})")
                    detail = extract_detail_info(page, school['url'])
                    if detail:
                        existing[school['id']].update(detail)
                        if detail.get('name_zh_detail'):
                            existing[school['id']]['name_zh'] = detail['name_zh_detail']
                        success_count += 1
                        logger.info(f"  ✓ OK")
                    else:
                        fail_count += 1
                        logger.warning(f"  ✗ 無法取得詳細資訊")
                    time.sleep(DELAY_BETWEEN_REQUESTS)

                all_schools = list(existing.values())
                with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                    json.dump(all_schools, f, ensure_ascii=False, indent=2)
                logger.info(f"✅ 指定 ID 模式完成，更新 {success_count} 所，失敗 {fail_count} 所")
                return

            # Step 2：完整模式 - 逐一爬取詳細頁面
            total = len(schools)
            success_count = 0
            fail_count = 0

            for idx, school in enumerate(schools, 1):
                logger.info(f"[{idx}/{total}] {school['name_zh']} ({school['country']})")

                detail = extract_detail_info(page, school['url'])

                if detail:
                    school.update(detail)
                    # 詳細頁的校名比列表頁乾淨，優先使用
                    if detail.get('name_zh_detail'):
                        school['name_zh'] = detail['name_zh_detail']
                    success_count += 1
                    logger.info(f"  ✓ name_en={detail.get('name_en', '')}  "
                                f"group={detail.get('language_group')}  "
                                f"gpa={detail.get('gpa_min')}  "
                                f"toefl={detail.get('toefl_ibt')}  "
                                f"ielts={detail.get('ielts')}  "
                                f"gept={detail.get('gept')}  "
                                f"cefr={detail.get('language_cefr')}  "
                                f"jlpt={detail.get('jlpt')}  "
                                f"quota={detail.get('quota')}  "
                                f"no_fail={detail.get('no_fail_required')}  "
                                f"2nd={detail.get('second_exchange_eligible')}")
                else:
                    fail_count += 1
                    logger.warning(f"  ✗ 無法取得詳細資訊")

                all_schools.append(school)
                time.sleep(DELAY_BETWEEN_REQUESTS)

            # Step 3：儲存
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                json.dump(all_schools, f, ensure_ascii=False, indent=2)

            logger.info("=" * 60)
            logger.info("爬取完成！")
            logger.info(f"總學校數: {total}，成功: {success_count}，失敗: {fail_count}")
            logger.info(f"耗時: {datetime.now() - start_time}")
            logger.info(f"資料已儲存至: {OUTPUT_FILE}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"發生嚴重錯誤: {e}")
            raise
        finally:
            browser.close()


if __name__ == '__main__':
    main()
