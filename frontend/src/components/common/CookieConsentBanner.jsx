import React, { useState, useEffect } from 'react';

/**
 * Cookie Consent Banner Component
 *
 * Shows a dismissible banner at the bottom of the page informing users about cookie usage.
 * Matches the style of other floating elements (Paywall, Modals).
 *
 * ONLY shown to non-authenticated users (visitors).
 * Authenticated users have already accepted terms & conditions during registration.
 *
 * Stores consent in localStorage (browser-only, no DB tracking for anonymous visitors).
 */
const CookieConsentBanner = ({ onOpenCookiePolicy, isAuthenticated = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Don't show banner to authenticated users (already accepted T&C)
    if (isAuthenticated) {
      setIsVisible(false);
      return;
    }

    // Check if user has already accepted cookies (localStorage only)
    const hasAccepted = localStorage.getItem('cookieConsentAccepted');

    if (!hasAccepted) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleAccept = () => {
    // Store consent in localStorage ONLY (browser-only, no DB)
    // For authenticated users, consent is already tracked in DB via T&C acceptance
    // For anonymous visitors, we only need localStorage to avoid showing banner on refresh
    localStorage.setItem('cookieConsentAccepted', 'true');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());

    // Trigger closing animation
    setIsClosing(true);

    // Remove banner after animation completes
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  const handleViewPolicy = () => {
    if (onOpenCookiePolicy) {
      onOpenCookiePolicy();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-3xl z-[9999] w-[90vw] max-w-2xl overflow-hidden ${
        isClosing ? 'animate-slideDown' : 'animate-slideUp'
      }`}
      style={{
        boxShadow: '0 0 20px rgba(83, 153, 217, 0.3)',
      }}
    >
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Cookie Icon */}
          <div className="flex-shrink-0">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(83, 153, 217, 0.1)' }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: '#5399d9' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-neutral-900 mb-2">
              Utilizzo dei Cookie
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Utilizziamo cookie tecnici essenziali per garantire il corretto funzionamento del servizio.
              Non utilizziamo cookie di tracciamento o marketing.{' '}
              <button
                onClick={handleViewPolicy}
                className="font-medium hover:underline"
                style={{ color: '#5399d9' }}
              >
                Scopri di più
              </button>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleAccept}
              className="py-2.5 px-6 text-sm font-medium rounded-2xl transition-all duration-200 hover:shadow-lg whitespace-nowrap"
              style={{
                backgroundColor: '#5399d9',
                color: 'white',
                border: 'none'
              }}
            >
              Ho Capito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    to {
      opacity: 0;
      transform: translate(-50%, 20px);
    }
  }

  .animate-slideUp {
    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .animate-slideDown {
    animation: slideDown 0.3s ease-out;
  }
`;

// Append style only once
if (!document.querySelector('style[data-cookie-consent-animations]')) {
  style.setAttribute('data-cookie-consent-animations', 'true');
  document.head.appendChild(style);
}

export default CookieConsentBanner;
