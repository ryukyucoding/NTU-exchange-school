#!/usr/bin/env python3
"""測試 PDF 圖片提取"""

import fitz

pdf_path = "pdf_extracts/12894/report_1.pdf"

doc = fitz.open(pdf_path)

for page_num in range(len(doc)):
    page = doc[page_num]
    print(f"\n=== 頁面 {page_num + 1} ===")

    # 方法 1: get_images()
    images = page.get_images()
    print(f"get_images() 找到: {len(images)} 張圖片")

    # 方法 2: get_text("dict") 的 blocks
    blocks = page.get_text("dict")["blocks"]
    image_blocks = [b for b in blocks if b["type"] == 1]
    print(f"blocks (type==1) 找到: {len(image_blocks)} 個圖片區塊")

    # 方法 3: get_text("rawdict")
    raw_blocks = page.get_text("rawdict")["blocks"]
    raw_image_blocks = [b for b in raw_blocks if b["type"] == 1]
    print(f"rawdict blocks (type==1) 找到: {len(raw_image_blocks)} 個圖片區塊")

    # 顯示詳細資訊
    if images:
        print("\n圖片詳細資訊:")
        for idx, img in enumerate(images):
            print(f"  圖片 {idx + 1}: xref={img[0]}")

    if image_blocks:
        print("\n圖片區塊詳細資訊:")
        for idx, block in enumerate(image_blocks):
            print(f"  區塊 {idx + 1}: {block}")

doc.close()
