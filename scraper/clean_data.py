#!/usr/bin/env python3
"""
清理和標準化爬取的學校資料
輸出為標準 CSV 格式
"""

import json
import pandas as pd
import re
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 學院標準化對照表
COLLEGE_MAPPING = {
    '文學院': ['文學院', '中文系', '外文系', '歷史系', '哲學系', '人類學系', '圖資系', '日文系', '戲劇系', '語言學研究所'],
    '理學院': ['理學院', '數學系', '物理系', '化學系', '地質系', '心理系', '地理系', '大氣系'],
    '社會科學院': ['社會科學院', '政治系', '經濟系', '社會系', '社工系', '新聞所', '國發所'],
    '醫學院': ['醫學院', '醫學系', '牙醫系', '藥學系','護理系', '醫技系', '物治系', '職治系'],
    '工學院': ['工學院', '土木系', '機械系', '化工系', '材料系', '工海系', '醫工系', '應力所'],
    '生農學院': ['生農學院', '農藝系', '生工系', '農化系', '森林系', '動科系', '農經系', '園藝系', '獸醫系', '生傳系', '生機系', '昆蟲系', '植微系'],
    '管理學院': ['管理學院', '工管系', '會計系', '財金系', '國企系', '資管系', 'MBA', 'EMBA', 'GMBA'],
    '公衛學院': ['公衛學院', '公衛系'],
    '電資學院': ['電資學院', '電機系', '資工系', '光電所', '電信所', '電子所', '網媒所'],
    '法律學院': ['法律學院', '法律系', '科法所'],
    '生科學院': ['生科學院', '生化科技學系', '生命科學系'],
}

# 國家地區對照表
REGION_MAPPING = {
    '北美洲': ['美國', '加拿大', '墨西哥'],
    '歐洲': [
        '英國', '法國', '德國', '義大利', '西班牙', '荷蘭', '比利時', '瑞士', '奧地利',
        '瑞典', '挪威', '丹麥', '芬蘭', '波蘭', '捷克', '匈牙利', '葡萄牙', '希臘',
        '愛爾蘭', '冰島', '盧森堡', '愛沙尼亞', '拉脫維亞', '立陶宛', '斯洛伐克',
        '斯洛維尼亞', '克羅埃西亞', '羅馬尼亞', '保加利亞', '塞爾維亞', '烏克蘭'
    ],
    '亞洲': [
        '日本', '韓國', '中國', '香港', '新加坡', '泰國', '馬來西亞', '印尼', '菲律賓',
        '越南', '印度', '以色列', '土耳其', '阿聯酋', '沙烏地阿拉伯', '台灣'
    ],
    '大洋洲': ['澳洲', '澳大利亞', '紐西蘭', '新西蘭', '斐濟'],
    '南美洲': ['巴西', '阿根廷', '智利', '哥倫比亞', '秘魯', '委內瑞拉'],
    '非洲': ['南非', '埃及', '肯亞', '奈及利亞', '摩洛哥']
}

def standardize_colleges(college_text):
    """標準化學院欄位"""
    if not college_text or pd.isna(college_text):
        return None

    # 檢查是否為全校
    if '全校' in college_text or '所有學院' in college_text:
        return '全校'

    # 提取學院名稱
    matched_colleges = set()

    for standard_college, keywords in COLLEGE_MAPPING.items():
        for keyword in keywords:
            if keyword in college_text:
                matched_colleges.add(standard_college)
                break

    if matched_colleges:
        return '|'.join(sorted(matched_colleges))

    return None

def standardize_region(country):
    """根據國家判斷地區"""
    if not country or pd.isna(country):
        return '其他'

    for region, countries in REGION_MAPPING.items():
        if any(c in country for c in countries):
            return region

    return '其他'

def parse_language_requirement(text, test_type):
    """解析語言成績要求"""
    if not text or pd.isna(text):
        return None

    text = str(text)

    # 根據測驗類型使用不同的正則表達式
    if test_type == 'toefl':
        patterns = [
            r'TOEFL\s*iBT\s*[:：]?\s*(\d+)',
            r'TOEFL\s*[:：]?\s*(\d+)',
            r'托福\s*[:：]?\s*(\d+)'
        ]
        max_score = 120
    elif test_type == 'ielts':
        patterns = [r'IELTS\s*[:：]?\s*(\d+\.?\d*)']
        max_score = 9
    elif test_type == 'toeic':
        patterns = [
            r'TOEIC\s*[:：]?\s*(\d+)',
            r'多益\s*[:：]?\s*(\d+)'
        ]
        max_score = 990
    else:
        return None

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                score = float(match.group(1))
                if 0 <= score <= max_score:
                    return int(score) if test_type != 'ielts' else score
            except ValueError:
                continue

    return None

