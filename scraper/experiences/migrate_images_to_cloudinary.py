#!/usr/bin/env python3
"""
將圖片從 Supabase Storage 遷移到 Cloudinary 並更新相關數據

使用方法:
1. 確保環境變數已設置：
   export NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
   export CLOUDINARY_UPLOAD_PRESET="your_upload_preset"
   export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

2. 執行: python migrate_images_to_cloudinary.py
"""

import json
import os
import requests
import time
from pathlib import Path
from supabase import create_client, Client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase 設定
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
STORAGE_BUCKET = "experience-images"

# Cloudinary 設定
CLOUDINARY_CLOUD_NAME = os.getenv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")
CLOUDINARY_UPLOAD_PRESET = os.getenv("CLOUDINARY_UPLOAD_PRESET")

if not all([SUPABASE_URL, SUPABASE_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET]):
    raise ValueError("請設定所有必要的環境變數: SUPABASE_URL, SUPABASE_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET")

# 初始化 Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def download_from_supabase(storage_path: str) -> bytes:
    """從 Supabase Storage 下載圖片"""
    try:
        # 注意：get_public_url 不需要前導斜線，但下載需要
        download_url = supabase.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)

        response = requests.get(download_url)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"下載失敗 {storage_path}: {e}")
        return None

def upload_to_cloudinary(image_data: bytes, filename: str, image_format: str) -> str:
    """上傳圖片到 Cloudinary"""
    try:
        cloudinary_url = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload"

        # 轉換為 base64
        import base64
        base64_data = base64.b64encode(image_data).decode('utf-8')
        data_uri = f"data:image/{image_format};base64,{base64_data}"

        # 生成安全的文件名
        timestamp = str(int(time.time()))
        random_str = str(hash(filename))[-8:]
        safe_filename = f"exp_{timestamp}_{random_str}"

        # 準備上傳數據
        upload_data = {
            'file': data_uri,
            'upload_preset': CLOUDINARY_UPLOAD_PRESET,
            'filename_override': safe_filename,
            'folder': 'experience-images'  # 可選：在 Cloudinary 中組織文件
        }

        response = requests.post(cloudinary_url, data=upload_data)
        response.raise_for_status()

        result = response.json()
        if 'secure_url' in result:
            return result['secure_url']
        else:
            logger.error(f"Cloudinary 上傳失敗: {result}")
            return None

    except Exception as e:
        logger.error(f"上傳到 Cloudinary 失敗 {filename}: {e}")
        return None

