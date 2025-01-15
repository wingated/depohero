/*
  # Update user_id column type

  1. Changes
    - Drop existing RLS policy
    - Modify `user_id` column in `cases` table from UUID to TEXT
    - Recreate RLS policy with updated column type

  2. Security
    - Temporarily disables and re-enables RLS
    - Recreates policy to work with Auth0 IDs
*/

-- First drop the policy that depends on the column
DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;

-- Now we can safely alter the column
ALTER TABLE cases 
  ALTER COLUMN user_id TYPE text;

-- Recreate the policy with the new type
CREATE POLICY "Users can manage their own cases"
  ON cases
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);