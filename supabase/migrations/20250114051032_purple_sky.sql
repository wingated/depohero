/*
  # Update user_id column type and related policies

  1. Changes
    - Drop all policies that depend on the user_id column
    - Modify user_id column in cases table from UUID to TEXT
    - Recreate all policies with updated column type

  2. Security
    - Temporarily removes and recreates all affected policies
    - Updates policies to work with Auth0 IDs
*/

-- First drop all policies that depend on the user_id column
DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;
DROP POLICY IF EXISTS "Users can manage documents in their cases" ON documents;
DROP POLICY IF EXISTS "Users can manage depositions in their cases" ON depositions;
DROP POLICY IF EXISTS "Users can manage analyses for their depositions" ON deposition_analyses;

-- Now we can safely alter the column
ALTER TABLE cases 
  ALTER COLUMN user_id TYPE text;

-- Recreate the policy for cases
CREATE POLICY "Users can manage their own cases"
  ON cases
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Recreate the policy for documents
CREATE POLICY "Users can manage documents in their cases"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = documents.case_id
      AND cases.user_id = auth.uid()::text
    )
  );

-- Recreate the policy for depositions
CREATE POLICY "Users can manage depositions in their cases"
  ON depositions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = depositions.case_id
      AND cases.user_id = auth.uid()::text
    )
  );

-- Recreate the policy for deposition analyses
CREATE POLICY "Users can manage analyses for their depositions"
  ON deposition_analyses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions
      JOIN cases ON cases.id = depositions.case_id
      WHERE depositions.id = deposition_analyses.deposition_id
      AND cases.user_id = auth.uid()::text
    )
  );