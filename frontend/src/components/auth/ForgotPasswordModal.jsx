import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';

const ForgotPasswordModal = ({ isOpen, onClose }) => {

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email) {
      setError('Inserisci il tuo indirizzo email');
      return;
    }

    if (!email.includes('@')) {
      setError('Inserisci un indirizzo email valido');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError('Troppi tentativi. Riprova tra un\'ora.');
        } else {
          setError(data.detail || 'Errore durante l\'invio della richiesta');
        }
        return;
      }

      setSuccess('Se l\'email esiste nel sistema, riceverai le istruzioni per il reset.');
      setEmail('');

      // Close modal after 3 seconds
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 3000);

    } catch (err) {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={handleClose}
      />

      {/* Centered Modal */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl z-[10001] w-[90vw] max-w-md overflow-hidden"
        style={{
          boxShadow: '0 0 20px #5399d9',
          animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 hover:text-neutral-800 z-10"
        >
          <Icon icon="mdi:close" className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6 pr-8">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">
              Password Dimenticata
            </h3>
            <p className="text-sm text-neutral-600">
              Inserisci il tuo indirizzo email e ti invieremo un link per reimpostare la password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <Icon icon="mdi:alert-circle" className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                <p className="text-sm" style={{ color: '#991b1b' }}>{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                <Icon icon="mdi:check-circle" className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
                <p className="text-sm" style={{ color: '#15803d' }}>{success}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Indirizzo Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-neutral-300 rounded-2xl transition-all duration-200"
                placeholder="inserisci la tua email"
                disabled={isSubmitting}
                style={{
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#5399d9';
                  e.target.style.boxShadow = '0 0 0 3px rgba(83, 153, 217, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d4d4d4';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 rounded-2xl transition-all duration-200"
                style={{
                  border: '1px solid #d4d4d4',
                  color: '#525252',
                  backgroundColor: 'white'
                }}
                disabled={isSubmitting}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: isSubmitting ? '#9ca3af' : '#5399d9',
                  color: 'white',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Invio...' : 'Invia Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordModal;
