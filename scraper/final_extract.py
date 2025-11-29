#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import csv

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
        '南韓': 'South Korea',
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
        '越南': 'Vietnam',
        '澳門': 'Macau',
        '中國': 'China',
        '蒙古': 'Mongolia',
        '奧地利': 'Austria',
        '比利時': 'Belgium',
        '捷克': 'Czech Republic',
        '希臘': 'Greece',
        '匈牙利': 'Hungary',
        '冰島': 'Iceland',
        '拉脫維亞': 'Latvia',
        '立陶宛': 'Lithuania',
        '盧森堡': 'Luxembourg',
        '科索沃': 'Kosovo',
        '斯洛維尼亞': 'Slovenia',
        '哥倫比亞': 'Colombia',
        '澳大利亞': 'Australia'
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
    
    # 定義輸出檔案
    output_file = '/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_list_gemini.csv'
    
    # 建立 ID 到英文名稱的映射
    id_to_english_name = {}
    for school in schools_data:
        if 'text_content' in school:
            english_name = extract_english_name(school['text_content'])
            if english_name:
                id_to_english_name[school['id']] = english_name
    
    # 更新每間學校的英文名稱
    for i, school in enumerate(schools):
        school_id = school['id']
        country_zh = school['country']
        
        # 添加英文校名
        school['name_en'] = id_to_english_name.get(school_id, '')
        
        # 添加英文國家名稱
        school['country_en'] = get_country_english_name(country_zh)
        
        print(f"處理 {i+1}/{len(schools)}: {school['name_zh']}: {school['name_en']} ({school['country_en']})")
        
        # 每處理 50 間學校就寫入一次，避免資料遺失
        if (i + 1) % 50 == 0:
            print(f"已處理 {i+1} 間學校，正在儲存...")
            try:
                with open(output_file, 'w', newline='', encoding='utf-8') as f:
                    # 重新構建正確的欄位順序
                    original_fieldnames = list(schools[0].keys())
                    original_fieldnames = [f for f in original_fieldnames if f not in ['name_en', 'country_en']]
                    
                    # 找到 name_zh 和 country 欄位的位置
                    name_zh_index = original_fieldnames.index('name_zh')
                    country_index = original_fieldnames.index('country')
                    
                    # 在 name_zh 後面插入 name_en，在 country 後面插入 country_en
                    correct_fieldnames = (original_fieldnames[:name_zh_index+1] + ['name_en'] + 
                                        original_fieldnames[name_zh_index+1:country_index+1] + ['country_en'] + 
                                        original_fieldnames[country_index+1:])
                    
                    writer = csv.DictWriter(f, fieldnames=correct_fieldnames)
                    writer.writeheader()
                    writer.writerows(schools[:i+1])
            except Exception as e:
                print(f"儲存時發生錯誤: {e}")
                print("跳過此次儲存，繼續處理...")
    
    # 寫入更新後的 CSV
    output_file = '/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_list_gemini.csv'
    
    if schools:
        # 重新構建正確的欄位順序
        original_fieldnames = list(schools[0].keys())
        # 移除新添加的欄位
        original_fieldnames = [f for f in original_fieldnames if f not in ['name_en', 'country_en']]
        
        # 找到 name_zh 和 country 欄位的位置
        name_zh_index = original_fieldnames.index('name_zh')
        country_index = original_fieldnames.index('country')
        
        # 在 name_zh 後面插入 name_en，在 country 後面插入 country_en
        correct_fieldnames = (original_fieldnames[:name_zh_index+1] + ['name_en'] + 
                            original_fieldnames[name_zh_index+1:country_index+1] + ['country_en'] + 
                            original_fieldnames[country_index+1:])
        
        try:
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=correct_fieldnames)
                writer.writeheader()
                writer.writerows(schools)
        except Exception as e:
            print(f"最終儲存時發生錯誤: {e}")
            print("嘗試使用簡化的欄位順序...")
            # 使用簡化的欄位順序
            simple_fieldnames = ['id', 'name_zh', 'name_en', 'country', 'country_en', 'url']
            # 添加其他欄位
            for school in schools:
                for key in school.keys():
                    if key not in simple_fieldnames:
                        simple_fieldnames.append(key)
            
            try:
                with open(output_file, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=simple_fieldnames)
                    writer.writeheader()
                    writer.writerows(schools)
                print("使用簡化欄位順序儲存成功！")
            except Exception as e2:
                print(f"簡化儲存也失敗: {e2}")
                return
    
    print(f"\n完成！已更新 {len(schools)} 間學校的英文名稱")
    print(f"檔案已儲存至: {output_file}")
    
    # 顯示統計資訊
    successful = sum(1 for school in schools if school.get('name_en'))
    print(f"成功獲取英文校名的學校: {successful}/{len(schools)}")

if __name__ == "__main__":
    main()
