-- Rename table from lowercase to proper case (if table has data you want to keep)
-- First, drop the new table if it exists
DROP TABLE IF EXISTS public."SchoolWishList" CASCADE;

-- Rename the old lowercase table to the new case-sensitive name
ALTER TABLE IF EXISTS public.schoolwishlist RENAME TO "SchoolWishList";

-- Note: After renaming, you may need to recreate indexes, constraints, and RLS policies
-- It's recommended to run the full create-wishlist-table.sql script instead

