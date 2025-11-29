#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import urllib.request
import urllib.parse
import json
import time
from typing import Optional, Tuple

def get_coordinates_enhanced(school_name: str, country: str) -> Optional[Tuple[float, float]]:
    """
    使用多種策略嘗試獲取學校座標
    """
    # 嘗試多種查詢策略
    queries = [
        f"{school_name}, {country}",  # 原始查詢
    ]
    
    # 如果校名包含括號，嘗試提取簡化名稱
    if '(' in school_name and ')' in school_name:
        import re
        match = re.search(r'\(([^)]+)\)', school_name)
        if match:
            short_name = match.group(1)
            queries.append(f"{short_name}, {country}")
    
    # 嘗試不同的查詢方式
    if 'University' in school_name:
        # 提取主要部分
        main_part = school_name.split('(')[0].strip()
        queries.append(f"{main_part}, {country}")
    
    # 嘗試更簡化的查詢
    if 'The ' in school_name:
        queries.append(school_name.replace('The ', ''))
    
    # 嘗試只使用大學名稱
    if 'University' in school_name:
        queries.append(school_name.split(',')[0])
    
    # 嘗試使用城市名稱
    city_mapping = {
        'New York': 'New York',
        'California': 'California',
        'Paris': 'Paris',
        'Madrid': 'Madrid',
        'Barcelona': 'Barcelona',
        'Berlin': 'Berlin',
        'Munich': 'Munich',
        'Auckland': 'Auckland',
        'Lyon': 'Lyon',
        'Bordeaux': 'Bordeaux',
        'Orleans': 'Orleans',
        'Rennes': 'Rennes',
        'Darmstadt': 'Darmstadt',
        'Freiburg': 'Freiburg',
        'Erlangen': 'Erlangen',
        'Linz': 'Linz',
        'Mons': 'Mons',
        'Scranton': 'Scranton',
        'Albany': 'Albany',
        'Nagoya': 'Nagoya',
        'Sunchon': 'Sunchon',
        'Zhejiang': 'Hangzhou',
        'Nottingham': 'Nottingham',
        'Auckland': 'Auckland'
    }
    
    for city, city_name in city_mapping.items():
        if city in school_name:
            queries.append(f"{school_name}, {city_name}")
            break
    
    for query in queries:
        try:
            params = {
                'q': query,
                'format': 'json',
                'limit': 3,  # 增加結果數量
                'addressdetails': 1
            }
            
            # 構建 URL
            url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
            
            # 創建請求
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Exchange School Mapper 1.0')
            
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode())
                
                if data:
                    # 嘗試找到最相關的結果
                    for result in data:
                        display_name = result.get('display_name', '').lower()
                        if any(keyword in display_name for keyword in ['university', 'college', 'institute', 'school']):
                            lat = float(result['lat'])
                            lon = float(result['lon'])
                            return (lat, lon)
                    
                    # 如果沒有找到大學相關的結果，使用第一個結果
                    lat = float(data[0]['lat'])
                    lon = float(data[0]['lon'])
                    return (lat, lon)
        
        except Exception as e:
            continue  # 嘗試下一個查詢
    
    return None

def main():
    # 讀取現有的 CSV 檔案
    with open('/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_map.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        schools = list(reader)
    
    # 找出沒有座標的學校
    missing_coords = []
    for i, school in enumerate(schools):
        if not school.get('latitude') or school.get('latitude').strip() == '':
            missing_coords.append((i, school))
    
    print(f"找到 {len(missing_coords)} 間學校沒有座標，開始重新查詢...")
    
    # 為沒有座標的學校重新查詢
    updated_count = 0
    for i, (index, school) in enumerate(missing_coords):
        school_name = school.get('name_en', '')
        country = school.get('country_en', '')
        
        if not school_name or not country:
            print(f"跳過 {index+1}: {school.get('name_zh', '')} - 缺少英文名稱或國家")
            continue
        
        print(f"重新查詢 {i+1}/{len(missing_coords)}: {school.get('name_zh', '')} ({school_name})")
        
        coords = get_coordinates_enhanced(school_name, country)
        
        if coords:
            schools[index]['latitude'] = str(coords[0])
            schools[index]['longitude'] = str(coords[1])
            print(f"  ✓ 成功獲取座標: {coords[0]}, {coords[1]}")
            updated_count += 1
        else:
            print(f"  ✗ 仍然無法獲取座標")
        
        # 避免 API 限制
        time.sleep(2)
    
    # 儲存更新後的 CSV
    if schools:
        fieldnames = list(schools[0].keys())
        with open('/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_map.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(schools)
    
    print(f"\n完成！成功為 {updated_count} 間學校補上座標")
    
    # 顯示最終統計
    final_missing = sum(1 for school in schools if not school.get('latitude') or school.get('latitude').strip() == '')
    print(f"仍有 {final_missing} 間學校沒有座標")

if __name__ == "__main__":
    main()
