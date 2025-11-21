import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import SectionCard from './SectionCard';
import useToast from '../../hooks/useToast';
import configService from '../../services/configService';

const SubscriptionTab = ({ user, onCancelSubscription }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  // Load pricing configuration on component mount
  useEffect(() => {
    const loadPricingConfig = async () => {
      try {
        setLoadingPricing(true);
        const config = await configService.loadPricingConfig('EUR');
        setPricingConfig(config);
      } catch (error) {
        // Set empty config to show error state
        setPricingConfig(null);
      } finally {
        setLoadingPricing(false);
      }
    };

    loadPricingConfig();
  }, []);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getUsagePercentage = () => {
    if (!user?.api_calls_limit || user.api_calls_limit === 0) return 0;
    return Math.round((user.api_calls_used / user.api_calls_limit) * 100);
  };

  const getRemainingDays = () => {
    if (!user?.expires_at) return 0;
    const expiryDate = new Date(user.expires_at);
    const today = new Date();
    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getPlanBadge = (plan) => {
    const planClasses = {
      trial: 'bg-blue-100 text-blue-800',
      basic: 'bg-purple-100 text-purple-800',
      pro: 'bg-orange-100 text-orange-800'
    };

    const planLabels = {
      trial: 'Trial Gratuito',
      basic: 'Piano Basic',
      pro: 'Piano Pro'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planClasses[plan] || planClasses.trial}`}>
        {planLabels[plan] || plan}
      </span>
    );
  };

  const getSubscriptionStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      active: 'Attivo',
      expired: 'Scaduto',
      cancelled: 'Cancellato'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || statusClasses.active}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPlanPrice = (plan) => {
    // Se i dati sono ancora in caricamento
    if (loadingPricing) {
      return '...';
    }

    // Se abbiamo la configurazione caricata dall'API, usala
    if (pricingConfig) {
      const planData = pricingConfig.plans?.[plan?.toLowerCase()];
      if (planData && planData.price_display) {
        return planData.price_display;
      }
    }

    // Nessun fallback hardcoded - se l'API fallisce, non mostrare prezzo
    return 'N/A';
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleCancelSubscription = async () => {
    const result = await Swal.fire({
      title: 'Cancella Abbonamento',
      text: 'Sei sicuro di voler cancellare il tuo abbonamento? La cancellazione avrà effetto alla fine del periodo di fatturazione corrente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sì, cancella',
      cancelButtonText: 'Annulla',
      background: '#ffffff',
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold',
        content: 'text-sm text-gray-600',
        confirmButton: 'rounded-xl px-6 py-3 font-medium',
        cancelButton: 'rounded-xl px-6 py-3 font-medium'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      await onCancelSubscription();
      
      Swal.fire({
        title: 'Abbonamento Cancellato',
        text: 'Il tuo abbonamento è stato cancellato. Rimarrà attivo fino alla fine del periodo corrente.',
        icon: 'success',
        confirmButtonColor: '#5399d9',
        confirmButtonText: 'OK',
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Errore',
        text: error.message || 'Errore nella cancellazione dell\'abbonamento',
        icon: 'error',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'OK',
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const usagePercentage = getUsagePercentage();
  const remainingDays = getRemainingDays();
  const isExpired = remainingDays === 0;

  return (
    <div className="space-y-8">
      {/* Piano Attuale */}
      <SectionCard
        title="Piano Attuale"
        description="Dettagli del tuo abbonamento corrente"
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Tipo di piano</span>
              {getPlanBadge(user.subscription_plan)}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Stato</span>
              {getSubscriptionStatusBadge(user.subscription_status)}
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Prezzo mensile</span>
              <span className="font-medium text-lg">{getPlanPrice(user.subscription_plan)}/mese</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Data inizio</span>
              <span className="font-medium">{formatDate(user.created_at)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Data scadenza</span>
              <span className="font-medium">{formatDate(user.expires_at)}</span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-neutral-100">
              <span className="text-soft">Giorni rimanenti</span>
              <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                {remainingDays} {remainingDays === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Utilizzo e Limiti */}
      <SectionCard
        title="Utilizzo e Limiti"
        description="Monitoraggio del consumo API"
        icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      >
        <div className="space-y-6">
          {/* Usage Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-soft">Analisi utilizzate</span>
              <span className="font-medium">{user.api_calls_used || 0} / {user.api_calls_limit || 0}</span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  usagePercentage >= 90 ? 'bg-red-500' :
                  usagePercentage >= 70 ? 'bg-yellow-500' :
                  ''
                }`}
                style={{ 
                  width: `${Math.min(usagePercentage, 100)}%`,
                  backgroundColor: usagePercentage < 70 ? '#5399d9' : undefined
                }}
              ></div>
            </div>
            <p className="text-xs text-soft mt-1">
              {usagePercentage >= 90 ? 'Limite quasi raggiunto - Considera un upgrade' :
               usagePercentage >= 70 ? 'Uso intensivo - Monitora il consumo' :
               'Uso normale'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
              <p className="text-sm text-soft mb-1">Utilizzate</p>
              <p className="text-2xl font-bold text-neutral-900">{user.api_calls_used || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
              <p className="text-sm text-soft mb-1">Disponibili</p>
              <p className="text-2xl font-bold text-medical-600">{(user.api_calls_limit || 0) - (user.api_calls_used || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
              <p className="text-sm text-soft mb-1">Limite totale</p>
              <p className="text-2xl font-bold text-neutral-900">{user.api_calls_limit || 0}</p>
            </div>
          </div>

          {user.custom_api_limit && (
            <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
              <h4 className="font-medium text-accent-800 mb-1">Limite Personalizzato</h4>
              <p className="text-sm text-accent-700">
                Hai un limite personalizzato di {user.custom_api_limit} analisi
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Fatturazione */}
      <SectionCard
        title="Fatturazione"
        description="Informazioni sui pagamenti e fatture"
        icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
      >
        <div className="space-y-4">
          {user.stripe_customer_id || user.paypal_customer_id ? (
            <>
              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <span className="text-soft">Customer ID</span>
                <span className="font-mono text-xs text-neutral-600">{user.stripe_customer_id}</span>
              </div>

              {user.stripe_subscription_id && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-soft">Subscription ID</span>
                  <span className="font-mono text-xs text-neutral-600">{user.stripe_subscription_id}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                <span className="text-soft">Metodo di pagamento</span>
                <span className="text-neutral-900">
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Carta configurata
                </span>
              </div>

              {user.subscription_plan !== 'trial' && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                  <span className="text-soft">Prossima fatturazione</span>
                  <span className="font-medium">{formatDate(user.expires_at)}</span>
                </div>
              )}

              {user.paypal_customer_id && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                    <span className="text-soft">PayPal Customer ID</span>
                    <span className="font-mono text-xs text-neutral-600">{user.paypal_customer_id}</span>
                  </div>
                  {user.paypal_subscription_id && (
                    <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                      <span className="text-soft">PayPal Subscription ID</span>
                      <span className="font-mono text-xs text-neutral-600">{user.paypal_subscription_id}</span>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="bg-neutral-50 rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
              <svg className="w-8 h-8 text-neutral-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-sm text-neutral-600 mb-2">Nessun metodo di pagamento configurato</p>
              <p className="text-xs text-neutral-500">Configura un piano a pagamento per aggiungere un metodo di pagamento</p>
            </div>
          )}

          {user.password_reset_expires && new Date(user.password_reset_expires) > new Date() && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h4 className="font-medium text-orange-800 mb-1">⏰ Reset Password Attivo</h4>
              <p className="text-sm text-orange-700">
                Token di reset password valido fino al {formatDate(user.password_reset_expires)}
              </p>
            </div>
          )}

          <div className="border-t border-neutral-200 pt-4">
            <button
              className="btn-ghost text-sm w-full flex justify-center items-center text-neutral-400"
              disabled
            >
              <svg className="w-4 h-4 mr-2 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Scarica Fatture (Prossimamente)
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Statistiche Account */}
      <SectionCard
        title="Statistiche Account"
        description="Informazioni sull'utilizzo del tuo account"
        icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
            <p className="text-sm text-soft mb-1">Giorni di utilizzo</p>
            <p className="text-2xl font-bold text-neutral-900">
              {Math.floor((Date.now() - new Date(user.created_at)) / (1000*60*60*24))}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
            <p className="text-sm text-soft mb-1">Tentativi falliti</p>
            <p className={`text-2xl font-bold ${
              (user.failed_login_attempts || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {user.failed_login_attempts || 0}
            </p>
          </div>
          {user.seats_limit && user.seats_limit > 1 && (
            <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 0 8px rgba(83, 153, 217, 0.3)' }}>
              <p className="text-sm text-soft mb-1">Postazioni</p>
              <p className="text-2xl font-bold text-blue-600">
                {user.seats_limit}
              </p>
            </div>
          )}
        </div>

        {/* Sezione info aggiuntive per B2B */}
        {user.account_type === 'b2b' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 mb-2">📊 Informazioni B2B</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {user.is_primary_account ? (
                <div className="text-blue-700">
                  ✓ Account principale dell'organizzazione
                </div>
              ) : (
                <div className="text-blue-700">
                  ↳ Sub-account collegato all'ID #{user.parent_account_id}
                </div>
              )}
              {user.username && (
                <div className="text-blue-700">
                  🔐 Login: {user.username}
                </div>
              )}
              {user.lead_source && (
                <div className="text-blue-700">
                  📍 Fonte lead: {user.lead_source}
                </div>
              )}
              {user.contract_start_date && (
                <div className="text-blue-700">
                  📅 Inizio contratto: {formatDate(user.contract_start_date)}
                </div>
              )}
              {user.contract_end_date && (
                <div className="text-blue-700">
                  📅 Fine contratto: {formatDate(user.contract_end_date)}
                </div>
              )}
              {user.annual_contract_value && (
                <div className="text-blue-700">
                  💰 Valore annuale: €{user.annual_contract_value.toLocaleString('it-IT')}
                </div>
              )}
              {user.customer_segment && (
                <div className="text-blue-700">
                  🏢 Segmento: {user.customer_segment}
                </div>
              )}
              {user.industry && (
                <div className="text-blue-700">
                  🏭 Settore: {user.industry}
                </div>
              )}
              {user.company_size && (
                <div className="text-blue-700">
                  👥 Dipendenti: {user.company_size}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Azioni Piano */}
      <SectionCard
        title="Gestione Abbonamento"
        description="Modifica o cancella il tuo abbonamento"
        icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      >
        <div className="space-y-4">
          {/* Pulsanti per tutti i tipi di piano */}
          <div className="space-y-4">
            {user.subscription_plan === 'trial' && (
              <div className="bg-gradient-to-r from-medical-50 to-medical-100 rounded-xl p-6 border border-medical-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-medical-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h5 className="font-semibold text-medical-800 mb-2">Upgrade Disponibile</h5>
                    <p className="text-sm text-medical-700 mb-4">
                      Sblocca il pieno potenziale di RefertoSicuro con un piano a pagamento.
                      Ottieni più analisi e funzionalità avanzate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pulsanti sempre visibili */}
            <div className="flex gap-4">
              <button
                onClick={handleUpgrade}
                className="flex items-center justify-center py-3 px-6 text-sm font-medium rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: '#5399d9',
                  color: 'white',
                  border: 'none',
                  margin: '0 auto'
                }}
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {user.subscription_plan === 'trial' ? 'Visualizza Piani' : 'Modifica Piano'}
              </button>

              {(user.subscription_plan === 'basic' || user.subscription_plan === 'pro') && (
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 flex items-center justify-center py-3 px-6 text-sm font-medium rounded-2xl transition-all duration-200"
                  style={{
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none'
                  }}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {loading ? 'Cancellando...' : 'Cancella Abbonamento'}
                </button>
              )}
            </div>
          </div>

          {user.subscription_status === 'cancelled' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h4 className="font-medium text-yellow-800 mb-1">Abbonamento Cancellato</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Il tuo abbonamento è stato cancellato e scadrà il {formatDate(user.expires_at)}
              </p>
              <button
                onClick={handleUpgrade}
                className="btn-primary text-sm"
              >
                Riattiva Abbonamento
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default SubscriptionTab;