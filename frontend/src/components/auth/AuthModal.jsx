import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthModal = ({ isOpen, onClose, initialMode = 'login', verificationData = null }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [isExpanded, setIsExpanded] = useState(false); // Track modal expansion

  // Update mode when initialMode changes (e.g., from email verification link)
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setIsExpanded(false); // Reset expansion when switching modes
  };

  const handleSuccess = () => {
    onClose();
  };

  const handleExpansionChange = (shouldExpand) => {
    setIsExpanded(shouldExpand);
  };

  return (
    <div className="auth-modal-overlay">
      <div className={`auth-modal-content ${isExpanded ? 'expanded' : ''}`}>
        <button className="auth-modal-close" onClick={onClose}>
          ×
        </button>

        <div className="auth-modal-body">
          {mode === 'login' ? (
            <LoginForm
              onToggleMode={handleToggleMode}
              onSuccess={handleSuccess}
            />
          ) : (
            <RegisterForm
              onToggleMode={handleToggleMode}
              onSuccess={handleSuccess}
              verificationDataProp={verificationData}
              onExpansionChange={handleExpansionChange}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;