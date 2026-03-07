import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const CompaniesPage = lazy(() => import('./pages/admin/CompaniesPage'));
const CatalogsPage = lazy(() => import('./pages/admin/CatalogsPage'));
const AssetsPage = lazy(() => import('./pages/admin/AssetsPage'));

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-primary-50">
      <div className="w-8 h-8 border-2 border-primary-200 border-t-accent-600 rounded-full animate-spin" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminPage />}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<CompaniesPage />} />
            <Route path="catalogs" element={<CatalogsPage />} />
            <Route path="assets" element={<AssetsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
