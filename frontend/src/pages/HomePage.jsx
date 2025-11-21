import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import PageWrapper from '../components/common/PageWrapper';
import ReportResults from '../components/reports/ReportResults';
import ToastContainer from '../components/common/ToastContainer';
import ResetPasswordModal from '../components/auth/ResetPasswordModal';
import ActivateB2BModal from '../components/auth/ActivateB2BModal';
import LegalModal from '../components/common/LegalModal';
import Paywall from '../components/common/Paywall';
import CookieConsentBanner from '../components/common/CookieConsentBanner';
import useToast from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { generalAPI, reportsAPI, specialtiesAPI, inputTemplatesAPI, platformFeaturesAPI } from '../services/api';

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

const HomePage = () => {
  // UI State
  const [reportContent, setReportContent] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);
  const [isClosingModal, setIsClosingModal] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState([]);
  const [showTranscriptionUpgradeModal, setShowTranscriptionUpgradeModal] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // SSE Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Input templates state
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [hasTemplatesFeature, setHasTemplatesFeature] = useState(false);

  // System status
  const [systemStatus, setSystemStatus] = useState(null);

  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  // Activate B2B modal state
  const [showActivateB2BModal, setShowActivateB2BModal] = useState(false);
  const [activateB2BEmail, setActivateB2BEmail] = useState(null);
  const [activateB2BToken, setActivateB2BToken] = useState(null);

  // Legal modal state
  const [legalModalContent, setLegalModalContent] = useState(null);

  // Paywall state
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);

  // Refs for cleanup
  const scrollTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  // Progressive rendering refs
  const bufferQueueRef = useRef([]);
  const renderIntervalRef = useRef(null);

  const { toasts, removeToast, showSuccess, showError } = useToast();
  const { isAuthenticated, user, isLoading, openAuthModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check subscription status and show paywall if needed
  // Wait for auth state to be fully loaded before showing paywall
  useEffect(() => {
    // Only check paywall when authenticated AND user data is loaded (not loading)
    if (isAuthenticated && user && !isLoading) {
      const isTrialUser = user.subscription_plan === 'trial';
      const isExpired = user.expires_at && new Date(user.expires_at) < new Date();
      const isInactive = user.subscription_status !== 'active';

      // Show paywall for expired or inactive subscriptions
      if ((isExpired || isInactive) && !paywallDismissed) {
        setShowPaywall(true);
      } else if (isTrialUser && !isExpired && !paywallDismissed) {
        // Show dismissible overlay for active trial users
        setShowPaywall(true);
      } else {
        setShowPaywall(false);
      }
    } else {
      // Not authenticated or still loading - hide paywall
      setShowPaywall(false);
    }
  }, [isAuthenticated, user, isLoading, paywallDismissed]);

  useEffect(() => {
    checkSystemStatus();
    loadSpecialties();
    // Check for debug mode in localStorage
    setDebugMode(localStorage.getItem('refertosicuro_debug') === 'true');
  }, [isAuthenticated]);


  // Handle state from email verification redirect or URL params
  useEffect(() => {
    // Check location.state first (from navigate)
    if (location.state?.openRegistration) {
      const verificationData = (location.state.email || location.state.verificationToken) ? {
        email: location.state.email,
        verificationToken: location.state.verificationToken,
        step: location.state.step || 'email_confirm'
      } : null;
      openAuthModal('register', verificationData);
      return;
    }

    // Check URL params (from email link)
    const searchParams = new URLSearchParams(location.search);

    // Handle password reset link: /?reset=true&token=xxx
    if (searchParams.get('reset') === 'true') {
      const token = searchParams.get('token');
      if (token) {
        setResetToken(token);
        setShowResetPasswordModal(true);
        // Clean URL
        navigate('/', { replace: true });
      }
    }
    // Handle B2B activation link: /?activate=b2b&email=xxx&token=xxx
    else if (searchParams.get('activate') === 'b2b') {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      if (token) {
        setActivateB2BToken(token);
        setActivateB2BEmail(email || null);
        setShowActivateB2BModal(true);
        // Clean URL
        navigate('/', { replace: true });
      }
    }
    // Handle email verification link: /?verify=email&email=xxx&token=xxx&nome=xxx&cognome=xxx...
    else if (searchParams.get('verify') === 'email') {
      const email = searchParams.get('email');
      const token = searchParams.get('token');
      const nome = searchParams.get('nome');
      const cognome = searchParams.get('cognome');
      const birthDate = searchParams.get('birth_date');
      const odmNumber = searchParams.get('odm');

      if (email) {
        const verificationData = {
          email: email,
          verificationToken: token || '',
          step: token ? 'auto_confirm' : 'email_confirm',  // auto_confirm if token present
          // Include FNOMCeO data if available
          fnomceoData: (nome || cognome || birthDate || odmNumber) ? {
            nome: nome || '',
            cognome: cognome || '',
            birth_date: birthDate || '',
            odm_number: odmNumber || ''
          } : null
        };
        openAuthModal('register', verificationData);
        // Clean URL
        navigate('/', { replace: true });
      }
    }
    // Legacy registration link
    else if (searchParams.get('register') === 'true') {
      openAuthModal('register');
    }
  }, [location.state, location.search, navigate, openAuthModal]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside the dropdown area
      const dropdownContainer = event.target.closest('[data-dropdown-container]');
      const isSubmitButton = event.target.closest('[data-submit-button]');

      // Don't close dropdown if clicking on submit button or inside dropdown container
      if (!dropdownContainer && !isSubmitButton && showSpecialtyDropdown) {
        setShowSpecialtyDropdown(false);
      }
    };

    let timeoutId;
    if (showSpecialtyDropdown) {
      // Use a slight delay to avoid immediate closure
      timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 100);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSpecialtyDropdown]);

  // Cleanup progressive rendering on unmount
  useEffect(() => {
    return () => {
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
      }
    };
  }, []);

  // Prevent body scroll when specialty dropdown is open
  useEffect(() => {
    if (showSpecialtyDropdown) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup: restore scroll on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSpecialtyDropdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      // Cleanup audio recording resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await generalAPI.health();
      setSystemStatus(response.data);
    } catch (error) {
      // Silent fail
    }
  };


  const loadSpecialties = async () => {
    try {
      let response;

      if (isAuthenticated) {
        response = await specialtiesAPI.getUserSpecialties();
      } else {
        response = await specialtiesAPI.getAll();
      }

      const newSpecialties = response.data.specialties || [];
      setSpecialties(newSpecialties);

      // Validate current selection is still available
      if (selectedSpecialty && newSpecialties.length > 0) {
        const availableSpecialtyIds = newSpecialties.map(s => s.id);
        if (!availableSpecialtyIds.includes(selectedSpecialty)) {
          setSelectedSpecialty('');
        }
      }

      // If no specialties, clear selection
      if (newSpecialties.length === 0 && selectedSpecialty) {
        setSelectedSpecialty('');
      }

    } catch (err) {
      setSpecialties([]);
      // Clear selection on error
      if (selectedSpecialty) {
        setSelectedSpecialty('');
      }
    }
  };

  // Load user features to check templates access
  useEffect(() => {
    const loadFeatures = async () => {
      if (!isAuthenticated) {
        setHasTemplatesFeature(false);
        return;
      }

      try {
        const response = await platformFeaturesAPI.getMyFeatures();
        const templatesFeature = response.data.find(f => f.feature_id === 'custom_input_templates');
        setHasTemplatesFeature(templatesFeature?.has_access || false);
      } catch (error) {
        console.error('Error loading features:', error);
        setHasTemplatesFeature(false);
      }
    };

    loadFeatures();
  }, [isAuthenticated]);

  const loadTemplates = async () => {
    // Only load templates if user has access to the feature
    if (!isAuthenticated || !selectedSpecialty || !hasTemplatesFeature) {
      setAvailableTemplates([]);
      return;
    }

    try {
      const response = await inputTemplatesAPI.getAll(selectedSpecialty, true);
      setAvailableTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setAvailableTemplates([]);
    }
  };

  // Load templates when specialty changes or feature access changes
  useEffect(() => {
    loadTemplates();
  }, [selectedSpecialty, isAuthenticated, hasTemplatesFeature]);

  // Auto-resize textarea when content changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && reportContent) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [reportContent]);

  // Function to handle modal close with animation
  const handleCloseModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setShowSpecialtyDropdown(false);
      setIsClosingModal(false);
    }, 300); // Match animation duration
  };

  // Voice recording functions
  const analyzeAudioLevel = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume for silence detection
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const SILENCE_THRESHOLD = 5; // Very low threshold for silence detection

    // Take samples for spectrum visualization (7 bars)
    const bars = 7;
    const step = Math.floor(bufferLength / bars);
    const spectrum = [];

    for (let i = 0; i < bars; i++) {
      const index = i * step;
      const value = dataArray[index];
      // Normalize to 0-100 with 2.25x boost for visibility
      spectrum.push(Math.min(100, (value / 255) * 225));
    }

    setAudioLevel(spectrum);

    // Silence detection: stop recording after 5 seconds of silence
    if (average < SILENCE_THRESHOLD) {
      if (!silenceTimeoutRef.current) {
        // Start silence timer
        silenceTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, 5000); // 5 seconds
      }
    } else {
      // Audio detected, clear silence timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }

    // Continue animation loop if recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
    }
  };

  const startRecording = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    // Check subscription plan - require Trial, Medium or above (excludes only Basic)
    const allowedPlans = ['trial', 'medium', 'professional', 'enterprise'];
    if (user && !allowedPlans.includes(user.subscription_plan) && user.account_type !== 'admin') {
      setShowTranscriptionUpgradeModal(true);
      return;
    }

    try {
      // Request microphone with specific constraints to avoid system audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Explicitly request microphone (not system audio)
          channelCount: 1
        }
      });

      const audioTrack = stream.getAudioTracks()[0];

      // Force enable the track if it's disabled or muted
      if (!audioTrack.enabled) {
        audioTrack.enabled = true;
      }

      // Note: We cannot directly unmute a track that's muted by the system
      // But we can ensure it's enabled
      if (audioTrack.muted) {
        showError('Microfono silenziato. Controlla le impostazioni audio di macOS o i permessi del browser.');
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      // Setup audio analysis
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048; // Larger FFT for better resolution
      analyserRef.current.smoothingTimeConstant = 0.3; // Less smoothing for more reactive display

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        setAudioLevel([]);

        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start audio level analysis
      analyzeAudioLevel();

      showSuccess('Registrazione avviata');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showError('Permesso microfono negato. Abilita il microfono nelle impostazioni del browser.');
      } else {
        showError('Errore durante l\'avvio della registrazione: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    // Check MediaRecorder state directly (not React state) to avoid stale closure issues
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Clear silence timeout if exists
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // IMPORTANT: Cancel animation frame IMMEDIATELY to stop audio analysis loop
      // This prevents duplicate "Silence detected" messages
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      showSuccess('Registrazione terminata. Trascrizione in corso...');
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);

    try {
      const audioFile = new File([audioBlob], 'recording.webm', { type: audioBlob.type });
      const response = await reportsAPI.transcribe(audioFile);
      const transcribedText = response.data.transcription;

      // Insert transcribed text at cursor position instead of replacing
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentText = reportContent;

        // Insert text at cursor position
        const newText = currentText.substring(0, start) + transcribedText + currentText.substring(end);
        setReportContent(newText);

        // Set cursor position after inserted text
        setTimeout(() => {
          const newCursorPos = start + transcribedText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      } else {
        // Fallback: append if textarea ref not available
        setReportContent(prev => prev + transcribedText);
      }

      showSuccess(`Trascrizione completata (${response.data.processing_time?.toFixed(1)}s)`);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Errore durante la trascrizione audio';
      showError(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Progressive rendering functions for smooth typing effect
  const startProgressiveRendering = () => {
    if (renderIntervalRef.current) return; // Already running

    renderIntervalRef.current = setInterval(() => {
      if (bufferQueueRef.current.length === 0) return;

      // Render 3-5 characters at a time for smooth effect
      const charsToRender = Math.min(4, bufferQueueRef.current.length);
      const chunk = bufferQueueRef.current.splice(0, charsToRender).join('');

      setResults(prev => ({
        ...prev,
        data: {
          ...prev.data,
          improved_content: prev.data.improved_content + chunk
        }
      }));
    }, 25); // 25ms interval = ~40 chars/sec = smooth readable speed
  };

  const stopProgressiveRendering = () => {
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }

    // Flush remaining buffer immediately
    if (bufferQueueRef.current.length > 0) {
      const remaining = bufferQueueRef.current.join('');
      bufferQueueRef.current = [];
      setResults(prev => ({
        ...prev,
        data: {
          ...prev.data,
          improved_content: prev.data.improved_content + remaining
        }
      }));
    }
  };

  const handleImproveReport = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }

    if (reportContent.trim().length < 10) {
      showError('Il referto deve contenere almeno 10 caratteri');
      return;
    }

    // Validate selected specialty is available for authenticated user
    if (selectedSpecialty) {
      const availableSpecialtyIds = specialties.map(s => s.id);
      if (!availableSpecialtyIds.includes(selectedSpecialty)) {
        showError('Specializzazione non disponibile per il tuo piano. Seleziona una specializzazione valida.');
        return;
      }
    }

    setLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    setResults(null);

    // Reset progressive rendering state
    bufferQueueRef.current = [];
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }

    try {
      // Get assistant_id from selected specialty (only if specialty is selected)
      let assistantId = null;
      if (selectedSpecialty && specialties && specialties.length > 0) {
        const selectedSpecialtyObj = specialties.find(s => s.id === selectedSpecialty);
        assistantId = selectedSpecialtyObj?.assistant_id || null;
      }

      const requestData = {
        content: reportContent,
        report_type: selectedSpecialty || 'medicina_generale',
        ...(assistantId && { assistant_id: assistantId })  // Only add if not null
      };

      let finalImprovedText = '';
      let validationResult = null;

      // Initialize results object for streaming
      const streamingResults = {
        type: 'improvement',
        data: { improved_content: '' },
        originalContent: reportContent,
      };
      setResults(streamingResults);

      // Start SSE streaming
      await reportsAPI.improveStreamingSSE(requestData, (event) => {
        switch (event.type) {
          case 'validation':
            validationResult = event.data;
            break;

          case 'ttft':
            // First token received - start progressive rendering
            startProgressiveRendering();
            break;

          case 'delta':
            // Text chunk arrived - add to buffer queue
            finalImprovedText += event.data.delta;
            setStreamingText(finalImprovedText);
            // Push each character to buffer queue for progressive rendering
            for (const char of event.data.delta) {
              bufferQueueRef.current.push(char);
            }
            break;

          case 'done':
            // Stream complete - stop rendering and set final results
            stopProgressiveRendering();
            const { improved_content, metrics } = event.data;
            setResults({
              type: 'improvement',
              data: {
                improved_content: improved_content,
                validation: validationResult,
                metrics: metrics
              },
              originalContent: reportContent,
            });
            break;

          case 'error':
            stopProgressiveRendering();
            throw new Error(event.data?.message || 'Streaming error');
        }
      });

      setIsStreaming(false);
      showSuccess('Referto migliorato con successo!');

      // Scroll automatico verso i risultati
      scrollTimeoutRef.current = setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
        scrollTimeoutRef.current = null;
      }, 300);
    } catch (err) {
      let errorMessage = 'Errore durante il miglioramento';

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;

        // Handle array of validation errors (422 responses)
        if (Array.isArray(detail)) {
          errorMessage = detail.map(error => {
            if (typeof error === 'object' && error.msg) {
              return error.msg;
            }
            return String(error);
          }).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      }

      if (err.response?.status === 401) {
        showError('Sessione scaduta. Effettua nuovamente il login.');
        openAuthModal('login');
      } else if (err.response?.status === 429) {
        // Distinguish between rate limiting and API quota exceeded
        const responseDetail = err.response?.data?.detail;
        if (responseDetail && responseDetail.includes('Rate limit exceeded')) {
          // Temporary rate limit (per-minute window)
          showError('Troppe richieste. Riprova tra qualche secondo.');
        } else if (responseDetail && responseDetail.includes('API call limit exceeded')) {
          // API quota exhausted (monthly/subscription limit)
          showError('Limite di utilizzo raggiunto. Aggiorna il tuo piano per continuare.');
        } else {
          // Fallback generic message
          showError('Limite di utilizzo temporaneo raggiunto. Riprova tra poco.');
        }
      } else {
        showError(errorMessage);
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      stopProgressiveRendering();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (reportContent.trim().length >= 10 && !loading) {
        handleImproveReport();
      }
    }
  };

  // Handler for when user tries to type without selecting specialty
  const handleTextareaFocus = () => {
    if (!selectedSpecialty && isAuthenticated) {
      setShowSpecialtyDropdown(true);
    }
  };

  const handleTextareaChange = (e) => {
    // If user starts typing without specialty selected, open dropdown
    if (!selectedSpecialty && e.target.value.length > 0 && isAuthenticated) {
      setShowSpecialtyDropdown(true);
    }
    setReportContent(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const insertTemplate = (templateContent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = reportContent;

    // Insert template at cursor position
    const newText = currentText.substring(0, start) + templateContent + currentText.substring(end);
    setReportContent(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      const newCursorPos = start + templateContent.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);

    showSuccess('Template inserito');
  };


  const selectedSpecialtyData = specialties.find(s => s.id === selectedSpecialty);
  const hasResults = !!results || isStreaming;

  // Helper function to check if subscription is expired or blocked
  const isSubscriptionBlocked = () => {
    if (!isAuthenticated || !user) return false;
    const isExpired = user.expires_at && new Date(user.expires_at) < new Date();
    const isInactive = user.subscription_status !== 'active';
    return isExpired || isInactive;
  };

  // Helper function to determine if paywall can be dismissed
  const canDismissPaywall = () => {
    if (!isAuthenticated || !user) return false;
    const isTrialUser = user.subscription_plan === 'trial';
    const isExpired = user.expires_at && new Date(user.expires_at) < new Date();
    const isInactive = user.subscription_status !== 'active';
    // Can dismiss only if trial user and not expired/inactive
    return isTrialUser && !isExpired && !isInactive;
  };

  return (
    <Layout>
      <PageWrapper>
        {showPaywall && (
          <Paywall
            user={user}
            canDismiss={canDismissPaywall()}
            onDismiss={() => setPaywallDismissed(true)}
          />
        )}
        <div className={`flex flex-col ${!hasResults ? 'min-h-screen' : ''}`}>
        {/* Main Content */}
        <div className={`flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 ${!hasResults ? 'justify-center' : 'py-8'}`}>

          {/* Hero Section - Always visible but compact when results are shown */}
          <div className={`text-center transition-all duration-500 ${hasResults ? 'mb-6' : 'mb-12'} animate-fade-in`}>
            {/* Logo */}
            <div className={`transition-all duration-500 ${hasResults ? 'mb-3' : 'mb-8'}`}>
              <img
                src="/logo.png"
                alt="Referto Sicuro Logo"
                className={`mx-auto object-contain transition-all duration-500 ${hasResults ? 'w-16 h-16' : 'w-32 h-32'}`}
              />
            </div>
            <h1 className={`heading-display transition-all duration-500 ${hasResults ? 'text-3xl mb-3' : 'mb-6'}`}>
              Referto Sicuro
            </h1>
            {!hasResults && (
              <>
                <p className="text-xl text-soft max-w-2xl mx-auto">
                  Migliora i tuoi referti medici con l'intelligenza artificiale e
                  la knowledge base medica più avanzata
                </p>
                {isAuthenticated && (
                  <div className="mt-4">
                    <div className="flex items-center gap-3 text-sm text-orange-600 font-medium bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p>
                        Stai utilizzando una versione Beta. Non inserire dati sensibili e verifica sempre i contenuti generati.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Chat-like Input Interface */}
          <div className={`
            ${hasResults ? 'mb-8' : 'mb-12'}
            transition-all duration-700 ease-out
          `}>
            <div className="relative max-w-4xl mx-auto">

              {/* Main Input Container */}
              <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-large border border-white/30">

                {/* Specialty Selector Bar */}
                <div className="border-b border-neutral-100 px-6 py-3 flex items-center justify-between">
                  <button
                    onClick={() => setShowSpecialtyDropdown(!showSpecialtyDropdown)}
                    className="flex items-center space-x-2 text-sm text-neutral-600 hover:text-medical-600 transition-colors"
                  >
                    <img
                      src="/logo_spec.png"
                      alt="Specialization icon"
                      className="w-5 h-5 object-contain"
                    />
                    <span>{selectedSpecialtyData ? selectedSpecialtyData.name : 'Seleziona specializzazione'}</span>
                    <svg className={`w-4 h-4 transition-transform ${showSpecialtyDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Clear button */}
                  {reportContent.length > 0 && (
                    <button
                      onClick={() => {
                        setReportContent('');
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto';
                        }
                      }}
                      disabled={loading || isRecording || isTranscribing}
                      className="flex items-center justify-center p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Svuota campo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Text Input Area */}
                <div className="p-6">
                  <textarea
                    ref={textareaRef}
                    value={reportContent}
                    onChange={handleTextareaChange}
                    onFocus={handleTextareaFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="Inserisci qui il testo del referto..."
                    disabled={loading}
                    rows={hasResults ? 4 : 8}
                    className={`
                      w-full resize-none border-none outline-none bg-transparent text-base placeholder-neutral-400 overflow-y-auto
                      ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    style={{
                      minHeight: hasResults ? '100px' : '200px',
                      maxHeight: '60vh'
                    }}
                  />

                  {/* Template Selector */}
                  {isAuthenticated && availableTemplates.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium text-neutral-600">Template rapidi:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {availableTemplates.slice(0, 6).map(template => (
                          <button
                            key={template.id}
                            onClick={() => insertTemplate(template.template_content)}
                            disabled={loading || isRecording || isTranscribing}
                            className="group relative p-3.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                            title="Clicca per inserire questo template"
                          >
                            {/* Header con icona e indicatore */}
                            <div className="flex items-start justify-between mb-2.5">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-neutral-800 line-clamp-1 group-hover:text-neutral-900">
                                  {template.template_name}
                                </div>
                              </div>
                              <svg className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>

                            {/* Anteprima contenuto */}
                            <div className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                              {template.template_content.substring(0, 100)}...
                            </div>
                          </button>
                        ))}

                        {availableTemplates.length > 6 && (
                          <button
                            onClick={() => navigate('/template')}
                            className="p-3.5 rounded-lg bg-white hover:bg-neutral-50 border border-dashed border-neutral-300 hover:border-neutral-400 shadow-sm hover:shadow transition-all duration-200 flex flex-col items-center justify-center min-h-[88px]"
                            title="Vedi tutti i template"
                          >
                            <svg className="w-5 h-5 text-neutral-400 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-neutral-600 font-medium">
                              Altri {availableTemplates.length - 6}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-4">
                      {/* Character count */}
                      <span className="text-xs text-neutral-400">
                        {reportContent.length} caratteri
                      </span>
                    </div>

                    {/* File Upload and Submit Buttons */}
                    <div className="flex items-center space-x-3">
                      {/* Voice Recording Button with Spectrum */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={loading || isTranscribing}
                          className={`
                            flex items-center justify-center p-2 transition-all
                            ${isRecording
                              ? 'text-red-500 animate-pulse'
                              : isTranscribing
                              ? 'text-neutral-400 cursor-wait'
                              : 'hover:opacity-70'
                            }
                            ${(loading || isTranscribing) ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                          style={{
                            color: isRecording ? undefined : (isTranscribing ? undefined : '#5399d9')
                          }}
                          title={isRecording ? 'Ferma registrazione' : isTranscribing ? 'Trascrizione in corso...' : 'Registra audio (disponibile da piano Basic)'}
                        >
                          {isRecording ? (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="6" width="12" height="12" rx="2" />
                            </svg>
                          ) : isTranscribing ? (
                            <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                            </svg>
                          )}
                        </button>

                        {/* Audio Spectrum Visualizer */}
                        {isRecording && (
                          <div className="flex items-center space-x-0.5">
                            {audioLevel.map((value, index) => (
                              <div
                                key={index}
                                className="w-0.5 rounded-full transition-all duration-75 ease-out"
                                style={{
                                  height: `${Math.max(2, value / 3)}px`,
                                  backgroundColor: '#5399d9',
                                  opacity: 0.8
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                    <button
                      onClick={handleImproveReport}
                      disabled={reportContent.trim().length < 10 || loading || isRecording || isTranscribing}
                      data-submit-button
                      className={`
                        flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all
                        ${reportContent.trim().length < 10 || loading || isRecording || isTranscribing
                          ? 'bg-neutral-100 cursor-not-allowed'
                          : 'bg-white shadow-large hover:scale-105'
                        }
                      `}
                      style={{
                        color: (reportContent.trim().length < 10 || loading || isRecording || isTranscribing) ? '#9ca3af' : '#5399d9'
                      }}
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-400 rounded-full"></div>
                          <span>Elaborazione...</span>
                        </>
                      ) : (
                        <>
                          <img
                            src="/ai_icona.png"
                            alt="AI icon"
                            className={`w-5 h-5 object-contain transition-all ${
                              reportContent.trim().length < 10 || loading ? 'opacity-50 grayscale' : ''
                            }`}
                          />
                          <span>Migliora con AI</span>
                        </>
                      )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal Notice - Visible only when NO results */}
              {!hasResults && (
                <div className="text-center text-xs text-gray-500 mt-8">
                  Chattando con Referto Sicuro accetti i nostri{' '}
                  <button
                    onClick={() => setLegalModalContent('terms_conditions')}
                    className="text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Termini e Condizioni
                  </button>
                  , confermi di aver letto la nostra{' '}
                  <button
                    onClick={() => setLegalModalContent('privacy_policy')}
                    className="text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Privacy Policy
                  </button>
                  {' '}e la{' '}
                  <button
                    onClick={() => setLegalModalContent('cookie_policy')}
                    className="text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Cookie Policy
                  </button>
                  .
                </div>
              )}

            </div>
          </div>

          {/* Specialty Selection Modal - Popup Indipendente */}
          {showSpecialtyDropdown && (
            <>
              {/* Backdrop overlay */}
              <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10000]"
                style={{
                  animation: isClosingModal ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
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
                      Scegli la specializzazione più adatta per il tuo referto
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
                          onClick={() => {
                            setSelectedSpecialty(specialty.id);
                            handleCloseModal();
                          }}
                          className={`
                            relative p-4 rounded-xl transition-all duration-200 text-left hover:scale-[1.02] cursor-pointer group
                            ${selectedSpecialty === specialty.id
                              ? 'bg-medical-50 text-medical-700 ring-2 ring-medical-200'
                              : 'bg-white hover:bg-neutral-50'
                            }
                          `}
                          style={{
                            boxShadow: selectedSpecialty === specialty.id
                              ? '0 8px 25px rgba(83, 153, 217, 0.4), 0 4px 10px rgba(83, 153, 217, 0.25)'
                              : '0 4px 15px rgba(83, 153, 217, 0.3), 0 2px 6px rgba(83, 153, 217, 0.2)',
                            transition: 'all 0.3s ease',
                            border: selectedSpecialty === specialty.id ? '2px solid #5399d9' : '2px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedSpecialty !== specialty.id) {
                              e.currentTarget.style.border = '2px solid #5399d9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSpecialty !== specialty.id) {
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

          {/* Results Section */}
          {hasResults && (
            <div className="max-w-4xl mx-auto w-full animate-slide-up relative" id="results-section">
              <ReportResults
                results={results}
                isStreaming={isStreaming}
              />

              {/* Legal Notice */}
              <div className="text-center text-xs text-gray-500 mt-8">
                Chattando con Referto Sicuro accetti le nostre{' '}
                <a href="/terms" className="text-blue-600 hover:underline">
                  Condizioni d'uso
                </a>
                , confermi di aver letto l'
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Informativa sulla privacy
                </a>
                . Vedi{' '}
                <a href="/cookies" className="text-blue-600 hover:underline">
                  Preferenze sui cookie
                </a>
                .
              </div>
            </div>
          )}

          {/* Debug Section */}
          {debugMode && hasResults && (
            <div className="max-w-4xl mx-auto w-full mt-8 animate-slide-up">
              <div className="card-compact">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="heading-md">Debug Information</h3>
                  <span className="status-info">Debug Mode</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* System Status */}
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-3">System Status</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-soft">AI Service</span>
                        <span className={systemStatus?.services?.ai_service === 'available' ? 'status-success' : 'status-error'}>
                          {systemStatus?.services?.ai_service === 'available' ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-soft">API Version</span>
                        <span className="status-info">v{systemStatus?.version || '1.0.0'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div>
                    <h4 className="font-semibold text-neutral-800 mb-3">Request Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-soft">Specialty</span>
                        <span className="text-sm font-medium text-neutral-700">
                          {selectedSpecialtyData?.name || 'None selected'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-soft">Content Length</span>
                        <span className="text-sm font-medium text-neutral-700">
                          {reportContent.length} chars
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Toggle (hidden, activated by localStorage) */}
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => {
              const newDebugMode = !debugMode;
              setDebugMode(newDebugMode);
              localStorage.setItem('refertosicuro_debug', newDebugMode.toString());
            }}
            className="opacity-0 hover:opacity-100 transition-opacity duration-300 p-2 bg-neutral-800 text-white rounded-full text-xs"
            title="Toggle Debug Mode"
          >
            🐛
          </button>
        </div>


        {/* Toast Container */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        {/* Reset Password Modal */}
        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetToken(null);
          }}
          token={resetToken}
        />

        {/* Activate B2B Modal */}
        <ActivateB2BModal
          isOpen={showActivateB2BModal}
          onClose={() => {
            setShowActivateB2BModal(false);
            setActivateB2BEmail(null);
            setActivateB2BToken(null);
          }}
          email={activateB2BEmail}
          token={activateB2BToken}
        />

        {/* Legal Modals */}
        <LegalModal
          isOpen={legalModalContent === 'privacy_policy'}
          onClose={() => setLegalModalContent(null)}
          consentType="privacy_policy"
          title="Privacy Policy"
        />
        <LegalModal
          isOpen={legalModalContent === 'cookie_policy'}
          onClose={() => setLegalModalContent(null)}
          consentType="cookie_policy"
          title="Cookie Policy"
        />
        <LegalModal
          isOpen={legalModalContent === 'terms_conditions'}
          onClose={() => setLegalModalContent(null)}
          consentType="terms_conditions"
          title="Termini e Condizioni"
        />

        {/* Transcription Upgrade Modal */}
        {showTranscriptionUpgradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn">
              {/* Close button */}
              <button
                onClick={() => setShowTranscriptionUpgradeModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="#5399d9" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#5399d9' }}>
                  Trascrizione Vocale
                </h3>
                <p className="text-neutral-600 mb-4">
                  La trascrizione vocale è disponibile a partire dal piano <strong>Medium</strong>.
                </p>
                <p className="text-neutral-500 text-sm">
                  Passa a un piano superiore per dettare i tuoi referti usando la voce!
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setShowTranscriptionUpgradeModal(false);
                    navigate('/pricing');
                  }}
                  className="w-full py-3 px-6 rounded-2xl font-medium transition-all shadow-large hover:scale-105"
                  style={{ backgroundColor: '#5399d9', color: 'white' }}
                >
                  Vedi Piani e Prezzi
                </button>
                <button
                  onClick={() => setShowTranscriptionUpgradeModal(false)}
                  className="w-full py-3 px-6 rounded-2xl font-medium transition-all bg-neutral-100 hover:bg-neutral-200"
                  style={{ color: '#5399d9' }}
                >
                  Forse più tardi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cookie Consent Banner - Only for non-authenticated users */}
        <CookieConsentBanner
          onOpenCookiePolicy={() => setLegalModalContent('cookie_policy')}
          isAuthenticated={isAuthenticated}
        />
        </div>
      </PageWrapper>
    </Layout>
  );
};

export default HomePage;