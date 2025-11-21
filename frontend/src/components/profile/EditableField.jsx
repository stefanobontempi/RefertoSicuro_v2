import React, { useState } from 'react';

const EditableField = ({
  label,
  value,
  type = 'text',
  placeholder,
  readonly = false,
  required = false,
  validation,
  onSave,
  rows = 1,
  options = null // For select fields
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = () => {
    if (readonly) return;
    setIsEditing(true);
    setEditValue(value || '');
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value || '');
    setError('');
  };

  const handleSave = async () => {
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const renderInput = () => {
    const baseClasses = "input-primary";
    const errorClasses = error ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "";

    if (options) {
      return (
        <select
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className={`${baseClasses} ${errorClasses}`}
          onKeyDown={handleKeyPress}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          className={`textarea-primary ${errorClasses}`}
          rows={rows}
          onKeyDown={handleKeyPress}
        />
      );
    }

    return (
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        placeholder={placeholder}
        className={`${baseClasses} ${errorClasses}`}
        onKeyDown={handleKeyPress}
      />
    );
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100">
      <div className="flex-1">
        <label className="text-sm text-neutral-600 block mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {isEditing ? (
          <div className="space-y-2">
            {renderInput()}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary text-xs px-3 py-1"
                style={{ backgroundColor: '#5399d9', borderColor: '#5399d9' }}
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </div>
                ) : (
                  'Salva'
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="btn-secondary text-xs px-3 py-1"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-neutral-900 font-medium">
              {value || <span className="text-neutral-400 italic">Non specificato</span>}
            </span>
            {!readonly && (
              <button
                onClick={handleEdit}
                className="text-medical-600 hover:text-medical-700 p-1 ml-2"
                title="Modifica"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditableField;