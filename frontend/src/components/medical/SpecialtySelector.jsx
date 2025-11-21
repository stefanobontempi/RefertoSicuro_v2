import React, { useState, useEffect } from 'react';
import { specialtiesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SpecialtySelector = ({ value, onChange, disabled = false, className = '' }) => {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadSpecialties();
  }, [isAuthenticated]);

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

  const loadSpecialties = async () => {
    try {
      setLoading(true);
      setError(null);
      let response;

      if (isAuthenticated) {
        response = await specialtiesAPI.getUserSpecialties();
      } else {
        response = await specialtiesAPI.getAll();
      }

      const specialtiesList = response.data.specialties || [];
      setSpecialties(specialtiesList);

      // If no specialties available, show appropriate message
      if (specialtiesList.length === 0) {
        const message = isAuthenticated
          ? 'Nessuna specializzazione disponibile per il tuo piano'
          : 'Nessuna specializzazione al momento disponibile';
        setError(message);
      }

    } catch (err) {
      const errorMessage = isAuthenticated
        ? 'Errore nel caricamento delle specializzazioni del tuo piano. Riprova o contatta il supporto.'
        : 'Errore nel caricamento delle specializzazioni. Riprova più tardi.';
      setError(errorMessage);
      setSpecialties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (specialty) => {
    onChange(specialty);
    setIsOpen(false);
  };

  const selectedSpecialty = specialties.find(s => s.id === value);

  if (loading) {
    return (
      <div className={`select-primary ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-neutral-400">Caricamento specializzazioni...</span>
          <div className="animate-spin w-4 h-4 border-2 border-medical-300 border-t-medical-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`select-primary border-error-300 bg-error-50 ${className}`}>
        <span className="text-error-600">{error}</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`select-primary text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-medical-300'
        } ${isOpen ? 'ring-2 ring-medical-200 border-medical-400' : ''}`}
      >
        <div className="flex-1">
          {selectedSpecialty ? (
            <div>
              <div className="font-medium text-neutral-900">{selectedSpecialty.name}</div>
              <div className="text-sm text-neutral-500 mt-1">{selectedSpecialty.description}</div>
            </div>
          ) : (
            <span className="text-neutral-400">Seleziona una specializzazione...</span>
          )}
        </div>

        <div className={`ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-neutral-200 rounded-2xl shadow-large z-50 max-h-80 overflow-y-auto specialty-scroll animate-slide-down">
          <div className="p-2">
            {specialties.map((specialty) => (
              <button
                key={specialty.id}
                type="button"
                onClick={() => handleSelect(specialty.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-150 hover:bg-medical-50 hover:shadow-soft ${
                  value === specialty.id ? 'bg-medical-100 shadow-soft' : ''
                }`}
              >
                <div className="font-medium text-neutral-900">{specialty.name}</div>
                <div className="text-sm text-neutral-600 mt-1">{specialty.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SpecialtySelector;