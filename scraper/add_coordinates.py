#!/usr/bin/env python3
"""
為 raw_schools_v2_sem{N}.json 補上經緯度座標
- 使用 Nominatim (OpenStreetMap) API，免費不需要 API Key
- 有持久快取（coordinates_cache.json），重跑不重複查
- 只查還沒有座標的學校
- 直接修改 JSON 檔，不另存新檔

用法:
  python add_coordinates.py              # 處理 semester 2（預設）
  python add_coordinates.py --semester 1 # 處理 semester 1
  python add_coordinates.py --force      # 強制重查所有學校（忽略現有座標）
"""

import json
import time
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── 設定 ─────────────────────────────────────────────────────
SEMESTER = 2
FORCE = False
for i, arg in enumerate(sys.argv[1:], 1):
    if arg == '--semester' and i < len(sys.argv) - 1:
        SEMESTER = int(sys.argv[sys.argv.index('--semester') + 1])
    if arg == '--force':
        FORCE = True

INPUT_FILE  = Path(__file__).parent / f'raw_schools_v2_sem{SEMESTER}.json'
CACHE_FILE  = Path(__file__).parent / 'coordinates_cache.json'   # 跨學期共用
DELAY       = 1.2   # 秒（Nominatim policy: max 1 req/sec）

# ── 快取 I/O ─────────────────────────────────────────────────

def load_cache() -> dict:
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache: dict):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

# ── Nominatim 查詢 ────────────────────────────────────────────

def nominatim_search(query: str) -> tuple[float, float] | None:
    """單次 Nominatim 查詢，回傳 (lat, lon) 或 None"""
    try:
        params = urllib.parse.urlencode({
            'q': query, 'format': 'json',
            'limit': 3, 'addressdetails': 1
        })
        url = f'https://nominatim.openstreetmap.org/search?{params}'
        req = urllib.request.Request(url, headers={'User-Agent': 'NTU-ExchangeSchoolMapper/2.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            results = json.loads(resp.read().decode())
        # 優先選 university / college 類型
        for r in results:
            if r.get('type') in ('university', 'college', 'campus'):
                return float(r['lat']), float(r['lon'])
        # 否則取第一筆
        if results:
            return float(results[0]['lat']), float(results[0]['lon'])
    except Exception as e:
        logger.debug(f'  Nominatim error: {e}')
    return None


def get_coordinates(name_en: str, name_zh: str, country: str) -> tuple[float, float] | None:
    """
    嘗試多種查詢策略，回傳第一個成功的 (lat, lon)
    查詢順序從最精確到最模糊
    """
    queries = []

    # 1. 英文名 + 國家（最準）
    if name_en:
        queries.append(f'{name_en}, {country}')

        # 2. 括號裡的簡稱（如 MIT, USP, TUM）
        abbr = re.search(r'\(([A-Z]{2,})\)', name_en)
        if abbr:
            queries.append(f'{abbr.group(1)}, {country}')

        # 3. 去掉括號後的主名稱
        main = re.sub(r'\s*\([^)]*\)', '', name_en).strip()
        if main != name_en:
            queries.append(f'{main}, {country}')

    # 4. 中文名 + 國家（Nominatim 對中文的支援還不錯）
    if name_zh:
        queries.append(f'{name_zh}, {country}')

    # 去重，保留順序
    seen = set()
    unique_queries = [q for q in queries if not (q in seen or seen.add(q))]

    for q in unique_queries:
        result = nominatim_search(q)
        if result:
            return result
        time.sleep(DELAY)

    return None

# ── 主程式 ────────────────────────────────────────────────────

def main():
    if not INPUT_FILE.exists():
        logger.error(f'找不到 {INPUT_FILE}')
        logger.error(f'請先執行: python fetch_schools_v2.py --semester {SEMESTER}')
        sys.exit(1)

    with open(INPUT_FILE, encoding='utf-8') as f:
        schools = json.load(f)

    cache = load_cache()
    logger.info(f'快取已載入 {len(cache)} 筆座標')

    # 統計
    total      = len(schools)
    has_coord  = sum(1 for s in schools if s.get('latitude') and not FORCE)
    need_query = total - has_coord
    logger.info(f'總學校: {total}  已有座標: {has_coord}  需查詢: {need_query}')
    if need_query == 0:
        logger.info('所有學校都已有座標，結束。（若要重查請加 --force）')
        return

    queried = 0
    cache_hit = 0
    success = 0
    fail = 0

    for idx, school in enumerate(schools, 1):
        # 已有座標就跳過（除非 --force）
        if not FORCE and school.get('latitude') and school.get('longitude'):
            continue

        name_en  = school.get('name_en', '') or ''
        name_zh  = school.get('name_zh', '') or ''
        country  = school.get('country', '') or ''

        # 先查快取（用英文名+國家為 key）
        cache_key = f'{name_en}|{country}'
        if cache_key in cache and not FORCE:
            lat, lon = cache[cache_key]
            school['latitude']  = lat
            school['longitude'] = lon
            cache_hit += 1
            logger.debug(f'  [快取] {name_zh} → {lat:.4f}, {lon:.4f}')
            continue

        # 查 API
        queried += 1
        logger.info(f'[{idx}/{total}] {name_zh} ({country})')
        result = get_coordinates(name_en, name_zh, country)

        if result:
            lat, lon = result
            school['latitude']  = lat
            school['longitude'] = lon
            cache[cache_key] = [lat, lon]
            success += 1
            logger.info(f'  ✓ {lat:.4f}, {lon:.4f}')
        else:
            school['latitude']  = None
            school['longitude'] = None
            cache[cache_key] = [None, None]   # 記錄查過但找不到，下次不重查
            fail += 1
            logger.warning(f'  ✗ 找不到座標')

        # 每 10 筆存一次快取（避免中途中斷全部重來）
        if queried % 10 == 0:
            save_cache(cache)

        time.sleep(DELAY)

    # 最後存檔
    save_cache(cache)
    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(schools, f, ensure_ascii=False, indent=2)

    logger.info('=' * 55)
    logger.info(f'完成！API 查詢 {queried} 次（快取命中 {cache_hit} 次）')
    logger.info(f'成功: {success}  找不到: {fail}')
    logger.info(f'總有座標: {sum(1 for s in schools if s.get("latitude"))} / {total}')
    logger.info(f'快取已儲存至: {CACHE_FILE}')
    logger.info(f'資料已更新: {INPUT_FILE}')
    logger.info('=' * 55)


if __name__ == '__main__':
    main()
