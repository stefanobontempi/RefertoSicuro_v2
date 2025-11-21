import axios from 'axios';
import { API_CONFIG, FEATURES, debugLog, ENV_BEHAVIORS } from '../config/environment.js';
import { triggerOpenAuthModal } from '../utils/authModalManager.js';

// =============================================================================
// CSRF PROTECTION (VULN-004 FIX)
// Inline implementation to prevent Vite tree-shaking
// =============================================================================

// CSRF token storage (in-memory, not localStorage - more secure)
let csrfToken = null;
let csrfTokenExpiry = null;
const CSRF_TOKEN_DURATION = 3600 * 1000; // 1 hour in milliseconds

/**
 * Fetch CSRF token from server
 */
const fetchCsrfToken = async () => {
  try {
    debugLog('Fetching CSRF token from server');

    const response = await axios.get(`${API_CONFIG.backendURL}/api/v1/auth/csrf-token`, {
      withCredentials: true, // Include cookies in request
    });

    if (response.data?.csrf_token) {
      csrfToken = response.data.csrf_token;
      csrfTokenExpiry = Date.now() + CSRF_TOKEN_DURATION;

      debugLog('CSRF token fetched successfully', {
        token: csrfToken.substring(0, 10) + '...',
        expiresAt: new Date(csrfTokenExpiry).toISOString(),
      });

      return csrfToken;
    }

    throw new Error('Invalid CSRF token response');
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('CSRF token fetch failed');
  }
};

/**
 * Get current CSRF token (fetch new one if expired or missing)
 */
const getCsrfToken = async () => {
  // Check if token exists and is not expired
  if (csrfToken && csrfTokenExpiry && Date.now() < csrfTokenExpiry) {
    debugLog('Using cached CSRF token');
    return csrfToken;
  }

  // Token expired or missing, fetch new one
  debugLog('CSRF token expired or missing, fetching new one');
  return await fetchCsrfToken();
};

/**
 * Clear CSRF token (e.g., on logout)
 */
export const clearCsrfToken = () => {
  debugLog('Clearing CSRF token');
  csrfToken = null;
  csrfTokenExpiry = null;
};

/**
 * Refresh CSRF token (called after 403 CSRF validation error)
 */
const refreshCsrfToken = async () => {
  debugLog('Refreshing CSRF token after validation error');
  clearCsrfToken();
  return await fetchCsrfToken();
};

// =============================================================================
// AXIOS API INSTANCE
// =============================================================================

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // VULN-010 FIX: Enable credentials to send/receive httpOnly cookies
});

// Log API configuration in development
debugLog('API Configuration:', {
  baseURL: API_CONFIG.baseURL,
  backendURL: API_CONFIG.backendURL,
  timeout: API_CONFIG.timeout,
});

