import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import Deposition from './pages/Deposition';
import DocumentAnalysis from './pages/DocumentAnalysis';

function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/:caseId" element={<CaseDetail />} />
            <Route path="cases/:caseId/depositions/:depositionId" element={<Deposition />} />
            <Route path="cases/:caseId/analyze" element={<DocumentAnalysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Auth0Provider>
  );
}

export default App;