import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Briefcase, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Case } from '../types';

export default function Cases() {
  const { user } = useAuth0();
  const [cases, setCases] = useState<Case[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, [user?.sub]);

  async function loadCases() {
    if (!user?.sub || !user?.email) return;
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .or(`user_id.eq.${user.email},user_id.eq.${user.sub}`)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error loading cases:', error);
      setError('Failed to load cases. Please try again.');
      return;
    }
    
    setCases(data);
  }

  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.sub || !user?.email) return;

    setError(null);

    const { data, error: insertError } = await supabase
      .from('cases')
      .insert([
        {
          title: newCase.title,
          description: newCase.description,
          user_id: user.email // Use email as the user_id
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating case:', insertError);
      setError('Failed to create case. Please try again.');
      return;
    }

    setCases(prev => [data, ...prev]);
    setIsCreating(false);
    setNewCase({ title: '', description: '' });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Your Cases</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Case
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {isCreating && (
        <form onSubmit={createCase} className="bg-white p-6 rounded-lg shadow-sm space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Case Title
            </label>
            <input
              type="text"
              id="title"
              value={newCase.title}
              onChange={e => setNewCase(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={newCase.description}
              onChange={e => setNewCase(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Create Case
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cases.map(case_ => (
          <Link
            key={case_.id}
            to={`/cases/${case_.id}`}
            className="block bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start space-x-3">
              <Briefcase className="h-6 w-6 text-indigo-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{case_.title}</h2>
                {case_.description && (
                  <p className="mt-1 text-gray-600 line-clamp-2">{case_.description}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Created {new Date(case_.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}