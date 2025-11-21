// API Configuration
// Priority: VITE_API_URL from .env > DEV mode detection
const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV
    ? 'http://localhost:8000/api'
    : '/api');

export default API_BASE_URL;