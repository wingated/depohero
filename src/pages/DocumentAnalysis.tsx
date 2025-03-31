import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ChevronLeft, FileText, Loader, History, AlertTriangle, Lightbulb, CheckCircle, XCircle } from 'lucide-react';
import { analyzeDocument } from '../lib/openai';
import type { Case, Document, DocumentAnalysis as DocumentAnalysisType } from '../types';
import { api } from '../lib/api';

export default function DocumentAnalysis() {
  const { caseId, documentId } = useParams<{ caseId: string; documentId: string }>();
  const { user } = useAuth0();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [goals, setGoals] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<DocumentAnalysisType | null>(null);
  const [previousAnalyses, setPreviousAnalyses] = useState<Array<{
    id: string;
    goals: string;
    created_at: string;
  }>>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Loading data for caseId:", caseId);
        // Load case data
        const caseData = await api.getCase(caseId);
        if (!caseData) {
          setError('Failed to load case data');
          return;
        }
        setCaseData(caseData);

        // Load a list of documents for the case
        const documents = await api.getDocuments(caseId);
        if (!documents) {
          setError('Failed to load document data');
          return;
        }
        //const docData = documents.find(doc => doc.id === documentId);
        const docData = documents[0];

        if (!docData) {
          setError('Document not found');
          return;
        }
        setDocumentData(docData);

        // Load analysis if it exists
        // const analysisData = await api.getDocumentAnalysis(documentId);
        // if (analysisData) {
        //   setAnalysisData(analysisData);
        // }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      }
    };

    loadData();
  }, [caseId]);

  async function loadPreviousAnalyses() {
    if (!caseId) return;

    try {
      const analyses = await api.getDocumentAnalyses(caseId);
      setPreviousAnalyses(analyses.map(a => ({
        id: a.id,
        goals: a.goals,
        created_at: a.created_at
      })));
    } catch (error) {
      console.error('Error loading previous analyses:', error);
    }
  }

  async function loadAnalysis(analysisId: string) {
    try {
      // Get all analyses and find the one we want
      const analyses = await api.getDocumentAnalyses(caseId!);
      const analysis = analyses.find(a => a.id === analysisId);
      if (!analysis) {
        setError('Failed to load analysis');
        return;
      }

      setAnalysisData(analysis);
      setGoals(analysis.goals);
      setSelectedAnalysisId(analysisId);
    } catch (error) {
      console.error('Error loading analysis:', error);
      setError('Failed to load analysis');
    }
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

  const handleAnalyze = async () => {
    if (!documentData) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzeDocument(documentData);

      // Create a new document analysis
      const newAnalysis = await api.createDocumentAnalysis({
        document_id: documentId,
        case_id: caseId,
        goals: analysisResult.goals,
        key_evidence: analysisResult.key_evidence,
        suggested_inquiries: analysisResult.suggested_inquiries,
        potential_weaknesses: analysisResult.potential_weaknesses
      });

      setAnalysisData(newAnalysis);
    } catch (err) {
      console.error('Error analyzing document:', err);
      setError('Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              {documentData && (
                <div
                  className="flex items-start space-x-3 p-4 bg-white rounded-lg shadow-sm"
                >
                  <FileText className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                  <div>
                    <a
                      href={documentData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {documentData.name}
                    </a>
                    <p className="text-sm text-gray-500">
                      Added {new Date(documentData.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
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
              disabled={isAnalyzing || !documentData || !goals.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isAnalyzing ? (
                <>
                  <Loader className="animate-spin h-5 w-5 mr-2" />
                  Analyzing Document...
                </>
              ) : (
                'Analyze Document'
              )}
            </button>
          </div>
        </div>

        {/* Analysis Results section */}
        <div className="space-y-6">
          {analysisData && (
            <>
              {/* Key Evidence */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileText className="h-6 w-6 text-indigo-600 mr-2" />
                  Key Evidence
                </h2>
                <div className="space-y-4">
                  {analysisData.key_evidence.map((evidence, index) => (
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
                  {analysisData.suggested_inquiries.map((inquiry, index) => (
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
                  {analysisData.potential_weaknesses.map((weakness, index) => (
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