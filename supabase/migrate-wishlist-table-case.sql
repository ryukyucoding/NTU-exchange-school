-- Migration script to fix SchoolWishList table name case
-- This script will drop the old lowercase table and recreate it with proper case

-- Drop the old table if it exists (lowercase version)
DROP TABLE IF EXISTS public.schoolwishlist CASCADE;

-- Drop the new table if it exists (to allow clean recreation)
DROP TABLE IF EXISTS public."SchoolWishList" CASCADE;

-- Now run the create-wishlist-table.sql script to create the table with proper case

