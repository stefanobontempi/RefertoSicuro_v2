import React, { useState, useEffect } from 'react';
import { consentAPI } from '../../services/api';

const LegalModal = ({ isOpen, onClose, consentType, title }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && consentType) {
      fetchContent();
    }
  }, [isOpen, consentType]);

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

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await consentAPI.getTemplate(consentType);
      setContent(response.data);
    } catch (err) {
      setError('Impossibile caricare il contenuto. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[10000] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="card max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold" style={{ color: '#5399d9' }}>
              {content?.title || title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto specialty-scroll py-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#5399d9' }}></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
                {error}
              </div>
            )}

            {!loading && !error && content && (
              <div className="prose prose-sm max-w-none">
                {content.description && (
                  <p className="text-gray-600 mb-6 text-lg">
                    {content.description}
                  </p>
                )}

                <div
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content.full_text }}
                />

                {content.last_updated && (
                  <p className="text-sm text-gray-500 mt-8 pt-4 border-t border-gray-200">
                    Ultimo aggiornamento: {new Date(content.last_updated).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-medium text-white transition-all duration-200"
              style={{ backgroundColor: '#5399d9' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LegalModal;
