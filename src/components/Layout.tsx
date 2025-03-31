import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Outlet, Link } from 'react-router-dom';
import { Scale, LogOut, User } from 'lucide-react';

export default function Layout() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <Scale className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold">Second Chair.ai</span>
              </Link>
              {isAuthenticated && (
                <div className="ml-10 flex items-center space-x-4">
                  <Link to="/cases" className="text-gray-700 hover:text-indigo-600">
                    Cases
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-gray-500" />
                    <span className="text-sm text-gray-700">{user?.name}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="flex items-center text-gray-700 hover:text-indigo-600"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => loginWithRedirect()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}