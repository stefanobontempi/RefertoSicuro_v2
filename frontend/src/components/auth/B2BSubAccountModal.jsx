import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

const B2BSubAccountModal = ({ masterEmail, subAccounts, onClose, onSubAccountSelected }) => {
  const [selectedSubAccount, setSelectedSubAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { completeB2BLogin, pendingB2BCredentials } = useAuth();

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleSubAccountSelect = async (subAccount) => {
    if (loading) return;

    // Security check: ensure credentials are available
    if (!pendingB2BCredentials) {
      setError('Sessione scaduta. Effettua nuovamente il login.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Login as the selected sub-account using stored credentials
      // SECURITY: Credentials are stored temporarily in memory (not localStorage)
      // and cleared after use by AuthContext
      await authService.loginB2BSubAccount(
        pendingB2BCredentials.email,
        pendingB2BCredentials.password,
        subAccount.id
      );

      // Complete the login process through auth context
      // This also clears the pending credentials
      const result = await completeB2BLogin();

      if (result.success) {
        // Notify parent component of successful sub-account login
        onSubAccountSelected({ success: true }, subAccount);
      } else {
        setError(result.error || 'Errore durante il completamento del login');
      }

    } catch (error) {
      setError(error.message || 'Errore durante il login del sub-account');
    } finally {
      setLoading(false);
    }
  };

  const getSubAccountTypeLabel = (type) => {
    const typeLabels = {
      'medico_specialista': 'Medico Specialista',
      'medico_generico': 'Medico Generico',
      'infermiere': 'Infermiere',
      'tecnico': 'Tecnico',
      'amministratore': 'Amministratore',
      'altro': 'Altro'
    };
    return typeLabels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto specialty-scroll">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">
              🏢 Seleziona Account
            </h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600"
              disabled={loading}
            >
              ✕
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-neutral-600">
              Il tuo account B2B ha più sub-account configurati. Seleziona quello con cui vuoi accedere:
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {subAccounts.map((subAccount) => (
              <div
                key={subAccount.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedSubAccount?.id === subAccount.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-neutral-200 hover:border-blue-300 hover:bg-blue-50'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !loading && handleSubAccountSelect(subAccount)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-neutral-900">
                      {subAccount.display_name || subAccount.full_name}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {subAccount.email}
                    </p>
                    {subAccount.username && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Username: {subAccount.username}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getSubAccountTypeLabel(subAccount.sub_account_type)}
                    </span>
                  </div>
                </div>

                {loading && selectedSubAccount?.id === subAccount.id && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-blue-600">Accesso in corso...</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <span>Account Master: {masterEmail}</span>
              <button
                onClick={onClose}
                className="text-neutral-600 hover:text-neutral-800"
                disabled={loading}
              >
                Annulla
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 Puoi cambiare sub-account in qualsiasi momento dal menu profilo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default B2BSubAccountModal;