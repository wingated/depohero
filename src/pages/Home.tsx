import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { Scale, FileText, MessageSquare } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
      <div className="text-center max-w-3xl">
        <Scale className="h-16 w-16 text-indigo-600 mx-auto" />
        <h1 className="mt-6 text-4xl font-bold text-gray-900">
          AI-Powered Deposition Analysis
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Enhance your litigation strategy with advanced AI analysis of depositions and discovery documents.
        </p>
        
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <FileText className="h-8 w-8 text-indigo-600 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold">Document Management</h3>
            <p className="mt-2 text-gray-600">
              Upload and organize discovery documents for easy reference
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <MessageSquare className="h-8 w-8 text-indigo-600 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold">Deposition Analysis</h3>
            <p className="mt-2 text-gray-600">
              AI-powered analysis of testimony and document comparison
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <Scale className="h-8 w-8 text-indigo-600 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold">Strategic Insights</h3>
            <p className="mt-2 text-gray-600">
              Get AI-suggested questions and identify discrepancies
            </p>
          </div>
        </div>

        <div className="mt-12">
          {isAuthenticated ? (
            <Link
              to="/cases"
              className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700"
            >
              View Your Cases
            </Link>
          ) : (
            <button
              onClick={() => loginWithRedirect()}
              className="bg-indigo-600 text-white px-8 py-3 rounded-md hover:bg-indigo-700"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}