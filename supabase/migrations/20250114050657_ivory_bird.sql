/*
  # Update user_id column type

  1. Changes
    - Modify `user_id` column in `cases` table from UUID to TEXT
    - Update RLS policies to work with Auth0 IDs

  2. Security
    - Maintains existing RLS policies with updated column type
*/

DO $$ 
BEGIN
  -- Temporarily disable RLS
  ALTER TABLE cases DISABLE ROW LEVEL SECURITY;

  -- Change column type
  ALTER TABLE cases 
    ALTER COLUMN user_id TYPE text;

  -- Re-enable RLS
  ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

  -- Drop and recreate the policy with the new type
  DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;
  
  CREATE POLICY "Users can manage their own cases"
    ON cases
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id);
END $$;