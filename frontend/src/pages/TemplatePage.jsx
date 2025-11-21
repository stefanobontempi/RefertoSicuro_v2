import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/common/Layout';
import PageWrapper from '../components/common/PageWrapper';
import TabNavigation from '../components/profile/TabNavigation';
import Tab1 from '../components/template/Tab1';
import Tab2 from '../components/template/Tab2';
import { useAuth } from '../contexts/AuthContext';

const TemplatePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('tab1');
  const [hasAccess, setHasAccess] = useState(null); // null = loading, true/false = result
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Scroll to top on mount/refresh
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle URL-based tab routing
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname === '/template') {
      setActiveTab('tab1');
    } else if (pathname === '/template-out') {
      setActiveTab('tab2');
    }
    // Scroll to top when tab changes
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Check access based on subscription plan
  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setLoading(false);
      setHasAccess(false);
      return;
    }

    // Check if user has Professional or Enterprise plan
    const hasDirectAccess = user?.subscription_plan === 'professional' ||
                             user?.subscription_plan === 'enterprise';

    setHasAccess(hasDirectAccess);
    setLoading(false);

    // Mostra il modal solo per account Basic e Medium
    const shouldShowModal = user?.subscription_plan === 'basic' ||
                            user?.subscription_plan === 'medium';
    setShowUpgradeModal(shouldShowModal);
  }, [authLoading, isAuthenticated, user]);

  // Redirect to home if not authenticated (after loading completes)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showUpgradeModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showUpgradeModal]);

  const tabs = [
    {
      id: 'tab1',
      label: 'Template Input',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      id: 'tab2',
      label: 'Template Output',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01'
    }
  ];

  // Show loading state (auth loading or access check loading)
  if (authLoading || loading) {
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

  // If not authenticated, will redirect (wait for redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tab1':
        return <Tab1 user={user} />;
      case 'tab2':
        return <Tab2 user={user} />;
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
              <h1 className="heading-display mb-2">I Tuoi Template</h1>
              <p className="text-soft">Gestisci i tuoi template per RefertoSicuro</p>
            </div>

            {/* Tab Navigation */}
            <TabNavigation
              activeTab={activeTab}
              tabs={tabs}
            />

            {/* Tab Content */}
            <div className="mt-6">
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[10000] transition-opacity" />

            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <div className="card max-w-lg w-full text-center">
                {/* Lock Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(83, 153, 217, 0.1)' }}>
                    <svg className="w-10 h-10" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold mb-4" style={{ color: '#5399d9' }}>
                  Funzionalità Premium
                </h2>

                {/* Message */}
                <p className="text-lg text-gray-700 mb-8">
                  I template personalizzati sono disponibili solo per gli abbonamenti <strong>Professional</strong> ed <strong>Enterprise</strong>.
                  <br />
                  <span className="text-gray-600 mt-2 block">
                    Fai l'upgrade per accedere a questa funzionalità!
                  </span>
                </p>

                {/* CTA Button */}
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn-primary px-8 py-4 text-lg font-semibold"
                  style={{ backgroundColor: '#5399d9', borderRadius: '50px' }}
                >
                  Scopri i Piani Premium
                </button>

                {/* Back link */}
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-600 hover:text-gray-800 mt-6 flex items-center justify-center gap-2 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Torna indietro
                </button>
              </div>
            </div>
          </>
        )}
      </PageWrapper>
    </Layout>
  );
};

export default TemplatePage;
