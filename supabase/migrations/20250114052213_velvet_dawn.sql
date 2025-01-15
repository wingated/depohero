/*
  # Add TXT file support
  
  1. Changes
    - Modify documents table type check constraint to include 'txt' file type
  
  2. Security
    - Existing RLS policies remain unchanged and will apply to txt files
*/

DO $$ 
BEGIN
  -- Drop existing check constraint
  ALTER TABLE documents 
    DROP CONSTRAINT IF EXISTS documents_type_check;
  
  -- Add new check constraint with txt support
  ALTER TABLE documents 
    ADD CONSTRAINT documents_type_check 
    CHECK (type IN ('pdf', 'doc', 'docx', 'txt'));
END $$;