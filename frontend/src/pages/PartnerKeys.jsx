import React from 'react';
import Layout from '../components/common/Layout';
import PageWrapper from '../components/common/PageWrapper';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PartnerKeys = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check access
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const hasAccess = user?.subscription_plan === 'professional' || user?.subscription_plan === 'enterprise';
    if (!hasAccess) {
      navigate('/subscription');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <Layout>
      <PageWrapper>
        <div className="min-h-screen">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="heading-display mb-2">Partner API Keys</h1>
            <p className="text-soft mb-4">
              Gestisci le tue chiavi API per integrare RefertoSicuro nelle tue applicazioni
            </p>
            <div className="mt-6 p-8 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600">Partner Keys page - Implementation in progress</p>
            </div>
          </div>
        </div>
      </PageWrapper>
    </Layout>
  );
};

export default PartnerKeys;
