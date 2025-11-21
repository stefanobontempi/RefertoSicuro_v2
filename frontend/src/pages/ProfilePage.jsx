import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/common/Layout';
import PageWrapper from '../components/common/PageWrapper';
import ToastContainer from '../components/common/ToastContainer';
import TabNavigation from '../components/profile/TabNavigation';
import ProfileTab from '../components/profile/ProfileTab';
import SubscriptionTab from '../components/profile/SubscriptionTab';
import useToast from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout, updateProfile } = useAuth();
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const location = useLocation();

  // Scroll to top on mount/refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle URL-based tab routing
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname === '/profile') {
      setActiveTab('profile');
    } else if (pathname === '/subscription') {
      setActiveTab('subscription');
    }
  }, [location.pathname]);

  // Redirect to home if not authenticated (after loading completes)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleUserUpdate = async (updatedData) => {
    try {
      const updatedUser = await authService.updateProfile(updatedData);
      await updateProfile(updatedData);
      return updatedUser;
    } catch (error) {
      throw error;
    }
  };

  const tabs = [
    {
      id: 'profile',
      label: 'Profilo',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    {
      id: 'subscription',
      label: 'Abbonamento',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
    }
  ];

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Layout>
        <PageWrapper>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#5399d9' }}></div>
          </div>
        </PageWrapper>
      </Layout>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} onUserUpdate={handleUserUpdate} />;
      case 'subscription':
        return <SubscriptionTab user={user} onNavigate={navigate} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <PageWrapper>
        <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-display mb-2">Il tuo Profilo</h1>
            <p className="text-soft">Gestisci il tuo account e abbonamento Referto Sicuro</p>
          </div>

          {/* Tab Navigation */}
          <TabNavigation
            activeTab={activeTab}
            tabs={tabs}
          />

          {/* Tab Content */}
          {renderTabContent()}
        </div>

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </PageWrapper>
    </Layout>
  );
};

export default ProfilePage;