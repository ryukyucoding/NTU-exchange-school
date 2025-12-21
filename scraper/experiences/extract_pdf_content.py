#!/usr/bin/env python3
"""
從 PDF 中提取文字和圖片，保留順序
需要安裝: pip install PyMuPDF Pillow
"""

import json
import os
import requests
import fitz  # PyMuPDF
from pathlib import Path
import logging
import urllib3

# 停用 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 建立輸出目錄
OUTPUT_DIR = Path("pdf_extracts")
OUTPUT_DIR.mkdir(exist_ok=True)

def download_pdf(url, output_path):
    """下載 PDF 檔案"""
    try:
        logger.info(f"下載 PDF: {url}")
        # 停用 SSL 驗證來解決證書問題
        response = requests.get(url, timeout=30, verify=False)
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            f.write(response.content)

        logger.info(f"  ✓ 已儲存至: {output_path}")
        return True
    except Exception as e:
        logger.error(f"  ✗ 下載失敗: {e}")
        return False

def extract_pdf_content(pdf_path, student_id):
    """
    從 PDF 中提取文字和圖片，根據頁面位置保留順序

    Returns:
        dict: 包含 markdown 文字和圖片列表
        {
            "markdown": "markdown 格式的文字內容，其中包含 ![12894_001_jpg] 這樣的圖片引用",
            "images": [
                {
                    "id": "12894_001_jpg",
                    "filename": "001.jpg",
                    "local_path": "12894/images/001.jpg",
                    "url": null,
                    "format": "jpg"
                },
                ...
            ]
        }
    """
    all_content = []
    images_data = []  # 儲存所有圖片資訊

    try:
        doc = fitz.open(pdf_path)
        logger.info(f"處理 PDF: {pdf_path.name} ({len(doc)} 頁)")

        # 建立圖片輸出目錄
        image_dir = OUTPUT_DIR / student_id / "images"
        image_dir.mkdir(parents=True, exist_ok=True)

        image_counter = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            page_number = page_num + 1
            page_content = []

            # 提取文字區塊（帶位置資訊）
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if block["type"] == 0:  # 文字區塊
                    text = ""
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text += span.get("text", "")
                        text += "\n"

                    text = text.strip()
                    if text:
                        page_content.append({
                            "type": "text",
                            "content": text,
                            "page": page_number,
                            "y_position": block["bbox"][1],  # 上邊界的 y 座標
                            "bbox": block["bbox"]  # [x0, y0, x1, y1]
                        })

                elif block["type"] == 1:  # 圖片區塊
                    try:
                        # 方法 1: 先嘗試從 block 中直接獲取圖片
                        img_info = block.get("image")
                        if img_info:
                            # 圖片數據已經在 block 中
                            image_bytes = img_info
                            # 根據前幾個字節判斷圖片格式
                            if image_bytes.startswith(b'\xff\xd8'):
                                image_ext = "jpg"
                            elif image_bytes.startswith(b'\x89PNG'):
                                image_ext = "png"
                            else:
                                image_ext = "img"

                            image_counter += 1
                            image_filename = f"{image_counter:03d}.{image_ext}"
                            image_path = image_dir / image_filename

                            # 儲存圖片
                            with open(image_path, "wb") as img_file:
                                img_file.write(image_bytes)

                            # 生成全局唯一的圖片 ID
                            image_id = f"{student_id}_{image_filename.replace('.', '_')}"

                            # 儲存圖片資訊
                            images_data.append({
                                "id": image_id,
                                "filename": image_filename,
                                "local_path": str(image_path.relative_to(OUTPUT_DIR)),
                                "url": None,  # 上傳到 Supabase 後填入
                                "format": image_ext
                            })

                            page_content.append({
                                "type": "image",
                                "image_id": image_id,
                                "page": page_number,
                                "y_position": block["bbox"][1]
                            })
                        else:
                            # 方法 2: 使用 xref 提取
                            images = page.get_images()
                            for img in images:
                                xref = img[0]
                                if xref > 0:
                                    base_image = doc.extract_image(xref)
                                    image_bytes = base_image["image"]
                                    image_ext = base_image["ext"]

                                    image_counter += 1
                                    image_filename = f"{image_counter:03d}.{image_ext}"
                                    image_path = image_dir / image_filename

                                    # 儲存圖片
                                    with open(image_path, "wb") as img_file:
                                        img_file.write(image_bytes)

                                    # 生成全局唯一的圖片 ID
                                    image_id = f"{student_id}_{image_filename.replace('.', '_')}"

                                    # 儲存圖片資訊
                                    images_data.append({
                                        "id": image_id,
                                        "filename": image_filename,
                                        "local_path": str(image_path.relative_to(OUTPUT_DIR)),
                                        "url": None,  # 上傳到 Supabase 後填入
                                        "format": image_ext
                                    })

                                    page_content.append({
                                        "type": "image",
                                        "image_id": image_id,
                                        "page": page_number,
                                        "y_position": block["bbox"][1]
                                    })
                                    break  # 只處理第一張圖片
                    except Exception as e:
                        logger.warning(f"  提取圖片時出錯 (頁 {page_number}): {e}")

            # 根據 y 座標排序（從上到下）
            page_content.sort(key=lambda x: x["y_position"])

            # 加入總列表
            all_content.extend(page_content)

        doc.close()

        # 將內容轉換成 Markdown 格式
        markdown_parts = []
        current_text_parts = []

        for item in all_content:
            if item["type"] == "text":
                current_text_parts.append(item["content"])
            else:  # 圖片
                # 先保存之前累積的文字
                if current_text_parts:
                    markdown_parts.append("\n\n".join(current_text_parts))
                    current_text_parts = []
                # 插入圖片引用
                markdown_parts.append(f"![{item['image_id']}]")

        # 處理最後的文字
        if current_text_parts:
            markdown_parts.append("\n\n".join(current_text_parts))

        markdown_content = "\n\n".join(markdown_parts)

        logger.info(f"  ✓ 提取完成: {len([i for i in all_content if i['type'] == 'text'])} 個文字區塊, "
                   f"{len(images_data)} 張圖片")

        return {
            "markdown": markdown_content,
            "images": images_data
        }

    except Exception as e:
        logger.error(f"  ✗ 處理 PDF 失敗: {e}")
        return {
            "markdown": "",
            "images": []
        }

