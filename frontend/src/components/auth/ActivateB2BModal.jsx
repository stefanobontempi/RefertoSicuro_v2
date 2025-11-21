import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import API_BASE_URL from '../../config/api';

const ActivateB2BModal = ({ isOpen, onClose, email, token }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

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
    if (isOpen && (!email || !token)) {
      setError('Link di attivazione non valido. Parametri mancanti.');
    }
  }, [isOpen, email, token]);

  // Password validation
  useEffect(() => {
    if (password) {
      setPasswordValidation({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      });
    } else {
      setPasswordValidation({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      });
    }
  }, [password]);

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(v => v === true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!password || !confirmPassword) {
      setError('Tutti i campi sono obbligatori');
      return;
    }

    if (!isPasswordValid()) {
      setError('La password non rispetta i requisiti di sicurezza');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    if (!email || !token) {
      setError('Dati di attivazione mancanti');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/b2b/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          token: token,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Errore durante l\'attivazione dell\'account');
        return;
      }

      if (data.success) {
        setSuccess('Account B2B attivato con successo! Ora puoi effettuare il login.');
        setPassword('');
        setConfirmPassword('');

        // Close modal after 3 seconds
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setError(data.message || 'Errore durante l\'attivazione');
      }

    } catch (err) {
      setError('Errore di connessione. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
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
              <h2>Attiva Account B2B</h2>
              <p>Imposta la password per attivare il tuo account aziendale</p>
              {email && <p className="text-sm text-gray-600 mt-2">{email}</p>}
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
                  {/* Password Input */}
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-input-container">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Inserisci la password"
                        disabled={isSubmitting || !email || !token}
                      />
                      <button
                        type="button"
                        className="password-toggle-button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'} className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Password Validation */}
                  {password && (
                    <div className="password-validation">
                      <div className={`validation-item ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                        <span className="validation-icon">{passwordValidation.minLength ? '✓' : '✗'}</span>
                        <span className="validation-text">Almeno 8 caratteri</span>
                      </div>
                      <div className={`validation-item ${passwordValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                        <span className="validation-icon">{passwordValidation.hasUppercase ? '✓' : '✗'}</span>
                        <span className="validation-text">Una lettera maiuscola</span>
                      </div>
                      <div className={`validation-item ${passwordValidation.hasLowercase ? 'valid' : 'invalid'}`}>
                        <span className="validation-icon">{passwordValidation.hasLowercase ? '✓' : '✗'}</span>
                        <span className="validation-text">Una lettera minuscola</span>
                      </div>
                      <div className={`validation-item ${passwordValidation.hasNumber ? 'valid' : 'invalid'}`}>
                        <span className="validation-icon">{passwordValidation.hasNumber ? '✓' : '✗'}</span>
                        <span className="validation-text">Un numero</span>
                      </div>
                      <div className={`validation-item ${passwordValidation.hasSpecialChar ? 'valid' : 'invalid'}`}>
                        <span className="validation-icon">{passwordValidation.hasSpecialChar ? '✓' : '✗'}</span>
                        <span className="validation-text">Un carattere speciale</span>
                      </div>
                    </div>
                  )}

                  {/* Confirm Password Input */}
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Conferma Password</label>
                    <div className="password-input-container">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Conferma la password"
                        disabled={isSubmitting || !email || !token}
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

                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div className={`validation-item ${password === confirmPassword ? 'valid' : 'invalid'}`}>
                      <span className="validation-icon">{password === confirmPassword ? '✓' : '✗'}</span>
                      <span className="validation-text">Le password corrispondono</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="auth-button primary"
                    disabled={isSubmitting || !email || !token || !isPasswordValid() || password !== confirmPassword}
                  >
                    {isSubmitting ? 'Attivazione...' : 'Attiva Account'}
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

export default ActivateB2BModal;
