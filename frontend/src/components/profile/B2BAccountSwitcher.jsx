import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

const B2BAccountSwitcher = () => {
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const { user, completeB2BLogin } = useAuth();

  useEffect(() => {
    // Only show for B2B sub-accounts or B2B masters with sub-accounts
    if (user && user.account_type === 'b2b') {
      loadAvailableAccounts();
    }
  }, [user]);

  const loadAvailableAccounts = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let masterEmail;
      let masterId;

      if (user.is_primary_account) {
        // Current user is master - get their sub-accounts
        masterEmail = user.email;
        masterId = user.id;
      } else {
        // Current user is sub-account - get master and siblings
        // Note: We'd need an endpoint to get master account info
        // For now, we'll use parent_account_id if available
        return; // Skip for now, implement when needed
      }

      // Get sub-accounts using admin endpoint (if user has access)
      // For now, we'll implement a simple version
      const accounts = [
        {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          display_name: user.full_name,
          sub_account_type: user.is_primary_account ? 'master' : user.sub_account_type,
          is_current: true
        }
      ];

      setAvailableAccounts(accounts);
    } catch (error) {
      setError('Errore nel caricamento degli account disponibili');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSwitch = async (targetAccount) => {
    if (targetAccount.is_current) return;

    try {
      setLoading(true);
      setError('');

      // If switching to a sub-account
      if (targetAccount.sub_account_type !== 'master') {
        await authService.loginB2BSubAccount(user.email, targetAccount.id);
      } else {
        // Switching back to master - need a different endpoint
        // For now, just refresh
        window.location.reload();
        return;
      }

      // Complete the login process
      const result = await completeB2BLogin();

      if (result.success) {
        setShowSwitcher(false);
        // Optionally reload the page to refresh all components
        window.location.reload();
      } else {
        setError(result.error || 'Errore durante il cambio account');
      }

    } catch (error) {
      setError(error.message || 'Errore durante il cambio account');
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeLabel = (type) => {
    if (type === 'master') return '👑 Master Account';

    const typeLabels = {
      'medico_specialista': '🩺 Medico Specialista',
      'medico_generico': '👩‍⚕️ Medico Generico',
      'infermiere': '👨‍⚕️ Infermiere',
      'tecnico': '🔧 Tecnico',
      'amministratore': '📋 Amministratore',
      'altro': '👤 Altro'
    };
    return typeLabels[type] || `👤 ${type}`;
  };

  // Don't show if not B2B account or no multiple accounts available
  if (!user || user.account_type !== 'b2b' || availableAccounts.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSwitcher(!showSwitcher)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        disabled={loading}
      >
        <div className="flex items-center gap-2">
          <span className="text-blue-600">🏢</span>
          <span className="text-blue-800 font-medium">
            {user.display_name || user.full_name}
          </span>
        </div>
        <span className="text-blue-600">
          {showSwitcher ? '▲' : '▼'}
        </span>
      </button>

      {showSwitcher && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {error && (
            <div className="p-3 border-b border-red-200 bg-red-50">
              <p className="text-red-700 text-xs">{error}</p>
            </div>
          )}

          <div className="p-2">
            <div className="text-xs text-neutral-500 px-2 py-1 border-b border-neutral-100">
              Cambia Account
            </div>

            {availableAccounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountSwitch(account)}
                disabled={loading || account.is_current}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  account.is_current
                    ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                    : 'hover:bg-neutral-100'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{account.display_name}</div>
                    <div className="text-xs text-neutral-500">{account.email}</div>
                  </div>
                  <div className="text-xs">
                    {getAccountTypeLabel(account.sub_account_type)}
                    {account.is_current && <span className="ml-2 text-blue-600">✓</span>}
                  </div>
                </div>
              </button>
            ))}

            {loading && (
              <div className="flex items-center justify-center p-3 text-sm text-neutral-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Cambio account...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-neutral-500">
        💡 Puoi cambiare tra i diversi account B2B assegnati alla tua organizzazione
      </div>
    </div>
  );
};

export default B2BAccountSwitcher;