def get_coordinates(school_name, city, country, geolocator, cache):
    """使用 geopy 取得經緯度座標"""
    # 檢查快取
    cache_key = f"{school_name}|{city}|{country}"
    if cache_key in cache:
        return cache[cache_key]

    try:
        # 建立查詢字串
        query_parts = []
        if school_name:
            query_parts.append(school_name)
        if city:
            query_parts.append(city)
        if country:
            query_parts.append(country)

        query = ', '.join(query_parts)

        # 查詢座標
        location = geolocator.geocode(query, timeout=10)

        if location:
            result = (location.latitude, location.longitude)
            cache[cache_key] = result
            logger.info(f"  ✓ 找到座標: {school_name} -> {result}")
            return result
        else:
            # 嘗試只用城市和國家
            if city and country:
                query = f"{city}, {country}"
                location = geolocator.geocode(query, timeout=10)
                if location:
                    result = (location.latitude, location.longitude)
                    cache[cache_key] = result
                    logger.info(f"  ✓ 找到座標 (城市): {city}, {country} -> {result}")
                    return result

            logger.warning(f"  ✗ 找不到座標: {school_name}")
            cache[cache_key] = (None, None)
            return (None, None)

    except (GeocoderTimedOut, GeocoderServiceError) as e:
        logger.warning(f"  ✗ 查詢座標失敗: {school_name} - {e}")
        cache[cache_key] = (None, None)
        return (None, None)
    except Exception as e:
        logger.error(f"  ✗ 查詢座標時發生錯誤: {school_name} - {e}")
        cache[cache_key] = (None, None)
        return (None, None)

def clean_data():
    """主要資料清理函式"""
    logger.info("=" * 60)
    logger.info("開始清理資料")
    logger.info("=" * 60)

    # 讀取原始資料
    with open('raw_schools.json', 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    logger.info(f"載入 {len(raw_data)} 筆原始資料")

    # 建立 DataFrame
    df = pd.DataFrame(raw_data)

    # 如果 id 欄位存在，先移除再重新建立流水號
    if 'id' in df.columns:
        df = df.drop(columns=['id'])

    # 建立流水號 id
    df.insert(0, 'id', range(1, len(df) + 1))

    # 標準化學院
    logger.info("正在標準化學院資訊...")
    df['colleges'] = df.apply(
        lambda row: standardize_colleges(row.get('colleges') or row.get('departments')),
        axis=1
    )

    # 標準化地區
    logger.info("正在標準化地區分類...")
    df['region'] = df['country'].apply(standardize_region)

    # 處理缺失值
    logger.info("正在處理缺失值...")

    # GPA 缺失設為 null
    if 'gpa_min' not in df.columns:
        df['gpa_min'] = None

    # 名額缺失設為 1
    if 'quota' in df.columns:
        df['quota'] = df['quota'].fillna(1).astype(int)
    else:
        df['quota'] = 1

    # 年級限制缺失設為 "不限"
    if 'grade_requirement' in df.columns:
        df['grade_requirement'] = df['grade_requirement'].fillna('不限')
    else:
        df['grade_requirement'] = '不限'

    # 學期資訊缺失設為 "Fall,Spring"
    if 'semesters' in df.columns:
        df['semesters'] = df['semesters'].fillna('Fall,Spring')
    else:
        df['semesters'] = 'Fall,Spring'

    # 取得地理座標
    logger.info("正在查詢地理座標...")
    geolocator = Nominatim(user_agent="ntu_oia_scraper")
    coord_cache = {}

    coordinates = []
    for idx, row in df.iterrows():
        if idx > 0 and idx % 10 == 0:
            logger.info(f"  進度: {idx}/{len(df)}")

        lat, lon = get_coordinates(
            row.get('name_en') or row.get('name_zh'),
            row.get('city'),
            row.get('country'),
            geolocator,
            coord_cache
        )
        coordinates.append({'latitude': lat, 'longitude': lon})

        # 延遲避免超過 API 限制
        time.sleep(1)

    df['latitude'] = [c['latitude'] for c in coordinates]
    df['longitude'] = [c['longitude'] for c in coordinates]

    # 確保欄位順序
    column_order = [
        'id', 'name_zh', 'name_en', 'country', 'city', 'region',
        'latitude', 'longitude', 'colleges', 'departments',
        'grade_requirement', 'gpa_min', 'toefl_ibt', 'ielts', 'toeic',
        'other_language', 'quota', 'semesters', 'tuition', 'notes', 'url'
    ]

    # 添加缺失的欄位
    for col in column_order:
        if col not in df.columns:
            df[col] = None

    # 重新排序欄位
    df = df[column_order]

    # 儲存 CSV
    output_path = '../hw3/public/data/schools.csv'
    df.to_csv(output_path, index=False, encoding='utf-8')

    logger.info("=" * 60)
    logger.info("資料清理完成！")
    logger.info(f"輸出檔案: {output_path}")
    logger.info(f"總計: {len(df)} 筆資料")
    logger.info("=" * 60)

    # 輸出統計資訊
    logger.info("\n統計資訊:")
    logger.info(f"各地區分布:")
    for region, count in df['region'].value_counts().items():
        logger.info(f"  {region}: {count}")

    logger.info(f"\n有座標的學校: {df['latitude'].notna().sum()}")
    logger.info(f"無座標的學校: {df['latitude'].isna().sum()}")

    return df

if __name__ == '__main__':
    clean_data()
