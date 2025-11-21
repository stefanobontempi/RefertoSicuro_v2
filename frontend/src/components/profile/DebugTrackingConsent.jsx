import React, { useState, useEffect } from 'react';
import api from '../../services/api';

/**
 * Debug Tracking Consent Component
 *
 * Allows users to enable/disable debug tracking (GDPR-compliant)
 * - Explains what data is collected
 * - Shows retention period (30 days max)
 * - Allows one-click enable/disable
 * - Deletes all data on disable (GDPR right to erasure)
 */
const DebugTrackingConsent = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load current status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users/debug-tracking/status');
      setStatus(response.data);
    } catch (err) {
      setError('Impossibile caricare lo stato del tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setActionLoading(true);
      setError(null);

      if (status?.enabled) {
        // Disable tracking
        const response = await api.post('/users/debug-tracking/disable');
        alert(`Debug tracking disabilitato.\n${response.data.deleted_records} record eliminati.`);
      } else {
        // Enable tracking
        const response = await api.post('/users/debug-tracking/enable');
        alert(`Debug tracking abilitato.\nDati conservati per max ${response.data.retention_days} giorni.`);
      }

      // Reload status
      await loadStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Operazione fallita');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="liquidGlass-wrapper" style={{borderRadius: '1rem', padding: '1.5rem'}}>
        <div className="liquidGlass-effect"></div>
        <div className="liquidGlass-tint"></div>
        <div className="liquidGlass-shine"></div>
        <div className="relative" style={{zIndex: 20}}>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="liquidGlass-wrapper" style={{borderRadius: '1rem', padding: '1.5rem'}}>
      {/* Liquid Glass Effect Layers */}
      <div className="liquidGlass-effect"></div>
      <div className="liquidGlass-tint"></div>
      <div className="liquidGlass-shine"></div>

      {/* Section Content */}
      <div className="relative" style={{zIndex: 20}}>
        {/* Header */}
        <div className="pb-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start min-w-0 flex-1">
              {/* Icona Alert Gialla */}
              <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Debug Tracking (Supporto Tecnico)
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Aiutaci a risolvere eventuali problemi tecnici
                </p>
              </div>
            </div>
            <div className={`self-start sm:self-auto px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
              status?.enabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {status?.enabled ? 'Attivo' : 'Disattivo'}
            </div>
          </div>
        </div>

      {/* Content */}
      <div className="pt-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Status Info */}
        {status?.enabled && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4">
            <h4 className="text-sm font-medium mb-2" style={{ color: '#5399d9' }}>
              Informazioni Tracking Attivo
            </h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Retention:</strong> Max {status.retention_days} giorni</p>
              <p>• <strong>Attivato:</strong> {status.enabled_at ? new Date(status.enabled_at).toLocaleDateString('it-IT') : 'N/A'}</p>
              <p>• <strong>Motivo:</strong> {status.tracking_reason === 'user_debug' ? 'Debug utente' : status.tracking_reason}</p>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: '#5399d9' }}
          >
            <span className="mr-2">{showDetails ? '▼' : '▶'}</span>
            Cosa viene tracciato?
          </button>

          {showDetails && (
            <div className="ml-6 space-y-2 text-sm text-gray-600">
              <p className="flex items-center">
                <svg className="w-4 h-4 mr-2" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <strong>Quando è attivo:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Testi dei referti inviati e migliorati</li>
                <li>Risposte generate dall'AI</li>
                <li>Tempi di elaborazione e token utilizzati</li>
                <li>Eventuali errori o problemi tecnici</li>
              </ul>

              <p className="mt-3 flex items-center">
                <svg className="w-4 h-4 mr-2" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <strong>Garanzie GDPR:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Dati conservati max 30 giorni</li>
                <li>Cancellazione automatica dopo retention period</li>
                <li>Cancellazione immediata se disattivi il tracking</li>
                <li>Usati SOLO per supporto tecnico e debug</li>
              </ul>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className="pt-4">
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-medium text-white transition-all duration-200 ${
              actionLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              backgroundColor: '#5399d9',
              margin: '0 auto'
            }}
          >
            {actionLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                <span>Elaborazione...</span>
              </>
            ) : status?.enabled ? (
              'Disattiva Debug Tracking (Elimina Dati)'
            ) : (
              'Attiva Debug Tracking (Acconsento)'
            )}
          </button>

          {!status?.enabled && (
            <p className="mt-2 text-xs text-center text-gray-500">
              Attivando accetti che i tuoi dati siano conservati per max 30 giorni per supporto tecnico
            </p>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default DebugTrackingConsent;
