'use client';

import { useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import AuthPage from '../components/AuthPage';
import Dashboard from '../components/Dashboard';
import ProfilePage from '../components/ProfilePage';
import SharePage from '../components/SharePage';
import ConnectionsPage from '../components/ConnectionsPage';
import LoadingSpinner from '../components/LoadingSpinner';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

type Page = 'dashboard' | 'profile' | 'share' | 'connections';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'profile':
        return <ProfilePage />;
      case 'share':
        return <SharePage />;
      case 'connections':
        return <ConnectionsPage />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <>
      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="min-h-screen pt-16">
        {renderPage()}
      </main>
      <Toast />
    </>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
