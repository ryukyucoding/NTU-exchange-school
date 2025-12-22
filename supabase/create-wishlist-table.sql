-- Create SchoolWishList table
-- Stores user's favorite schools and application preferences (order field)
-- Note: Use double quotes to preserve case sensitivity in PostgreSQL
CREATE TABLE IF NOT EXISTS public."SchoolWishList" (
  id text NOT NULL,
  "userId" text NOT NULL,
  "schoolId" bigint NOT NULL,
  note text,
  "order" integer,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolWishList_pkey" PRIMARY KEY (id),
  CONSTRAINT "SchoolWishList_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE,
  CONSTRAINT "SchoolWishList_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES public.schools(id) ON DELETE CASCADE,
  CONSTRAINT "SchoolWishList_userId_schoolId_unique" UNIQUE ("userId", "schoolId")
);

-- Create index for efficient querying by userId and order
CREATE INDEX IF NOT EXISTS idx_school_wishlist_user_order ON public."SchoolWishList"("userId", "order");

-- Create index for efficient querying by userId
CREATE INDEX IF NOT EXISTS idx_school_wishlist_user ON public."SchoolWishList"("userId");

-- Enable Row Level Security
ALTER TABLE public."SchoolWishList" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own wishlist items
CREATE POLICY "Users can view their own wishlist items"
  ON public."SchoolWishList"
  FOR SELECT
  USING (auth.uid()::text = "userId");

-- RLS Policy: Users can only insert their own wishlist items
CREATE POLICY "Users can insert their own wishlist items"
  ON public."SchoolWishList"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId");

-- RLS Policy: Users can only update their own wishlist items
CREATE POLICY "Users can update their own wishlist items"
  ON public."SchoolWishList"
  FOR UPDATE
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- RLS Policy: Users can only delete their own wishlist items
CREATE POLICY "Users can delete their own wishlist items"
  ON public."SchoolWishList"
  FOR DELETE
  USING (auth.uid()::text = "userId");

-- Create function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_school_wishlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updatedAt
CREATE TRIGGER update_school_wishlist_updated_at
  BEFORE UPDATE ON public."SchoolWishList"
  FOR EACH ROW
  EXECUTE FUNCTION update_school_wishlist_updated_at();

