-- ============================================================
-- Migration: 新增學校結構化欄位
-- 日期: 2026-03-10
-- 說明: 配合 fetch_schools_v2.py 的新爬蟲輸出
-- ============================================================

-- ── 學期與更新狀態 ─────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS semester          integer,         -- 1 或 2
  ADD COLUMN IF NOT EXISTS is_updated        boolean DEFAULT false,  -- 本學期是否已更新
  ADD COLUMN IF NOT EXISTS contract_quota    integer,         -- 合約名額（數字）
  ADD COLUMN IF NOT EXISTS selection_quota   integer,         -- 甄選名額 (null=未更新, 0=不收, N=收N人)
  ADD COLUMN IF NOT EXISTS selection_count   integer;         -- 甄選人次

-- ── 篩選用布林欄位 ────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS no_fail_required  boolean DEFAULT false;  -- 歷年不得有不及格

-- ── 結構化語言/GPA 數字欄位（方便篩選）──────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS gpa_min           numeric,         -- GPA 最低門檻（數字）
  ADD COLUMN IF NOT EXISTS toefl_ibt         integer,         -- TOEFL iBT 分數
  ADD COLUMN IF NOT EXISTS ielts             numeric,         -- IELTS 分數
  ADD COLUMN IF NOT EXISTS toeic             integer,         -- TOEIC 分數
  ADD COLUMN IF NOT EXISTS gept              text,            -- 全民英檢（中高級 等）
  ADD COLUMN IF NOT EXISTS language_cefr     text,            -- 非英語 CEFR（B1/B2/C1/C2）
  ADD COLUMN IF NOT EXISTS jlpt              text,            -- 日語能力檢定（N1~N5）
  ADD COLUMN IF NOT EXISTS language_group    text;            -- 語言組別（一般組/日語組/...）

-- ── 動態 sections（JSONB，供前端動態顯示）────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS sections          jsonb;
-- sections 格式: [{ "label": "申請資格", "text": "...", "links": [{"text":"","href":""}] }, ...]

-- ── 建立篩選用索引 ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_schools_semester         ON public.schools(semester);
CREATE INDEX IF NOT EXISTS idx_schools_selection_quota  ON public.schools(selection_quota);
CREATE INDEX IF NOT EXISTS idx_schools_is_updated       ON public.schools(is_updated);
CREATE INDEX IF NOT EXISTS idx_schools_no_fail          ON public.schools(no_fail_required);
CREATE INDEX IF NOT EXISTS idx_schools_gpa_min          ON public.schools(gpa_min);
CREATE INDEX IF NOT EXISTS idx_schools_toefl_ibt        ON public.schools(toefl_ibt);
CREATE INDEX IF NOT EXISTS idx_schools_ielts            ON public.schools(ielts);
