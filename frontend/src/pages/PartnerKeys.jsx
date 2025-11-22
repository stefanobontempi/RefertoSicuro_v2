import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/common/Layout';
import PageWrapper from '../components/common/PageWrapper';
import TabNavigation from '../components/profile/TabNavigation';
import { useAuth } from '../contexts/AuthContext';
import { partnerKeysAPI } from '../services/partnerKeys';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PartnerKeysStats from '../components/partner/PartnerKeysStats';
import SectionCard from '../components/profile/SectionCard';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { IconButton, Tooltip as MuiTooltip } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import DeleteIcon from '@mui/icons-material/Delete';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PartnerKeys = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Get tab from URL or default to 'my-keys'
  const tabFromUrl = searchParams.get('tab') || 'my-keys';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keys management state
  const [keys, setKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [error, setError] = useState(null);

  // Create key state
  const [creatingKey, setCreatingKey] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdKey, setCreatedKey] = useState(null);
  const [showCreatedKeyModal, setShowCreatedKeyModal] = useState(false);
  const [formData, setFormData] = useState({
    partner_name: '',
    partner_email: '',
    expires_days: '',
    rate_limit_per_second: 10,
    rate_limit_burst: 20
  });

  // Usage stats state
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // IP Whitelist state
  const [selectedWhitelistKeyId, setSelectedWhitelistKeyId] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);
  const [showAddIPModal, setShowAddIPModal] = useState(false);
  const [addingIP, setAddingIP] = useState(false);
  const [detectingIP, setDetectingIP] = useState(false);
  const [showCIDRExamples, setShowCIDRExamples] = useState(false);
  const [ipValidation, setIpValidation] = useState({ valid: null, message: '' });
  const [ipFormData, setIpFormData] = useState({
    ip_address: '',
    ip_range_cidr: '',
    description: ''
  });

  // Renew key state
  const [renewingKey, setRenewingKey] = useState(false);
  const [renewedKey, setRenewedKey] = useState(null);
  const [showRenewedKeyModal, setShowRenewedKeyModal] = useState(false);

  // Edit rate limits state
  const [editingRateLimits, setEditingRateLimits] = useState(null); // keyId being edited
  const [rateLimitForm, setRateLimitForm] = useState({
    rate_limit_per_second: 10,
    rate_limit_burst: 20
  });

  // Sync tab with URL parameter on mount/reload
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Force scroll to top IMMEDIATELY when component mounts (using useLayoutEffect)
  // This runs BEFORE the browser paints
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Also force scroll to top AFTER component mounts with a slight delay
  // This handles cases where content loads asynchronously
  useEffect(() => {
    // Force scroll immediately
    window.scrollTo(0, 0);

    // And again after a small delay to catch any async content
    const scrollTimer = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, []); // Empty deps = runs only on mount

  // Handle tab change - updates both state and URL
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);

    // If switching to default tab (my-keys), remove the URL param for cleaner URLs
    if (newTab === 'my-keys') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: newTab });
    }

    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddIPModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showAddIPModal]);

  // Check access based on subscription plan
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setLoading(false);
      setHasAccess(false);
      return;
    }

    const hasDirectAccess =
      user?.subscription_plan === 'professional' ||
      user?.subscription_plan === 'enterprise';

    setHasAccess(hasDirectAccess);
    setLoading(false);
  }, [authLoading, isAuthenticated, user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Redirect to subscription if no access
  useEffect(() => {
    if (!loading && hasAccess === false) {
      navigate('/subscription');
    }
  }, [loading, hasAccess, navigate]);

  // Load keys when tab is active (needed for my-keys, usage-stats, and ip-whitelist)
  useEffect(() => {
    if (hasAccess && (activeTab === 'my-keys' || activeTab === 'usage-stats' || activeTab === 'ip-whitelist')) {
      loadKeys();
    }
  }, [activeTab, hasAccess]);

  // Auto-select first key when tab "usage-stats" is active
  useEffect(() => {
    if (activeTab === 'usage-stats' && hasAccess && keys.length > 0) {
      // Auto-select FIRST key from loaded list (NOT hardcoded ID 1)
      if (!selectedKeyId || !keys.find(k => k.id === selectedKeyId)) {
        const firstKey = keys[0];
        console.log(`[PARTNER_KEYS_FIX] Auto-selecting first key: ID=${firstKey.id}, name=${firstKey.partner_name}`);
        loadUsageStats(firstKey.id);
      }
    }
  }, [activeTab, hasAccess, keys, selectedKeyId]);

  // Auto-select first key when tab "ip-whitelist" is active
  useEffect(() => {
    if (activeTab === 'ip-whitelist' && hasAccess && keys.length > 0) {
      // Auto-select FIRST key from loaded list
      if (!selectedWhitelistKeyId || !keys.find(k => k.id === selectedWhitelistKeyId)) {
        const firstKey = keys[0];
        console.log(`[PARTNER_KEYS_FIX] Auto-selecting first key for IP whitelist: ID=${firstKey.id}, name=${firstKey.partner_name}`);
        setSelectedWhitelistKeyId(firstKey.id);
        loadWhitelist(firstKey.id);
      }
    }
  }, [activeTab, hasAccess, keys, selectedWhitelistKeyId]);

  const loadKeys = async () => {
    setLoadingKeys(true);
    setError(null);

    try {
      const response = await partnerKeysAPI.list();
      setKeys(response.data);
    } catch (err) {
      console.error('Error loading keys:', err);
      setError(err.response?.data?.detail || 'Errore nel caricamento delle chiavi API');
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreatingKey(true);
    setCreateError(null);

    try {
      const data = {
        partner_name: formData.partner_name,
        partner_email: formData.partner_email || null,  // Send null if empty, not empty string
        expires_days: formData.expires_days ? parseInt(formData.expires_days) : null,
        rate_limit_per_second: formData.rate_limit_per_second,
        rate_limit_burst: formData.rate_limit_burst
      };

      const response = await partnerKeysAPI.create(data);
      setCreatedKey(response.data);
      setShowCreatedKeyModal(true);

      // Reset form
      setFormData({
        partner_name: '',
        partner_email: '',
        expires_days: '',
        rate_limit_per_second: 10,
        rate_limit_burst: 20
      });

      // Reload keys list
      loadKeys();
    } catch (err) {
      console.error('Error creating key:', err);
      setCreateError(err.response?.data?.detail || 'Errore nella creazione della chiave API');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (keyId) => {
    if (!confirm('Sei sicuro di voler eliminare questa chiave API? Questa azione è irreversibile!')) {
      return;
    }

    try {
      await partnerKeysAPI.delete(keyId);
      toast.success('Chiave API eliminata con successo');
      loadKeys();
    } catch (err) {
      console.error('Error deleting key:', err);
      toast.error(err.response?.data?.detail || 'Errore nell\'eliminazione della chiave API');
    }
  };

  const handleToggleActive = async (key) => {
    try {
      if (key.is_active) {
        await partnerKeysAPI.deactivate(key.id);
        toast.success('Chiave API disattivata');
      } else {
        await partnerKeysAPI.activate(key.id);
        toast.success('Chiave API attivata');
      }
      loadKeys();
    } catch (err) {
      console.error('Error toggling key status:', err);
      toast.error(err.response?.data?.detail || 'Errore nell\'aggiornamento della chiave API');
    }
  };

  const loadUsageStats = async (keyId) => {
    setLoadingStats(true);

    // Validation: Verify keyId is valid
    if (!keyId || isNaN(keyId)) {
      console.error('[PARTNER_KEYS_ERROR] Invalid keyId:', keyId);
      toast.error('Errore: ID chiave API non valido');
      setLoadingStats(false);
      return;
    }

    // Validation: Verify key exists in list
    const keyExists = keys.find(k => k.id === keyId);
    if (!keyExists) {
      console.error(`[PARTNER_KEYS_ERROR] Key ID ${keyId} not found in user's keys:`, keys.map(k => k.id));
      toast.error(`Chiave API ID ${keyId} non trovata. Seleziona una chiave dalla lista.`);
      setLoadingStats(false);
      return;
    }

    setSelectedKeyId(keyId);
    console.log(`[PARTNER_KEYS_DEBUG] Loading stats for key ID=${keyId}, name=${keyExists.partner_name}`);

    try {
      const response = await partnerKeysAPI.getUsage(keyId);
      setUsageStats(response.data);
      console.log(`[PARTNER_KEYS_SUCCESS] Loaded stats for key ID=${keyId}:`, response.data);
    } catch (err) {
      console.error('[PARTNER_KEYS_ERROR] Error loading usage stats:', err);

      // Better error messages
      const status = err.response?.status;
      const detail = err.response?.data?.detail;

      if (status === 404) {
        toast.error(`Chiave API non trovata (ID ${keyId}). Potrebbe essere stata eliminata.`);
      } else if (status === 403) {
        toast.error(`Accesso negato: Non sei autorizzato per questa chiave API.`);
      } else {
        toast.error(detail || `Errore nel caricamento delle statistiche (${status || 'Rete'})`);
      }
    } finally {
      setLoadingStats(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Chiave API copiata negli appunti!');
  };

  const handleEditRateLimits = (key) => {
    setEditingRateLimits(key.id);
    setRateLimitForm({
      rate_limit_per_second: key.rate_limit_per_second,
      rate_limit_burst: key.rate_limit_burst
    });
  };

  const handleSaveRateLimits = async (keyId) => {
    try {
      await partnerKeysAPI.updateRateLimits(keyId, rateLimitForm);
      toast.success('Rate limits aggiornati con successo');
      setEditingRateLimits(null);
      loadKeys();
    } catch (err) {
      console.error('Error updating rate limits:', err);
      toast.error(err.response?.data?.detail || 'Errore nell\'aggiornamento dei rate limits');
    }
  };

  const handleCancelEditRateLimits = () => {
    setEditingRateLimits(null);
    setRateLimitForm({ rate_limit_per_second: 10, rate_limit_burst: 20 });
  };

  const loadWhitelist = async (keyId) => {
    setLoadingWhitelist(true);
    setSelectedWhitelistKeyId(keyId);

    try {
      const response = await partnerKeysAPI.listWhitelist(keyId);
      setWhitelist(response.data);
    } catch (err) {
      console.error('Error loading whitelist:', err);
      toast.error(err.response?.data?.detail || 'Errore nel caricamento della whitelist');
    } finally {
      setLoadingWhitelist(false);
    }
  };

  // IP Validation helpers
  const validateIPv4 = (ip) => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const validateIPv6 = (ip) => {
    const ipv6Regex = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$|^::$|^([\da-fA-F]{1,4}:){1,7}:$|^:((:[\da-fA-F]{1,4}){1,7})$|^([\da-fA-F]{1,4}:){1,6}:[\da-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  };

  const validateIP = (ip) => {
    if (!ip) return { valid: null, message: '' };
    const isIPv4 = validateIPv4(ip);
    const isIPv6 = validateIPv6(ip);
    if (isIPv4) return { valid: true, message: 'IPv4 valido ✓' };
    if (isIPv6) return { valid: true, message: 'IPv6 valido ✓' };
    return { valid: false, message: 'Formato IP non valido' };
  };

  const calculateCIDRRange = (cidr) => {
    if (!cidr) return null;
    const match = cidr.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!match) return null;
    const [, ip, prefix] = match;
    const prefixNum = parseInt(prefix, 10);
    if (prefixNum < 0 || prefixNum > 32) return null;
    const hosts = Math.pow(2, 32 - prefixNum);
    return `~${hosts.toLocaleString()} indirizzi`;
  };

  const handleDetectMyIP = async () => {
    setDetectingIP(true);
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setIpFormData({ ...ipFormData, ip_address: data.ip });
      setIpValidation(validateIP(data.ip));
      toast.success(`IP rilevato: ${data.ip}`, { autoClose: 2000 });
    } catch (err) {
      console.error('Error detecting IP:', err);
      toast.error('Impossibile rilevare IP automaticamente');
    } finally {
      setDetectingIP(false);
    }
  };

  const handleIPChange = (e) => {
    const ip = e.target.value;
    setIpFormData({ ...ipFormData, ip_address: ip });
    setIpValidation(validateIP(ip));
  };

  const handleAddIP = async (e) => {
    e.preventDefault();
    setAddingIP(true);

    try {
      await partnerKeysAPI.addToWhitelist(selectedWhitelistKeyId, ipFormData);
      toast.success('IP aggiunto alla whitelist con successo');

      // Reset form
      setIpFormData({
        ip_address: '',
        ip_range_cidr: '',
        description: ''
      });
      setIpValidation({ valid: null, message: '' });
      setShowCIDRExamples(false);
      setShowAddIPModal(false);

      // Reload whitelist
      loadWhitelist(selectedWhitelistKeyId);
    } catch (err) {
      console.error('Error adding IP:', err);
      toast.error(err.response?.data?.detail || 'Errore nell\'aggiunta dell\'IP alla whitelist');
    } finally {
      setAddingIP(false);
    }
  };

  const handleRemoveIP = async (keyId, ipId) => {
    if (!confirm('Sei sicuro di voler rimuovere questo IP dalla whitelist?')) {
      return;
    }

    try {
      await partnerKeysAPI.removeFromWhitelist(keyId, ipId);
      toast.success('IP rimosso dalla whitelist');
      loadWhitelist(keyId);
    } catch (err) {
      console.error('Error removing IP:', err);
      toast.error(err.response?.data?.detail || 'Errore nella rimozione dell\'IP');
    }
  };

  const handleToggleIPStatus = async (keyId, ipId, currentStatus) => {
    try {
      await partnerKeysAPI.toggleIPStatus(keyId, ipId);
      toast.success(currentStatus ? 'IP disabilitato' : 'IP attivato', { autoClose: 1500 });
      loadWhitelist(keyId);
    } catch (err) {
      console.error('Error toggling IP status:', err);
      toast.error(err.response?.data?.detail || 'Errore nel cambio stato IP');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Mai';
    return new Date(dateString).toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiration = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpirationBadge = (expiresAt) => {
    const daysLeft = getDaysUntilExpiration(expiresAt);
    if (daysLeft === null) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Mai</span>;
    }
    if (daysLeft < 0) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Scaduta</span>;
    }
    if (daysLeft <= 7) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Scade tra {daysLeft}g</span>;
    }
    if (daysLeft <= 30) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Scade tra {daysLeft}g</span>;
    }
    return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{formatDate(expiresAt)}</span>;
  };

  const handleRenewKey = async (keyId) => {
    if (!confirm('Sei sicuro di voler rinnovare questa chiave API? La chiave vecchia verrà disattivata immediatamente.')) {
      return;
    }

    setRenewingKey(true);

    try {
      const response = await partnerKeysAPI.renew(keyId);
      setRenewedKey(response.data);
      setShowRenewedKeyModal(true);
      loadKeys();
    } catch (err) {
      console.error('Error renewing key:', err);
      toast.error(err.response?.data?.detail || 'Errore nel rinnovo della chiave API');
    } finally {
      setRenewingKey(false);
    }
  };

  const tabs = [
    {
      id: 'my-keys',
      label: 'Le Tue Chiavi',
      icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
    },
    {
      id: 'create-key',
      label: 'Crea Nuova Chiave',
      icon: 'M12 4v16m8-8H4'
    },
    {
      id: 'ip-whitelist',
      label: 'IP Whitelist',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      id: 'usage-stats',
      label: 'Statistiche Uso',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    }
  ];

  // Loading state
  if (authLoading || loading || hasAccess === null) {
    return (
      <Layout>
        <PageWrapper>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#5399d9' }}></div>
          </div>
        </PageWrapper>
      </Layout>
    );
  }

  // No access
  if (!isAuthenticated || !user || !hasAccess) {
    return null;
  }

  // Render functions for each tab...
  // (Continuing in next part due to length)

  return (
    <Layout>
      <PageWrapper>
        <div className="min-h-screen">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="heading-display mb-2">Partner API Keys</h1>
              <p className="text-soft mb-4">
                Gestisci le tue chiavi API per integrare RefertoSicuro nelle tue applicazioni
              </p>
            </div>

            {/* Tab Navigation */}
            <TabNavigation
              activeTab={activeTab}
              tabs={tabs}
              onTabChange={handleTabChange}
            />

            {/* Tab Content */}
            <div className="mt-6">
              <p className="text-center text-gray-500">Partner Keys page - Implementation in progress</p>
            </div>
          </div>
        </div>
      </PageWrapper>
      <ToastContainer position="top-right" autoClose={3000} />
    </Layout>
  );
};

export default PartnerKeys;
