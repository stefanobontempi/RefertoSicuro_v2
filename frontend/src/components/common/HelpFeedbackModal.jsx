import React, { useState } from 'react';
import API_BASE_URL from '../../config/api.js';

const HelpFeedbackModal = ({ isOpen, onClose, pageContext, instructionsContent }) => {
  const [activeTab, setActiveTab] = useState('instructions');
  const [feedbackCategory, setFeedbackCategory] = useState('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmitFeedback = async () => {
    if (feedbackMessage.length < 10) {
      alert('Il messaggio deve contenere almeno 10 caratteri');
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/help-feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: feedbackCategory,
          message: feedbackMessage,
          page_context: pageContext
        })
      });

      if (response.ok) {
        setFeedbackSuccess(true);
      } else {
        const error = await response.json();
        alert(error.detail || 'Errore durante l\'invio del feedback');
      }
    } catch (error) {
      alert('Errore di connessione. Riprova più tardi.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleClose = () => {
    setActiveTab('instructions');
    setFeedbackSuccess(false);
    setFeedbackMessage('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
        onClick={handleClose}
        style={{ marginTop: 0 }}
      />

      {/* Modal */}
      <div
        className="fixed bottom-24 right-6 bg-white rounded-2xl z-[10001] w-[90vw] sm:w-96 shadow-xl"
        style={{
          animation: 'slideUpFadeIn 0.3s ease-out',
          maxHeight: 'calc(100vh - 200px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200" style={{ backgroundColor: '#5399d9' }}>
          <h4 className="text-lg font-semibold" style={{ color: 'white' }}>
            Aiuto e Feedback
          </h4>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'instructions'
                ? 'border-b-2 text-medical-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
            style={{
              borderBottomColor: activeTab === 'instructions' ? '#5399d9' : 'transparent'
            }}
          >
            Come funziona
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'feedback'
                ? 'border-b-2 text-medical-600'
                : 'text-neutral-600 hover:text-neutral-800'
            }`}
            style={{
              borderBottomColor: activeTab === 'feedback' ? '#5399d9' : 'transparent'
            }}
          >
            Invia Feedback
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-sm text-neutral-700 overflow-y-auto specialty-scroll" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          {activeTab === 'instructions' ? (
            <div className="space-y-3">
              {instructionsContent}
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(83, 153, 217, 0.1)' }}>
                    <svg className="w-8 h-8" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#5399d9' }}>Feedback Inviato!</h3>
                  <p className="text-neutral-600">
                    Grazie per il tuo feedback. Il nostro team lo esaminerà al più presto.
                  </p>
                  <button
                    onClick={() => {
                      setFeedbackSuccess(false);
                      setFeedbackMessage('');
                      setFeedbackCategory('bug');
                    }}
                    className="mt-6 px-6 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#5399d9', color: 'white' }}
                  >
                    Invia Altro Feedback
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-neutral-700">
                      <strong style={{ color: '#5399d9' }}>Hai avuto un problema?</strong><br />
                      Segnalacelo e aiutaci a migliorare!
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Categoria
                    </label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                      disabled={feedbackSubmitting}
                    >
                      <option value="bug">Segnala un Bug</option>
                      <option value="feature_request">Suggerisci una Funzionalità</option>
                      <option value="question">Fai una Domanda</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Messaggio *
                    </label>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Descrivi il problema o condividi il tuo suggerimento..."
                      rows={6}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent resize-none"
                      disabled={feedbackSubmitting}
                      maxLength={2000}
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      {feedbackMessage.length}/2000 caratteri
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitFeedback}
                    disabled={feedbackSubmitting || feedbackMessage.length < 10}
                    className="w-full px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: feedbackSubmitting || feedbackMessage.length < 10 ? '#9ca3af' : '#5399d9',
                      color: 'white'
                    }}
                  >
                    {feedbackSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Invio in corso...
                      </span>
                    ) : (
                      'Invia Feedback'
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default HelpFeedbackModal;
