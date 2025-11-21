import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';

// B2C Registration Steps
const REGISTRATION_STEPS = {
  DOCTOR_VERIFICATION: 'doctor_verification',  // NEW: Phase 1
  EMAIL_VERIFICATION: 'email_verification',
  EMAIL_CONFIRM: 'email_confirm',
  AUTO_CONFIRM: 'auto_confirm',  // NEW: Auto-confirm from email link with token
  REGISTRATION_FORM: 'registration_form',  // Includes consents now
  SUCCESS: 'success'
};

// Step configuration for progress bar (removed CONSENTS - now integrated in REGISTRATION_FORM)
const STEP_CONFIG = [
  { key: 'DOCTOR_VERIFICATION', label: 'Verifica Medico', icon: '👨‍⚕️' },  // NEW
  { key: 'EMAIL_VERIFICATION', label: 'Verifica Email', icon: '📧' },
  { key: 'EMAIL_CONFIRM', label: 'Conferma', icon: '✉️' },
  { key: 'REGISTRATION_FORM', label: 'Registrazione', icon: '📝' }
];

const RegisterForm = ({ onToggleMode, onSuccess, verificationDataProp = null, onExpansionChange, onClose }) => {
  // Determine initial step based on verificationDataProp
  const getInitialStep = () => {
    if (verificationDataProp?.step === 'auto_confirm') {
      return REGISTRATION_STEPS.AUTO_CONFIRM;
    } else if (verificationDataProp?.step === 'email_confirm') {
      return REGISTRATION_STEPS.EMAIL_CONFIRM;
    } else if (verificationDataProp?.step === 'registration_form') {
      return REGISTRATION_STEPS.REGISTRATION_FORM;
    }
    return REGISTRATION_STEPS.DOCTOR_VERIFICATION;  // Default: Start with doctor verification
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep());
  const [internalVerificationData, setInternalVerificationData] = useState({
    email: verificationDataProp?.email || '',
    verification_token: verificationDataProp?.verificationToken || ''
  });

  // 6-digit code state (array of digits)
  const [digitCode, setDigitCode] = useState(['', '', '', '', '', '']);
  const digitInputRefs = [
    React.useRef(null),
    React.useRef(null),
    React.useRef(null),
    React.useRef(null),
    React.useRef(null),
    React.useRef(null)
  ];

  // Step 1: Doctor verification (NEW) - Initialize with data from email link if available
  const [doctorData, setDoctorData] = useState({
    cognome: verificationDataProp?.fnomceoData?.cognome || '',
    nome: verificationDataProp?.fnomceoData?.nome || '',
    birth_date: verificationDataProp?.fnomceoData?.birth_date || '',
    odm_number: verificationDataProp?.fnomceoData?.odm_number || ''
  });
  const [doctorValidating, setDoctorValidating] = useState(false);
  const [validatedDoctorData, setValidatedDoctorData] = useState(null);

  // Field validation errors and touched state
  const [doctorFieldErrors, setDoctorFieldErrors] = useState({});
  const [doctorTouchedFields, setDoctorTouchedFields] = useState({});

  // Step 2: Email verification
  const [emailData, setEmailData] = useState({ email: '' });

  // Step 2: Complete registration form
  const [formData, setFormData] = useState({
    email: verificationDataProp?.email || '',
    password: '',
    confirmPassword: '',
    verification_token: verificationDataProp?.verificationToken || '',

    // Personal Information - Pre-fill with FNOMCeO data if available
    full_name: verificationDataProp?.fnomceoData
      ? `${verificationDataProp.fnomceoData.nome} ${verificationDataProp.fnomceoData.cognome}`.trim()
      : '',
    phone_number: '',

    // Billing Information
    billing_type: 'private', // 'private' or 'business'
    tax_code: '',

    // Address
    billing_address: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'IT',

    // Business fields (conditional)
    vat_number: '',
    company_name: '',
    pec_email: '',
    unique_code: ''
  });

  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  // Trial plan data
  const [trialData, setTrialData] = useState({
    maxApiCalls: 20, // Default fallback (aligned with backend trial tier)
    trialDays: 14 // Trial period constant
  });

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password match validation
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Terms acceptance state
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Terms modal state
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsContent, setTermsContent] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // Tax code validation state
  const [taxCodeValidation, setTaxCodeValidation] = useState({
    validLength: false,
    validFormat: false,
    validChecksum: false
  });

  // Consent management states (integrated in main flow)
  const [userConsents, setUserConsents] = useState({});
  const [expandedConsent, setExpandedConsent] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [consentsLoading, setConsentsLoading] = useState(false);

  const { clearError } = useAuth();

  // Handle modal expansion based on current step
  useEffect(() => {
    if (onExpansionChange) {
      // Expand modal when reaching REGISTRATION_FORM (includes consents now)
      const shouldExpand = currentStep === REGISTRATION_STEPS.REGISTRATION_FORM;
      onExpansionChange(shouldExpand);
    }
  }, [currentStep, onExpansionChange]);

  // Load consent requirements from database when reaching registration form
  useEffect(() => {
    if (currentStep === REGISTRATION_STEPS.REGISTRATION_FORM && !consentData) {
      loadConsentRequirements();
    }
  }, [currentStep]);

  // Fetch trial plan data from backend
  useEffect(() => {
    const fetchTrialData = async () => {
      try {
        const response = await fetch('/api/pricing/tiers?customer_type=b2c');
        if (response.ok) {
          const tiers = await response.json();
          // Find the trial tier
          const trialTier = tiers.find(tier => tier.tier_id === 'trial');
          if (trialTier) {
            const updates = {};

            // Get API calls limit
            if (trialTier.api_calls_limit) {
              updates.maxApiCalls = trialTier.api_calls_limit;
            }

            // Extract trial days from description (e.g., "Piano prova gratuito di 14 giorni")
            if (trialTier.description) {
              const daysMatch = trialTier.description.match(/(\d+)\s*giorni?/i);
              if (daysMatch && daysMatch[1]) {
                updates.trialDays = parseInt(daysMatch[1], 10);
              }
            }

            setTrialData(prev => ({
              ...prev,
              ...updates
            }));
          }
        }
      } catch (error) {
        // Keep default values on error
      }
    };

    fetchTrialData();
  }, []); // Run once on mount

  // Auto-confirm email verification when arriving from email link with token
  useEffect(() => {
    const autoConfirmEmail = async () => {
      if (currentStep === REGISTRATION_STEPS.AUTO_CONFIRM &&
          internalVerificationData.email &&
          internalVerificationData.verification_token) {
        setLocalLoading(true);
        setLocalError('');

        try {
          await authService.confirmEmailVerification({
            email: internalVerificationData.email,
            verification_token: internalVerificationData.verification_token
          });

          // Update formData with verified email and token
          setFormData({
            ...formData,
            email: internalVerificationData.email,
            verification_token: internalVerificationData.verification_token
          });

          // Move directly to registration form
          setCurrentStep(REGISTRATION_STEPS.REGISTRATION_FORM);
        } catch (error) {
          setLocalError(error.message || 'Link di verifica non valido o scaduto');
          // Fallback to manual code entry
          setCurrentStep(REGISTRATION_STEPS.EMAIL_CONFIRM);
        } finally {
          setLocalLoading(false);
        }
      }
    };

    autoConfirmEmail();
  }, [currentStep]);

  const loadConsentRequirements = async () => {
    setConsentsLoading(true);
    setLocalError('');

    try {
      const response = await fetch('/api/consent/requirements?language=it-IT');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei consensi');
      }
      const data = await response.json();
      setConsentData(data);
    } catch (error) {
      setLocalError('Errore nel caricamento dei termini e condizioni. Riprova.');
    } finally {
      setConsentsLoading(false);
    }
  };

  // Password validation function (aligned with backend: 10 chars minimum)
  const validatePassword = (password) => {
    const validation = {
      minLength: password.length >= 10,  // Backend requires 10 chars (app/core/security.py:67)
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    setPasswordValidation(validation);
    return validation;
  };

  // Tax code validation function (Italian algorithm)
  const validateTaxCode = (taxCode) => {
    const upperTaxCode = taxCode.toUpperCase();

    const validation = {
      validLength: upperTaxCode.length === 16,
      validFormat: /^[A-Z]{6}[0-9A-Z]{2}[A-Z][0-9A-Z]{2}[A-Z][0-9A-Z]{3}[A-Z]$/.test(upperTaxCode),
      validChecksum: false
    };

    // Checksum validation (only if length is correct)
    if (validation.validLength) {
      // Character-to-value mapping for odd positions (1st, 3rd, 5th...)
      const oddValues = {
        '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
        'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
        'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
        'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
      };

      // Character-to-value mapping for even positions (2nd, 4th, 6th...)
      const evenValues = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
        'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
        'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
      };

      let sum = 0;

      // Calculate checksum for first 15 characters
      for (let i = 0; i < 15; i++) {
        const char = upperTaxCode[i];
        if (i % 2 === 0) { // Odd position (1st, 3rd, 5th...)
          sum += oddValues[char] || 0;
        } else { // Even position (2nd, 4th, 6th...)
          sum += evenValues[char] || 0;
        }
      }

      const expectedChecksum = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[sum % 26];
      validation.validChecksum = upperTaxCode[15] === expectedChecksum;
    }

    setTaxCodeValidation(validation);
    return validation;
  };

  // Validate individual doctor field
  const validateDoctorField = (fieldName, value) => {
    switch (fieldName) {
      case 'cognome':
        if (!value) return 'Il cognome è obbligatorio';
        if (value.length < 2) return 'Il cognome deve avere almeno 2 caratteri';
        return '';
      case 'nome':
        if (!value) return 'Il nome è obbligatorio';
        if (value.length < 2) return 'Il nome deve avere almeno 2 caratteri';
        return '';
      case 'birth_date':
        if (!value) return 'La data di nascita è obbligatoria';
        return '';
      case 'odm_number':
        if (!value) return 'Il numero ODM è obbligatorio';
        return '';
      default:
        return '';
    }
  };

  // Handle doctor data input changes
  const handleDoctorDataChange = (e) => {
    const { name, value } = e.target;
    setDoctorData({ ...doctorData, [name]: value });

    // Clear error for this field if user is typing
    if (doctorFieldErrors[name]) {
      setDoctorFieldErrors({ ...doctorFieldErrors, [name]: '' });
    }

    if (localError) setLocalError('');
    clearError();
  };

  // Handle field blur for validation
  const handleDoctorFieldBlur = (e) => {
    const { name, value } = e.target;
    setDoctorTouchedFields({ ...doctorTouchedFields, [name]: true });

    const error = validateDoctorField(name, value);
    setDoctorFieldErrors({ ...doctorFieldErrors, [name]: error });
  };

  // Step 1: Verify doctor credentials with FNOMCeO
  const handleDoctorVerification = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);
    setDoctorValidating(true);

    // Basic validation
    if (!doctorData.cognome || doctorData.cognome.length < 2) {
      setLocalError('Il cognome deve essere completo (minimo 2 caratteri)');
      setLocalLoading(false);
      setDoctorValidating(false);
      return;
    }

    if (!doctorData.nome || doctorData.nome.length < 2) {
      setLocalError('Il nome è obbligatorio (minimo 2 caratteri)');
      setLocalLoading(false);
      setDoctorValidating(false);
      return;
    }

    if (!doctorData.birth_date) {
      setLocalError('La data di nascita è obbligatoria');
      setLocalLoading(false);
      setDoctorValidating(false);
      return;
    }

    if (!doctorData.odm_number) {
      setLocalError('Il numero ODM è obbligatorio');
      setLocalLoading(false);
      setDoctorValidating(false);
      return;
    }

    try {
      // Call backend to verify doctor credentials (without email)
      const response = await fetch('/api/auth/b2c/verify-doctor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'temp@temp.com', // Temporary placeholder - will be provided in next step
          cognome: doctorData.cognome,
          nome: doctorData.nome,
          birth_date: doctorData.birth_date, // Format: YYYY-MM-DD
          odm_number: doctorData.odm_number
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante la validazione delle credenziali');
      }

      if (!data.valid) {
        throw new Error(data.message || 'Credenziali medico non valide');
      }

      // Doctor verified successfully!
      setValidatedDoctorData(data.doctor_data);
      setLocalSuccess('Credenziali medico verificate con successo! Procedi con l\'inserimento dell\'email.');

      // Update formData with doctor info for later use
      setFormData(prev => ({
        ...prev,
        full_name: `${doctorData.nome} ${doctorData.cognome}`,  // Pre-fill name
      }));

      // Wait 1.5 seconds to show success message, then move to next step
      setTimeout(() => {
        setCurrentStep(REGISTRATION_STEPS.EMAIL_VERIFICATION);
        setLocalSuccess('');
      }, 1500);

    } catch (error) {
      setLocalError(error.message || 'Errore durante la validazione del medico');
    } finally {
      setLocalLoading(false);
      setDoctorValidating(false);
    }
  };

  // Handle input changes
  const handleEmailChange = (e) => {
    setEmailData({ ...emailData, [e.target.name]: e.target.value });
    if (localError) setLocalError('');
    clearError();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    // Gestione speciale per il campo telefono
    if (name === 'phone_number') {
      // Rimuovi tutti i caratteri non numerici
      const numbersOnly = value.replace(/\D/g, '');

      // Se è vuoto, mantieni vuoto
      if (numbersOnly === '') {
        setFormData({ ...formData, [name]: '' });
      } else {
        // Aggiungi automaticamente +39 e formatta
        const formatted = `+39 ${numbersOnly}`;
        setFormData({ ...formData, [name]: formatted });
      }
    } else {
      setFormData({ ...formData, [name]: value });

      // Validazione password in tempo reale
      if (name === 'password') {
        validatePassword(value);
        // Controlla anche la corrispondenza se confirmPassword è già compilato
        if (formData.confirmPassword) {
          setPasswordsMatch(value === formData.confirmPassword);
        }
      }

      // Validazione conferma password
      if (name === 'confirmPassword') {
        setPasswordsMatch(value === formData.password);
      }

      // Validazione codice fiscale in tempo reale
      if (name === 'tax_code') {
        validateTaxCode(value);
      }
    }

    if (localError) setLocalError('');
    clearError();
  };

  // Step 1: Request email verification
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);

    if (!emailData.email.includes('@')) {
      setLocalError('Inserisci un indirizzo email valido');
      setLocalLoading(false);
      return;
    }

    try {
      // Pass doctor data to be included in email link
      const data = await authService.requestEmailVerification(
        emailData.email,
        termsAccepted,
        doctorData  // Pass FNOMCeO data to be included in email link
      );

      // Check if this is a pending verification (email already exists but not verified)
      if (data.pending_verification) {
        // User has a pending registration - stay in modal and show code input
        setLocalSuccess('Nuovo codice di verifica inviato. Controlla la tua email.');
        // Clear any previous code
        setDigitCode(['', '', '', '', '', '']);
      }

      setInternalVerificationData({
        email: emailData.email,
        verification_token: ''
      });
      setCurrentStep(REGISTRATION_STEPS.EMAIL_CONFIRM);
    } catch (error) {
      setLocalError(error.message || 'Errore durante l\'invio della verifica');
    } finally {
      setLocalLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    setLocalError('');
    setLocalSuccess('');
    setLocalLoading(true);

    try {
      await authService.requestEmailVerification(internalVerificationData.email);
      setLocalSuccess('Nuovo codice di verifica inviato. Controlla la tua email.');
      // Clear the digit inputs
      setDigitCode(['', '', '', '', '', '']);
      // Focus first input
      digitInputRefs[0].current?.focus();
    } catch (error) {
      setLocalError(error.message || 'Errore durante l\'invio del codice');
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle digit input change
  const handleDigitChange = (index, value) => {
    // Clear messages when user starts typing
    if (localError) setLocalError('');
    if (localSuccess) setLocalSuccess('');

    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newDigitCode = [...digitCode];
    newDigitCode[index] = value;
    setDigitCode(newDigitCode);

    // Update verification_token with combined digits
    const combinedCode = newDigitCode.join('');
    setInternalVerificationData({
      ...internalVerificationData,
      verification_token: combinedCode
    });

    // Auto-focus next input
    if (value && index < 5) {
      digitInputRefs[index + 1].current?.focus();
    }
  };

  // Handle digit input keydown
  const handleDigitKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !digitCode[index] && index > 0) {
      digitInputRefs[index - 1].current?.focus();
    }
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      digitInputRefs[index - 1].current?.focus();
    }
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      digitInputRefs[index + 1].current?.focus();
    }
  };

  // Handle paste event
  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigitCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigitCode(newDigitCode);

    const combinedCode = newDigitCode.join('');
    setInternalVerificationData({
      ...internalVerificationData,
      verification_token: combinedCode
    });

    // Focus last filled input or first empty
    const nextIndex = Math.min(pastedData.length, 5);
    digitInputRefs[nextIndex].current?.focus();
  };

  // Step 2: Confirm email verification
  const handleEmailConfirm = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);

    const combinedCode = digitCode.join('');
    if (!combinedCode || combinedCode.length !== 6) {
      setLocalError('Inserisci il codice di verifica completo (6 cifre)');
      setLocalLoading(false);
      return;
    }

    try {
      const data = await authService.confirmEmailVerification({
        email: internalVerificationData.email,
        verification_token: combinedCode
      });

      setFormData({
        ...formData,
        email: internalVerificationData.email,
        verification_token: combinedCode
      });
      setCurrentStep(REGISTRATION_STEPS.REGISTRATION_FORM);
    } catch (error) {
      setLocalError(error.message || 'Codice di verifica non valido');
    } finally {
      setLocalLoading(false);
    }
  };

  // Step 3: Complete registration (now includes consents)
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalLoading(true);

    // Validation
    if (!formData.full_name || !formData.password || !formData.confirmPassword) {
      setLocalError('Compila tutti i campi obbligatori');
      setLocalLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword || !passwordsMatch) {
      setLocalError('Le password non coincidono');
      setLocalLoading(false);
      return;
    }

    // Validate password criteria
    const passwordCheck = validatePassword(formData.password);
    if (!passwordCheck.minLength || !passwordCheck.hasUppercase || !passwordCheck.hasNumber || !passwordCheck.hasSpecialChar) {
      setLocalError('La password deve soddisfare tutti i criteri di sicurezza');
      setLocalLoading(false);
      return;
    }

    // Business validation
    if (formData.billing_type === 'business') {
      if (!formData.vat_number || !formData.company_name) {
        setLocalError('Partita IVA e ragione sociale sono obbligatorie per la fatturazione aziendale');
        setLocalLoading(false);
        return;
      }
      if (!formData.pec_email && !formData.unique_code) {
        setLocalError('PEC o Codice Univoco richiesto per la fatturazione elettronica');
        setLocalLoading(false);
        return;
      }
    }

    // Check if all required consents are given
    if (!consentData) {
      setLocalError('Errore: consensi non disponibili. Riprova.');
      setLocalLoading(false);
      return;
    }

    const allRequiredGiven = consentData.required_consents.every(consent => userConsents[consent] === true);
    if (!allRequiredGiven) {
      setLocalError('È necessario accettare tutti i consensi obbligatori per procedere');
      setLocalLoading(false);
      return;
    }

    // All validation passed - submit registration
    try {
      const registrationData = {
        email: formData.email,
        password: formData.password,
        verification_token: formData.verification_token,
        full_name: formData.full_name,
        phone_number: formData.phone_number || null,
        billing_type: formData.billing_type,
        tax_code: formData.tax_code || null,
        billing_address: formData.billing_address,
        city: formData.city,
        province: formData.province.toUpperCase(),
        postal_code: formData.postal_code,
        country: formData.country,
        vat_number: formData.billing_type === 'business' ? formData.vat_number : null,
        company_name: formData.billing_type === 'business' ? formData.company_name : null,
        pec_email: formData.billing_type === 'business' ? formData.pec_email : null,
        unique_code: formData.billing_type === 'business' ? formData.unique_code : null,
        // Add doctor verification data
        birth_date: doctorData.birth_date || null,
        odm_number: doctorData.odm_number || null,
        // Add consents to registration data
        consents: userConsents
      };

      const data = await authService.completeB2CRegistration(registrationData);

      setCurrentStep(REGISTRATION_STEPS.SUCCESS);
      setTimeout(() => {
        onSuccess && onSuccess();
      }, 3000);
    } catch (error) {
      setLocalError(error.message || 'Errore durante la registrazione');
    } finally {
      setLocalLoading(false);
    }
  };

  // Handle consent submission and complete registration
  // Consent handling functions
  const handleConsentChange = (consentType, granted) => {
    setUserConsents(prev => ({
      ...prev,
      [consentType]: granted
    }));
  };

  const toggleExpandedConsent = (consentType) => {
    setExpandedConsent(expandedConsent === consentType ? null : consentType);
  };

  // Load terms and conditions from backend
  const loadTermsAndConditions = async () => {
    if (termsContent) {
      // Already loaded, just open modal
      setTermsModalOpen(true);
      return;
    }

    setTermsLoading(true);
    try {
      const response = await fetch('/api/consent/templates/terms_conditions?language=it-IT');
      if (!response.ok) {
        throw new Error('Impossibile caricare i termini e condizioni');
      }
      const data = await response.json();
      setTermsContent(data);
      setTermsModalOpen(true);
    } catch (error) {
      alert('Errore nel caricamento dei termini e condizioni. Riprova più tardi.');
    } finally {
      setTermsLoading(false);
    }
  };

  // Get current step index for progress bar
  const getCurrentStepIndex = () => {
    return STEP_CONFIG.findIndex(step => REGISTRATION_STEPS[step.key] === currentStep);
  };

  // Render step progress bar
  const renderStepProgress = () => {
    const currentIndex = getCurrentStepIndex();

    return (
      <div className="step-progress-container">
        <div className="step-progress">
          {STEP_CONFIG.map((step, index) => (
            <div
              key={step.key}
              className={`progress-line ${
                index < currentIndex ? 'completed' :
                index === currentIndex ? 'active' : ''
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  // Step Components
  const renderDoctorVerification = () => (
    <div className="auth-form">
      {renderStepProgress()}
      <div style={{ marginBottom: '0', marginTop: '-1rem', textAlign: 'left' }}>
        <button
          type="button"
          onClick={onToggleMode}
          disabled={doctorValidating}
          style={{
            background: 'none',
            border: 'none',
            color: '#5399d9',
            cursor: doctorValidating ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            padding: '0.25rem 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'opacity 0.2s',
            opacity: doctorValidating ? '0.5' : '1'
          }}
          onMouseEnter={(e) => !doctorValidating && (e.target.style.opacity = '0.7')}
          onMouseLeave={(e) => !doctorValidating && (e.target.style.opacity = '1')}
        >
          <span style={{ fontSize: '1.1rem' }}>←</span>
          <span>Indietro</span>
        </button>
      </div>
      <div className="auth-header">
        <h2>Verifica Credenziali Medico</h2>
        <p>Per registrarti, devi essere un medico iscritto all'Ordine dei Medici (FNOMCeO)</p>
      </div>

      {localError && (
        <div className="error-message">{localError}</div>
      )}

      {localSuccess && (
        <div className="success-message">{localSuccess}</div>
      )}

      <form onSubmit={handleDoctorVerification} className="auth-form-container">
        <div className="form-group">
          <label htmlFor="nome">Nome <span style={{color: 'red'}}>*</span></label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={doctorData.nome}
            onChange={handleDoctorDataChange}
            onBlur={handleDoctorFieldBlur}
            placeholder="Nome"
            minLength="2"
            required
            disabled={doctorValidating}
          />
          {doctorTouchedFields.nome && doctorFieldErrors.nome && (
            <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {doctorFieldErrors.nome}
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="cognome">
            Cognome <span style={{color: 'red'}}>*</span>
            <small style={{ color: '#666', fontSize: '12px', fontWeight: 'normal', display: 'block', marginTop: '4px' }}>
              Inserisci il cognome completo come registrato all'Ordine
            </small>
          </label>
          <input
            type="text"
            id="cognome"
            name="cognome"
            value={doctorData.cognome}
            onChange={handleDoctorDataChange}
            onBlur={handleDoctorFieldBlur}
            placeholder="Cognome completo"
            minLength="2"
            required
            disabled={doctorValidating}
          />
          {doctorTouchedFields.cognome && doctorFieldErrors.cognome && (
            <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {doctorFieldErrors.cognome}
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="birth_date">Data di Nascita <span style={{color: 'red'}}>*</span></label>
          <input
            type="date"
            id="birth_date"
            name="birth_date"
            value={doctorData.birth_date}
            onChange={handleDoctorDataChange}
            onBlur={handleDoctorFieldBlur}
            max={new Date().toISOString().split('T')[0]}
            required
            disabled={doctorValidating}
          />
          {doctorTouchedFields.birth_date && doctorFieldErrors.birth_date && (
            <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {doctorFieldErrors.birth_date}
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="odm_number">
            Numero Ordine dei Medici (ODM) <span style={{color: 'red'}}>*</span>
            <small style={{ color: '#666', fontSize: '12px', fontWeight: 'normal', display: 'block', marginTop: '4px' }}>
              Il numero di iscrizione all'Ordine dei Medici
            </small>
          </label>
          <input
            type="text"
            id="odm_number"
            name="odm_number"
            value={doctorData.odm_number}
            onChange={handleDoctorDataChange}
            onBlur={handleDoctorFieldBlur}
            placeholder="Es. 12345"
            required
            disabled={doctorValidating}
          />
          {doctorTouchedFields.odm_number && doctorFieldErrors.odm_number && (
            <small style={{ color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {doctorFieldErrors.odm_number}
            </small>
          )}
        </div>

        {doctorValidating && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            margin: '16px 0'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e5e7eb',
              borderTop: '4px solid #2563eb',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: '#1f2937', fontWeight: '500', margin: 0 }}>
              Verifica credenziali in corso...
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0 0' }}>
              La validazione può richiedere 10-15 secondi
            </p>
          </div>
        )}

        <button
          type="submit"
          className="auth-button primary"
          disabled={localLoading || doctorValidating}
        >
          {doctorValidating ? 'Verifica in corso...' : 'Verifica'}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const renderEmailVerification = () => (
    <div className="auth-form">
      {renderStepProgress()}
      <div className="auth-header">
        <h2>Verifica la tua email</h2>
        <p>Inserisci il tuo indirizzo email per iniziare la registrazione</p>
      </div>

      {localError && (
        <div className="error-message">{localError}</div>
      )}

      <form onSubmit={handleEmailSubmit} className="auth-form-container">
        <div className="form-group">
          <label htmlFor="email">Indirizzo Email <span style={{color: 'red'}}>*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            value={emailData.email}
            onChange={handleEmailChange}
            placeholder="inserisci la tua email"
            required
          />
        </div>

        {/* Terms acceptance checkbox */}
        <div className="form-group" style={{ marginTop: '16px' }}>
          <label className="consent-checkbox" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ margin: '0', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '14px', lineHeight: '1.5' }}>
              Accetto le{' '}
              <button
                type="button"
                className="text-medical-600 hover:underline"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  font: 'inherit'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  loadTermsAndConditions();
                }}
                disabled={termsLoading}
              >
                Condizioni d'Uso
              </button>
              <span style={{color: 'red'}}> *</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="auth-button primary"
          disabled={localLoading || !emailData.email.trim() || !termsAccepted}
        >
          {localLoading ? 'Invio in corso...' : 'Invia codice di verifica'}
        </button>
      </form>

      <div className="auth-toggle">
        <p>
          Hai già un account?{' '}
          <button type="button" className="link-button" onClick={onToggleMode}>
            Accedi
          </button>
        </p>
      </div>
    </div>
  );

  const renderEmailConfirmation = () => (
    <div className="auth-form">
      {renderStepProgress()}
      <div className="auth-header">
        <h2>Controlla la tua email</h2>
        <p>
          Abbiamo inviato un codice di verifica a <strong>{internalVerificationData.email}</strong>
        </p>
      </div>

      {localError && (
        <div className="error-message">{localError}</div>
      )}

      {localSuccess && (
        <div className="success-message">
          {localSuccess}
        </div>
      )}

      <form onSubmit={handleEmailConfirm} className="auth-form-container">
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
            Codice di verifica <span style={{color: 'red'}}>*</span>
          </label>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            Inserisci il codice a 6 cifre ricevuto via email
          </p>
          <div style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            {digitCode.map((digit, index) => (
              <input
                key={index}
                ref={digitInputRefs[index]}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                onPaste={index === 0 ? handleDigitPaste : undefined}
                style={{
                  width: '48px',
                  height: '56px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: digit ? '#f0f9ff' : 'white'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#ddd';
                  e.target.style.boxShadow = 'none';
                }}
                autoComplete="off"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="auth-button primary"
          disabled={localLoading || digitCode.join('').length !== 6}
        >
          {localLoading ? 'Verifica in corso...' : 'Verifica email'}
        </button>
      </form>

      <div className="auth-toggle" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <button
          type="button"
          className="link-button"
          onClick={handleResendCode}
          disabled={localLoading}
          style={{ color: '#5399d9', fontWeight: '500' }}
        >
          Non hai ricevuto il codice? Invia di nuovo
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => setCurrentStep(REGISTRATION_STEPS.EMAIL_VERIFICATION)}
        >
          ← Cambia email
        </button>
      </div>
    </div>
  );

  const renderRegistrationForm = () => (
    <div className="auth-form">
      {renderStepProgress()}
      <div className="auth-header">
        <h2>Completa la registrazione</h2>
        <p>Email verificata: <strong>{formData.email}</strong></p>
      </div>

      {localError && (
        <div className="error-message">{localError}</div>
      )}

      <form onSubmit={handleRegistrationSubmit} className="auth-form-container">
        {/* Personal Information */}
        <div className="form-section">
          <h3>Informazioni Personali</h3>

          {/* Grid layout a 2 colonne per informazioni personali */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="full_name">Nome Completo <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleFormChange}
                placeholder="Mario Rossi"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone_number">Telefono</label>
              <div className="phone-input-container">
                <span className="phone-prefix">+39</span>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number.replace('+39 ', '')}
                  onChange={handleFormChange}
                  placeholder="333 123 4567"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password <span style={{color: 'red'}}>*</span></label>
              <div className="password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="Minimo 10 caratteri"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Password validation indicators */}
              {formData.password && (
                <div className="password-validation">
                  <div className={`validation-item ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {passwordValidation.minLength ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Almeno 10 caratteri</span>
                  </div>
                  <div className={`validation-item ${passwordValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {passwordValidation.hasUppercase ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Almeno 1 lettera maiuscola</span>
                  </div>
                  <div className={`validation-item ${passwordValidation.hasNumber ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {passwordValidation.hasNumber ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Almeno 1 numero</span>
                  </div>
                  <div className={`validation-item ${passwordValidation.hasSpecialChar ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {passwordValidation.hasSpecialChar ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Almeno 1 carattere speciale</span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Conferma Password <span style={{color: 'red'}}>*</span></label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleFormChange}
                  placeholder="Ripeti la password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Password match validation */}
              {formData.confirmPassword && (
                <div className="password-validation">
                  <div className={`validation-item ${passwordsMatch ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {passwordsMatch ? '✓' : '×'}
                    </span>
                    <span className="validation-text">
                      {passwordsMatch ? 'Le password coincidono' : 'Le password non coincidono'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing Type */}
        <div className="form-section">
          <h3>Tipo di Fatturazione</h3>

          {/* Grid layout a 2 colonne per tipo fatturazione */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="billing_type"
                  value="private"
                  checked={formData.billing_type === 'private'}
                  onChange={handleFormChange}
                />
                <span>Privato</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="billing_type"
                  value="business"
                  checked={formData.billing_type === 'business'}
                  onChange={handleFormChange}
                />
                <span>Azienda/Partita IVA</span>
              </label>
            </div>

            {/* Tax Code - Always shown */}
            <div className="form-group">
              <label htmlFor="tax_code">Codice Fiscale</label>
              <input
                type="text"
                id="tax_code"
                name="tax_code"
                value={formData.tax_code}
                onChange={handleFormChange}
                placeholder="RSSMRA80A01H501U"
                maxLength="16"
                style={{ textTransform: 'uppercase' }}
              />

              {/* Tax code validation indicators */}
              {formData.tax_code && (
                <div className="password-validation">
                  <div className={`validation-item ${taxCodeValidation.validLength ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {taxCodeValidation.validLength ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Lunghezza corretta (16 caratteri)</span>
                  </div>
                  <div className={`validation-item ${taxCodeValidation.validFormat ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {taxCodeValidation.validFormat ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Formato valido (lettere e numeri)</span>
                  </div>
                  <div className={`validation-item ${taxCodeValidation.validChecksum ? 'valid' : 'invalid'}`}>
                    <span className="validation-icon">
                      {taxCodeValidation.validChecksum ? '✓' : '×'}
                    </span>
                    <span className="validation-text">Codice di controllo corretto</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business fields - conditional */}
        {formData.billing_type === 'business' && (
          <div className="form-section">
            <h3>Dati Azienda</h3>

            {/* Grid layout a 2 colonne per dati azienda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="company_name">Ragione Sociale <span style={{color: 'red'}}>*</span></label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleFormChange}
                  placeholder="Nome azienda"
                  required={formData.billing_type === 'business'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vat_number">Partita IVA <span style={{color: 'red'}}>*</span></label>
                <input
                  type="text"
                  id="vat_number"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleFormChange}
                  placeholder="IT12345678901"
                  required={formData.billing_type === 'business'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="pec_email">Email PEC</label>
                <input
                  type="email"
                  id="pec_email"
                  name="pec_email"
                  value={formData.pec_email}
                  onChange={handleFormChange}
                  placeholder="azienda@pec.it"
                />
              </div>

              <div className="form-group">
                <label htmlFor="unique_code">Codice Univoco (alternativa alla PEC)</label>
                <input
                  type="text"
                  id="unique_code"
                  name="unique_code"
                  value={formData.unique_code}
                  onChange={handleFormChange}
                  placeholder="ABCD123"
                  maxLength="7"
                />
              </div>
            </div>
          </div>
        )}

        {/* Address Information */}
        <div className="form-section">
          <h3>Indirizzo di Fatturazione</h3>

          {/* Grid layout a 2 colonne per indirizzo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group md:col-span-2">
              <label htmlFor="billing_address">Indirizzo <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="billing_address"
                name="billing_address"
                value={formData.billing_address}
                onChange={handleFormChange}
                placeholder="Via Roma 123"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="city">Città <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                placeholder="Milano"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="province">Provincia <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="province"
                name="province"
                value={formData.province}
                onChange={handleFormChange}
                placeholder="MI"
                maxLength="2"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="postal_code">CAP <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                id="postal_code"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleFormChange}
                placeholder="20100"
                maxLength="5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="country">Paese</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleFormChange}
                placeholder="Italia"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Consents Section (integrated in registration form) */}
        {consentsLoading && (
          <div className="form-section">
            <p>Caricamento consensi...</p>
          </div>
        )}

        {consentData && !consentsLoading && (
          <div className="form-section">
            <h3>Consensi e Privacy</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Per completare la registrazione è necessario accettare i consensi obbligatori secondo il GDPR
            </p>

            {/* Required Consents */}
            {consentData.required_consents.map(consentType => {
              const template = consentData.templates[consentType];
              if (!template) return null;

              return (
                <div key={consentType} className="consent-item required" style={{ marginBottom: '16px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                  <div className="consent-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id={consentType}
                      checked={userConsents[consentType] || false}
                      onChange={(e) => handleConsentChange(consentType, e.target.checked)}
                      style={{ marginTop: '4px', cursor: 'pointer' }}
                    />
                    <label htmlFor={consentType} style={{ flex: 1, cursor: 'pointer', fontSize: '14px' }}>
                      <strong>{template.title} <span style={{color: 'red'}}>*</span></strong>
                      <p style={{ margin: '4px 0 8px', color: '#666', fontSize: '13px' }}>{template.summary_text || template.description}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleExpandedConsent(consentType);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#5399d9',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '12px'
                        }}
                      >
                        {expandedConsent === consentType ? '▼ Nascondi testo completo' : '▶ Leggi il testo completo'}
                      </button>
                      {expandedConsent === consentType && (
                        <div style={{
                          marginTop: '12px',
                          padding: '12px',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontSize: '12px',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {template.full_text}
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              );
            })}

            {/* Optional Consents */}
            {consentData.optional_consents.length > 0 && (
              <>
                <h4 style={{ marginTop: '24px', marginBottom: '12px', fontSize: '16px' }}>Consensi Opzionali</h4>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                  Questi consensi sono facoltativi
                </p>
                {consentData.optional_consents.map(consentType => {
                  const template = consentData.templates[consentType];
                  if (!template) return null;

                  return (
                    <div key={consentType} className="consent-item optional" style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                      <div className="consent-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id={consentType}
                          checked={userConsents[consentType] || false}
                          onChange={(e) => handleConsentChange(consentType, e.target.checked)}
                          style={{ marginTop: '4px', cursor: 'pointer' }}
                        />
                        <label htmlFor={consentType} style={{ flex: 1, cursor: 'pointer', fontSize: '14px' }}>
                          <strong>{template.title}</strong>
                          <p style={{ margin: '4px 0 8px', color: '#666', fontSize: '13px' }}>{template.summary_text || template.description}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              toggleExpandedConsent(consentType);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#5399d9',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '12px'
                            }}
                          >
                            {expandedConsent === consentType ? '▼ Nascondi testo completo' : '▶ Leggi il testo completo'}
                          </button>
                          {expandedConsent === consentType && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px',
                              backgroundColor: '#fff',
                              borderRadius: '4px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              fontSize: '12px',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {template.full_text}
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        <div className="trial-info">
          <p>🎉 Piano Trial: <strong>{trialData.maxApiCalls} analisi gratuite</strong> per {trialData.trialDays} giorni</p>
        </div>

        <button
          type="submit"
          className="auth-button primary"
          disabled={localLoading || consentsLoading || !consentData}
        >
          {localLoading ? 'Registrazione in corso...' : 'Completa registrazione'}
        </button>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="auth-form">
      <div className="auth-header success">
        <h2>Registrazione completata!</h2>
        <p>Il tuo account è stato creato con successo.</p>
      </div>

      <div className="success-info">
        <p>Controlla la tua email per la conferma di benvenuto.</p>
        <p>Verrai reindirizzato al login tra pochi secondi...</p>
      </div>
    </div>
  );

  // Render Terms Modal
  const renderTermsModal = () => {
    if (!termsModalOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={() => setTermsModalOpen(false)}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              {termsContent?.title || 'Termini e Condizioni'}
            </h2>
            <button
              type="button"
              onClick={() => setTermsModalOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '0 8px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Content */}
          <div style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1
          }}>
            {termsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Caricamento...</p>
              </div>
            ) : termsContent ? (
              <>
                {termsContent.description && (
                  <p style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '20px',
                    fontStyle: 'italic'
                  }}>
                    {termsContent.description}
                  </p>
                )}
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#333'
                }}>
                  {termsContent.full_text}
                </div>
                {termsContent.version && (
                  <p style={{
                    fontSize: '12px',
                    color: '#999',
                    marginTop: '20px',
                    textAlign: 'right'
                  }}>
                    Versione: {termsContent.version}
                  </p>
                )}
              </>
            ) : (
              <p style={{ textAlign: 'center', color: '#666' }}>
                Contenuto non disponibile
              </p>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={() => setTermsModalOpen(false)}
              className="auth-button primary"
              style={{ minWidth: '120px' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  const renderMainContent = () => {
    switch (currentStep) {
      case REGISTRATION_STEPS.DOCTOR_VERIFICATION:
        return renderDoctorVerification();
      case REGISTRATION_STEPS.EMAIL_VERIFICATION:
        return renderEmailVerification();
      case REGISTRATION_STEPS.EMAIL_CONFIRM:
        return renderEmailConfirmation();
      case REGISTRATION_STEPS.AUTO_CONFIRM:
        // Show loading while auto-validating email from link
        return (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
            <h3 style={{ marginBottom: '12px', color: '#1B3950' }}>Verifica in corso...</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Stiamo verificando il tuo indirizzo email, attendere...
            </p>
          </div>
        );
      case REGISTRATION_STEPS.REGISTRATION_FORM:
        return renderRegistrationForm();
      case REGISTRATION_STEPS.SUCCESS:
        return renderSuccess();
      default:
        return renderDoctorVerification();
    }
  };

  return (
    <>
      {renderMainContent()}
      {renderTermsModal()}
    </>
  );
};

export default RegisterForm;