def process_experiences(json_file="experiences_data.json"):
    """處理所有學生心得的 PDF"""

    # 讀取 JSON 資料
    with open(json_file, 'r', encoding='utf-8') as f:
        experiences = json.load(f)

    logger.info("=" * 60)
    logger.info(f"開始處理 {len(experiences)} 位學生的心得 PDF")
    logger.info("=" * 60)

    # 處理每位學生
    for idx, student in enumerate(experiences, 1):
        name = student.get('name', 'unknown')
        school = student.get('school', 'unknown')

        logger.info(f"\n[{idx}/{len(experiences)}] 處理: {name} - {school}")

        # 建立學生 ID（使用 detail_url 中的 sn）
        detail_url = student.get('detail_url', '')
        student_id = detail_url.split('/sn/')[-1] if '/sn/' in detail_url else f"student_{idx}"

        # 建立學生專屬目錄
        student_dir = OUTPUT_DIR / student_id
        student_dir.mkdir(parents=True, exist_ok=True)

        # 處理 PDF
        pdf_links = student.get('pdf_links', [])
        if not pdf_links:
            logger.warning("  沒有 PDF 連結")
            continue

        all_markdown = []
        all_images = []

        for pdf_idx, pdf_info in enumerate(pdf_links, 1):
            pdf_url = pdf_info.get('url', '')
            if not pdf_url:
                continue

            # 下載 PDF
            pdf_filename = f"report_{pdf_idx}.pdf"
            pdf_path = student_dir / pdf_filename

            if not pdf_path.exists():
                if not download_pdf(pdf_url, pdf_path):
                    continue

            # 提取 PDF 內容
            result = extract_pdf_content(pdf_path, student_id)
            all_markdown.append(result["markdown"])
            all_images.extend(result["images"])

        # 合併所有 PDF 的內容
        combined_markdown = "\n\n---\n\n".join(all_markdown)

        # 儲存提取的內容
        if combined_markdown or all_images:
            content_file = student_dir / "content.json"
            with open(content_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "student_info": {
                        "name": name,
                        "school": school,
                        "country": student.get('country', ''),
                        "year_info": student.get('year_info', ''),
                        "college": student.get('college', ''),
                        "department": student.get('department', ''),
                        "degree": student.get('degree', '')
                    },
                    "markdown": combined_markdown,
                    "images": all_images
                }, f, ensure_ascii=False, indent=2)

            logger.info(f"  ✓ 內容已儲存至: {content_file}")

        # 更新原始資料，加入 PDF 內容資訊
        student['markdown'] = combined_markdown
        student['images'] = all_images

    # 儲存更新後的 experiences 資料
    output_file = "experiences_with_content.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(experiences, f, ensure_ascii=False, indent=2)

    logger.info("\n" + "=" * 60)
    logger.info("處理完成！")
    logger.info(f"詳細內容已儲存至: {OUTPUT_DIR}")
    logger.info(f"完整資料已儲存至: {output_file}")
    logger.info("=" * 60)

if __name__ == '__main__':
    process_experiences()