def migrate_student_images(student_dir: Path, student_id: str, dry_run: bool = False):
    """遷移單個學生的圖片"""

    content_file = student_dir / "content.json"
    if not content_file.exists():
        logger.warning(f"找不到 {content_file}")
        return 0, 0

    # 讀取內容
    with open(content_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    images = data.get('images', [])
    if not images:
        logger.info(f"學生 {student_id} 沒有圖片")
        return 0, 0

    logger.info(f"處理學生 {student_id} 的 {len(images)} 張圖片...")
    migrated_count = 0
    updated_count = 0

    for img in images:
        image_id = img['id']
        storage_path = f"{student_id}/{img['filename']}"  # Supabase 中的路徑

        # 檢查是否已經是 Cloudinary URL
        if 'cloudinary' in img.get('url', ''):
            logger.info(f"  ✓ {image_id} 已經是 Cloudinary URL，跳過")
            continue

        # 檢查是否是 Supabase URL
        if 'supabase.co' not in img.get('url', ''):
            logger.info(f"  ⚠️ {image_id} 不是 Supabase URL，跳過")
            continue

        if dry_run:
            logger.info(f"  🔍 [DRY RUN] 會遷移 {image_id}")
            migrated_count += 1
            continue

        try:
            # 1. 從 Supabase 下載圖片
            logger.info(f"  📥 下載 {image_id}...")
            image_data = download_from_supabase(storage_path)

            if not image_data:
                logger.error(f"  ✗ 下載失敗 {image_id}")
                continue

            # 2. 上傳到 Cloudinary
            logger.info(f"  ☁️ 上傳到 Cloudinary {image_id}...")
            cloudinary_url = upload_to_cloudinary(image_data, img['filename'], img['format'])

            if cloudinary_url:
                # 3. 更新圖片資訊
                img['migrated_from_url'] = img['url']  # 保存舊的 Supabase URL
                img['url'] = cloudinary_url
                img['migrated_from'] = 'supabase'
                img['migrated_at'] = time.time()
                migrated_count += 1
                updated_count += 1
                logger.info(f"  ✓ {image_id} -> {cloudinary_url}")
            else:
                logger.error(f"  ✗ 上傳失敗 {image_id}")

        except Exception as e:
            logger.error(f"  ✗ 遷移失敗 {image_id}: {e}")

    # 更新 content.json
    if not dry_run and updated_count > 0:
        with open(content_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ 已更新 {content_file} ({updated_count} 張圖片)")

    return migrated_count, updated_count

def update_supabase_posts(student_id: str, content_data: dict):
    """更新 Supabase 中對應的 Post 記錄"""
    try:
        student_info = content_data.get('student_info', {})
        student_name = student_info.get('name', '')
        school_name = student_info.get('school', '')

        if not student_name or not school_name:
            logger.warning(f"學生 {student_id} 資訊不完整，無法匹配 Post")
            return False

        logger.info(f"🔍 查找學生 {student_name} ({school_name}) 對應的 Post 記錄...")

        # 策略 1: 根據學生姓名和學校名稱精確匹配
        search_query = f"{student_name} {school_name}"

        # 在 Supabase 中搜索匹配的 Post
        response = supabase.table('Post').select('id, content, title').ilike('content', f'%{search_query}%').eq('status', 'published').execute()

        if response.data and len(response.data) > 0:
            logger.info(f"✓ 找到 {len(response.data)} 個匹配的 Post 記錄")

            for post in response.data:
                # 更新 Post 內容中的圖片 URL
                updated_content = post['content']
                url_replacements = 0

                # 替換圖片 URL - 根據學生 ID 和圖片 ID 匹配
                for img in content_data.get('images', []):
                    if 'migrated_from' in img and img['migrated_from'] == 'supabase':
                        old_url = img.get('migrated_from_url', '')
                        if not old_url:
                            # 如果沒有記錄舊 URL，構造 Supabase URL
                            old_url = f"https://dvqlakvtakiwhwgjmsgu.supabase.co/storage/v1/object/public/experience-images/{student_id}/{img['filename']}"

                        new_url = img['url']
                        if old_url in updated_content:
                            updated_content = updated_content.replace(old_url, new_url)
                            url_replacements += 1
                            logger.info(f"  替換圖片 URL: {img['id']}")

                if url_replacements > 0:
                    # 更新 Post
                    update_response = supabase.table('Post').update({
                        'content': updated_content,
                        'updatedAt': 'now()'
                    }).eq('id', post['id']).execute()

                    if update_response.data:
                        logger.info(f"✓ 已更新 Post {post['id']} ({url_replacements} 個圖片 URL)")
                    else:
                        logger.error(f"✗ 更新 Post {post['id']} 失敗")
                else:
                    logger.info(f"⚠️ Post {post['id']} 沒有需要替換的圖片 URL")

            return True
        else:
            logger.warning(f"⚠️ 未找到學生 {student_name} ({school_name}) 對應的 Post 記錄")
            return False

    except Exception as e:
        logger.error(f"更新 Supabase Post 失敗 {student_id}: {e}")
        return False

def main():
    """遷移所有學生的圖片"""

    import argparse
    parser = argparse.ArgumentParser(description='將圖片從 Supabase Storage 遷移到 Cloudinary')
    parser.add_argument('--dry-run', action='store_true', help='只顯示會被遷移的圖片，不實際執行')
    parser.add_argument('--update-supabase', action='store_true', help='同時更新 Supabase 中的 Post 記錄')
    parser.add_argument('--student-id', help='只處理指定的學生 ID')

    args = parser.parse_args()

    pdf_extracts_dir = Path("pdf_extracts")

    if not pdf_extracts_dir.exists():
        logger.error("找不到 pdf_extracts 目錄")
        return

    logger.info("=" * 60)
    if args.dry_run:
        logger.info("DRY RUN 模式 - 只顯示將要遷移的圖片")
    else:
        logger.info("開始將圖片遷移到 Cloudinary")
    logger.info(f"Cloudinary Cloud: {CLOUDINARY_CLOUD_NAME}")
    if args.update_supabase:
        logger.info("將同時更新 Supabase 中的 Post 記錄")
    logger.info("=" * 60)

    # 遍歷所有學生目錄
    student_dirs = [d for d in pdf_extracts_dir.iterdir() if d.is_dir()]

    # 如果指定了學生 ID，只處理該學生
    if args.student_id:
        student_dirs = [d for d in student_dirs if d.name == args.student_id]
        if not student_dirs:
            logger.error(f"找不到學生 ID: {args.student_id}")
            return

    total_migrated = 0
    total_updated = 0
    processed_students = 0

    for idx, student_dir in enumerate(student_dirs, 1):
        student_id = student_dir.name
        logger.info(f"\n[{idx}/{len(student_dirs)}] 處理學生 {student_id}")

        migrated, updated = migrate_student_images(student_dir, student_id, args.dry_run)
        total_migrated += migrated
        total_updated += updated

        # 如果需要更新 Supabase 且不是 dry run
        if args.update_supabase and not args.dry_run and updated > 0:
            # 重新讀取更新後的 content.json
            content_file = student_dir / "content.json"
            if content_file.exists():
                with open(content_file, 'r', encoding='utf-8') as f:
                    content_data = json.load(f)
                update_supabase_posts(student_id, content_data)

        processed_students += 1

        # 避免請求過於頻繁
        if not args.dry_run:
            time.sleep(0.5)

    logger.info("\n" + "=" * 60)
    if args.dry_run:
        logger.info(f"DRY RUN 完成 - 會遷移 {total_migrated} 張圖片")
    else:
        logger.info(f"遷移完成 - 成功遷移 {total_migrated} 張圖片，更新 {total_updated} 個文件")
    logger.info(f"處理了 {processed_students} 個學生")

    if total_migrated > 0 and not args.dry_run:
        logger.info("\n請檢查 content.json 文件中的 URL 是否正確")
        if args.update_supabase:
            logger.info("請檢查 Supabase 中的 Post 記錄是否已更新")

    logger.info("=" * 60)

if __name__ == '__main__':
    main()
