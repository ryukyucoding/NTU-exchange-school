-- 建立交換學校資料表
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT NOT NULL,
  country TEXT NOT NULL,
  country_en TEXT NOT NULL,
  url TEXT,
  second_exchange_eligible BOOLEAN DEFAULT false,
  application_group TEXT,
  gpa_requirement TEXT,
  grade_requirement TEXT,
  language_requirement TEXT,
  restricted_colleges TEXT,
  quota TEXT,
  academic_calendar TEXT,
  registration_fee TEXT,
  accommodation_info TEXT,
  notes TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_schools_country ON schools(country);
CREATE INDEX IF NOT EXISTS idx_schools_country_en ON schools(country_en);
CREATE INDEX IF NOT EXISTS idx_schools_name_zh ON schools(name_zh);
CREATE INDEX IF NOT EXISTS idx_schools_name_en ON schools(name_en);
CREATE INDEX IF NOT EXISTS idx_schools_location ON schools(latitude, longitude);

-- 建立全文搜尋索引（中英文學校名稱）
CREATE INDEX IF NOT EXISTS idx_schools_search_zh ON schools USING gin(to_tsvector('simple', name_zh));
CREATE INDEX IF NOT EXISTS idx_schools_search_en ON schools USING gin(to_tsvector('english', name_en));

-- 啟用 Row Level Security (RLS)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 政策：所有人都可以讀取
CREATE POLICY "Enable read access for all users" ON schools
  FOR SELECT
  USING (true);

-- 建立 RLS 政策：只有認證使用者可以新增/更新（未來可以調整）
CREATE POLICY "Enable insert for authenticated users only" ON schools
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON schools
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 建立更新時間的自動觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 建立搜尋函數（支援中英文混合搜尋）
CREATE OR REPLACE FUNCTION search_schools(search_query TEXT)
RETURNS SETOF schools AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM schools
  WHERE
    name_zh ILIKE '%' || search_query || '%' OR
    name_en ILIKE '%' || search_query || '%' OR
    country ILIKE '%' || search_query || '%' OR
    country_en ILIKE '%' || search_query || '%'
  ORDER BY
    CASE
      WHEN name_zh ILIKE search_query || '%' THEN 1
      WHEN name_en ILIKE search_query || '%' THEN 2
      ELSE 3
    END,
    name_zh;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 建立國家資料表
-- ============================================
CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  country_zh TEXT NOT NULL,
  country_en TEXT NOT NULL,
  continent TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_countries_country_zh ON countries(country_zh);
CREATE INDEX IF NOT EXISTS idx_countries_country_en ON countries(country_en);
CREATE INDEX IF NOT EXISTS idx_countries_continent ON countries(continent);

-- 啟用 Row Level Security (RLS)
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 政策：所有人都可以讀取
CREATE POLICY "Enable read access for all users" ON countries
  FOR SELECT
  USING (true);

-- 建立 RLS 政策：只有認證使用者可以新增/更新
CREATE POLICY "Enable insert for authenticated users only" ON countries
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON countries
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 建立更新時間的自動觸發器
CREATE TRIGGER update_countries_updated_at
  BEFORE UPDATE ON countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
