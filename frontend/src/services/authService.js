/**
 * Authentication service for frontend API calls
 */

import API_BASE_URL from '../config/api';
import { clearCsrfToken } from './api';

// =============================================================================
// CSRF PROTECTION (VULN-004 FIX)
// Inline implementation for authService (uses fetch() instead of axios)
// =============================================================================

let csrfToken = null;
let csrfTokenExpiry = null;
const CSRF_TOKEN_DURATION = 3600 * 1000; // 1 hour

/**
 * Fetch CSRF token from server
 */
const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/csrf-token`, {
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();

    if (data?.csrf_token) {
      csrfToken = data.csrf_token;
      csrfTokenExpiry = Date.now() + CSRF_TOKEN_DURATION;
      return csrfToken;
    }

    throw new Error('Invalid CSRF token response');
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

/**
 * Get current CSRF token (fetch new one if expired or missing)
 */
const getCsrfToken = async () => {
  if (csrfToken && csrfTokenExpiry && Date.now() < csrfTokenExpiry) {
    return csrfToken;
  }
  return await fetchCsrfToken();
};

/**
 * Add CSRF token to headers for state-changing requests
 */
const addCsrfHeader = async (headers = {}) => {
  try {
    const token = await getCsrfToken();
    return {
      ...headers,
      'X-CSRF-Token': token,
    };
  } catch (error) {
    console.warn('Failed to add CSRF token (may be disabled):', error.message);
    return headers;
  }
};

class AuthService {
  constructor() {
    // SECURITY (VULN-SEC-003 fix): Tokens now stored in httpOnly cookies
    // No longer using localStorage to prevent XSS attacks
    // Backend sets cookies automatically via Set-Cookie header
  }

  /**
   * Register a new user
   */
  async register(userData) {
    try {
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include', // SECURITY (VULN-SEC-003 fix): Enable cookie support
        headers,
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  /**
   * Login user (UNIFIED ENDPOINT)
   * Handles all user types: B2C, B2B, B2B sub-accounts, Admin
   */
  async login(email, password, subAccountId = null) {
    try {
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      // Use UNIFIED login endpoint for ALL user types
      const requestBody = {
        email,
        password,
      };

      // Include sub_account_id if provided (for B2B sub-account selection)
      if (subAccountId !== null) {
        requestBody.sub_account_id = subAccountId;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include', // SECURITY (VULN-SEC-003 fix): Send/receive httpOnly cookies
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Check if sub-account selection is required
      if (data.requires_sub_account_selection) {
        // Return data for sub-account selection modal
        return {
          requiresSubAccountSelection: true,
          masterEmail: email,
          subAccounts: data.sub_accounts
        };
      }

      // SECURITY (VULN-SEC-003 fix): Tokens are now in httpOnly cookies
      // Backend automatically sets cookies via Set-Cookie header
      // No localStorage needed - prevents XSS token theft

      return {
        requiresSubAccountSelection: false,
        authenticated: data.authenticated,
        // Note: access_token and refresh_token are in httpOnly cookies
        // They are not accessible to JavaScript (XSS protection)
        token_type: data.token_type,
        user_info: data.user_info
      };

    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Login as B2B sub-account
   * NOTE: This now calls the unified login endpoint with sub_account_id
   * @param {string} masterEmail - Master account email
   * @param {string} masterPassword - Master account password (required for security)
   * @param {number} subAccountId - ID of sub-account to login to
   */
  async loginB2BSubAccount(masterEmail, masterPassword, subAccountId) {
    try {
      // Use unified login endpoint with sub_account_id parameter
      return await this.login(masterEmail, masterPassword, subAccountId);
    } catch (error) {
      throw new Error(error.message || 'Sub-account login failed');
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      // SECURITY (VULN-SEC-003 fix): Call backend to clear httpOnly cookies
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Send cookies to be cleared
        headers,
      });

      // Backend clears cookies via Set-Cookie with max_age=0
      // No localStorage cleanup needed
    } catch (error) {
      console.error('Logout error:', error);
      // Even if backend call fails, cookies will expire eventually
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      // SECURITY (VULN-SEC-003 fix): Cookies sent automatically, no Authorization header
      const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        method: 'GET',
        credentials: 'include', // Send httpOnly cookies automatically
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await this.logout();
          throw new Error('Session expired');
        }
        throw new Error(data.detail || 'Failed to get user profile');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }

  /**
   * Get user subscription details
   */
  async getSubscription() {
    try {
      // SECURITY (VULN-SEC-003 fix): Cookies sent automatically
      const response = await fetch(`${API_BASE_URL}/api/v1/billing/subscription`, {
        method: 'GET',
        credentials: 'include', // Send httpOnly cookies automatically
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          throw new Error('Session expired');
        }
        throw new Error(data.detail || 'Failed to get subscription details');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to get subscription details');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userData) {
    try {
      // SECURITY (VULN-SEC-003 fix): No Authorization header, cookies sent automatically
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        method: 'PUT',
        credentials: 'include', // Send httpOnly cookies automatically
        headers,
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          throw new Error('Session expired');
        }
        throw new Error(data.detail || 'Failed to update profile');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription() {
    try {
      // SECURITY (VULN-SEC-003 fix): Cookies sent automatically
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/billing/subscription/cancel`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookies automatically
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          throw new Error('Session expired');
        }
        throw new Error(data.detail || 'Failed to cancel subscription');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to cancel subscription');
    }
  }

  /**
   * Get invoices/billing history
   */
  async getInvoices() {
    try {
      // SECURITY (VULN-SEC-003 fix): Cookies sent automatically
      const response = await fetch(`${API_BASE_URL}/api/v1/billing/invoices`, {
        method: 'GET',
        credentials: 'include', // Send httpOnly cookies automatically
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await this.logout();
          throw new Error('Session expired');
        }
        throw new Error(data.detail || 'Failed to get invoices');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to get invoices');
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    // SECURITY (VULN-SEC-003 fix): Check auth via API call instead of localStorage
    // Cookies are httpOnly and not accessible to JavaScript
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get auth headers for API calls
   */
  getAuthHeaders() {
    // SECURITY (VULN-SEC-003 fix): No Authorization header needed
    // Cookies sent automatically with credentials: 'include'
    return {};
  }

  /**
   * Verify token validity
   */
  async verifyToken() {
    // SECURITY (VULN-SEC-003 fix): Verify via API call with cookies
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify`, {
        method: 'GET',
        credentials: 'include', // Send httpOnly cookies automatically
      });

      if (!response.ok) {
        await this.logout();
        return false;
      }

      return true;
    } catch (error) {
      await this.logout();
      return false;
    }
  }

  /**
   * B2C Email verification - Step 1: Request verification email
   */
  async requestEmailVerification(email, termsAccepted = false, doctorData = null) {
    try {
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const requestBody = {
        email,
        terms_accepted: termsAccepted
      };

      // Include FNOMCeO data if available (to be included in email link)
      if (doctorData) {
        requestBody.fnomceo_data = {
          nome: doctorData.nome,
          cognome: doctorData.cognome,
          birth_date: doctorData.birth_date,
          odm_number: doctorData.odm_number
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/verify-email`, {
        method: 'POST',
        credentials: 'include', // SECURITY (VULN-SEC-003 fix): Enable cookie support
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send verification email');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to send verification email');
    }
  }

  /**
   * B2C Email verification - Step 2: Confirm verification token
   */
  async confirmEmailVerification(verificationData) {
    try {
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/confirm-email`, {
        method: 'POST',
        credentials: 'include', // SECURITY (VULN-SEC-003 fix): Enable cookie support
        headers,
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to verify email';
        try {
          const data = await response.json();
          errorMessage = data.detail || errorMessage;
        } catch (e) {
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to verify email');
    }
  }

  /**
   * B2C Registration - Step 3: Complete registration with billing data
   */
  async completeB2CRegistration(registrationData) {
    try {
      const headers = await addCsrfHeader({
        'Content-Type': 'application/json',
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register/complete`, {
        method: 'POST',
        credentials: 'include', // SECURITY (VULN-SEC-003 fix): Enable cookie support
        headers,
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = 'Failed to complete registration';

        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (data.detail.message) {
            errorMessage = data.detail.message;
          }
        }

        throw new Error(errorMessage);
      }

      // If registration successful and user is returned, store token and set auth
      if (data.success && data.user_id) {
        // Note: The B2C registration might not return a token directly
        // User might need to login after registration completion
        return data;
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Failed to complete registration');
    }
  }
}

// Export singleton instance
export default new AuthService();