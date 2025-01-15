/*
  # Update cases table RLS policy
  
  1. Changes
    - Simplify cases table RLS policy to allow users to manage their own cases using email as user_id
  
  2. Security
    - Maintains row-level security while fixing access issues
    - Ensures users can only access their own cases
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;

-- Create new simplified policy
CREATE POLICY "Users can manage their own cases"
  ON cases
  FOR ALL
  TO authenticated
  USING (user_id = auth.email());