#!/usr/bin/env python3
"""
Sort CSV files by id (first column)
"""
import csv
import sys
from pathlib import Path

def sort_csv_by_id(input_file, output_file=None):
    """
    Sort a CSV file by the id column (first column)
    
    Args:
        input_file: Path to input CSV file
        output_file: Path to output CSV file (if None, overwrites input file)
    """
    if output_file is None:
        output_file = input_file
    
    # Read all rows
    rows = []
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # Read header
        rows = list(reader)
    
    # Sort by id (first column) as integer
    def get_id(row):
        try:
            return int(row[0]) if row[0] else 0
        except ValueError:
            return 0
    
    rows_sorted = sorted(rows, key=get_id)
    
    # Write sorted rows
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)  # Write header first
        writer.writerows(rows_sorted)
    
    print(f"✓ Sorted {input_file} by id")
    print(f"  Output: {output_file}")
    print(f"  Total rows: {len(rows_sorted)}")

if __name__ == '__main__':
    # File paths
    base_dir = Path(__file__).parent.parent
    
    files_to_sort = [
        './schools_with_links.csv'
    ]
    
    for file_path in files_to_sort:
        # Convert string to Path object if needed
        path = Path(file_path) if isinstance(file_path, str) else file_path
        if path.exists():
            sort_csv_by_id(str(path))
        else:
            print(f"✗ File not found: {path}")

