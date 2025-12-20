-- ============================================
-- 遷移資格篩選數據從 User 表到 UserQualification 表
-- ============================================
-- 如果 User 表中已有資格欄位，執行此文件來遷移數據到新表
-- 
-- 注意：請先執行 add-user-qualification-table.sql 創建 UserQualification 表
-- 然後再執行此文件來遷移數據

-- 2. 遷移現有數據（如果 User 表中有資格欄位）
DO $$
DECLARE
  user_record RECORD;
  has_qualification BOOLEAN;
BEGIN
  -- 檢查 User 表是否有資格欄位
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'User' AND column_name = 'college'
  ) THEN
    -- 遷移有資格數據的用戶
    FOR user_record IN 
      SELECT "id", "college", "grade", "gpa", "toefl", "ielts", "toeic"
      FROM "User"
      WHERE "college" IS NOT NULL 
         OR "grade" IS NOT NULL 
         OR "gpa" IS NOT NULL 
         OR "toefl" IS NOT NULL 
         OR "ielts" IS NOT NULL 
         OR "toeic" IS NOT NULL
    LOOP
      -- 檢查是否已存在記錄
      IF NOT EXISTS (
        SELECT 1 FROM "UserQualification" WHERE "userId" = user_record.id
      ) THEN
        INSERT INTO "UserQualification" (
          "id", "userId", "college", "grade", "gpa", "toefl", "ielts", "toeic"
        ) VALUES (
          gen_random_uuid()::TEXT,
          user_record.id,
          user_record.college,
          user_record.grade,
          user_record.gpa,
          user_record.toefl,
          user_record.ielts,
          user_record.toeic
        );
      END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed. Migrated qualification data to UserQualification table.';
  ELSE
    RAISE NOTICE 'User table does not have qualification columns. No migration needed.';
  END IF;
END $$;

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS "UserQualification_userId_idx" ON "UserQualification"("userId");

-- 4. 驗證遷移結果
SELECT 
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM "UserQualification") as users_with_qualification
FROM "User";

-- 5. 顯示遷移的數據樣本
SELECT 
  u.id,
  u.email,
  uq.college,
  uq.grade,
  uq.gpa,
  uq.toefl,
  uq.ielts,
  uq.toeic
FROM "User" u
LEFT JOIN "UserQualification" uq ON u.id = uq."userId"
WHERE uq.id IS NOT NULL
LIMIT 10;
