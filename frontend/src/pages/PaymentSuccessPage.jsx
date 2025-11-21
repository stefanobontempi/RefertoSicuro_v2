import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageWrapper from '../components/common/PageWrapper';
import api from '../services/api';
import '../styles/PaymentSuccessPage.css';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id'); // Stripe
  const subscriptionId = searchParams.get('subscription_id'); // PayPal
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [planDetails, setPlanDetails] = useState(null);

  const paymentId = sessionId || subscriptionId;
  const paymentProvider = sessionId ? 'Stripe' : 'PayPal';

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        // Refresh user data first
        await refreshUser();

        // Wait a bit for the user state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Load plan details from API if user has a subscription plan
        if (user?.subscription_plan) {
          const response = await api.get(`/pricing/tiers?customer_type=b2c`);
          const tiers = response.data;
          const currentTier = tiers.find(t => t.tier_id === user.subscription_plan);

          if (currentTier) {
            setPlanDetails({
              name: currentTier.name,
              monthlyPrice: currentTier.base_monthly_price,
              yearlyPrice: currentTier.base_yearly_price,
              apiCallsLimit: currentTier.max_api_calls || user.api_calls_limit,
              maxSpecialties: currentTier.max_specialties
            });
          }
        }
      } catch (err) {
        console.error('Failed to load subscription data:', err);
        setError('Impossibile caricare i dettagli della subscription');
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      // Wait a moment for webhook to process, then load data
      setTimeout(loadSubscriptionData, 2000);
    } else {
      setLoading(false);
    }
  }, [paymentId, refreshUser, user?.subscription_plan]);

  if (!paymentId) {
    return (
      <PageWrapper>
        <div className="payment-success-page">
        <div className="success-card error-card">
          <div className="error-icon">❌</div>
          <h1>Sessione non valida</h1>
          <p>Non è stata trovata una sessione di pagamento valida.</p>
          <Link to="/pricing" className="success-button">
            Torna ai piani
          </Link>
        </div>
        </div>
      </PageWrapper>
    );
  }

  if (loading || !planDetails) {
    return (
      <PageWrapper>
        <div className="payment-success-page">
        <div className="success-card">
          <div className="loading-spinner"></div>
          <h1>Elaborazione pagamento...</h1>
          <p>Stiamo confermando il tuo pagamento e caricando i dettagli del piano...</p>
        </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <div className="payment-success-page">
        <div className="success-card error-card">
          <div className="error-icon">⚠️</div>
          <h1>Errore</h1>
          <p>{error}</p>
          <Link to="/profile" className="success-button">
            Vai al profilo
          </Link>
        </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="payment-success-page">
      <div className="success-card">
        <div className="success-icon">🎉</div>
        <h1>Pagamento completato con successo!</h1>
        <p>Il tuo abbonamento è ora attivo. Puoi iniziare subito ad utilizzare tutte le funzionalità del piano {planDetails.name}.</p>

        <div className="success-details">
          <div className="detail-item">
            <span className="detail-label">Piano attivato:</span>
            <span className="detail-value">{planDetails.name} (€{planDetails.monthlyPrice}/mese)</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Analisi disponibili:</span>
            <span className="detail-value">{planDetails.apiCallsLimit} al mese</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Provider pagamento:</span>
            <span className="detail-value">{paymentProvider}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">ID Transazione:</span>
            <span className="detail-value">{paymentId}</span>
          </div>
        </div>

        <div className="success-actions">
          <Link to="/" className="success-button primary">
            Inizia ad analizzare
          </Link>
          <Link to="/profile" className="success-button secondary">
            Gestisci abbonamento
          </Link>
        </div>

        <div className="success-next-steps">
          <h3>Prossimi passi:</h3>
          <ul>
            <li>✅ Il tuo account è stato aggiornato automaticamente</li>
            <li>📧 Riceverai una email di conferma da {paymentProvider}</li>
            <li>🎯 Puoi ora effettuare fino a {planDetails.apiCallsLimit} analisi al mese</li>
            <li>🛠️ Hai accesso al supporto prioritario</li>
          </ul>
        </div>

        <div className="success-support">
          <p>
            <strong>Hai domande?</strong> Contatta il nostro supporto all'indirizzo{' '}
            <a href="mailto:support@refertosicuro.it">support@refertosicuro.it</a>
          </p>
        </div>
      </div>
      </div>
    </PageWrapper>
  );
};

export default PaymentSuccessPage;