-- ============================================
-- 添加 UserQualification 表（适用于已有 User 表的情况）
-- ============================================
-- 此文件只创建 UserQualification 表和相关的索引、触发器、RLS 策略
-- 不会修改现有的 User 表

-- 1. 创建 UserQualification 表
CREATE TABLE IF NOT EXISTS "UserQualification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "college" TEXT,  -- 學院
  "grade" TEXT,  -- 年級 (Freshman, Sophomore, Junior, Senior)
  "gpa" NUMERIC(3, 2),  -- GPA (0.00-4.30)
  "toefl" INTEGER,  -- TOEFL iBT 分數
  "ielts" NUMERIC(2, 1),  -- IELTS 分數
  "toeic" INTEGER,  -- TOEIC 分數
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "UserQualification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS "UserQualification_userId_idx" ON "UserQualification"("userId");

-- 3. 创建更新時間觸發器（如果函数不存在则创建）
CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 UserQualification 表添加更新時間觸發器
DROP TRIGGER IF EXISTS update_user_qualification_updated_at_trigger ON "UserQualification";
CREATE TRIGGER update_user_qualification_updated_at_trigger
  BEFORE UPDATE ON "UserQualification"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_updated_at();

-- 4. 启用 Row Level Security (RLS)
ALTER TABLE "UserQualification" ENABLE ROW LEVEL SECURITY;

-- 5. 删除现有的 policy（如果存在）
DROP POLICY IF EXISTS "Users can view own qualification" ON "UserQualification";
DROP POLICY IF EXISTS "Users can update own qualification" ON "UserQualification";
DROP POLICY IF EXISTS "Users can insert own qualification" ON "UserQualification";
DROP POLICY IF EXISTS "Users can delete own qualification" ON "UserQualification";

-- 6. 创建 RLS 策略
CREATE POLICY "Users can view own qualification" ON "UserQualification"
  FOR SELECT
  USING (true);  -- 暫時允許所有人讀取，之後可以改為 auth.uid() = "userId"

CREATE POLICY "Users can update own qualification" ON "UserQualification"
  FOR UPDATE
  USING (true);  -- 暫時允許所有人更新，之後可以改為 auth.uid() = "userId"

CREATE POLICY "Users can insert own qualification" ON "UserQualification"
  FOR INSERT
  WITH CHECK (true);  -- 暫時允許所有人插入，之後可以改為 auth.uid() = "userId"

CREATE POLICY "Users can delete own qualification" ON "UserQualification"
  FOR DELETE
  USING (true);  -- 暫時允許所有人刪除，之後可以改為 auth.uid() = "userId"

-- 7. 驗證表已創建
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'UserQualification'
ORDER BY ordinal_position;