// Request interceptor for CSRF protection and environment-aware logging
// SECURITY (VULN-SEC-003 fix): No longer adding Authorization header
// Tokens are in httpOnly cookies, sent automatically with withCredentials: true
api.interceptors.request.use(
  async (config) => {
    // SECURITY (VULN-SEC-003 fix): Enable cookie-based authentication
    config.withCredentials = true;

    // Add CSRF token for state-changing requests (VULN-004 fix)
    const isStateMutating = ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase());
    const isCsrfTokenEndpoint = config.url?.includes('/csrf-token');

    if (isStateMutating && !isCsrfTokenEndpoint) {
      try {
        const csrfToken = await getCsrfToken();
        config.headers['X-CSRF-Token'] = csrfToken;

        debugLog('Added CSRF token to request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          csrfToken: csrfToken.substring(0, 10) + '...',
        });
      } catch (error) {
        // If CSRF token fetch fails, log but continue (backend may have CSRF disabled)
        debugLog('Failed to fetch CSRF token (may be disabled):', error.message);
      }
    }

    // Log requests in development/staging
    if (ENV_BEHAVIORS.enableLogging) {
      debugLog('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    debugLog('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors with environment-aware logging and CSRF retry
// SECURITY (VULN-SEC-003 fix): Token refresh handled automatically by httpOnly cookies
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (ENV_BEHAVIORS.enableLogging && FEATURES.debug) {
      debugLog('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // SECURITY (VULN-SEC-003 fix): Handle 401 by opening login modal
    // Token refresh is now handled server-side via httpOnly cookies
    // Backend automatically refreshes access token when needed
    if (
      error.response?.status === 401 &&
      !originalRequest._retry && // Prevent infinite retry loop
      !originalRequest.url?.includes('/api/v1/auth/login') // Don't retry login endpoint
    ) {
      debugLog('Authentication failed (401), opening login modal');
      originalRequest._retry = true;

      // Open global auth modal instead of redirecting to non-existent /login page
      triggerOpenAuthModal('login');
      return Promise.reject(error);
    }

    // Handle CSRF validation errors (403 with CSRF-related message)
    if (
      error.response?.status === 403 &&
      error.response?.data?.detail?.includes('CSRF') &&
      !originalRequest._csrfRetry // Prevent infinite retry loop
    ) {
      debugLog('CSRF validation failed, refreshing token and retrying');

      try {
        // Refresh CSRF token
        const newCsrfToken = await refreshCsrfToken();

        // Update request headers with new token
        originalRequest.headers['X-CSRF-Token'] = newCsrfToken;

        // Mark request as retried
        originalRequest._csrfRetry = true;

        // Retry original request with new token
        return api(originalRequest);
      } catch (csrfError) {
        debugLog('CSRF token refresh failed:', csrfError);
        return Promise.reject(error);
      }
    }

    // Report errors if enabled
    if (ENV_BEHAVIORS.reportErrors && FEATURES.errorReporting) {
      // Here you could integrate with error reporting service
      debugLog('Error would be reported to monitoring service');
    }

    return Promise.reject(error);
  }
);

// Reports API
export const reportsAPI = {
  validate: (reportData) =>
    api.post('/api/v1/reports/validate', reportData),

  improve: (reportData) =>
    api.post('/api/v1/reports/improve', reportData),

  // Streaming endpoint with enhanced metrics (TTFT, tokens/sec)
  improveStreaming: (reportData) =>
    api.post('/api/v1/reports/improve-streaming', reportData),

  // TRUE SSE streaming endpoint - visible real-time streaming
  improveStreamingSSE: async (reportData, onEvent) => {
    // SECURITY (VULN-SEC-003 fix): Use httpOnly cookies instead of Authorization header
    const response = await fetch(`${API_CONFIG.baseURL}/api/v1/reports/improve-streaming-sse`, {
      method: 'POST',
      credentials: 'include', // Send httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Streaming request failed');
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported in this browser');
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          debugLog('SSE stream ended');
          break;
        }

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by \n\n)
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // Keep incomplete event in buffer

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          // Parse SSE format: "data: {json}"
          const match = eventStr.match(/^data:\s*(.+)$/m);
          if (!match) continue;

          try {
            const event = JSON.parse(match[1]);

            // Call event handler
            if (onEvent) {
              onEvent(event);
            }

            // Auto-handle error events
            if (event.type === 'error') {
              throw new Error(event.data?.message || 'Stream error');
            }

          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  getSuggestions: (reportData) =>
    api.post('/api/v1/reports/suggestions', reportData),

  transcribe: (audioFile) => {
    const formData = new FormData();
    formData.append('audio_file', audioFile);

    return api.post('/api/v1/reports/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  health: () =>
    api.get('/api/v1/reports/health'),
};


// Specialties API
export const specialtiesAPI = {
  getAll: () =>
    api.get('/api/v1/specialties'),

  getUserSpecialties: () =>
    api.get('/api/v1/specialtiesuser/me'),

  getUserAssistants: () =>
    api.get('/api/v1/specialtiesuser/me/assistants'),

  getById: (id) =>
    api.get(`/api/v1/specialties/${id}`),
};

// Consent API
export const consentAPI = {
  getTemplate: (consentType) =>
    api.get(`/api/v1/consent/templates/${consentType}`),

  getAll: () =>
    api.get('/api/v1/consent/templates'),
};

// General API
export const generalAPI = {
  health: () =>
    api.get('/health'),

  info: () =>
    api.get('/api/v1/info'),
};

// Axios instance for Input Templates with 403 silent handling
const templatesApi = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
  // Treat 403 as valid response (no console error)
  validateStatus: (status) => (status >= 200 && status < 300) || status === 403,
});

// Request interceptor (same as main api)
// SECURITY (VULN-SEC-003 fix): Use httpOnly cookies instead of localStorage tokens
templatesApi.interceptors.request.use(
  (config) => {
    // Enable cookie-based authentication
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 403 as empty data (feature not available)
templatesApi.interceptors.response.use(
  (response) => {
    // Convert 403 responses to empty array (feature not available for user tier)
    if (response.status === 403) {
      return { ...response, data: [] };
    }
    return response;
  },
  (error) => {
    // This should never trigger due to validateStatus, but keep as fallback
    if (error.response?.status === 403) {
      return Promise.resolve({ data: [] });
    }
    return Promise.reject(error);
  }
);

// Input Templates API
export const inputTemplatesAPI = {
  // Get all templates for current user
  getAll: (specialtyId = null, isActive = null) => {
    const params = {};
    if (specialtyId) params.specialty_id = specialtyId;
    if (isActive !== null) params.is_active = isActive;
    return templatesApi.get('/api/v1/templates', { params });
  },

  // Get templates grouped by specialty
  getBySpecialty: () =>
    templatesApi.get('/api/v1/templatesby-specialty'),

  // Get template statistics
  getStats: () =>
    templatesApi.get('/api/v1/templatesstats'),

  // Get single template
  getById: (id) =>
    templatesApi.get(`/api/v1/templates/${id}`),

  // Create new template
  create: (templateData) =>
    templatesApi.post('/api/v1/templates', templateData),

  // Update template
  update: (id, templateData) =>
    templatesApi.put(`/api/v1/templates/${id}`, templateData),

  // Delete template
  delete: (id) =>
    templatesApi.delete(`/api/v1/templates/${id}`),

  // Toggle active status
  toggle: (id) =>
    templatesApi.patch(`/api/v1/templates/${id}/toggle`),

  // Duplicate template
  duplicate: (id) =>
    templatesApi.post(`/api/v1/templates/${id}/duplicate`),
};

// Platform Features API
export const platformFeaturesAPI = {
  // Get public features (optionally filtered by tier)
  getPublic: (tierId = null, category = null) => {
    const params = {};
    if (tierId) params.tier_id = tierId;
    if (category) params.category = category;
    return api.get('/api/v1/features/public', { params });
  },

  // Get features for current user
  getMyFeatures: () =>
    api.get('/api/v1/features/user'),
};

export default api;