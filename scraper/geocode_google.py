#!/usr/bin/env python3
"""
用 Google Maps Geocoding API 重新查所有學校經緯度
- 結果存到 google_coordinates.json（獨立 cache，不覆蓋 Nominatim 的）
- 跑完會產生比較報告，顯示與 DB 的差異
- 確認後可選擇更新 raw_schools_v2_sem2.json 和 DB

用法:
  python geocode_google.py --key YOUR_API_KEY
  python geocode_google.py --key YOUR_API_KEY --force   # 重查已有 cache 的
  python geocode_google.py --key YOUR_API_KEY --update-json  # 更新 JSON 檔
"""

import json
import time
import re
import sys
import os
import urllib.request
import urllib.parse
import argparse
from pathlib import Path
import logging

# 嘗試從 .env / .env.local 載入環境變數
for env_file in [Path(__file__).parent.parent / '.env.local', Path(__file__).parent.parent / '.env']:
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR   = Path(__file__).parent
JSON_FILE  = BASE_DIR / 'raw_schools_v2_sem2.json'
CACHE_FILE = BASE_DIR / 'google_coordinates.json'
DELAY      = 0.05   # Google 限速寬鬆，0.05s 足夠

COUNTRY_ZH_TO_EN = {
    '美國': 'United States', '加拿大': 'Canada', '英國': 'United Kingdom',
    '澳洲': 'Australia', '紐西蘭': 'New Zealand', '日本': 'Japan',
    '南韓': 'South Korea', '大陸地區': 'China', '香港': 'Hong Kong',
    '新加坡': 'Singapore', '馬來西亞': 'Malaysia', '泰國': 'Thailand',
    '印尼': 'Indonesia', '越南': 'Vietnam', '印度': 'India',
    '德國': 'Germany', '法國': 'France', '荷蘭': 'Netherlands',
    '比利時': 'Belgium', '瑞士': 'Switzerland', '奧地利': 'Austria',
    '瑞典': 'Sweden', '丹麥': 'Denmark', '挪威': 'Norway', '芬蘭': 'Finland',
    '西班牙': 'Spain', '葡萄牙': 'Portugal', '義大利': 'Italy',
    '波蘭': 'Poland', '捷克': 'Czech Republic', '匈牙利': 'Hungary',
    '俄羅斯': 'Russia', '土耳其': 'Turkey', '以色列': 'Israel',
    '巴西': 'Brazil', '墨西哥': 'Mexico', '阿根廷': 'Argentina',
    '智利': 'Chile', '哥倫比亞': 'Colombia',
    '南非': 'South Africa', '埃及': 'Egypt',
}


def google_geocode(query: str, api_key: str) -> tuple[float, float] | None:
    """單次 Google Maps Geocoding 查詢，回傳 (lat, lon) 或 None"""
    try:
        params = urllib.parse.urlencode({'address': query, 'key': api_key})
        url = f'https://maps.googleapis.com/maps/api/geocode/json?{params}'
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        if data.get('status') == 'ZERO_RESULTS':
            return None
        if data.get('status') != 'OK':
            logger.warning(f'  API 狀態: {data.get("status")} ({query[:40]})')
            return None

        results = data.get('results', [])
        # 優先選 university / establishment
        for r in results:
            types = r.get('types', [])
            if any(t in types for t in ('university', 'school', 'establishment')):
                loc = r['geometry']['location']
                return loc['lat'], loc['lng']
        # 取第一筆
        if results:
            loc = results[0]['geometry']['location']
            return loc['lat'], loc['lng']
    except Exception as e:
        logger.debug(f'  Google API error: {e}')
    return None


def get_coordinates(school: dict, api_key: str) -> tuple[float, float] | None:
    name_en  = school.get('name_en', '') or ''
    name_zh  = school.get('name_zh', '') or ''
    country_zh = school.get('country', '') or ''
    country_en = COUNTRY_ZH_TO_EN.get(country_zh, country_zh)

    # 去掉括號備注（如 "（E交換學生計畫、V訪問學生計畫）"）
    name_en_clean = re.sub(r'\s*[（(][^)）]*[)）]', '', name_en).strip()
    # 去掉 "The " 前綴
    name_en_short = re.sub(r'^[Tt]he\s+', '', name_en_clean).strip()

    queries = []
    if name_en:
        queries.append(f'{name_en_clean}, {country_en}')
        if name_en_short != name_en_clean:
            queries.append(f'{name_en_short}, {country_en}')
    if name_zh:
        queries.append(f'{name_zh}, {country_en}')
    if name_en_clean:
        queries.append(name_en_clean)   # 不加國家，讓 Google 自己判斷

    seen = set()
    for q in queries:
        if q in seen:
            continue
        seen.add(q)
        result = google_geocode(q, api_key)
        time.sleep(DELAY)
        if result:
            return result

    return None


def load_cache() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache: dict):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--key', default=os.environ.get('GOOGLE_MAPS_API_KEY'), help='Google Maps API Key（或設 GOOGLE_MAPS_API_KEY 環境變數）')
    parser.add_argument('--force', action='store_true', help='重查所有（忽略 cache）')
    parser.add_argument('--update-json', action='store_true', help='將結果寫入 JSON 檔')
    args = parser.parse_args()

    if not args.key:
        logger.error('請提供 API Key：--key YOUR_KEY 或在 .env 設定 GOOGLE_MAPS_API_KEY')
        sys.exit(1)

    with open(JSON_FILE, encoding='utf-8') as f:
        schools = json.load(f)

    cache = load_cache()
    logger.info(f'Google 座標快取已載入 {len(cache)} 筆')

    queried = 0
    success = 0
    fail    = 0

    for idx, school in enumerate(schools, 1):
        cache_key = f"{school.get('name_en','')}|{school.get('country','')}"

        if not args.force and cache_key in cache:
            lat, lon = cache[cache_key]
            school['latitude_google']  = lat
            school['longitude_google'] = lon
            continue

        logger.info(f'[{idx}/{len(schools)}] {school["name_zh"]} ({school.get("country","")})')
        result = get_coordinates(school, args.key)
        queried += 1

        if result:
            lat, lon = result
            school['latitude_google']  = lat
            school['longitude_google'] = lon
            cache[cache_key] = [lat, lon]
            success += 1
            logger.info(f'  ✓ {lat:.4f}, {lon:.4f}')
        else:
            school['latitude_google']  = None
            school['longitude_google'] = None
            cache[cache_key] = [None, None]
            fail += 1
            logger.warning(f'  ✗ 找不到')

        if queried % 20 == 0:
            save_cache(cache)

    save_cache(cache)
    logger.info(f'\n查詢 {queried} 次，成功 {success}，失敗 {fail}')

    # ── 比較報告 ────────────────────────────────────────────────
    print('\n' + '=' * 60)
    print('比較報告：Google Maps vs 現有 JSON 座標')
    print('=' * 60)

    same = 0
    diff_list = []
    no_google = []
    no_existing = []

    for s in schools:
        g_lat = s.get('latitude_google')
        g_lon = s.get('longitude_google')
        e_lat = s.get('latitude')
        e_lon = s.get('longitude')

        if not g_lat:
            no_google.append(s['name_zh'])
            continue
        if not e_lat:
            no_existing.append(s['name_zh'])
            continue

        lat_diff = abs(g_lat - e_lat)
        lon_diff = abs(g_lon - e_lon)

        if lat_diff > 0.05 or lon_diff > 0.05:
            diff_list.append({
                'name': s['name_zh'],
                'country': s.get('country', ''),
                'google':   (g_lat, g_lon),
                'existing': (e_lat, e_lon),
                'diff':     (lat_diff, lon_diff),
            })
        else:
            same += 1

    print(f'吻合 (< 0.05°): {same}')
    print(f'差異 (> 0.05°): {len(diff_list)}')
    if no_google:
        print(f'Google 找不到: {len(no_google)} → {no_google}')
    if no_existing:
        print(f'原本沒有座標: {len(no_existing)} → {no_existing}')

    if diff_list:
        print(f'\n{"學校":<22} {"國家":<8} {"Google":<22} {"現有":<22} {"差異"}')
        print('-' * 90)
        for d in sorted(diff_list, key=lambda x: -(x['diff'][0] + x['diff'][1])):
            g = f'{d["google"][0]:.4f}, {d["google"][1]:.4f}'
            e = f'{d["existing"][0]:.4f}, {d["existing"][1]:.4f}'
            df = f'{d["diff"][0]:.2f}°, {d["diff"][1]:.2f}°'
            print(f'{d["name"]:<22} {d["country"]:<8} {g:<22} {e:<22} {df}')

    # ── 更新 JSON ────────────────────────────────────────────────
    if args.update_json:
        # 把 latitude_google/longitude_google 覆蓋到 latitude/longitude
        updated = 0
        for s in schools:
            g_lat = s.pop('latitude_google', None)
            g_lon = s.pop('longitude_google', None)
            if g_lat is not None:
                s['latitude']  = g_lat
                s['longitude'] = g_lon
                updated += 1
            else:
                s.pop('latitude_google', None)
                s.pop('longitude_google', None)

        with open(JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(schools, f, ensure_ascii=False, indent=2)
        print(f'\n✅ 已更新 JSON 座標 {updated} 筆 → {JSON_FILE}')
    else:
        # 清掉臨時欄位，不寫入
        for s in schools:
            s.pop('latitude_google', None)
            s.pop('longitude_google', None)
        print('\n（加 --update-json 才會更新 JSON 檔）')


if __name__ == '__main__':
    main()
