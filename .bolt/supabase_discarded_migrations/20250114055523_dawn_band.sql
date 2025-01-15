/*
  # Create storage bucket for case documents

  1. New Storage Bucket
    - Create 'case-documents' bucket for storing case-related files
  2. Security
    - Enable public access for authenticated users
    - Add policy for authenticated users to manage their own files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('case-documents', 'case-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-documents');

-- Create policy to allow authenticated users to read their files
CREATE POLICY "Authenticated users can read files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'case-documents');

-- Create policy to allow authenticated users to update their files
CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'case-documents');

-- Create policy to allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'case-documents');