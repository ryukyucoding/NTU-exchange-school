-- PostSchool：貼文與學校關聯（學校版篩選、草稿學校列表）
-- 若曾刪除此表，請在 Supabase SQL Editor 執行本檔

CREATE TABLE IF NOT EXISTS public."PostSchool" (
  id text NOT NULL PRIMARY KEY,
  "postId" text NOT NULL,
  "schoolId" bigint NOT NULL,
  CONSTRAINT "PostSchool_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON DELETE CASCADE,
  CONSTRAINT "PostSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public.schools(id) ON DELETE CASCADE,
  CONSTRAINT "PostSchool_postId_schoolId_key" UNIQUE ("postId", "schoolId")
);

CREATE INDEX IF NOT EXISTS idx_post_school_post ON public."PostSchool" ("postId");
CREATE INDEX IF NOT EXISTS idx_post_school_school ON public."PostSchool" ("schoolId");

-- 由既有心得文 SchoolRating 回填（不重複）
INSERT INTO public."PostSchool" (id, "postId", "schoolId")
SELECT gen_random_uuid()::text, sr."postId", sr."schoolId"
FROM public."SchoolRating" sr
ON CONFLICT ("postId", "schoolId") DO NOTHING;

-- 由學校看板 PostBoard 回填（該貼文掛在學校版上）
INSERT INTO public."PostSchool" (id, "postId", "schoolId")
SELECT gen_random_uuid()::text, pb."postId", b."schoolId"
FROM public."PostBoard" pb
JOIN public."Board" b ON b.id = pb."boardId" AND b.type = 'school' AND b."schoolId" IS NOT NULL
ON CONFLICT ("postId", "schoolId") DO NOTHING;
