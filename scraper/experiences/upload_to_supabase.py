#!/usr/bin/env python3
"""
上傳圖片到 Supabase Storage 並更新 URL

使用方法:
1. 安裝依賴: pip install supabase
2. 設定環境變數:
   export SUPABASE_URL="your-project-url"
   export SUPABASE_KEY="your-anon-key"
3. 執行: python upload_to_supabase.py
"""

import json
import os
from pathlib import Path
from supabase import create_client, Client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase 設定
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
STORAGE_BUCKET = "experience-images"  # 你的 bucket 名稱

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("請設定 SUPABASE_URL 和 SUPABASE_KEY 環境變數")

# 初始化 Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_images_for_student(student_dir: Path, student_id: str):
    """上傳單個學生的所有圖片到 Supabase"""

    content_file = student_dir / "content.json"
    if not content_file.exists():
        logger.warning(f"找不到 {content_file}")
        return

    # 讀取內容
    with open(content_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    images = data.get('images', [])
    if not images:
        logger.info(f"  學生 {student_id} 沒有圖片")
        return

    logger.info(f"  上傳 {len(images)} 張圖片...")
    updated_images = []

    for img in images:
        image_id = img['id']
        local_path = img['local_path']
        filename = img['filename']

        # 完整的本地檔案路徑
        full_local_path = Path("pdf_extracts") / local_path

        if not full_local_path.exists():
            logger.warning(f"    ✗ 找不到圖片: {full_local_path}")
            updated_images.append(img)
            continue

        try:
            # Supabase Storage 路徑
            storage_path = f"{student_id}/{filename}"

            # 讀取圖片檔案
            with open(full_local_path, 'rb') as f:
                file_data = f.read()

            # 上傳到 Supabase
            response = supabase.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=file_data,
                file_options={
                    "content-type": f"image/{img['format']}",
                    "upsert": "true"  # 如果已存在則覆蓋
                }
            )

            # 獲取公開 URL
            public_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)

            # 更新圖片資訊
            img['url'] = public_url
            updated_images.append(img)

            logger.info(f"    ✓ {image_id} -> {public_url}")

        except Exception as e:
            logger.error(f"    ✗ 上傳 {image_id} 失敗: {e}")
            updated_images.append(img)

    # 更新 content.json
    data['images'] = updated_images
    with open(content_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    logger.info(f"  ✓ 已更新 {content_file}")

def main():
    """上傳所有學生的圖片"""

    pdf_extracts_dir = Path("pdf_extracts")

    if not pdf_extracts_dir.exists():
        logger.error("找不到 pdf_extracts 目錄")
        return

    logger.info("=" * 60)
    logger.info("開始上傳圖片到 Supabase Storage")
    logger.info(f"Bucket: {STORAGE_BUCKET}")
    logger.info("=" * 60)

    # 遍歷所有學生目錄
    student_dirs = [d for d in pdf_extracts_dir.iterdir() if d.is_dir()]

    for idx, student_dir in enumerate(student_dirs, 1):
        student_id = student_dir.name
        logger.info(f"\n[{idx}/{len(student_dirs)}] 處理學生 {student_id}")
        upload_images_for_student(student_dir, student_id)

    logger.info("\n" + "=" * 60)
    logger.info("上傳完成！")
    logger.info("=" * 60)

if __name__ == '__main__':
    main()
