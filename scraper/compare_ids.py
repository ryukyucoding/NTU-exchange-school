#!/usr/bin/env python3
"""
比較兩個CSV文件中的ID，找出哪些ID在一個文件中存在但在另一個文件中不存在
"""

import csv
import sys
from pathlib import Path

def read_ids_from_csv(file_path):
    """從CSV文件中讀取所有ID"""
    ids = set()
    try:
        # 使用 utf-8-sig 編碼來自動處理 BOM
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            # 檢查是否有id欄位（處理可能的BOM問題）
            id_key = None
            for key in reader.fieldnames:
                if key.strip().lower() == 'id' or key.replace('\ufeff', '').strip().lower() == 'id':
                    id_key = key
                    break
            
            if id_key is None:
                print(f"警告: 文件 {file_path} 中沒有找到 'id' 欄位")
                print(f"可用的欄位: {reader.fieldnames}")
                return ids
            
            row_count = 0
            for row in reader:
                row_count += 1
                id_value = row.get(id_key, '').strip()
                if id_value:
                    try:
                        ids.add(int(id_value))
                    except ValueError:
                        print(f"警告: 無法將ID轉換為整數: '{id_value}' (在 {file_path} 第 {row_count+1} 行)")
            
            print(f"  成功讀取 {row_count} 行，獲得 {len(ids)} 個有效ID")
    except FileNotFoundError:
        print(f"錯誤: 找不到文件 {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"錯誤: 讀取文件 {file_path} 時發生錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    return ids

def main():
    # 文件路徑
    script_dir = Path(__file__).parent
    file1_path = script_dir / 'schools_with_links.csv'
    file2_path = script_dir.parent / 'public' / 'data' / 'school_map.csv'
    
    print("=" * 60)
    print("比較兩個CSV文件中的ID")
    print("=" * 60)
    print(f"\n文件1: {file1_path}")
    print(f"文件2: {file2_path}\n")
    
    # 讀取兩個文件的ID
    print("正在讀取文件...")
    ids1 = read_ids_from_csv(file1_path)
    ids2 = read_ids_from_csv(file2_path)
    
    print(f"\n文件1中的ID數量: {len(ids1)}")
    print(f"文件2中的ID數量: {len(ids2)}")
    
    # 找出差異
    only_in_file1 = ids1 - ids2
    only_in_file2 = ids2 - ids1
    common_ids = ids1 & ids2
    
    print(f"\n共同ID數量: {len(common_ids)}")
    print(f"只在文件1中的ID數量: {len(only_in_file1)}")
    print(f"只在文件2中的ID數量: {len(only_in_file2)}")
    
    # 顯示詳細結果
    print("\n" + "=" * 60)
    print("詳細結果")
    print("=" * 60)
    
    if only_in_file1:
        print(f"\n只在 schools_with_links.csv 中的ID ({len(only_in_file1)}個):")
        print(sorted(only_in_file1))
    else:
        print("\n✓ 所有 schools_with_links.csv 中的ID都在 school_map.csv 中")
    
    if only_in_file2:
        print(f"\n只在 school_map.csv 中的ID ({len(only_in_file2)}個):")
        print(sorted(only_in_file2))
    else:
        print("\n✓ 所有 school_map.csv 中的ID都在 schools_with_links.csv 中")
    
    # 統計信息
    print("\n" + "=" * 60)
    print("統計摘要")
    print("=" * 60)
    print(f"文件1總數: {len(ids1)}")
    print(f"文件2總數: {len(ids2)}")
    print(f"共同ID: {len(common_ids)}")
    print(f"只在文件1: {len(only_in_file1)}")
    print(f"只在文件2: {len(only_in_file2)}")
    
    if only_in_file1 or only_in_file2:
        print("\n⚠️  發現ID差異，請檢查上述列表")
    else:
        print("\n✓ 兩個文件的ID完全一致")

if __name__ == '__main__':
    main()

