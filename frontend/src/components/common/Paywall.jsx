import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Paywall Component
 *
 * Shows a blocking overlay for users with expired trials or inactive subscriptions.
 * For trial users within trial period, shows a dismissible banner.
 * For expired trials or inactive subscriptions, shows a blocking modal.
 *
 * @param {Object} user - Current user object with subscription info
 * @param {boolean} canDismiss - Whether the paywall can be dismissed (trial still active)
 * @param {Function} onDismiss - Callback when user dismisses the paywall (trial users only)
 */
const Paywall = ({ user, canDismiss = false, onDismiss }) => {
  const navigate = useNavigate();

  if (!user) return null;

  // Check subscription status
  const isTrialUser = user.subscription_plan === 'trial';
  const isExpired = user.expires_at && new Date(user.expires_at) < new Date();
  const isInactive = user.subscription_status !== 'active';

  // Don't show paywall for active paid subscriptions
  if (!isTrialUser && !isInactive && !isExpired) {
    return null;
  }

  // Calculate days remaining for trial users
  let daysRemaining = 0;
  if (isTrialUser && user.expires_at) {
    const now = new Date();
    const expiryDate = new Date(user.expires_at);
    const diffTime = expiryDate - now;
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Determine if paywall should block (not dismissible)
  const shouldBlock = isExpired || isInactive || (isTrialUser && daysRemaining <= 0);
  const actuallyCanDismiss = !shouldBlock && canDismiss;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  const handleDismiss = () => {
    if (actuallyCanDismiss && onDismiss) {
      onDismiss();
    }
  };

  // Trial overlay (dismissible) for active trial users
  if (isTrialUser && !shouldBlock && actuallyCanDismiss) {
    return (
      <>
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
          style={{
            animation: 'fadeIn 0.3s ease-out'
          }}
          onClick={handleDismiss}
        />

        {/* Centered Modal */}
        <div
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl z-[10001] w-[90vw] max-w-lg overflow-hidden"
          style={{
            boxShadow: '0 0 20px #5399d9',
            animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 hover:text-neutral-800 z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-6 pr-8">
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                Periodo di Prova
              </h3>
              <p className="text-sm text-neutral-600">
                {daysRemaining > 0
                  ? `Hai ancora ${daysRemaining} ${daysRemaining === 1 ? 'giorno' : 'giorni'} di prova gratuita`
                  : 'Il tuo periodo di prova sta per scadere'}
              </p>
            </div>

            {/* Content */}
            <div className="mb-6 text-center">
              <p className="text-neutral-600 mb-4">
                Passa a un piano premium per continuare a utilizzare tutte le funzionalità di RefertoSicuro senza interruzioni.
              </p>

              {/* Call to action */}
              <button
                onClick={handleUpgrade}
                className="py-3 px-6 text-sm font-medium rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: '#5399d9',
                  color: 'white',
                  border: 'none',
                  width: 'fit-content',
                  margin: '0 auto'
                }}
              >
                Scopri i Piani Premium
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Blocking paywall modal for expired/inactive subscriptions
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[10000]"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      />

      {/* Centered Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl z-[10001] w-[90vw] max-w-lg overflow-hidden"
        style={{
          boxShadow: '0 0 20px #5399d9',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              {isTrialUser ? 'Periodo di Prova Scaduto' : 'Abbonamento Scaduto'}
            </h3>
            <p className="text-sm text-neutral-600">
              {isTrialUser
                ? 'Il tuo periodo di prova gratuito è terminato.'
                : 'Il tuo abbonamento è scaduto o non attivo.'}
            </p>
          </div>

          {/* Content */}
          <div className="mb-6 text-center">
            <p className="text-neutral-600 mb-4">
              Per continuare a utilizzare Referto Sicuro e validare i tuoi referti medici, passa a un piano premium.
            </p>

            {/* Features list */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'rgba(83, 153, 217, 0.05)' }}>
              <h4 className="font-semibold text-neutral-800 mb-3 text-sm">Con un piano premium avrai:</h4>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 text-sm">Validazione dei referti medici con AI</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 text-sm">Accesso a specialità mediche avanzate</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 text-sm">Supporto e assistenza dedicati</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-neutral-700 text-sm">Aggiornamenti automatici e nuove funzionalità</span>
                </li>
              </ul>
            </div>

            {/* Call to action */}
            <button
              onClick={handleUpgrade}
              className="py-3 px-6 text-sm font-medium rounded-2xl transition-all duration-200"
              style={{
                backgroundColor: '#5399d9',
                color: 'white',
                border: 'none',
                width: 'fit-content',
                margin: '0 auto'
              }}
            >
              Scopri i Nostri Piani
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-neutral-200">
            <p className="text-xs text-neutral-600">
              Hai domande? <a href="mailto:support@refertosicuro.it" className="hover:underline font-medium" style={{ color: '#5399d9' }}>Contattaci</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Paywall;
