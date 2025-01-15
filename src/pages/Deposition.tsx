import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { AlertTriangle, Lightbulb, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzeDeposition } from '../lib/openai';
import type { Deposition, Document, DepositionAnalysis, Case } from '../types';

export default function DepositionPage() {
  const { caseId, depositionId } = useParams<{ caseId: string; depositionId: string }>();
  const { user } = useAuth0();
  const [deposition, setDeposition] = useState<Deposition | null>(null);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analysis, setAnalysis] = useState<DepositionAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (depositionId && caseId) {
      loadDepositionData();
    }
  }, [depositionId, caseId]);

  useEffect(() => {
    if (deposition?.transcript) {
      setTranscript(deposition.transcript);
    }
  }, [deposition?.transcript]);

  async function loadDepositionData() {
    if (!depositionId || !caseId || !user?.sub) return;

    // Load case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError) {
      console.error('Error loading case:', caseError);
      setError('Failed to load case data');
      return;
    }

    setCaseData(caseData);

    const { data: depoData, error: depoError } = await supabase
      .from('depositions')
      .select('*, deposition_analyses(*)')
      .eq('id', depositionId)
      .single();

    if (depoError) {
      console.error('Error loading deposition:', depoError);
      setError('Failed to load deposition data');
      return;
    }

    const { data: docsData, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId);

    if (docsError) {
      console.error('Error loading documents:', docsError);
      setError('Failed to load related documents');
      return;
    }

    if (depoData) {
      setDeposition(depoData);
      if (depoData.deposition_analyses?.[0]) {
        setAnalysis(depoData.deposition_analyses[0]);
      }
    }
    if (docsData) setDocuments(docsData);
  }

  async function handleTranscriptUpdate(newTranscript: string) {
    setTranscript(newTranscript);
    if (!depositionId || !user?.sub) return;

    const { error: updateError } = await supabase
      .from('depositions')
      .update({ transcript: newTranscript })
      .eq('id', depositionId);

    if (updateError) {
      console.error('Error updating transcript:', updateError);
      setError('Failed to save transcript changes');
    }
  }

  async function downloadDocumentContent(url: string): Promise<string> {
    try {
      console.log("Trying to download file:",url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // For text files
      if (url.endsWith('.txt')) {
        return await response.text();
      }
      
      // For PDFs, DOCs, and DOCX, we'll need to handle them differently
      // For now, we'll return a placeholder as these formats require additional processing
      if (url.endsWith('.pdf')) {
        return 'PDF content extraction not implemented';
      }
      if (url.endsWith('.doc') || url.endsWith('.docx')) {
        return 'Word document content extraction not implemented';
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error('Failed to download document content');
    }
  }

  async function handleAnalyze() {
    if (!transcript || !documents.length) {
      setError('Please add a transcript and ensure there are documents to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const docsWithContent = await Promise.all(
        documents.map(async (doc) => {
          try {
            const content = await downloadDocumentContent(doc.url);
            return {
              content,
              name: doc.name
            };
          } catch (error) {
            console.error(`Error processing document ${doc.name}:`, error);
            return {
              content: `Error loading content for ${doc.name}`,
              name: doc.name
            };
          }
        })
      );

      const analysisResult = await analyzeDeposition(deposition, transcript, docsWithContent);

      const { error: analysisError } = await supabase
        .from('deposition_analyses')
        .upsert({
          deposition_id: depositionId,
          discrepancies: analysisResult.discrepancies,
          suggested_questions: analysisResult.suggested_questions
        });

      if (analysisError) {
        console.error('Error saving analysis:', analysisError);
        setError('Failed to save analysis results');
        return;
      }

      loadDepositionData();
    } catch (error) {
      console.error('Error analyzing deposition:', error);
      setError('Failed to analyze deposition');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!deposition || !caseData) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <ChevronLeft className="h-4 w-4" />
          <Link to={`/cases/${caseId}`} className="hover:text-indigo-600">
            Back to {caseData.title}
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Deposition of {deposition.witness_name}
          </h1>
          <p className="text-gray-600">
            Date: {new Date(deposition.date).toLocaleDateString()}
          </p>
          <p className="text-gray-600">
            Case: <Link to={`/cases/${caseId}`} className="text-indigo-600 hover:underline">{caseData.title}</Link>
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Transcript</h2>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !transcript}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Testimony'}
            </button>
          </div>
          <textarea
            value={transcript}
            onChange={e => handleTranscriptUpdate(e.target.value)}
            placeholder="Paste deposition transcript here..."
            className="w-full h-[600px] p-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>

        <div className="space-y-6">
          {analysis && (
            <>
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                  Discrepancies
                </h2>
                <div className="space-y-4">
                  {analysis.discrepancies.map((discrepancy, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900">Testimony:</h3>
                        <p className="text-gray-700 bg-amber-50 p-2 rounded">
                          "{discrepancy.testimony_excerpt}"
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <h3 className="font-medium text-gray-900">Document Reference:</h3>
                        <p className="text-gray-700 bg-blue-50 p-2 rounded">
                          "{discrepancy.document_reference.excerpt}"
                        </p>
                      </div>
                      <p className="mt-3 text-gray-600">
                        {discrepancy.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
                  Suggested Questions
                </h2>
                <div className="space-y-2">
                  {analysis.suggested_questions.map((question, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-400"
                    >
                      <p className="text-gray-700">{question}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}