SELECT conname, consrc, condef 
FROM pg_constraint 
WHERE conrelid = 'assessments'::regclass AND contype = 'c';
