import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';

/**
 * Global Authentication Modal
 *
 * This component wraps AuthModal and connects it to the global auth state.
 * It should be rendered once at the app root level to handle authentication
 * modals triggered from anywhere in the app (e.g., API 401 errors).
 */
const GlobalAuthModal = () => {
  const {
    showAuthModal,
    authModalMode,
    authModalVerificationData,
    closeAuthModal
  } = useAuth();

  return (
    <AuthModal
      isOpen={showAuthModal}
      onClose={closeAuthModal}
      initialMode={authModalMode}
      verificationData={authModalVerificationData}
    />
  );
};

export default GlobalAuthModal;
