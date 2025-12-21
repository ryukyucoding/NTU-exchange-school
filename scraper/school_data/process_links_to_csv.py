#!/usr/bin/env python3
"""
處理包含連結的 JSON 資料，轉換為 CSV 格式
連結欄位會以 JSON 字串形式儲存
"""

import json
import csv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def format_links(links_data):
    """
    將連結資料格式化為易讀的字串
    支援多種格式：
    - 單一連結: "文字 [URL]"
    - 多個連結: "文字1 [URL1] | 文字2 [URL2]"
    """
    if not links_data:
        return ""

    if isinstance(links_data, str):
        return links_data

    if isinstance(links_data, list):
        formatted_links = []
        for link in links_data:
            if isinstance(link, dict) and 'text' in link and 'url' in link:
                formatted_links.append(f"{link['text']} [{link['url']}]")
            elif isinstance(link, str):
                formatted_links.append(link)
        return " | ".join(formatted_links)

    return str(links_data)

def format_field_data(field_data):
    """
    格式化欄位資料（可能是連結列表或純文字）
    """
    if not field_data:
        return ""
    
    if isinstance(field_data, str):
        return field_data
    
    if isinstance(field_data, list):
        if len(field_data) == 0:
            return ""
        # 檢查是否為連結列表
        if isinstance(field_data[0], dict) and 'text' in field_data[0] and 'url' in field_data[0]:
            return format_links(field_data)
        else:
            return " | ".join(str(item) for item in field_data)
    
    return str(field_data)

def main():
    # 讀取包含連結的 JSON 檔案
    input_file = 'raw_schools_with_links.json'
    output_file = 'schools_with_links.csv'

    logger.info(f"讀取檔案: {input_file}")

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            schools_data = json.load(f)
    except FileNotFoundError:
        logger.error(f"找不到檔案: {input_file}")
        logger.info("請先執行 fetch_schools_with_links.py 爬取資料")
        return

    logger.info(f"共有 {len(schools_data)} 間學校")

    # 準備 CSV 欄位（只包含三個目標欄位）
    csv_fields = [
        'id',
        'name_zh',
        'country',
        'url',
        'accommodation_info',      # 住宿資訊（含連結）
        'academic_calendar',       # 學校年曆（含連結）
        'notes',                   # 注意事項（含連結）
    ]

    # 寫入 CSV
    processed_schools = []

    for school in schools_data:
        processed_school = {
            'id': school.get('id', ''),
            'name_zh': school.get('name_zh', ''),
            'country': school.get('country', ''),
            'url': school.get('url', ''),
            'accommodation_info': format_field_data(school.get('accommodation_info', '')),
            'academic_calendar': format_field_data(school.get('academic_calendar', '')),
            'notes': format_field_data(school.get('notes', '')),
        }

        processed_schools.append(processed_school)

    # 寫入 CSV
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(processed_schools)

    logger.info(f"資料已寫入: {output_file}")

    # 統計包含資料的學校數量
    stats = {
        'accommodation_info': 0,
        'academic_calendar': 0,
        'notes': 0,
    }

    for school in processed_schools:
        for field in stats.keys():
            if school.get(field):
                stats[field] += 1

    logger.info("\n統計資訊:")
    logger.info(f"  住宿資訊有資料: {stats['accommodation_info']}/{len(processed_schools)}")
    logger.info(f"  學校年曆有資料: {stats['academic_calendar']}/{len(processed_schools)}")
    logger.info(f"  注意事項有資料: {stats['notes']}/{len(processed_schools)}")

if __name__ == '__main__':
    main()
