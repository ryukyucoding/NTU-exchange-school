-- ============================================
-- NextAuth 和用戶認證相關資料表
-- ============================================

-- 用戶表
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userID" TEXT,  -- 可選，用戶自訂的用戶名
  "name" TEXT,
  "email" TEXT,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  "image" TEXT,
  "bio" TEXT,
  "backgroundImage" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- OAuth 帳號關聯表
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Session 表（NextAuth 使用，但我們使用 JWT，這個表可能不需要）
CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL,  -- UNIQUE 約束將在索引部分創建
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 如果表已存在且有 UNIQUE 約束，先移除
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_sessionToken_key') THEN
    ALTER TABLE "Session" DROP CONSTRAINT "Session_sessionToken_key";
  END IF;
END $$;

-- 驗證 Token 表（用於 email 驗證等）
CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- ============================================
-- 索引
-- ============================================

-- Account 表索引
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");
-- 刪除並重新創建唯一約束（如果已存在）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_provider_providerAccountId_key') THEN
    ALTER TABLE "Account" DROP CONSTRAINT "Account_provider_providerAccountId_key";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" 
  ON "Account"("provider", "providerAccountId");

-- Session 表索引
-- 確保唯一約束已移除（在 CREATE TABLE 部分已處理）
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

-- User 表索引
-- 刪除並重新創建唯一約束（如果已存在）
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_userID_key') THEN
    ALTER TABLE "User" DROP CONSTRAINT "User_userID_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_userID_key') THEN
    DROP INDEX IF EXISTS "User_userID_key";
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "User_userID_key" ON "User"("userID") WHERE "userID" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "User_userID_idx" ON "User"("userID");
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- ============================================
-- 更新時間自動觸發器
-- ============================================

CREATE OR REPLACE FUNCTION update_user_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_updated_at_trigger ON "User";
CREATE TRIGGER update_user_updated_at_trigger
  BEFORE UPDATE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_updated_at();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- 啟用 RLS
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

-- 刪除現有的 policy（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";
DROP POLICY IF EXISTS "Users can view own accounts" ON "Account";
DROP POLICY IF EXISTS "Users can insert own accounts" ON "Account";
DROP POLICY IF EXISTS "Users can view own sessions" ON "Session";
DROP POLICY IF EXISTS "Users can delete own sessions" ON "Session";

-- User 表政策：用戶可以讀取自己的資料，也可以讀取其他用戶的公開資料
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT
  USING (true);  -- 暫時允許所有人讀取，之後可以改為 auth.uid() = id

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE
  USING (true);  -- 暫時允許所有人更新，之後可以改為 auth.uid() = id

-- Account 表政策：用戶只能查看和修改自己的帳號
CREATE POLICY "Users can view own accounts" ON "Account"
  FOR SELECT
  USING (true);  -- 暫時允許所有人讀取，之後可以改為 auth.uid() = "userId"

CREATE POLICY "Users can insert own accounts" ON "Account"
  FOR INSERT
  WITH CHECK (true);  -- 暫時允許所有人插入，之後可以改為 auth.uid() = "userId"

-- Session 表政策
CREATE POLICY "Users can view own sessions" ON "Session"
  FOR SELECT
  USING (true);  -- 暫時允許所有人讀取，之後可以改為 auth.uid() = "userId"

CREATE POLICY "Users can delete own sessions" ON "Session"
  FOR DELETE
  USING (true);  -- 暫時允許所有人刪除，之後可以改為 auth.uid() = "userId"
