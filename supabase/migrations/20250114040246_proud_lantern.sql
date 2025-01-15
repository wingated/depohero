/*
  # Initial Schema Setup for Deposition Analysis Platform

  1. New Tables
    - `cases`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `user_id` (uuid, from Auth0)
      - `created_at` (timestamp)
    
    - `documents`
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key)
      - `name` (text)
      - `url` (text)
      - `type` (text)
      - `created_at` (timestamp)
    
    - `depositions`
      - `id` (uuid, primary key)
      - `case_id` (uuid, foreign key)
      - `witness_name` (text)
      - `date` (date)
      - `transcript` (text)
      - `created_at` (timestamp)
    
    - `deposition_analyses`
      - `id` (uuid, primary key)
      - `deposition_id` (uuid, foreign key)
      - `discrepancies` (jsonb)
      - `suggested_questions` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Cases table
CREATE TABLE cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cases"
  ON cases
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('pdf', 'doc', 'docx')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents in their cases"
  ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = documents.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Depositions table
CREATE TABLE depositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  witness_name text NOT NULL,
  date date NOT NULL,
  transcript text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE depositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage depositions in their cases"
  ON depositions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = depositions.case_id
      AND cases.user_id = auth.uid()
    )
  );

-- Deposition analyses table
CREATE TABLE deposition_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposition_id uuid REFERENCES depositions(id) ON DELETE CASCADE,
  discrepancies jsonb DEFAULT '[]'::jsonb,
  suggested_questions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deposition_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage analyses for their depositions"
  ON deposition_analyses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM depositions
      JOIN cases ON cases.id = depositions.case_id
      WHERE depositions.id = deposition_analyses.deposition_id
      AND cases.user_id = auth.uid()
    )
  );