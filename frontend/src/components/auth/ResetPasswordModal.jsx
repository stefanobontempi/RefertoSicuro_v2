import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';

const ResetPasswordModal = ({ isOpen, onClose, token }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Validate token on mount
  useEffect(() => {
    if (isOpen && !token) {
      setError('Link di reset non valido. Richiedi un nuovo link.');
    }
  }, [isOpen, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('Tutti i campi sono obbligatori');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (newPassword.length < 8) {
      setError('La password deve essere di almeno 8 caratteri');
      return;
    }

    if (!token) {
      setError('Token non valido. Richiedi un nuovo link di reset.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data.detail === 'object' && data.detail.errors) {
          setError(data.detail.errors.join(', '));
        } else {
          setError(data.detail || 'Errore durante il reset della password');
        }
        return;
      }

      setSuccess('Password aggiornata con successo! Ora puoi effettuare il login.');
      setNewPassword('');
      setConfirmPassword('');

      // Close modal after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err) {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-content">
        <button className="auth-modal-close" onClick={handleClose}>
          ×
        </button>

        <div className="auth-modal-body">
          <div className="auth-form">
            {/* Header */}
            <div className="auth-header">
              <h2>Reimposta Password</h2>
              <p>Inserisci la tua nuova password per completare il reset</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form-container">
              {/* Error Message */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="success-message">
                  {success}
                </div>
              )}

              {!success && (
                <>
                  {/* New Password Input */}
                  <div className="form-group">
                    <label htmlFor="newPassword">Nuova Password</label>
                    <div className="password-input-container">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Inserisci la nuova password"
                        disabled={isSubmitting || !token}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        <Icon icon={showNewPassword ? 'mdi:eye-off' : 'mdi:eye'} className="h-5 w-5" />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      Minimo 8 caratteri
                    </p>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Conferma Password</label>
                    <div className="password-input-container">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Conferma la nuova password"
                        disabled={isSubmitting || !token}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Icon icon={showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="auth-button primary"
                    disabled={isSubmitting || !token}
                  >
                    {isSubmitting ? 'Salvataggio...' : 'Reimposta Password'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
