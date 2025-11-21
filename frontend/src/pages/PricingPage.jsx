import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import ToastContainer from '../components/common/ToastContainer';
import useToast from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white/60 rounded-2xl" style={{boxShadow: '0 0 20px rgba(27, 57, 80, 0.4)'}}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 flex items-center justify-between rounded-2xl"
      >
        <h4 className="font-medium text-neutral-800">{question}</h4>
        <svg
          className={`w-5 h-5 text-neutral-600 transition-smooth ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className="overflow-hidden"
        style={{
          maxHeight: isOpen ? '200px' : '0px',
          paddingBottom: isOpen ? '24px' : '0px',
          transition: 'all 0.5s cubic-bezier(0.23, 1, 0.32, 1)'
        }}
      >
        <div className="px-6">
          <p className="text-neutral-600 text-sm">{answer}</p>
        </div>
      </div>
    </div>
  );
};

const PricingPageNew = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, showSuccess, showError } = useToast();

  // State
  const [tiers, setTiers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [platformFeatures, setPlatformFeatures] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [paymentProvider, setPaymentProvider] = useState('stripe'); // 'stripe' | 'paypal'
  const [pricingResult, setPricingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Icon mapping for specialties
  const getSpecialtyIcon = (specialtyCode) => {
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

    const iconFileName = iconMap[specialtyCode] || `${specialtyCode}.svg`;
    return `/icons_specialties/${iconFileName}`;
  };

  // Load data
  useEffect(() => {
    const loadPricingData = async () => {
      try {
        setLoadingData(true);
        const [tiersResponse, specialtiesResponse, featuresResponse] = await Promise.all([
          api.get('/pricing/tiers?customer_type=b2c'),
          api.get('/pricing/specialties'),
          api.get('/platform-features/public')
        ]);

        setTiers(tiersResponse.data);
        setSpecialties(specialtiesResponse.data);

        // Flatten features object (grouped by category) into array
        const featuresData = featuresResponse.data || {};
        const flattenedFeatures = Object.values(featuresData).flat();
        setPlatformFeatures(flattenedFeatures);

        // Auto-select Basic plan
        const basicTier = tiersResponse.data.find(t => t.tier_id === 'basic') || tiersResponse.data[1];
        if (basicTier) {
          setSelectedTier(basicTier);
        }

        // Auto-include medicina_generale
        const medicinaGenerale = specialtiesResponse.data.find(s => s.code === 'medicina_generale');
        if (medicinaGenerale) {
          setSelectedSpecialties([medicinaGenerale.specialty_id]);
        }

      } catch (error) {
        showError('Errore nel caricamento dei dati pricing');
      } finally {
        setLoadingData(false);
      }
    };

    loadPricingData();
  }, [showError]);

  // Auto-adjust specialties when tier changes
  useEffect(() => {
    if (selectedTier) {
      const maxSpecialties = getMaxSpecialtiesForTier(selectedTier);
      const medicinaGenerale = specialties.find(s => s.code === 'medicina_generale');

      setSelectedSpecialties(prev => {
        // Always keep medicina_generale
        const withoutMedicinaGenerale = prev.filter(id => id !== medicinaGenerale?.specialty_id);

        // Limit to max_specialties (excluding medicina_generale)
        const limited = withoutMedicinaGenerale.slice(0, maxSpecialties);

        // Add back medicina_generale
        return medicinaGenerale ? [medicinaGenerale.specialty_id, ...limited] : limited;
      });
    }
  }, [selectedTier]);

  // Calculate pricing when selection changes
  useEffect(() => {
    if (selectedTier && selectedTier.tier_id !== 'trial') {
      calculatePricing();
    }
  }, [selectedTier, selectedSpecialties, billingInterval]);

  const calculatePricing = async () => {
    if (!selectedTier) return;

    try {
      setLoading(true);
      const response = await api.post('/pricing/calculate/b2c', {
        tier_id: selectedTier.tier_id,
        specialty_ids: selectedSpecialties,
        billing_interval: billingInterval
      });
      setPricingResult(response.data);
    } catch (error) {
      showError('Errore nel calcolo del prezzo');
    } finally {
      setLoading(false);
    }
  };

  const getMaxSpecialtiesForTier = (tier) => {
    if (!tier) return 0;
    return tier.max_specialties || 99;
  };

  // Get platform features available for a tier (with tier hierarchy)
  const getFeaturesForTier = (tierId) => {
    if (!tierId || !platformFeatures.length) return [];

    const tierHierarchy = ['trial', 'basic', 'medium', 'professional', 'enterprise'];
    const tierIndex = tierHierarchy.indexOf(tierId);

    return platformFeatures.filter(feature => {
      // If allowed_tiers is set, use explicit list
      if (feature.allowed_tiers && feature.allowed_tiers.length > 0) {
        return feature.allowed_tiers.includes(tierId);
      }

      // Otherwise use tier hierarchy
      const featureTierIndex = tierHierarchy.indexOf(feature.minimum_tier_id);
      return featureTierIndex !== -1 && tierIndex >= featureTierIndex;
    }).sort((a, b) => a.display_order - b.display_order);
  };

  const handleSpecialtyToggle = (specialtyId, specialty) => {
    // Don't allow deselecting medicina_generale
    if (specialty.code === 'medicina_generale') return;

    setSelectedSpecialties(prev => {
      const isSelected = prev.includes(specialtyId);

      if (isSelected) {
        return prev.filter(id => id !== specialtyId);
      } else {
        const maxSpecialties = getMaxSpecialtiesForTier(selectedTier);
        const currentAdditional = prev.length - 1; // Exclude medicina_generale

        if (currentAdditional >= maxSpecialties) {
          showError(`Il piano ${selectedTier.name} permette massimo ${maxSpecialties} specialità aggiuntive`);
          return prev;
        }

        return [...prev, specialtyId];
      }
    });
  };

  const handleSubscribe = async (paymentMethod = 'stripe') => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!pricingResult?.is_valid) {
      showError('Configurazione pricing non valida');
      return;
    }

    // Validate specialty count against tier limits
    const maxSpecialties = getMaxSpecialtiesForTier(selectedTier);
    const additionalSpecialties = selectedSpecialties.length - 1; // Exclude medicina_generale

    if (additionalSpecialties > maxSpecialties) {
      showError(`Il piano ${selectedTier.name} permette massimo ${maxSpecialties} specialità aggiuntive. Hai selezionato ${additionalSpecialties}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/billing/create-checkout-session', {
        tier_id: selectedTier.tier_id,
        specialty_ids: selectedSpecialties.map(String),
        billing_interval: billingInterval
      });

      if (response.data.success) {
        window.location.href = response.data.checkout_url;
      } else {
        showError(response.data.detail || 'Errore nella creazione della sessione di pagamento');
      }
    } catch (error) {
      // Extract error message from various error formats
      let errorMessage = 'Errore di connessione';

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle FastAPI validation errors (422)
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => err.msg).join(', ');
        }
        // Handle string detail
        else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Handle plain message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!pricingResult?.is_valid) {
      showError('Configurazione pricing non valida');
      return;
    }

    // Validate specialty count against tier limits
    const maxSpecialties = getMaxSpecialtiesForTier(selectedTier);
    const additionalSpecialties = selectedSpecialties.length - 1; // Exclude medicina_generale

    if (additionalSpecialties > maxSpecialties) {
      showError(`Il piano ${selectedTier.name} permette massimo ${maxSpecialties} specialità aggiuntive. Hai selezionato ${additionalSpecialties}.`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/paypal/create-checkout', {
        tier_id: selectedTier.tier_id,
        specialty_ids: selectedSpecialties.map(String),
        billing_interval: billingInterval,
        return_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/pricing`
      });

      if (response.data.approval_url) {
        window.location.href = response.data.approval_url;
      } else {
        showError('Errore nella creazione della subscription PayPal');
      }
    } catch (error) {
      // Extract error message from various error formats
      let errorMessage = 'Errore durante la creazione della subscription PayPal';

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle FastAPI validation errors (422)
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map(err => err.msg).join(', ');
        }
        // Handle string detail
        else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Handle plain message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }

      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestQuote = () => {
    const subject = encodeURIComponent('Richiesta Preventivo Piano Enterprise');
    const body = encodeURIComponent(
      `Buongiorno,\n\nSono interessato al piano Enterprise di RefertoSicuro.\n\nVorrei ricevere maggiori informazioni e un preventivo personalizzato.\n\n` +
      (user ? `\nNome: ${user.full_name}\nEmail: ${user.email}\n` : '') +
      `\nGrazie`
    );
    window.location.href = `mailto:amministrazione@iusmedical.it?subject=${subject}&body=${body}`;
  };

  const formatPrice = (price) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);

  if (loadingData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="card text-center">
            <div className="animate-spin w-8 h-8 border-2 border-medical-200 border-t-medical-600 rounded-full mx-auto mb-4"></div>
            <p className="text-neutral-600">Caricamento piani pricing...</p>
          </div>
        </div>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-medical-600 mb-6">
              Scegli il Piano Perfetto per Te
            </h1>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Potenzia la tua pratica medica con l'intelligenza artificiale.
              Scegli il piano e le specialità che meglio si adattano alle tue esigenze.
            </p>
          </div>

          {/* Pricing Tiers */}
          <div className="mb-16">
            {/* Billing Toggle Switch - Center on mobile, right on desktop */}
            <div className="flex justify-center md:justify-end mb-8">
              <div className="liquidGlass-wrapper p-1">
                {/* Liquid Glass Effect Layers */}
                <div className="liquidGlass-effect"></div>
                <div className="liquidGlass-tint"></div>
                <div className="liquidGlass-shine"></div>

                {/* Tab Indicator */}
                <div
                  className="absolute top-1 bottom-1 tab-liquid-glass"
                  style={{
                    width: 'calc(50% - 4px)',
                    left: billingInterval === 'monthly' ? 'calc(0% + 2px)' : 'calc(50% + 2px)',
                    transition: 'left 1.2s cubic-bezier(0.23, 1, 0.32, 1)',
                    transformOrigin: 'center',
                    zIndex: 10
                  }}
                />

                {/* Toggle Buttons */}
                <div className="relative flex w-full" style={{zIndex: 20}}>
                  <button
                    onClick={() => setBillingInterval('monthly')}
                    className={`
                      relative z-10 flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium
                      transition-colors duration-1000 ease-out
                      ${billingInterval === 'monthly'
                        ? 'text-white'
                        : 'text-neutral-600 hover:text-neutral-800'
                      }
                    `}
                    style={{borderRadius: '100px'}}
                  >
                    Mensile
                  </button>
                  <button
                    onClick={() => setBillingInterval('yearly')}
                    className={`
                      relative z-10 flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium
                      transition-colors duration-1000 ease-out
                      ${billingInterval === 'yearly'
                        ? 'text-white'
                        : 'text-neutral-600 hover:text-neutral-800'
                      }
                    `}
                    style={{borderRadius: '100px'}}
                  >
                    Annuale
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mx-auto">
              {tiers.map((tier) => {
                const isSelected = selectedTier?.tier_id === tier.tier_id;
                const isPopular = tier.tier_id === 'basic';
                const isDisabled = (tier.tier_id === 'trial' && user?.subscription_plan !== 'trial') || tier.is_disabled;

                return (
                  <div
                    key={tier.tier_id}
                    className={`relative transition-all duration-300 ${
                      isSelected ? 'scale-105' : 'hover:scale-102'
                    } ${isDisabled && tier.tier_id !== 'enterprise' ? 'opacity-50 cursor-not-allowed' : tier.tier_id !== 'enterprise' ? 'cursor-pointer' : ''}`}
                    onClick={() => !isDisabled && tier.tier_id !== 'enterprise' && setSelectedTier(tier)}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10" style={{overflow: 'hidden', borderRadius: '9999px'}}>
                        <span className="text-white px-4 py-1 rounded-full text-sm font-medium shadow-medium popular-badge" style={{backgroundColor: '#5399d9'}}>
                          Più Popolare
                        </span>
                      </div>
                    )}

                    <div className={`liquidGlass-wrapper h-full p-6 rounded-3xl ${
                      isSelected ? 'shadow-large border-2' : ''
                    }`}
                    style={isSelected ? {borderColor: '#5399d9'} : {}}>
                      {/* Liquid Glass Effect Layers */}
                      <div className="liquidGlass-effect"></div>
                      <div className="liquidGlass-tint"></div>
                      <div className="liquidGlass-shine"></div>

                      <div className="relative z-10 h-full flex flex-col">

                      {/* Tier Header */}
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-medical-700 mb-2">
                          {tier.name}
                        </h3>
                        <p className="text-neutral-600 text-sm mb-6">
                          {tier.description}
                        </p>

                        {/* Pricing */}
                        <div className="mb-6">
                          {tier.tier_id === 'trial' ? (
                            <div className="text-4xl font-bold text-medical-600 transition-all duration-700 ease-out">
                              Gratuito
                            </div>
                          ) : tier.custom_pricing ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-medical-600 mb-2">
                                Richiedi Preventivo
                              </div>
                              <div className="text-sm text-neutral-600">
                                Soluzione personalizzata per le tue esigenze
                              </div>
                            </div>
                          ) : tier.tier_id === 'enterprise' ? (
                            // Enterprise tier with "A partire da" pricing
                            <div className="text-center">
                              <div className="text-sm text-neutral-600 mb-1">
                                A partire da
                              </div>
                              <div className="text-4xl font-bold text-medical-600 transition-all duration-700 ease-out">
                                {formatPrice(tier.base_monthly_price)}
                                <span className="text-lg text-neutral-500 font-normal">
                                  /mese
                                </span>
                              </div>
                              <div className="text-sm text-neutral-600 mt-2">
                                Piano personalizzabile
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-4xl font-bold text-medical-600 transition-all duration-700 ease-out">
                                {formatPrice(billingInterval === 'yearly' && tier.base_yearly_price
                                  ? tier.base_yearly_price / 12
                                  : tier.base_monthly_price
                                )}
                                <span className="text-lg text-neutral-500 font-normal">
                                  /mese
                                </span>
                              </div>

                              <div className={`text-success-600 text-sm font-medium mt-2 transition-all duration-700 ease-out ${
                                billingInterval === 'yearly' && tier.yearly_discount_percent > 0
                                  ? 'opacity-100 transform translate-y-0'
                                  : 'opacity-0 transform -translate-y-2'
                              }`}>
                                Risparmi {tier.yearly_discount_percent || 0}% pagando annualmente
                                <div className="text-xs text-neutral-500 mt-1">
                                  ({formatPrice(tier.base_yearly_price)} totale annuale)
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-6 flex-1">
                        {/* API Calls Limit */}
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{tier.max_api_calls?.toLocaleString()} analisi/mese</span>
                        </div>

                        {/* Specialties */}
                        <div className="flex items-center text-sm">
                          <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>
                            {tier.max_specialties
                              ? `Medicina Generale + ${tier.max_specialties} specialità`
                              : 'Tutte le specialità'
                            }
                          </span>
                        </div>

                        {/* Platform Features from centralized system */}
                        {getFeaturesForTier(tier.tier_id).slice(0, 3).map((feature) => (
                          <div key={feature.feature_id} className="flex items-center text-sm">
                            <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>
                              {feature.name}
                              {feature.badge_text && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(83, 153, 217, 0.1)', color: '#5399d9' }}>
                                  {feature.badge_text}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button - Only for Enterprise */}
                      {tier.tier_id === 'enterprise' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestQuote();
                          }}
                          className="py-3 px-6 text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
                          style={{
                            backgroundColor: '#5399d9',
                            borderRadius: '50px',
                            border: 'none',
                            width: 'fit-content',
                            margin: '0 auto'
                          }}
                        >
                          Richiedi Preventivo
                        </button>
                      )}

                      {/* Selection Indicator for other tiers */}
                      {tier.tier_id !== 'enterprise' && isSelected && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 text-white rounded-full flex items-center justify-center" style={{backgroundColor: '#5399d9'}}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Specialty Selection */}
          {selectedTier && specialties.length > 0 && (
            <div className="mb-16">
              <div className="liquidGlass-wrapper mx-auto p-8 rounded-3xl">
                {/* Liquid Glass Effect Layers */}
                <div className="liquidGlass-effect"></div>
                <div className="liquidGlass-tint"></div>
                <div className="liquidGlass-shine"></div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-semibold text-medical-600 mb-4 text-center">
                    Specialità Mediche
                  </h3>
                <p className="text-neutral-600 text-center mb-8">
                  <strong>Medicina Generale</strong> è sempre inclusa.
                  {selectedTier.max_specialties &&
                    ` Puoi aggiungere fino a ${selectedTier.max_specialties} specialità aggiuntive.`
                  }
                </p>

                {/* Medicina Generale Always Included */}
                {specialties.find(s => s.code === 'medicina_generale') && (
                  <div className="mb-6 relative">
                    <div className="card-elegant bg-white border border-neutral-200">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-4 border border-neutral-200">
                          <img
                            src={getSpecialtyIcon('medicina_generale')}
                            alt="Medicina Generale"
                            className="w-8 h-8"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-800">Medicina Generale</h4>
                          <p className="text-neutral-600 text-sm">Sempre inclusa in tutti i piani</p>
                        </div>
                        <div className="hidden sm:block text-success-600 font-medium">
                          ✓ Inclusa
                        </div>
                      </div>
                    </div>
                    {/* Badge sovrapposto solo da mobile */}
                    <div className="sm:hidden absolute -top-2 -right-2 z-10">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shadow-lg">
                        ✓ Inclusa
                      </span>
                    </div>
                  </div>
                )}

                {/* Additional Specialties */}
                {selectedTier.max_specialties > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-neutral-700">Specialità aggiuntive</h4>
                      <span className="text-sm text-neutral-500">
                        {selectedSpecialties.length - 1} / {selectedTier.max_specialties} selezionate
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {specialties
                        .filter(specialty => specialty.code !== 'medicina_generale')
                        .map((specialty) => {
                          const isSelected = selectedSpecialties.includes(specialty.specialty_id);
                          const maxReached = (selectedSpecialties.length - 1) >= selectedTier.max_specialties;
                          const isDisabled = !isSelected && maxReached;

                          return (
                            <div
                              key={specialty.specialty_id}
                              className={`card-elegant !p-4 cursor-pointer transition-smooth border-2 ${
                                isSelected
                                  ? 'border-medical-500'
                                  : isDisabled
                                    ? 'opacity-50 cursor-not-allowed border-white'
                                    : 'border-white hover:border-white hover:bg-medical-25 hover:shadow-medium'
                              }`}
                              onClick={() => !isDisabled && handleSpecialtyToggle(specialty.specialty_id, specialty)}
                            >
                              <div className="flex items-center space-x-3">
                                {/* Icon */}
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-smooth ${
                                  isSelected ? 'bg-medical-500' : 'bg-white border border-neutral-200'
                                }`}>
                                  <img
                                    src={getSpecialtyIcon(specialty.code)}
                                    alt={specialty.display_name}
                                    className={`w-7 h-7 transition-smooth ${
                                      isSelected ? 'filter brightness-0 invert' : ''
                                    }`}
                                  />
                                </div>

                                {/* Content */}
                                <div className="flex-1 flex items-center justify-between">
                                  <h4 className={`font-medium text-lg transition-smooth ${
                                    isSelected ? 'text-medical-700' : 'text-neutral-800'
                                  }`}>
                                    {specialty.display_name}
                                  </h4>

                                  {/* Checkbox */}
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-medical-500 border-medical-500'
                                      : 'border-neutral-300 bg-white'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Summary & Checkout */}
          {pricingResult && selectedTier?.tier_id !== 'trial' && (
            <div className="mb-16">
              <div className="liquidGlass-wrapper mx-auto max-w-2xl p-8 rounded-3xl">
                {/* Liquid Glass Effect Layers */}
                <div className="liquidGlass-effect"></div>
                <div className="liquidGlass-tint"></div>
                <div className="liquidGlass-shine"></div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-semibold text-medical-600 mb-8 text-center">
                    Riepilogo del Piano Selezionato
                  </h3>

                  {/* Plan Details */}
                  <div className="bg-white/60 rounded-2xl p-6 mb-6" style={{boxShadow: '0 0 20px rgba(27, 57, 80, 0.4)'}}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-medical-700">Piano {selectedTier.name}</h4>
                      <span className="text-sm px-3 py-1 bg-medical-100 text-medical-700 rounded-full">
                        {billingInterval === 'yearly' ? 'Annuale' : 'Mensile'}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{selectedTier.max_api_calls?.toLocaleString()} analisi al mese</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Medicina Generale + {selectedSpecialties.length - 1} specialità aggiuntive</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-success-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Supporto tecnico incluso</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-white/60 rounded-2xl p-6 mb-6" style={{boxShadow: '0 0 20px rgba(27, 57, 80, 0.4)'}}>
                    <h4 className="font-semibold text-neutral-700 mb-4">Dettaglio Prezzo</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Piano {pricingResult.tier_name}</span>
                        <span>{formatPrice(pricingResult.base_price)}</span>
                      </div>

                      {pricingResult.specialties_price > 0 && (
                        <div className="flex justify-between">
                          <span>Specialità aggiuntive</span>
                          <span>{formatPrice(pricingResult.specialties_price)}</span>
                        </div>
                      )}

                      {pricingResult.discounts_applied > 0 && (
                        <div className="flex justify-between text-success-600">
                          <span>Sconto applicato</span>
                          <span>-{formatPrice(pricingResult.discounts_applied)}</span>
                        </div>
                      )}

                      <div className="border-t border-neutral-200 pt-3">
                        <div className="flex justify-between text-xl font-bold text-medical-600">
                          <span>Totale {billingInterval === 'yearly' ? 'annuale' : 'mensile'}</span>
                          <span>{formatPrice(pricingResult.total_price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Provider Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 mb-3 text-center">
                      Metodo di Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('stripe')}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                          paymentProvider === 'stripe'
                            ? 'border-medical-500 bg-medical-50 shadow-md'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <svg className="h-8 w-auto mb-2" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
                            <path fill={paymentProvider === 'stripe' ? '#5399d9' : '#6772E5'} d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.9 0 1.85 6.29.97 6.29 5.88z"/>
                          </svg>
                          <span className={`text-xs font-medium ${
                            paymentProvider === 'stripe' ? 'text-medical-700' : 'text-neutral-600'
                          }`}>
                            Carte di Credito
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentProvider('paypal')}
                        className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                          paymentProvider === 'paypal'
                            ? 'border-medical-500 bg-medical-50 shadow-md'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <svg className="h-8 w-auto mb-2" viewBox="0 0 124 33" xmlns="http://www.w3.org/2000/svg">
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#003087'} d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.803l1.77-11.209a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"/>
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#009CDE'} d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.209a.571.571 0 0 0-.565-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822c.469 0 .867-.34.939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z"/>
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#003087'} d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"/>
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#009CDE'} d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"/>
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#012169'} d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z"/>
                            <path fill={paymentProvider === 'paypal' ? '#5399d9' : '#003087'} d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z"/>
                          </svg>
                          <span className={`text-xs font-medium ${
                            paymentProvider === 'paypal' ? 'text-medical-700' : 'text-neutral-600'
                          }`}>
                            PayPal
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      onClick={() => {
                        if (paymentProvider === 'stripe') {
                          handleSubscribe('stripe');
                        } else {
                          handlePayPalCheckout();
                        }
                      }}
                      disabled={loading}
                      className="text-lg py-4 px-8 text-white font-medium transition-all duration-200 hover:shadow-lg"
                      style={{
                        backgroundColor: '#5399d9',
                        borderRadius: '50px',
                        border: 'none',
                        width: 'fit-content',
                        margin: '0 auto'
                      }}
                    >
                      {loading ? 'Elaborazione...' : 'Attiva Abbonamento'}
                    </button>

                    <p className="text-center text-xs text-neutral-500">
                      {paymentProvider === 'stripe'
                        ? 'Pagamento sicuro tramite Stripe • Cancellazione in qualsiasi momento'
                        : 'Pagamento sicuro tramite PayPal • Cancellazione in qualsiasi momento'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="liquidGlass-wrapper mx-auto p-8 rounded-3xl">
            {/* Liquid Glass Effect Layers */}
            <div className="liquidGlass-effect"></div>
            <div className="liquidGlass-tint"></div>
            <div className="liquidGlass-shine"></div>

            <div className="relative z-10">
              <h3 className="text-xl font-semibold text-medical-600 mb-6 text-center">
                Domande Frequenti
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FAQItem
                    question="Posso cambiare piano?"
                    answer="Sì, puoi modificare o annullare il piano in qualsiasi momento dal tuo profilo."
                  />
                  <FAQItem
                    question="Cosa succede se supero il limite?"
                    answer="Il servizio si interromperà fino al rinnovo mensile. Puoi sempre fare upgrade."
                  />
                </div>

                <div className="space-y-4">
                  <FAQItem
                    question="I pagamenti sono sicuri?"
                    answer="Tutti i pagamenti sono processati tramite Stripe con crittografia di livello bancario."
                  />
                  <FAQItem
                    question="Posso aggiungere specialità?"
                    answer={
                      <>
                        Sì, se le tue esigenze cambiano puoi scrivere a{' '}
                        <a href="mailto:supporto@refertosicuro.it" className="text-medical-600 hover:underline">
                          supporto@refertosicuro.it
                        </a>
                        {' '}per la modifica.
                      </>
                    }
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
};

export default PricingPageNew;