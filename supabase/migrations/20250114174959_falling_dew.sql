/*
  # Add document analyses table

  1. New Tables
    - `document_analyses`
      - `id` (uuid, primary key)
      - `case_id` (uuid, references cases)
      - `goals` (text)
      - `key_evidence` (jsonb)
      - `suggested_inquiries` (jsonb)
      - `potential_weaknesses` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `document_analyses` table
    - Add policy for authenticated users to manage their analyses
*/

CREATE TABLE IF NOT EXISTS document_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  goals text NOT NULL,
  key_evidence jsonb DEFAULT '[]'::jsonb,
  suggested_inquiries jsonb DEFAULT '[]'::jsonb,
  potential_weaknesses jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their document analyses"
  ON document_analyses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = document_analyses.case_id
      AND cases.user_id = auth.email()
    )
  );