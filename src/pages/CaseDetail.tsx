import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { FileText, Plus, Upload, Trash2, Search, MessageSquare } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { api } from '../lib/api';
import type { Case, Document, Deposition } from '../types';

function sanitizeString(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth0();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [depositions, setDepositions] = useState<Deposition[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isCreatingDepo, setIsCreatingDepo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'document' | 'deposition'; id: string } | null>(null);
  const [newDeposition, setNewDeposition] = useState({
    witness_name: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    onDrop: handleFileUpload
  });

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  async function loadCaseData() {
    if (!caseId || !user?.sub) return;

    try {
      const [caseData, documents, depositions] = await Promise.all([
        api.getCase(caseId),
        api.getDocuments(caseId),
        api.getDepositions(caseId)
      ]);

      if (caseData) setCaseData(caseData);
      if (documents) setDocuments(documents);
      if (depositions) setDepositions(depositions);
    } catch (error) {
      console.error('Error loading case data:', error);
      setError('Failed to load case data');
    }
  }

  async function handleFileUpload(acceptedFiles: File[]) {
    if (!caseId || !user?.sub) return;
    setError(null);
    setIsUploadingDoc(true);
    
    for (const file of acceptedFiles) {
      try {
        const newDocument = await api.uploadDocument(file, caseId);
        setDocuments(prev => [newDocument, ...prev]);
      } catch (error) {
        console.error('Error uploading document:', error);
        setError(`Failed to upload ${file.name}`);
      }
    }

    setIsUploadingDoc(false);
  }

  async function handleDeleteDocument(documentId: string) {
    if (!caseId || !user?.sub) return;
    setError(null);

    try {
      await api.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }

    setDeleteConfirm(null);
  }

  async function handleDownloadDocument(documentId: string) {
    try {
      console.log('Starting document download:', documentId);
      const blob = await api.downloadDocument(documentId);
      console.log('Downloaded blob:', {
        size: blob.size,
        type: blob.type
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documents.find(doc => doc.id === documentId)?.name || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  }

  async function handleDeleteDeposition(depositionId: string) {
    if (!caseId || !user?.sub) return;
    setError(null);

    try {
      await api.deleteDeposition(depositionId);
      setDepositions(depositions.filter(depo => depo.id !== depositionId));
    } catch (error) {
      console.error('Error deleting deposition:', error);
      setError('Failed to delete deposition');
    }

    setDeleteConfirm(null);
  }

  async function createDeposition(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId || !user?.sub) return;

    setError(null);
    try {
      const depositionData = {
        case_id: caseId,
        witness_name: newDeposition.witness_name,
        date: newDeposition.date,
        transcript: '' // Initialize with empty transcript
      };
      const createdDeposition = await api.createDeposition(depositionData);

      setDepositions(prev => [createdDeposition, ...prev]);
      setIsCreatingDepo(false);
      setNewDeposition({
        witness_name: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error creating deposition:', error);
      setError('Failed to create deposition');
    }
  }

  if (!caseData) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{caseData.title}</h1>
        {caseData.description && (
          <p className="mt-2 text-gray-600">{caseData.description}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <Link
          to={`/cases/${caseId}/chat`}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          Chat about Case Documents
        </Link>
        <Link
          to={`/cases/${caseId}/analyze`}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Search className="h-5 w-5 mr-2" />
          Analyze Documents
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Discovery Documents</h2>
          <button
            onClick={() => setIsUploadingDoc(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Document
          </button>
        </div>

        {isUploadingDoc && (
          <div
            {...getRootProps()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, DOC, DOCX, TXT
            </p>
          </div>
        )}

        <div className="space-y-4">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-gray-400 mr-3" />
                <button
                  onClick={() => handleDownloadDocument(doc.id)}
                  className="text-gray-900 hover:text-indigo-600"
                >
                  {doc.name}
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDeleteConfirm({ type: 'document', id: doc.id })}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Depositions</h2>
          <button
            onClick={() => setIsCreatingDepo(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Deposition
          </button>
        </div>

        {isCreatingDepo && (
          <form onSubmit={createDeposition} className="bg-white p-6 rounded-lg shadow-sm space-y-4">
            <div>
              <label htmlFor="witness_name" className="block text-sm font-medium text-gray-700">
                Witness Name
              </label>
              <input
                type="text"
                id="witness_name"
                value={newDeposition.witness_name}
                onChange={e => setNewDeposition(prev => ({ ...prev, witness_name: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={newDeposition.date}
                onChange={e => setNewDeposition(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreatingDepo(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Deposition
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {depositions.map(depo => (
            <div
              key={depo.id}
              className="relative p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <Link
                to={`/cases/${caseId}/depositions/${depo.id}`}
                className="block"
              >
                <h3 className="font-medium text-gray-900">{depo.witness_name}</h3>
                <p className="text-sm text-gray-500">
                  Date: {new Date(depo.date).toLocaleDateString()}
                </p>
                {depo.analysis && (
                  <div className="mt-2 text-sm">
                    <span className="text-green-600">✓ Analysis Complete</span>
                  </div>
                )}
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteConfirm({ type: 'deposition', id: depo.id });
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete deposition"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-6">
              {deleteConfirm.type === 'document'
                ? "Are you sure you want to delete this document? This action cannot be undone."
                : "Are you sure you want to delete this deposition? This will also delete all associated analyses. This action cannot be undone."}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'document') {
                    handleDeleteDocument(deleteConfirm.id);
                  } else {
                    handleDeleteDeposition(deleteConfirm.id);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}