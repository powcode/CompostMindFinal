-- Migration: Add condition column to ingredients table
ALTER TABLE ingredients
ADD COLUMN condition TEXT NOT NULL DEFAULT 'whole';

-- Optional: Add CHECK constraint to enforce valid condition values
ALTER TABLE ingredients
ADD CONSTRAINT chk_ingredient_condition CHECK (condition IN ('whole', 'peel', 'rotten'));
