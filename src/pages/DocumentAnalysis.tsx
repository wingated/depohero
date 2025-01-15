import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ChevronLeft, FileText, Loader, History, AlertTriangle, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { analyzeDocuments } from '../lib/openai';
import type { Case, Document } from '../types';

export default function DocumentAnalysis() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth0();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [goals, setGoals] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    key_evidence: Array<{
      document: string;
      excerpt: string;
      relevance: string;
      supports_goals: boolean;
    }>;
    suggested_inquiries: Array<{
      topic: string;
      rationale: string;
      specific_questions: string[];
    }>;
    potential_weaknesses: Array<{
      issue: string;
      explanation: string;
      mitigation_strategy: string;
    }>;
  } | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<Array<{
    id: string;
    goals: string;
    created_at: string;
  }>>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) {
      loadCaseData();
      loadPreviousAnalyses();
    }
  }, [caseId]);

  async function loadCaseData() {
    if (!caseId || !user?.sub) return;

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

    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error loading documents:', docsError);
      setError('Failed to load documents');
      return;
    }

    if (caseData) setCaseData(caseData);
    if (documents) setDocuments(documents);
  }

  async function loadPreviousAnalyses() {
    if (!caseId) return;

    const { data, error } = await supabase
      .from('document_analyses')
      .select('id, goals, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading previous analyses:', error);
      return;
    }

    setPreviousAnalyses(data || []);
  }

  async function loadAnalysis(analysisId: string) {
    const { data, error } = await supabase
      .from('document_analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Error loading analysis:', error);
      setError('Failed to load analysis');
      return;
    }

    setAnalysis({
      key_evidence: data.key_evidence,
      suggested_inquiries: data.suggested_inquiries,
      potential_weaknesses: data.potential_weaknesses
    });
    setGoals(data.goals);
    setSelectedAnalysisId(analysisId);
  }

  async function downloadDocumentContent(url: string): Promise<string> {
    try {
      console.log("Trying to download file:", url);
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
    if (!documents.length) {
      setError('Please add documents to analyze');
      return;
    }

    if (!goals.trim()) {
      setError('Please enter your goals for the analysis');
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

      const analysisResult = await analyzeDocuments(docsWithContent, goals);
      setAnalysis(analysisResult);

      // Store the analysis results
      const { error: insertError } = await supabase
        .from('document_analyses')
        .insert([{
          case_id: caseId,
          goals,
          key_evidence: analysisResult.key_evidence,
          suggested_inquiries: analysisResult.suggested_inquiries,
          potential_weaknesses: analysisResult.potential_weaknesses
        }]);

      if (insertError) {
        console.error('Error saving analysis:', insertError);
        setError('Analysis completed but failed to save results');
      } else {
        loadPreviousAnalyses(); // Refresh the list of analyses
      }
    } catch (error) {
      console.error('Error analyzing documents:', error);
      setError('Failed to analyze documents');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!caseData) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <Link to={`/cases/${caseId}`} className="flex items-center hover:text-indigo-600">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to {caseData.title}</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Document Analysis</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Documents section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Available Documents</h2>
            <div className="space-y-3">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm"
                >
                  <FileText className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                  <div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {doc.name}
                    </a>
                    <p className="text-sm text-gray-500">
                      Added {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Previous Analyses section */}
          {previousAnalyses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Previous Analyses</h2>
              <div className="space-y-3">
                {previousAnalyses.map(prevAnalysis => (
                  <button
                    key={prevAnalysis.id}
                    onClick={() => loadAnalysis(prevAnalysis.id)}
                    className={`w-full flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 text-left ${
                      selectedAnalysisId === prevAnalysis.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <History className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 line-clamp-2">{prevAnalysis.goals}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(prevAnalysis.created_at).toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Goals and Analysis button section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Analysis Goals</h2>
            <div>
              <textarea
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="Enter your goals for analyzing these documents..."
                className="w-full h-40 p-4 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !documents.length || !goals.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Analyzing Documents...
                </>
              ) : (
                'Analyze Documents'
              )}
            </button>
          </div>
        </div>

        {/* Analysis Results section */}
        <div className="space-y-6">
          {analysis && (
            <>
              {/* Key Evidence */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 text-indigo-600 mr-2" />
                  Key Evidence
                </h2>
                <div className="space-y-4">
                  {analysis.key_evidence.map((evidence, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        {evidence.supports_goals ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <h3 className="font-medium text-gray-900">{evidence.document}</h3>
                      </div>
                      <blockquote className="border-l-4 border-indigo-200 pl-4 my-2 text-gray-700">
                        {evidence.excerpt}
                      </blockquote>
                      <p className="text-gray-600 mt-2">{evidence.relevance}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Inquiries */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Lightbulb className="h-6 w-6 text-yellow-500 mr-2" />
                  Suggested Lines of Inquiry
                </h2>
                <div className="space-y-4">
                  {analysis.suggested_inquiries.map((inquiry, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                      <h3 className="font-medium text-gray-900">{inquiry.topic}</h3>
                      <p className="text-gray-600 mt-2">{inquiry.rationale}</p>
                      <div className="mt-3 space-y-2">
                        {inquiry.specific_questions.map((question, qIndex) => (
                          <div key={qIndex} className="flex items-start space-x-2">
                            <span className="text-indigo-600">•</span>
                            <p className="text-gray-700">{question}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Potential Weaknesses */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                  Potential Weaknesses
                </h2>
                <div className="space-y-4">
                  {analysis.potential_weaknesses.map((weakness, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-400">
                      <h3 className="font-medium text-gray-900">{weakness.issue}</h3>
                      <p className="text-gray-600 mt-2">{weakness.explanation}</p>
                      <div className="mt-3 p-3 bg-green-50 rounded-md">
                        <h4 className="text-sm font-medium text-green-800">Mitigation Strategy:</h4>
                        <p className="text-green-700">{weakness.mitigation_strategy}</p>
                      </div>
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