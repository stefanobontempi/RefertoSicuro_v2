import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import B2BSubAccountModal from './B2BSubAccountModal';
import ForgotPasswordModal from './ForgotPasswordModal';

const LoginForm = ({ onToggleMode, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showB2BModal, setShowB2BModal] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [b2bData, setB2BData] = useState(null);

  const { login, isLoading, clearError } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (localError) setLocalError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setLocalError('Compila tutti i campi richiesti');
      return;
    }

    if (!formData.email.includes('@')) {
      setLocalError('Inserisci un indirizzo email valido');
      return;
    }

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Check if B2B sub-account selection is required
        if (result.data && result.data.requiresSubAccountSelection) {
          setB2BData(result.data);
          setShowB2BModal(true);
        } else {
          onSuccess && onSuccess();
        }
      } else {
        // Display error from server (includes rate limiting messages)
        setLocalError(result.error || 'Login fallito. Riprova.');
      }
    } catch (error) {
      setLocalError('Errore durante il login. Riprova.');
    }
  };

  const handleB2BSubAccountSelected = async (tokenData, subAccount) => {
    // Sub-account login successful
    setShowB2BModal(false);
    setB2BData(null);
    onSuccess && onSuccess();
  };

  const handleB2BModalClose = () => {
    setShowB2BModal(false);
    setB2BData(null);
  };

  return (
    <>
      {/* B2B Sub-Account Selection Modal */}
      {showB2BModal && b2bData && (
        <B2BSubAccountModal
          masterEmail={b2bData.masterEmail}
          subAccounts={b2bData.subAccounts}
          onClose={handleB2BModalClose}
          onSubAccountSelected={handleB2BSubAccountSelected}
        />
      )}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    <div className="auth-form">
      <div className="auth-header">
        <h2>Login</h2>
        <p>Inserisci le tue credenziali per accedere</p>
      </div>

      {localError && (
        <div className="error-message">
          {localError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form-container">
        <div className="form-group">
          <label htmlFor="email">Indirizzo Email <span style={{color: 'red'}}>*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="inserisci la tua email"
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password <span style={{color: 'red'}}>*</span></label>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="inserisci la tua password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-button"
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.05 6.05M14.121 14.121l3.829 3.829" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Forgot Password Link */}
        <div className="text-right" style={{ marginTop: '-8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="link-button text-sm"
            style={{ fontSize: '0.875rem', color: '#0066cc' }}
          >
            Password dimenticata?
          </button>
        </div>

        <button
          type="submit"
          className="auth-button primary"
          disabled={isLoading || !formData.email.trim()}
        >
          {isLoading ? 'Accesso in corso...' : 'Accedi'}
        </button>
      </form>

      <div className="auth-toggle">
        <p>
          Non hai un account?{' '}
          <button
            type="button"
            className="link-button"
            onClick={onToggleMode}
          >
            Registrati
          </button>
        </p>
      </div>
    </div>
    </>
  );
};

export default LoginForm;