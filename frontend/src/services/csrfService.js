/**
 * CSRF Protection Service
 *
 * Handles CSRF token fetching, storage, and validation for protected API endpoints.
 * Implements double-submit cookie pattern for CSRF protection.
 *
 * VULN-004 FIX: Client-side CSRF token management
 */

import axios from 'axios';
import { API_CONFIG, debugLog } from '../config/environment.js';

// CSRF token storage (in-memory, not localStorage - more secure)
let csrfToken = null;
let csrfTokenExpiry = null;
const CSRF_TOKEN_DURATION = 3600 * 1000; // 1 hour in milliseconds

/**
 * Fetch CSRF token from server
 *
 * Calls /auth/csrf-token endpoint and stores token in memory + cookie.
 * Token is valid for 1 hour.
 *
 * @returns {Promise<string>} CSRF token
 */
export const fetchCsrfToken = async () => {
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
 *
 * @returns {Promise<string>} CSRF token
 */
export const getCsrfToken = async () => {
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
 * Check if CSRF protection is enabled
 *
 * Can be configured via environment variable or backend response
 *
 * @returns {boolean} True if CSRF protection is enabled
 */
export const isCsrfEnabled = () => {
  // Check if backend has CSRF protection enabled
  // For now, always try to fetch token (backend will reject if disabled via 404)
  return true;
};

/**
 * Refresh CSRF token (called after 403 CSRF validation error)
 *
 * @returns {Promise<string>} New CSRF token
 */
export const refreshCsrfToken = async () => {
  debugLog('Refreshing CSRF token after validation error');
  clearCsrfToken();
  return await fetchCsrfToken();
};

export default {
  fetchCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  isCsrfEnabled,
  refreshCsrfToken,
};
