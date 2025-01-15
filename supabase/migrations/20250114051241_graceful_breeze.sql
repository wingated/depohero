/*
  # Update RLS policies for Auth0 integration

  1. Changes
    - Update RLS policies to handle Auth0 users
    - Add auth.email() check for additional security
  
  2. Security
    - Policies updated to work with Auth0 authentication
    - Added email verification as an additional check
*/

-- Update cases policy
DROP POLICY IF EXISTS "Users can manage their own cases" ON cases;
CREATE POLICY "Users can manage their own cases"
  ON cases
  FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'email' = auth.email()
    AND (
      user_id = auth.email()
      OR user_id = auth.jwt()->>'sub'
    )
  );

-- Update documents policy
DROP POLICY IF EXISTS "Users can manage documents in their cases" ON documents;
CREATE POLICY "Users can manage documents in their cases"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = documents.case_id
      AND (
        cases.user_id = auth.email()
        OR cases.user_id = auth.jwt()->>'sub'
      )
      AND auth.jwt()->>'email' = auth.email()
    )
  );

-- Update depositions policy
DROP POLICY IF EXISTS "Users can manage depositions in their cases" ON depositions;
CREATE POLICY "Users can manage depositions in their cases"
  ON depositions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = depositions.case_id
      AND (
        cases.user_id = auth.email()
        OR cases.user_id = auth.jwt()->>'sub'
      )
      AND auth.jwt()->>'email' = auth.email()
    )
  );

-- Update deposition analyses policy
DROP POLICY IF EXISTS "Users can manage analyses for their depositions" ON deposition_analyses;
CREATE POLICY "Users can manage analyses for their depositions"
  ON deposition_analyses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions
      JOIN cases ON cases.id = depositions.case_id
      WHERE depositions.id = deposition_analyses.deposition_id
      AND (
        cases.user_id = auth.email()
        OR cases.user_id = auth.jwt()->>'sub'
      )
      AND auth.jwt()->>'email' = auth.email()
    )
  );