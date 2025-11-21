import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { clearCsrfToken } from '../services/api';
import { setOpenAuthModalCallback, clearOpenAuthModalCallback } from '../utils/authModalManager';

// Auth Context
const AuthContext = createContext();

// Auth actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_ERROR: 'REGISTER_ERROR',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_ERROR: 'LOAD_USER_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  OPEN_AUTH_MODAL: 'OPEN_AUTH_MODAL',
  CLOSE_AUTH_MODAL: 'CLOSE_AUTH_MODAL',
};

// Initial state
// SECURITY (VULN-SEC-003 fix): No longer checking localStorage for tokens
// Tokens are now in httpOnly cookies, not accessible to JavaScript
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading to check auth via API
  error: null,
  showAuthModal: false, // Global auth modal state
  authModalMode: 'login', // 'login' or 'register'
  authModalVerificationData: null, // Verification data for email verification flow
};

// Auth reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        showAuthModal: false, // Close modal on successful login/register
      };

    case AUTH_ACTIONS.LOGIN_ERROR:
    case AUTH_ACTIONS.REGISTER_ERROR:
    case AUTH_ACTIONS.LOAD_USER_ERROR:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.OPEN_AUTH_MODAL:
      return {
        ...state,
        showAuthModal: true,
        authModalMode: action.payload?.mode || 'login',
        authModalVerificationData: action.payload?.verificationData || null,
      };

    case AUTH_ACTIONS.CLOSE_AUTH_MODAL:
      return {
        ...state,
        showAuthModal: false,
        authModalVerificationData: null, // Clear verification data on close
      };

    default:
      return state;
  }
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // SECURITY: Temporary storage for B2B sub-account selection
  // Stored in memory (NOT localStorage) and cleared after use
  // Used to re-authenticate when selecting a sub-account
  const [pendingB2BCredentials, setPendingB2BCredentials] = React.useState(null);

  // Open auth modal (memoized to prevent recreation on every render)
  const openAuthModal = useCallback((mode = 'login', verificationData = null) => {
    dispatch({
      type: AUTH_ACTIONS.OPEN_AUTH_MODAL,
      payload: { mode, verificationData }
    });
  }, []);

  // Close auth modal (memoized to prevent recreation on every render)
  const closeAuthModal = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLOSE_AUTH_MODAL });
  }, []);

  // Register global auth modal callback for use in non-React contexts (e.g., API interceptors)
  useEffect(() => {
    setOpenAuthModalCallback(openAuthModal);
    return () => {
      clearOpenAuthModalCallback();
    };
  }, []);

  // Load user on app start if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
        try {
          const user = await authService.getCurrentUser();
          dispatch({ type: AUTH_ACTIONS.LOAD_USER_SUCCESS, payload: user });
        } catch (error) {
          dispatch({ type: AUTH_ACTIONS.LOAD_USER_ERROR, payload: error.message });
          // Token might be invalid, remove it
          authService.logout();
        }
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const loginResult = await authService.login(email, password);

      // Check if B2B sub-account selection is required
      if (loginResult.requiresSubAccountSelection) {
        // SECURITY: Store credentials temporarily in memory for sub-account selection
        // These will be cleared after sub-account login completes or on error
        setPendingB2BCredentials({ email, password });

        dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
        return {
          success: true,
          data: loginResult
        };
      }

      // Normal login flow - clear any pending credentials
      setPendingB2BCredentials(null);
      const user = await authService.getCurrentUser();
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: user });
      return { success: true };
    } catch (error) {
      // Clear pending credentials on error
      setPendingB2BCredentials(null);
      dispatch({ type: AUTH_ACTIONS.LOGIN_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Complete login after B2B sub-account selection
  const completeB2BLogin = async () => {
    try {
      const user = await authService.getCurrentUser();

      // SECURITY: Clear pending credentials after successful sub-account login
      setPendingB2BCredentials(null);

      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: user });
      return { success: true };
    } catch (error) {
      // Clear pending credentials on error
      setPendingB2BCredentials(null);
      dispatch({ type: AUTH_ACTIONS.LOGIN_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });
    try {
      const user = await authService.register(userData);
      // After registration, automatically log in
      await authService.login(userData.email, userData.password);
      const currentUser = await authService.getCurrentUser();
      dispatch({ type: AUTH_ACTIONS.REGISTER_SUCCESS, payload: currentUser });
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.REGISTER_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    clearCsrfToken(); // Clear CSRF token on logout (VULN-004 fix)
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const updatedUser = await authService.updateProfile(userData);
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_SUCCESS, payload: updatedUser });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Get subscription details
  const getSubscription = async () => {
    try {
      return await authService.getSubscription();
    } catch (error) {
      throw error;
    }
  };

  // Refresh user data
  // SECURITY (VULN-SEC-003 fix): No longer checking localStorage
  // Auth is now cookie-based, checked via API call
  const refreshUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_SUCCESS, payload: user });
      return user;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_ERROR, payload: error.message });
      throw error;
    }
  };

  const value = {
    ...state,
    login,
    completeB2BLogin,
    register,
    logout,
    clearError,
    updateProfile,
    getSubscription,
    refreshUser,
    openAuthModal,
    closeAuthModal,
    pendingB2BCredentials, // Temporary credentials for B2B sub-account selection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}