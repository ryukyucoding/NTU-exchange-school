#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

def extract_english_name(text_content: str) -> str:
    """
    從 text_content 中提取英文校名
    """
    lines = text_content.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # 檢查是否為學校名稱行（包含大學）
        if '大學' in line and '主選單' not in line and '國際事務處' not in line:
            # 檢查下一行是否為英文校名
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                # 如果下一行包含英文校名特徵
                if ('University' in next_line or 'College' in next_line or 'Institute' in next_line or 
                    'School' in next_line or 'Academy' in next_line or 'Universidade' in next_line or 
                    'Université' in next_line or 'Universidad' in next_line):
                    return next_line
    
    return ""

def main():
    # 讀取 JSON 檔案
    with open('/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/raw_schools.json', 'r', encoding='utf-8') as f:
        schools_data = json.load(f)
    
    # 測試前5間學校
    for i, school in enumerate(schools_data[:5]):
        if 'text_content' in school:
            english_name = extract_english_name(school['text_content'])
            print(f"{i+1}. {school['name_zh']}: {english_name}")

if __name__ == "__main__":
    main()
