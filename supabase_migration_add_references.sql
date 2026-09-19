-- Migration: Ensure reference column exists on steps table
-- Column name is "reference" (singular) - already exists in DB
-- Run this only if the column does NOT yet exist

ALTER TABLE steps 
ADD COLUMN IF NOT EXISTS reference JSONB DEFAULT '[]'::jsonb;

-- Add a comment to document the expected structure
COMMENT ON COLUMN steps.reference IS 
'Array of reference objects. Each object has: { title: string, url: string, source: string }';
