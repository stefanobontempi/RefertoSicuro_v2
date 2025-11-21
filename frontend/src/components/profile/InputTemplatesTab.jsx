import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import SectionCard from './SectionCard';
import useToast from '../../hooks/useToast';
import { inputTemplatesAPI, specialtiesAPI } from '../../services/api';
import HelpFeedbackModal from '../common/HelpFeedbackModal';

// Function to get specialty icon
const getSpecialtyIcon = (specialtyId) => {
  const iconMap = {
    'medicina_generale': 'medicina_generale.svg',
    'cardiologia': 'cardiologia.svg',
    'chirurgia_generale': 'chirurgia_generale.svg',
    'chirurgia_plastica': 'chirurgia_plastica.svg',
    'dermatologia': 'dermatologia.svg',
    'endocrinologia': 'endocrinologia.svg',
    'oftalmologia': 'oftalmologia.svg',
    'ortopedia': 'ortopedia.svg',
    'otorinolaringoiatria': 'otorinolaringoiatra.svg',
    'radiodiagnostica': 'radiodiagnostica.svg',
    'telemedicina': 'telemedicina.svg',
    'allergologia_e_immunologia': 'immunologia.svg',
    'immunologia': 'immunologia.svg',
    'fisiatria': 'fisiatria.svg',
    'gastroenterologia': 'gastroenterologia.svg',
    'ginecologia': 'ginecologia.svg',
    'medicina_dello_sport': 'medicina_sport.svg',
    'neurologia': 'neurologia.svg',
    'pneumologia': 'pneumologia.svg',
    'urologia': 'urologia.svg'
  };

  const iconFileName = iconMap[specialtyId];

  if (iconFileName) {
    return (
      <img
        src={`/icons_specialties/${iconFileName}`}
        alt={`${specialtyId} icon`}
        className="object-contain"
        style={{ minWidth: '1.5em', minHeight: '1.5em', width: '2em', height: '2em' }}
      />
    );
  }

  // Fallback icon for unknown specialties
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

const InputTemplatesTab = ({ user }) => {
  const { showSuccess, showError } = useToast();
  const [templates, setTemplates] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    specialty_id: '',
    template_name: '',
    template_content: '',
    is_active: true,
    display_order: 0
  });
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [showSpecialtyModal, setShowSpecialtyModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);
  const [isClosingFilterModal, setIsClosingFilterModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isOverFooter, setIsOverFooter] = useState(false);
  const buttonRef = useRef(null);

  useEffect(() => {
    loadTemplates();
    loadSpecialties();
  }, []);

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

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await inputTemplatesAPI.getAll();
      setTemplates(response.data);
    } catch (error) {
      showError(error.response?.data?.detail || 'Errore nel caricamento template');
    } finally {
      setLoading(false);
    }
  };

  const loadSpecialties = async () => {
    try {
      const response = await specialtiesAPI.getUserSpecialties();
      setSpecialties(response.data.specialties || []);
    } catch (error) {
      setSpecialties([]);
    }
  };

  const handleCreate = async () => {
    try {
      await inputTemplatesAPI.create(formData);
      showSuccess('Template creato con successo');
      setShowForm(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      showError(error.response?.data?.detail || 'Errore nella creazione');
    }
  };

  const handleUpdate = async () => {
    try {
      await inputTemplatesAPI.update(editingTemplate.id, formData);
      showSuccess('Template aggiornato');
      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      showError(error.response?.data?.detail || 'Errore nell\'aggiornamento');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Conferma eliminazione',
      text: 'Sei sicuro di voler eliminare questo template?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Elimina',
      cancelButtonText: 'Annulla'
    });

    if (result.isConfirmed) {
      try {
        await inputTemplatesAPI.delete(id);
        showSuccess('Template eliminato');
        loadTemplates();
      } catch (error) {
        showError(error.response?.data?.detail || 'Errore nell\'eliminazione');
      }
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await inputTemplatesAPI.duplicate(id);
      showSuccess('Template duplicato');
      loadTemplates();
    } catch (error) {
      showError(error.response?.data?.detail || 'Errore nella duplicazione');
    }
  };

  const handleToggle = async (id) => {
    try {
      await inputTemplatesAPI.toggle(id);
      loadTemplates();
    } catch (error) {
      showError(error.response?.data?.detail || 'Errore nel cambio stato');
    }
  };

  const startEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      specialty_id: template.specialty_id,
      template_name: template.template_name,
      template_content: template.template_content,
      is_active: template.is_active,
      display_order: template.display_order
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      specialty_id: '',
      template_name: '',
      template_content: '',
      is_active: true,
      display_order: 0
    });
    setEditingTemplate(null);
  };

  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowSpecialtyModal(false);
      setIsClosingModal(false);
    }, 300);
  };

  const handleSelectSpecialty = (specialtyId) => {
    setFormData({ ...formData, specialty_id: specialtyId });
    handleCloseModal();
  };

  const handleCloseFilterModal = () => {
    setIsClosingFilterModal(true);
    setTimeout(() => {
      setShowFilterModal(false);
      setIsClosingFilterModal(false);
    }, 300);
  };

  const handleSelectFilter = (specialtyId) => {
    setFilterSpecialty(specialtyId);
    handleCloseFilterModal();
  };

  const filteredTemplates = filterSpecialty
    ? templates.filter(t => t.specialty_id === filterSpecialty)
    : templates;

  const getSpecialtyName = (id) => {
    const specialty = specialties.find(s => s.id === id);
    return specialty?.name || id;
  };

  return (
    <div className="space-y-6 mt-6">
      <SectionCard title="Template di Input">
        <div className="space-y-6">
          {/* Header con filtri e azioni */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="label block">Filtra per specialità:</label>
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="w-full sm:w-96 px-4 py-3 bg-white/80 border-0 border-b-2 border-neutral-300 focus:border-[#5399d9] transition-all duration-200 outline-none text-left flex items-center justify-between"
              >
                <span className={`font-normal ${filterSpecialty ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {filterSpecialty
                    ? specialties.find(s => s.id === filterSpecialty)?.name || 'Tutte le specialità'
                    : 'Tutte le specialità'
                  }
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col justify-center">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                className="btn btn-primary"
              >
                {showForm ? 'Nascondi Form' : '+ Nuovo Template'}
              </button>
            </div>
          </div>

          {/* Form creazione/modifica */}
          {showForm && (
            <div className="card p-4 bg-surface-light">
              <h3 className="font-semibold mb-4">
                {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="label block">Specialità:</label>
                    <button
                      type="button"
                      onClick={() => setShowSpecialtyModal(true)}
                      className="w-full px-4 py-3 bg-white/80 border-0 border-b-2 border-neutral-300 focus:border-[#5399d9] transition-all duration-200 outline-none text-left flex items-center justify-between"
                    >
                      <span className={`font-normal ${formData.specialty_id ? 'text-neutral-900' : 'text-neutral-400'}`}>
                        {formData.specialty_id
                          ? specialties.find(s => s.id === formData.specialty_id)?.name || 'Seleziona specialità'
                          : 'Seleziona specialità'
                        }
                      </span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1">
                    <label className="label block">Nome Template:</label>
                    <input
                      type="text"
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/80 border-0 border-b-2 border-neutral-300 focus:border-[#5399d9] transition-all duration-200 placeholder-neutral-400 font-normal outline-none"
                      placeholder="es. Visita di controllo"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Contenuto:</label>
                  <textarea
                    value={formData.template_content}
                    onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                    className="w-full px-4 py-3 bg-white/80 border-2 border-neutral-300 focus:border-[#5399d9] transition-all duration-200 placeholder-neutral-400 font-normal outline-none resize-none"
                    style={{ marginTop: '.75em' }}
                    rows="12"
                    placeholder="Testo precompilato del template..."
                    required
                  />
                  <p className="text-xs text-soft mt-1">
                    Max 10.000 caratteri. Questo testo sarà inserito nel campo input quando cliccherai il template.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={editingTemplate ? handleUpdate : handleCreate}
                    className="btn btn-primary"
                    disabled={!formData.specialty_id || !formData.template_name || !formData.template_content}
                  >
                    {editingTemplate ? 'Aggiorna' : 'Crea'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="btn btn-secondary"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista template */}
          {loading ? (
            <div className="text-center py-8 text-soft">Caricamento...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-soft">
              Nessun template trovato. Crea il tuo primo template personalizzato!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className={`card p-4 ${!template.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    {/* Numero cerchiato */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#5399d9' }}>
                      {index + 1}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold">{template.template_name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(83, 153, 217, 0.1)', color: '#5399d9' }}>
                          {getSpecialtyName(template.specialty_id)}
                        </span>
                        {!template.is_active && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                            Disattivo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-soft line-clamp-2">
                        {template.template_content}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {/* Toggle visibility button */}
                      <button
                        onClick={() => handleToggle(template.id)}
                        className="group relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                        title={template.is_active ? 'Disattiva' : 'Attiva'}
                      >
                        {template.is_active ? (
                          <svg className="w-5 h-5 text-neutral-600 group-hover:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-neutral-400 group-hover:text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {template.is_active ? 'Disattiva' : 'Attiva'}
                        </span>
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={() => startEdit(template)}
                        className="group relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                        title="Modifica"
                      >
                        <svg className="w-5 h-5 text-neutral-600 group-hover:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Modifica
                        </span>
                      </button>

                      {/* Duplicate button */}
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="group relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                        title="Duplica"
                      >
                        <svg className="w-5 h-5 text-neutral-600 group-hover:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Duplica
                        </span>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="group relative p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="Elimina"
                      >
                        <svg className="w-5 h-5 text-neutral-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          Elimina
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

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

      {/* Help & Feedback Modal */}
      <HelpFeedbackModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        pageContext="Template Input (/template)"
        instructionsContent={(
          <>
            <p>
              I template di input ti permettono di salvare testi precompilati che puoi inserire rapidamente
              nei tuoi referti dalla home page.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Crea template personalizzati per ogni specialità medica;</li>
              <li>Organizzali per frequenza d'uso con l'ordine di visualizzazione;</li>
              <li>Clicca un template nella home per inserirlo nel campo input al cursore;</li>
              <li>Disattiva temporaneamente i template che non usi senza eliminarli.</li>
            </ul>
          </>
        )}
      />

      {/* Filter Modal */}
      {showFilterModal && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
            style={{
              animation: isClosingFilterModal ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out',
              marginTop: 0
            }}
            onClick={handleCloseFilterModal}
          />

          {/* Centered Modal */}
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl z-[10001] w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden"
            style={{
              boxShadow: '0 0 20px #5399d9',
              animation: isClosingFilterModal
                ? 'modalSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                : 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseFilterModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 hover:text-neutral-800 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-6 pr-8">
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Filtra per Specializzazione
                </h3>
                <p className="text-sm text-neutral-600">
                  Seleziona una specialità per filtrare i template
                </p>
              </div>

              {/* Specialties Grid */}
              <div
                className="max-h-[60vh] overflow-y-auto overflow-x-hidden specialty-scroll"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#5399d9 rgba(83, 153, 217, 0.1)'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2">
                  {/* Tutte le specialità option */}
                  <button
                    onClick={() => handleSelectFilter('')}
                    className={`
                      relative p-4 rounded-xl transition-all duration-200 text-left hover:scale-[1.02] cursor-pointer group
                      ${!filterSpecialty
                        ? 'bg-medical-50 text-medical-700 ring-2 ring-medical-200'
                        : 'bg-white hover:bg-neutral-50'
                      }
                    `}
                    style={{
                      boxShadow: !filterSpecialty
                        ? '0 8px 25px rgba(83, 153, 217, 0.4), 0 4px 10px rgba(83, 153, 217, 0.25)'
                        : '0 4px 15px rgba(83, 153, 217, 0.3), 0 2px 6px rgba(83, 153, 217, 0.2)',
                      transition: 'all 0.3s ease',
                      border: !filterSpecialty ? '2px solid #5399d9' : '2px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (filterSpecialty) {
                        e.currentTarget.style.border = '2px solid #5399d9';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterSpecialty) {
                        e.currentTarget.style.border = '2px solid transparent';
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-medical-600 opacity-80 flex-shrink-0">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
                        </svg>
                      </div>
                      <div className="font-semibold text-neutral-900 text-base leading-tight">
                        Tutte le specialità
                      </div>
                    </div>
                  </button>

                  {/* Specialties */}
                  {[...specialties]
                    .sort((a, b) => {
                      if (a.id === 'medicina_generale') return -1;
                      if (b.id === 'medicina_generale') return 1;
                      return a.name.localeCompare(b.name, 'it');
                    })
                    .map((specialty) => (
                    <button
                      key={specialty.id}
                      onClick={() => handleSelectFilter(specialty.id)}
                      className={`
                        relative p-4 rounded-xl transition-all duration-200 text-left hover:scale-[1.02] cursor-pointer group
                        ${filterSpecialty === specialty.id
                          ? 'bg-medical-50 text-medical-700 ring-2 ring-medical-200'
                          : 'bg-white hover:bg-neutral-50'
                        }
                      `}
                      style={{
                        boxShadow: filterSpecialty === specialty.id
                          ? '0 8px 25px rgba(83, 153, 217, 0.4), 0 4px 10px rgba(83, 153, 217, 0.25)'
                          : '0 4px 15px rgba(83, 153, 217, 0.3), 0 2px 6px rgba(83, 153, 217, 0.2)',
                        transition: 'all 0.3s ease',
                        border: filterSpecialty === specialty.id ? '2px solid #5399d9' : '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (filterSpecialty !== specialty.id) {
                          e.currentTarget.style.border = '2px solid #5399d9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (filterSpecialty !== specialty.id) {
                          e.currentTarget.style.border = '2px solid transparent';
                        }
                      }}
                    >
                      {specialty.id === 'medicina_generale' && (
                        <div
                          className="absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-medium shadow-md"
                          style={{ backgroundColor: '#5399d9' }}
                        >
                          Base
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        <div className="text-medical-600 opacity-80 flex-shrink-0">
                          {getSpecialtyIcon(specialty.id)}
                        </div>
                        <div className="font-semibold text-neutral-900 text-base leading-tight">
                          {specialty.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Specialty Selection Modal */}
      {showSpecialtyModal && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
            style={{
              animation: isClosingModal ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out',
              marginTop: 0
            }}
            onClick={handleCloseModal}
          />

          {/* Centered Modal */}
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl z-[10001] w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden"
            style={{
              boxShadow: '0 0 20px #5399d9',
              animation: isClosingModal
                ? 'modalSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                : 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600 hover:text-neutral-800 z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-6 pr-8">
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  Seleziona la Specializzazione
                </h3>
                <p className="text-sm text-neutral-600">
                  Scegli la specializzazione per questo template
                </p>
              </div>

              {/* Specialties Grid */}
              <div
                className="max-h-[60vh] overflow-y-auto overflow-x-hidden specialty-scroll"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#5399d9 rgba(83, 153, 217, 0.1)'
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2">
                  {[...specialties]
                    .sort((a, b) => {
                      if (a.id === 'medicina_generale') return -1;
                      if (b.id === 'medicina_generale') return 1;
                      return a.name.localeCompare(b.name, 'it');
                    })
                    .map((specialty) => (
                    <button
                      key={specialty.id}
                      onClick={() => handleSelectSpecialty(specialty.id)}
                      className={`
                        relative p-4 rounded-xl transition-all duration-200 text-left hover:scale-[1.02] cursor-pointer group
                        ${formData.specialty_id === specialty.id
                          ? 'bg-medical-50 text-medical-700 ring-2 ring-medical-200'
                          : 'bg-white hover:bg-neutral-50'
                        }
                      `}
                      style={{
                        boxShadow: formData.specialty_id === specialty.id
                          ? '0 8px 25px rgba(83, 153, 217, 0.4), 0 4px 10px rgba(83, 153, 217, 0.25)'
                          : '0 4px 15px rgba(83, 153, 217, 0.3), 0 2px 6px rgba(83, 153, 217, 0.2)',
                        transition: 'all 0.3s ease',
                        border: formData.specialty_id === specialty.id ? '2px solid #5399d9' : '2px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (formData.specialty_id !== specialty.id) {
                          e.currentTarget.style.border = '2px solid #5399d9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (formData.specialty_id !== specialty.id) {
                          e.currentTarget.style.border = '2px solid transparent';
                        }
                      }}
                    >
                      {/* Badge per Medicina Generale */}
                      {specialty.id === 'medicina_generale' && (
                        <div
                          className="absolute -top-2 -right-2 text-white text-xs px-2 py-1 rounded-full font-medium shadow-md"
                          style={{ backgroundColor: '#5399d9' }}
                        >
                          Base
                        </div>
                      )}

                      <div className="flex items-center space-x-3">
                        {/* Icon */}
                        <div className="text-medical-600 opacity-80 flex-shrink-0">
                          {getSpecialtyIcon(specialty.id)}
                        </div>

                        {/* Specialty Name */}
                        <div className="font-semibold text-neutral-900 text-base leading-tight">
                          {specialty.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Altre Features Section - TEMPORANEAMENTE COMMENTATO */}
      {/*
      <SectionCard title="Altre Features Avanzate">
        <p className="text-sm text-gray-600 mb-6">
          Funzionalità aggiuntive per utenti {user?.subscription_plan}
        </p>

        <div className="space-y-6">
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16" style={{ color: '#5399d9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#5399d9' }}>
              Nuove Funzionalità in Arrivo
            </h3>
            <p style={{ color: '#5399d9' }}>
              Stiamo sviluppando funzionalità aggiuntive esclusive per il piano {user?.subscription_plan}.
              Resta sintonizzato per gli aggiornamenti!
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium" style={{ color: '#5399d9' }}>
              Features in Sviluppo:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm mr-3 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <span className="font-medium text-gray-900">Gestione Avanzata Report</span>
                  <p className="text-sm text-gray-600">Dashboard completa per analisi e statistiche</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm mr-3 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <span className="font-medium text-gray-900">Integrazioni API</span>
                  <p className="text-sm text-gray-600">Connessione con sistemi esterni e EMR</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-sm mr-3 mt-0.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <span className="font-medium text-gray-900">Personalizzazione Avanzata</span>
                  <p className="text-sm text-gray-600">Branding personalizzato e white-label</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>
      */}
    </div>
  );
};

export default InputTemplatesTab;
