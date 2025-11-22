import React, { useState, useEffect, useRef } from 'react';
import SectionCard from '../profile/SectionCard';
import API_BASE_URL from '../../config/api.js';

const Tab2 = ({ user }) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isOverFooter, setIsOverFooter] = useState(false);
  const buttonRef = useRef(null);
  const [activeHelpTab, setActiveHelpTab] = useState('instructions'); // 'instructions' or 'feedback'
  const [feedbackCategory, setFeedbackCategory] = useState('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showHelpModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showHelpModal]);

  // Check if button is over footer
  useEffect(() => {
    const checkFooterOverlap = () => {
      const button = buttonRef.current;
      const footer = document.querySelector('footer');

      if (!button || !footer) return;

      const buttonRect = button.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();

      // Check if button overlaps with footer
      const isOverlapping = buttonRect.bottom > footerRect.top &&
                           buttonRect.top < footerRect.bottom;

      setIsOverFooter(isOverlapping);
    };

    // Check on scroll and resize
    window.addEventListener('scroll', checkFooterOverlap);
    window.addEventListener('resize', checkFooterOverlap);
    checkFooterOverlap(); // Initial check

    return () => {
      window.removeEventListener('scroll', checkFooterOverlap);
      window.removeEventListener('resize', checkFooterOverlap);
    };
  }, []);

  return (
    <>
      <div className="space-y-6 mt-6">
        <SectionCard title="Template di Output">
          <div className="space-y-6">
            {/* Placeholder content */}
            <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <p className="text-sm text-neutral-600">
                Questa sezione è in sviluppo. Presto potrai gestire i template di output qui.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Help Button Fixed */}
      <button
        ref={buttonRef}
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50 backdrop-blur-md"
        style={{
          backgroundColor: isOverFooter ? 'white' : 'rgba(83, 153, 217, 0.9)'
        }}
      >
        <svg
          className="w-7 h-7 transition-colors duration-200"
          style={{ color: isOverFooter ? '#5399d9' : 'white' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Help Chat Widget */}
      {showHelpModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
            onClick={() => setShowHelpModal(false)}
          />

          {/* Chat Widget */}
          <div
            className="fixed bottom-24 right-6 bg-white rounded-2xl z-[10001] w-[90vw] sm:w-96 shadow-xl"
            style={{
              animation: 'slideUpFadeIn 0.3s ease-out',
              maxHeight: 'calc(100vh - 200px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200" style={{ backgroundColor: '#5399d9' }}>
              <h4 className="text-lg font-semibold" style={{ color: 'white' }}>
                Aiuto e Feedback
              </h4>
              <button
                onClick={() => {
                  setShowHelpModal(false);
                  setActiveHelpTab('instructions');
                  setFeedbackSuccess(false);
                  setFeedbackMessage('');
                }}
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
                onClick={() => setActiveHelpTab('instructions')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeHelpTab === 'instructions'
                    ? 'border-b-2 text-medical-600'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
                style={{
                  borderBottomColor: activeHelpTab === 'instructions' ? '#5399d9' : 'transparent'
                }}
              >
                Come funziona
              </button>
              <button
                onClick={() => setActiveHelpTab('feedback')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeHelpTab === 'feedback'
                    ? 'border-b-2 text-medical-600'
                    : 'text-neutral-600 hover:text-neutral-800'
                }`}
                style={{
                  borderBottomColor: activeHelpTab === 'feedback' ? '#5399d9' : 'transparent'
                }}
              >
                Invia Feedback
              </button>
            </div>

            {/* Content */}
            <div className="p-6 text-sm text-neutral-700 overflow-y-auto specialty-scroll" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {activeHelpTab === 'instructions' ? (
                <div className="space-y-3">
                  <p>
                    I template di output ti permettono di personalizzare il formato e lo stile dei referti
                    generati dall'intelligenza artificiale.
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Definisci la struttura dei referti per ogni specialità medica;</li>
                    <li>Personalizza sezioni, intestazioni e layout del documento;</li>
                    <li>Imposta formattazione e stile per il testo generato;</li>
                    <li>Salva template riutilizzabili per ogni tipo di referto.</li>
                  </ul>
                  <p className="text-xs text-neutral-500 italic mt-4">
                    Funzionalità in sviluppo - disponibile presto!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">Feedback Inviato!</h3>
                      <p className="text-neutral-600">
                        Grazie per il tuo feedback. Il nostro team lo esaminerà al più presto.
                      </p>
                      <button
                        onClick={() => {
                          setFeedbackSuccess(false);
                          setFeedbackMessage('');
                          setFeedbackCategory('bug');
                        }}
                        className="mt-6 px-6 py-2 rounded-lg font-medium transition-colors"
                        style={{ backgroundColor: '#5399d9', color: 'white' }}
                      >
                        Invia Altro Feedback
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-orange-800">
                          <strong>Hai avuto un problema?</strong><br />
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
                          <option value="bug">🐛 Segnala un Bug</option>
                          <option value="feature_request">💡 Suggerisci una Funzionalità</option>
                          <option value="question">❓ Fai una Domanda</option>
                          <option value="other">📝 Altro</option>
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
                        onClick={async () => {
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
                                page_context: 'Template Output (/template-out)'
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
                        }}
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
      )}
    </>
  );
};

export default Tab2;
