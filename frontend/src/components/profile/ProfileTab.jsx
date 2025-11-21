import React, { useState } from 'react';
import Swal from 'sweetalert2';
import SectionCard from './SectionCard';
import EditableField from './EditableField';
import ChangePasswordModal from './ChangePasswordModal';
import DebugTrackingConsent from './DebugTrackingConsent';
import useToast from '../../hooks/useToast';

const ProfileTab = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [billingType, setBillingType] = useState(user.billing_type || 'private');

  React.useEffect(() => {
    setBillingType(user.billing_type || 'private');
  }, [user.billing_type]);

  // Validation functions
  const validateFullName = (value) => {
    if (!value || value.trim().length < 2) {
      return 'Il nome deve essere di almeno 2 caratteri';
    }
    if (value.length > 100) {
      return 'Il nome non può superare i 100 caratteri';
    }
    if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
      return 'Il nome contiene caratteri non validi';
    }
    return null;
  };

  const validatePhone = (value) => {
    if (value && !/^[\+]?[0-9\s\-\(\)]+$/.test(value)) {
      return 'Formato telefono non valido';
    }
    return null;
  };

  const validateVatNumber = (value) => {
    if (value && !/^IT[0-9]{11}$/.test(value)) {
      return 'Formato P.IVA non valido (es: IT12345678901)';
    }
    return null;
  };

  const validateTaxCode = (value) => {
    if (value && !/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(value.toUpperCase())) {
      return 'Codice fiscale non valido (16 caratteri)';
    }
    return null;
  };

  const validatePEC = (value) => {
    if (value && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
      return 'Formato PEC non valido';
    }
    return null;
  };

  const validateUniqueCode = (value) => {
    if (value && value.length !== 7) {
      return 'Codice univoco deve essere di 7 caratteri';
    }
    return null;
  };

  const validatePostalCode = (value) => {
    if (value && !/^[0-9]{5}$/.test(value)) {
      return 'CAP non valido (5 cifre)';
    }
    return null;
  };

  const validateProvince = (value) => {
    if (value && !/^[A-Z]{2}$/.test(value.toUpperCase())) {
      return 'Provincia non valida (2 caratteri)';
    }
    return null;
  };

  // Update handlers
  const handleFieldUpdate = async (field, value) => {
    try {
      await onUserUpdate({ [field]: value });
      
      Swal.fire({
        title: 'Campo Aggiornato',
        text: 'Le tue informazioni sono state aggiornate con successo',
        icon: 'success',
        confirmButtonColor: '#5399d9',
        confirmButtonText: 'OK',
        background: '#ffffff',
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
    } catch (error) {
      Swal.fire({
        title: 'Errore',
        text: error.message || 'Errore durante l\'aggiornamento',
        icon: 'error',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'OK',
        background: '#ffffff',
        customClass: {
          popup: 'rounded-2xl',
          title: 'text-xl font-bold',
          content: 'text-sm text-gray-600',
          confirmButton: 'rounded-xl px-6 py-3 font-medium'
        }
      });
      throw error;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmailVerificationBadge = () => {
    if (user.email_verified) {
      return (
        <span className="status-success text-xs ml-2">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Verificata
        </span>
      );
    }
    return (
      <span className="status-warning text-xs ml-2">
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        Non verificata
      </span>
    );
  };


  const localeOptions = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' }
  ];

  return (
    <div className="space-y-8">

      {/* Dati Personali */}
      <SectionCard
        title="Dati Personali"
        description="Gestisci i tuoi dati personali, contatti e indirizzo"
        icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        mobileActionsBelow={true}
        actions={[
          <div key="user-id-badge" className="px-4 py-2 rounded-full text-sm font-bold text-white whitespace-nowrap" style={{ backgroundColor: '#5399d9' }}>
            USER ID: {user.id}
          </div>
        ]}
      >
        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Nome completo
            </label>
            <span className="text-neutral-900 font-medium">{user.full_name}</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Indirizzo email
            </label>
            <div className="flex items-center">
              <span className="text-neutral-900 font-medium">{user.email}</span>
              {getEmailVerificationBadge()}
            </div>
          </div>
        </div>

        <EditableField
          label="Numero di telefono"
          value={user.phone_number}
          type="tel"
          placeholder="+39 123 456 7890"
          validation={validatePhone}
          onSave={(value) => handleFieldUpdate('phone_number', value)}
        />

        {(user.account_type === 'b2c' && billingType === 'private') && (
          <div className="flex items-center justify-between py-3 border-b border-neutral-100">
            <div>
              <label className="text-sm text-neutral-600 block mb-1">
                Codice fiscale
              </label>
              <span className="text-neutral-900 font-medium">{user.tax_code || '-'}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Numero Ordine dei Medici (ODM)
            </label>
            <span className="text-neutral-900 font-medium">{user.odm_number || '-'}</span>
          </div>
        </div>

        <EditableField
          label="Lingua preferita"
          value={user.locale || 'it'}
          options={localeOptions}
          onSave={(value) => handleFieldUpdate('locale', value)}
        />

        {/* Indirizzo - Solo per B2C Privato */}
        {(user.account_type === 'b2c' && billingType === 'private') && (
          <>
            <div className="pt-4 pb-2">
              <h4 className="text-sm font-medium text-neutral-700">Indirizzo di Residenza</h4>
              <p className="text-xs text-neutral-500 mt-1">Il tuo indirizzo di residenza per la fatturazione</p>
            </div>

            <EditableField
              label="Indirizzo"
              value={user.billing_address}
              type="textarea"
              rows={2}
              placeholder="Via, Numero civico"
              onSave={(value) => handleFieldUpdate('billing_address', value)}
            />

            <EditableField
              label="Città"
              value={user.city}
              placeholder="Roma"
              onSave={(value) => handleFieldUpdate('city', value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <EditableField
                label="Provincia"
                value={user.province}
                placeholder="RM"
                validation={validateProvince}
                onSave={(value) => handleFieldUpdate('province', value?.toUpperCase())}
              />

              <EditableField
                label="CAP"
                value={user.postal_code}
                placeholder="00100"
                validation={validatePostalCode}
                onSave={(value) => handleFieldUpdate('postal_code', value)}
              />
            </div>

            <EditableField
              label="Paese"
              value={user.country || 'IT'}
              placeholder="IT"
              onSave={(value) => handleFieldUpdate('country', value?.toUpperCase())}
            />
          </>
        )}

      </SectionCard>

      {/* Dati Aziendali - B2C Business o B2B */}
      {(user.account_type === 'b2b' || (user.account_type === 'b2c' && billingType === 'business')) && (
        <SectionCard
          title="Dati Aziendali"
          description="Informazioni relative alla tua azienda"
          icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        >
          <EditableField
            label="Nome azienda"
            value={user.company_name}
            placeholder="Nome della tua azienda"
            required
            onSave={(value) => handleFieldUpdate('company_name', value)}
          />

          <EditableField
            label="Partita IVA"
            value={user.vat_number}
            placeholder="IT12345678901"
            validation={validateVatNumber}
            onSave={(value) => handleFieldUpdate('vat_number', value)}
          />

          <EditableField
            label="Indirizzo sede legale"
            value={user.billing_address}
            type="textarea"
            rows={2}
            placeholder="Via, Numero civico"
            onSave={(value) => handleFieldUpdate('billing_address', value)}
          />

          <EditableField
            label="Città"
            value={user.city}
            placeholder="Roma"
            onSave={(value) => handleFieldUpdate('city', value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <EditableField
              label="Provincia"
              value={user.province}
              placeholder="RM"
              validation={validateProvince}
              onSave={(value) => handleFieldUpdate('province', value?.toUpperCase())}
            />

            <EditableField
              label="CAP"
              value={user.postal_code}
              placeholder="00100"
              validation={validatePostalCode}
              onSave={(value) => handleFieldUpdate('postal_code', value)}
            />
          </div>

          <EditableField
            label="Paese"
            value={user.country || 'IT'}
            placeholder="IT"
            onSave={(value) => handleFieldUpdate('country', value?.toUpperCase())}
          />

          <EditableField
            label="PEC (Email certificata)"
            value={user.pec_email}
            type="email"
            placeholder="azienda@pec.it"
            validation={validatePEC}
            onSave={(value) => handleFieldUpdate('pec_email', value)}
          />

          <EditableField
            label="Codice Univoco (alternativo a PEC)"
            value={user.unique_code}
            placeholder="XXXXXXX"
            validation={validateUniqueCode}
            onSave={(value) => handleFieldUpdate('unique_code', value?.toUpperCase())}
          />

        </SectionCard>
      )}

      {/* Informazioni B2B - Solo per account B2B */}
      {user.account_type === 'b2b' && (
        <SectionCard
          title="Informazioni Account B2B"
          description="Dettagli specifici dell'account aziendale"
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        >
          {user.seats_limit && user.seats_limit > 1 && (
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Postazioni acquistate
                </label>
                <span className="text-neutral-900 font-medium">
                  {user.seats_limit} {user.seats_limit === 1 ? 'postazione' : 'postazioni'}
                </span>
              </div>
            </div>
          )}

          {user.parent_account_id && (
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Relazione account
                </label>
                <span className="text-neutral-900 font-medium">
                  Sub-account di #{user.parent_account_id}
                </span>
              </div>
            </div>
          )}

          {!user.is_primary_account && (
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Ruolo account
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Sub-account
                </span>
              </div>
            </div>
          )}

          {user.username && (
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Username accesso
                </label>
                <span className="text-neutral-900 font-medium font-mono text-sm">
                  {user.username}
                </span>
              </div>
            </div>
          )}

          {user.display_name && user.display_name !== user.full_name && (
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Nome visualizzato
                </label>
                <span className="text-neutral-900 font-medium">
                  {user.display_name}
                </span>
              </div>
            </div>
          )}

          {user.sub_account_type && (
            <div className="flex items-center justify-between py-3">
              <div>
                <label className="text-sm text-neutral-600 block mb-1">
                  Tipo specialista
                </label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {user.sub_account_type.charAt(0).toUpperCase() + user.sub_account_type.slice(1)}
                </span>
              </div>
            </div>
          )}
        </SectionCard>
      )}


      {/* Privilegi Amministratore */}
      {user.is_admin && (
        <SectionCard
          title="Privilegi Amministratore"
          description="Informazioni sui tuoi privilegi di sistema"
          icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        >
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3">
                <h5 className="font-semibold text-orange-800 mb-2">🔑 Accesso Amministratore</h5>
                <p className="text-sm text-orange-700 mb-3">
                  Hai privilegi di amministratore del sistema. Puoi accedere alla dashboard amministrativa e gestire utenti e configurazioni.
                </p>
                <div className="flex items-center text-xs text-orange-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Utilizza i privilegi admin responsabilmente
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Sicurezza Account */}
      <SectionCard
        title="Sicurezza Account"
        description="Gestisci la sicurezza del tuo account"
        icon="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        mobileActionsBelow={true}
        actions={[
          <button
            key="change-password"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsChangingPassword(true);
            }}
            className="btn-secondary text-sm flex justify-center items-center"
            style={{ color: '#5399d9' }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#5399d9' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Cambia Password
          </button>
        ]}
      >
        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Stato account
            </label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {user.is_active ? 'Attivo' : 'Disattivato'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Ultimo accesso
            </label>
            <span className="text-neutral-900 font-medium">
              {formatDate(user.last_login_at) || 'Primo accesso'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Tentativi di accesso falliti
            </label>
            <span className={`font-medium ${
              (user.failed_login_attempts || 0) > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {user.failed_login_attempts || 0} tentativi
            </span>
          </div>
        </div>

        {user.locked_until && (
          <div className="flex items-center justify-between py-3 border-b border-neutral-100">
            <div>
              <label className="text-sm text-neutral-600 block mb-1">
                Account bloccato fino a
              </label>
              <span className="text-red-600 font-medium">
                {formatDate(user.locked_until)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-3">
          <div>
            <label className="text-sm text-neutral-600 block mb-1">
              Account creato
            </label>
            <span className="text-neutral-900 font-medium">
              {formatDate(user.created_at)}
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Specialità */}
      <SectionCard
        title="Specialità Mediche"
        description="Le specialità disponibili nel tuo account"
        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      >
        <div className="py-3">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(user.included_specialties || ['medicina_generale']).map((specialty) => {
              const specialtyName = specialty
                .replace(/_/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
              return (
                <li key={specialty} className="flex items-center text-sm text-neutral-700">
                  <svg className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {specialtyName}
                </li>
              );
            })}
          </ul>
        </div>
      </SectionCard>

      {/* Debug Tracking Consent (GDPR Compliance) */}
      <DebugTrackingConsent />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangingPassword}
        onClose={() => setIsChangingPassword(false)}
      />
    </div>
  );
};

export default ProfileTab;