/**
 * Global Auth Modal Manager
 *
 * This utility allows opening the authentication modal from anywhere in the app,
 * including non-React contexts like API interceptors.
 *
 * The AuthContext sets the callback when it mounts, and the API interceptor
 * can trigger it when receiving 401 errors.
 */

let openAuthModalCallback = null;

/**
 * Set the callback function to open the auth modal
 * Called by AuthProvider when it mounts
 */
export const setOpenAuthModalCallback = (callback) => {
  openAuthModalCallback = callback;
};

/**
 * Trigger the auth modal to open
 * Can be called from anywhere, including API interceptors
 * @param {string} mode - 'login' or 'register'
 */
export const triggerOpenAuthModal = (mode = 'login') => {
  if (openAuthModalCallback) {
    openAuthModalCallback(mode);
  } else {
    console.warn('Auth modal callback not initialized yet');
  }
};

/**
 * Clear the callback (e.g., on unmount)
 */
export const clearOpenAuthModalCallback = () => {
  openAuthModalCallback = null;
};
