#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import csv
import re

def extract_english_name(text_content: str) -> str:
    """
    從 text_content 中提取英文校名
    格式：主選單\n大學中文名\n英文校名\n申請資格
    """
    lines = text_content.split('\n')
    
    # 找到學校名稱後開始解析
    school_name_found = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # 檢查是否為學校名稱行（包含大學）
        if not school_name_found and '大學' in line and '主選單' not in line:
            school_name_found = True
            # 檢查下一行是否為英文校名
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # 如果下一行包含英文校名特徵，且不是台大的固定內容
                if (('University' in next_line or 'College' in next_line or 'Institute' in next_line or 
                    'School' in next_line or 'Academy' in next_line or 'Universidade' in next_line or 
                    'Université' in next_line or 'Universidad' in next_line) and 
                    'Office of International Affairs' not in next_line and 
                    'National Taiwan University' not in next_line):
                    return next_line
            continue
            
        if not school_name_found:
            continue
    
    return ""

def get_country_english_name(country_zh: str) -> str:
    """
    將中文國家名稱轉換為英文
    """
    country_mapping = {
        '巴西': 'Brazil',
        '加拿大': 'Canada',
        '智利': 'Chile',
        '中國': 'China',
        '丹麥': 'Denmark',
        '芬蘭': 'Finland',
        '法國': 'France',
        '德國': 'Germany',
        '香港': 'Hong Kong',
        '印度': 'India',
        '印尼': 'Indonesia',
        '愛爾蘭': 'Ireland',
        '以色列': 'Israel',
        '義大利': 'Italy',
        '日本': 'Japan',
        '韓國': 'South Korea',
        '馬來西亞': 'Malaysia',
        '墨西哥': 'Mexico',
        '荷蘭': 'Netherlands',
        '紐西蘭': 'New Zealand',
        '挪威': 'Norway',
        '菲律賓': 'Philippines',
        '波蘭': 'Poland',
        '葡萄牙': 'Portugal',
        '俄羅斯': 'Russia',
        '新加坡': 'Singapore',
        '南非': 'South Africa',
        '西班牙': 'Spain',
        '瑞典': 'Sweden',
        '瑞士': 'Switzerland',
        '泰國': 'Thailand',
        '土耳其': 'Turkey',
        '英國': 'United Kingdom',
        '美國': 'United States',
        '越南': 'Vietnam'
    }
    
    return country_mapping.get(country_zh, country_zh)

def main():
    # 讀取 JSON 檔案
    with open('/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/raw_schools.json', 'r', encoding='utf-8') as f:
        schools_data = json.load(f)
    
    # 讀取現有的 CSV 檔案
    schools = []
    with open('/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_list_gemini.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            schools.append(row)
    
    print(f"開始處理 {len(schools)} 間學校的英文名稱...")
    
    # 建立 ID 到英文名稱的映射
    id_to_english_name = {}
    for school in schools_data:
        if 'text_content' in school:
            english_name = extract_english_name(school['text_content'])
            if english_name:
                id_to_english_name[school['id']] = english_name
    
    # 更新每間學校的英文名稱
    for school in schools:
        school_id = school['id']
        country_zh = school['country']
        
        # 添加英文校名
        school['name_en'] = id_to_english_name.get(school_id, '')
        
        # 添加英文國家名稱
        school['country_en'] = get_country_english_name(country_zh)
        
        print(f"處理 {school['name_zh']}: {school['name_en']} ({school['country_en']})")
    
    # 寫入更新後的 CSV
    output_file = '/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_map.csv'
    
    if schools:
        # 重新構建正確的欄位順序
        original_fieldnames = list(schools[0].keys())
        # 移除新添加的欄位
        original_fieldnames = [f for f in original_fieldnames if f not in ['name_en', 'country_en']]
        
        # 找到 country 欄位的位置
        country_index = original_fieldnames.index('country')
        
        # 在 country 後面插入新欄位
        correct_fieldnames = original_fieldnames[:country_index+1] + ['name_en', 'country_en'] + original_fieldnames[country_index+1:]
        
        # 確保所有學校都有正確的欄位
        for school in schools:
            for field in correct_fieldnames:
                if field not in school:
                    school[field] = ''
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=correct_fieldnames)
            writer.writeheader()
            writer.writerows(schools)
    
    print(f"\n完成！已更新 {len(schools)} 間學校的英文名稱")
    print(f"檔案已儲存至: {output_file}")
    
    # 顯示統計資訊
    successful = sum(1 for school in schools if school.get('name_en'))
    print(f"成功獲取英文校名的學校: {successful}/{len(schools)}")

if __name__ == "__main__":
    main()
