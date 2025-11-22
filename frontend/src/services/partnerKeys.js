/**
 * Partner API Keys Service
 * Handles all API calls related to Partner API key management
 */
import axios from 'axios';
import { API_CONFIG, debugLog, ENV_BEHAVIORS } from '../config/environment.js';

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for cookie-based authentication
// SECURITY (VULN-SEC-003 fix): Use httpOnly cookies instead of localStorage tokens
api.interceptors.request.use(
  (config) => {
    // Enable cookie-based authentication
    config.withCredentials = true;

    if (ENV_BEHAVIORS.enableLogging) {
      debugLog('Partner Keys API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
    }

    return config;
  },
  (error) => {
    debugLog('Partner Keys API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (ENV_BEHAVIORS.enableLogging) {
      debugLog('Partner Keys API Response:', {
        status: response.status,
        url: response.config.url,
      });
    }
    return response;
  },
  (error) => {
    if (ENV_BEHAVIORS.reportErrors) {
      debugLog('Partner Keys API Error:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
      });
    }
    return Promise.reject(error);
  }
);

/**
 * Partner API Keys endpoints
 */
export const partnerKeysAPI = {
  /**
   * List all Partner API Keys for the current user
   * @param {boolean} isActive - Optional filter by active status
   * @returns {Promise} Array of API keys
   */
  list: (isActive = null) => {
    const params = isActive !== null ? { is_active: isActive } : {};
    return api.get('/partner-keys/', { params });  // Trailing slash required by FastAPI
  },

  /**
   * Create a new Partner API Key
   * @param {Object} data - Key creation data
   * @param {string} data.partner_name - Partner company or project name
   * @param {string} data.partner_email - Contact email for this API key
   * @param {number} [data.expires_days] - Expiration in days (null = never)
   * @param {number} [data.rate_limit_per_second] - Rate limit (req/sec)
   * @param {number} [data.rate_limit_burst] - Burst limit
   * @returns {Promise} Created API key with plain key (shown only once!)
   */
  create: (data) => {
    return api.post('/partner-keys/', data);
  },

  /**
   * Get details of a specific Partner API Key
   * @param {number} keyId - API key ID
   * @returns {Promise} API key details
   */
  get: (keyId) => {
    return api.get(`/partner-keys/${keyId}/`);
  },

  /**
   * Delete (permanently remove) a Partner API Key
   * @param {number} keyId - API key ID
   * @returns {Promise} Empty response
   */
  delete: (keyId) => {
    return api.delete(`/partner-keys/${keyId}/`);
  },

  /**
   * Deactivate a Partner API Key (reversible)
   * @param {number} keyId - API key ID
   * @returns {Promise} Updated API key
   */
  deactivate: (keyId) => {
    return api.patch(`/partner-keys/${keyId}/deactivate/`);
  },

  /**
   * Activate a previously deactivated Partner API Key
   * @param {number} keyId - API key ID
   * @returns {Promise} Updated API key
   */
  activate: (keyId) => {
    return api.patch(`/partner-keys/${keyId}/activate/`);
  },

  /**
   * Get usage statistics for a Partner API Key
   * @param {number} keyId - API key ID
   * @returns {Promise} Usage statistics
   */
  getUsage: (keyId) => {
    return api.get(`/partner-keys/${keyId}/usage/`);
  },

  /**
   * Get daily statistics for a Partner API Key
   * @param {number} keyId - API key ID
   * @param {number} [days=7] - Number of days to retrieve
   * @returns {Promise} Array of daily statistics
   */
  getDailyStats: (keyId, days = 7) => {
    return api.get(`/partner-keys/${keyId}/daily-stats/`, { params: { days } });
  },

  /**
   * Get endpoint-specific statistics (AI vs DB endpoints)
   * @param {number} keyId - API key ID
   * @param {number} [days=7] - Number of days to retrieve
   * @returns {Promise} Endpoint statistics separated by type
   */
  getEndpointStats: (keyId, days = 7) => {
    return api.get(`/partner-keys/${keyId}/endpoint-stats/`, { params: { days } });
  },

  // ============================================================================
  // IP Whitelist Management
  // ============================================================================

  /**
   * List IP whitelist entries for a Partner API Key
   * @param {number} keyId - API key ID
   * @returns {Promise} Array of IP whitelist entries
   */
  listWhitelist: (keyId) => {
    return api.get(`/partner-keys/${keyId}/whitelist/`);
  },

  /**
   * Add IP address to whitelist
   * @param {number} keyId - API key ID
   * @param {Object} data - Whitelist entry data
   * @param {string} data.ip_address - IP address (IPv4 or IPv6)
   * @param {string} [data.ip_range_cidr] - CIDR range (e.g., 192.168.1.0/24)
   * @param {string} [data.description] - Optional description
   * @returns {Promise} Created whitelist entry
   */
  addToWhitelist: (keyId, data) => {
    return api.post(`/partner-keys/${keyId}/whitelist/`, data);
  },

  /**
   * Remove IP address from whitelist
   * @param {number} keyId - API key ID
   * @param {number} ipId - Whitelist entry ID
   * @returns {Promise} Empty response
   */
  removeFromWhitelist: (keyId, ipId) => {
    return api.delete(`/partner-keys/${keyId}/whitelist/${ipId}/`);
  },

  /**
   * Toggle IP whitelist entry status (active/inactive)
   * @param {number} keyId - API key ID
   * @param {number} ipId - Whitelist entry ID
   * @returns {Promise} Updated whitelist entry
   */
  toggleIPStatus: (keyId, ipId) => {
    return api.patch(`/partner-keys/${keyId}/whitelist/${ipId}/toggle/`);
  },

  /**
   * Renew a Partner API Key (generate new key, deactivate old one)
   * @param {number} keyId - API key ID to renew
   * @returns {Promise} Created API key with plain key (shown only once!)
   */
  renew: (keyId) => {
    return api.post(`/partner-keys/${keyId}/renew/`);
  },

  /**
   * Update rate limits for a Partner API Key
   * @param {number} keyId - API key ID
   * @param {Object} data - Rate limit data
   * @param {number} [data.rate_limit_per_second] - Rate limit (req/sec)
   * @param {number} [data.rate_limit_burst] - Burst limit
   * @returns {Promise} Updated API key
   */
  updateRateLimits: (keyId, data) => {
    return api.patch(`/partner-keys/${keyId}/`, data);
  },
};

export default partnerKeysAPI;
