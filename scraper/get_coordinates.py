#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import urllib.request
import urllib.parse
import time
import json
from typing import Dict, Tuple, Optional

def get_coordinates_from_nominatim(school_name: str, country: str) -> Optional[Tuple[float, float]]:
    """
    使用 OpenStreetMap Nominatim API 獲取學校的經緯度
    """
    # 嘗試多種查詢策略
    queries = [
        f"{school_name}, {country}",  # 原始查詢
    ]
    
    # 如果校名包含括號，嘗試提取簡化名稱
    if '(' in school_name and ')' in school_name:
        # 提取括號內的簡稱
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
    
    for query in queries:
        try:
            params = {
                'q': query,
                'format': 'json',
                'limit': 1,
                'addressdetails': 1
            }
            
            # 構建 URL
            url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
            
            # 創建請求
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Exchange School Mapper 1.0')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
                if data:
                    lat = float(data[0]['lat'])
                    lon = float(data[0]['lon'])
                    return (lat, lon)
        
        except Exception as e:
            continue  # 嘗試下一個查詢
    
    return None

def get_coordinates_from_google(school_name: str, country: str) -> Optional[Tuple[float, float]]:
    """
    使用 Google Geocoding API 獲取學校的經緯度
    注意：這需要 Google API Key
    """
    # 這裡需要 Google API Key，暫時不使用
    return None

def get_coordinates_manual(school_name: str, country: str) -> Optional[Tuple[float, float]]:
    """
    不使用手動座標，只使用 API
    """
    return None

def get_coordinates(school_name: str, country: str) -> Tuple[Optional[float], Optional[float]]:
    """
    獲取學校座標，只使用 Nominatim API
    """
    # 使用 Nominatim API
    coords = get_coordinates_from_nominatim(school_name, country)
    if coords:
        return coords
    
    return (None, None)

def main():
    # 讀取現有的 CSV 檔案
    input_file = '/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_list_gemini.csv'
    output_file = '/Users/yu/Desktop/大三/網服/wp1141/hw3/scraper/school_map.csv'
    
    schools = []
    
    # 讀取 CSV 檔案
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            schools.append(row)
    
    print(f"開始處理 {len(schools)} 間學校的座標...")
    
    # 處理每間學校
    for i, school in enumerate(schools):
        school_name = school['name_en']
        country = school['country_en']
        
        print(f"處理 {i + 1}/{len(schools)}: {school_name} ({country})")
        
        lat, lon = get_coordinates(school_name, country)
        
        if lat and lon:
            school['latitude'] = lat
            school['longitude'] = lon
            print(f"  ✓ 座標: {lat}, {lon}")
        else:
            school['latitude'] = ''
            school['longitude'] = ''
            print(f"  ✗ 無法獲取座標")
        
        # 避免 API 限制，稍作延遲
        time.sleep(1)
    
    # 寫入更新後的 CSV
    if schools:
        fieldnames = list(schools[0].keys())
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(schools)
    
    print(f"\n完成！已更新 {len(schools)} 間學校的座標資訊")
    print(f"檔案已儲存至: {output_file}")
    
    # 顯示統計資訊
    successful = sum(1 for school in schools if school.get('latitude'))
    print(f"成功獲取座標的學校: {successful}/{len(schools)}")

if __name__ == "__main__":
    main()
