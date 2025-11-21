import React, { useState, useRef, useEffect } from 'react';

const ReportInput = ({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  isCompact = false,
  placeholder = "Inserisci qui il tuo referto medico...",
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && !isCompact) {
      // Auto-resize textarea
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value, isCompact]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !loading && !disabled) {
        onSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (value.trim() && !loading && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`
        transition-all duration-500 ease-out
        ${isCompact ? 'transform -translate-y-2' : ''}
      `}>
        <div className={`
          relative
          ${isCompact ? 'card-compact' : 'card-hero'}
          ${isFocused ? 'ring-2 ring-medical-200 shadow-large' : ''}
          transition-all duration-300
        `}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled || loading}
              rows={isCompact ? 4 : 8}
              className={`
                textarea-primary
                ${isCompact ? 'text-sm' : 'text-base lg:text-lg'}
                ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
                resize-none
                transition-all duration-200
              `}
              style={{
                minHeight: isCompact ? '100px' : '200px',
                maxHeight: isCompact ? '200px' : '400px'
              }}
            />

            {/* Character counter */}
            <div className={`
              absolute bottom-3 right-3 text-xs text-neutral-400
              ${isCompact ? 'hidden' : ''}
            `}>
              {value.length} caratteri
            </div>
          </div>

          {/* Action buttons */}
          <div className={`
            flex items-center justify-between mt-6
            ${isCompact ? 'mt-4' : ''}
          `}>
            <div className="flex items-center space-x-3">
              {/* Shortcuts hint */}
              <div className={`
                text-xs text-neutral-400
                ${isCompact ? 'hidden' : ''}
              `}>
                <kbd className="px-2 py-1 bg-neutral-100 rounded text-neutral-600">
                  ⌘ + Enter
                </kbd>
                <span className="ml-1">per inviare</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Loading indicator */}
              {loading && (
                <div className="flex items-center space-x-2 text-medical-600">
                  <div className="animate-spin w-4 h-4 border-2 border-medical-300 border-t-medical-600 rounded-full"></div>
                  <span className="text-sm font-medium">Elaborazione...</span>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || loading || disabled}
                className={`
                  btn-primary
                  ${isCompact ? 'py-2 px-4 text-sm' : 'py-4 px-8 text-lg'}
                  ${!value.trim() || loading || disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95'
                  }
                  transition-all duration-200
                `}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div>
                    <span>Elaborazione...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Migliora con AI</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Example button for empty state */}
      {!value.trim() && !isCompact && (
        <div className="mt-6 text-center animate-fade-in">
          <button
            onClick={() => onChange(`REFERTO MEDICO

Paziente: Mario Rossi
Data di nascita: 15/03/1980
Codice fiscale: RSSMRA80C15H501Z
Data referto: ${new Date().toLocaleDateString('it-IT')}

ANAMNESI:
Paziente si presenta per controllo post-operatorio a seguito di appendicectomia laparoscopica eseguita 7 giorni fa.

ESAME OBIETTIVO:
Addome trattabile, ferite chirurgiche in buone condizioni, assenza di segni di infezione.

DIAGNOSI:
Controllo post-operatorio regolare dopo appendicectomia.

TERAPIA:
Continuare terapia antibiotica per altri 3 giorni.
Controllo fra una settimana.

Dott. Giovanni Bianchi
Chirurgo`)}
            disabled={loading || disabled}
            className="btn-secondary text-sm"
          >
            📋 Carica referto di esempio
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportInput;