-- Remove the problematic constraint temporarily
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check;
