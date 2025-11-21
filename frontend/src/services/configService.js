/**
 * Configuration service for loading pricing and app configuration from backend
 */
import API_BASE_URL from '../config/api.js';

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Get cached data with expiration check
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set data in cache with timestamp
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Load complete pricing configuration
   * @param {string} currency - Currency code (EUR, USD)
   * @returns {Promise<Object>} Pricing configuration
   */
  async loadPricingConfig(currency = 'EUR') {
    const cacheKey = `pricing_config_${currency}`;

    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pricing/tiers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tiers = await response.json();

      // Transform array response to expected format
      const formattedConfig = {
        plans: {},
        success: true,
        message: 'Pricing configuration loaded successfully'
      };

      // Convert array to object keyed by tier_id
      tiers.forEach((tier) => {
        formattedConfig.plans[tier.tier_id] = {
          name: tier.name,
          price: tier.base_monthly_price,
          price_display: `€${tier.base_monthly_price}`,
          features: tier.features || {},
          max_api_calls: tier.api_calls_limit || 0,
          max_specialties: tier.max_specialties || 0
        };
      });

      this.setCachedData(cacheKey, formattedConfig);

      return formattedConfig;
    } catch (error) {
      throw new Error('Cannot load pricing configuration. Please check backend connection.');
    }
  }

  /**
   * Get pricing for a specific plan
   * @param {string} planId - Plan identifier
   * @param {string} currency - Currency code
   * @returns {Promise<Object>} Plan pricing details
   */
  async getPlanPricing(planId, currency = 'EUR') {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing/plans/${planId}?currency=${currency}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Cannot load pricing for plan ${planId}`);
    }
  }

  /**
   * Compare multiple plans
   * @param {Array<string>} planIds - Array of plan IDs to compare
   * @param {string} currency - Currency code
   * @returns {Promise<Object>} Plan comparison data
   */
  async comparePlans(planIds = ['trial', 'basic', 'pro'], currency = 'EUR') {
    try {
      const plansParam = planIds.join(',');
      const response = await fetch(
        `${API_BASE_URL}/pricing/compare?currency=${currency}&plans=${plansParam}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error('Cannot compare plans. Check backend connection.');
    }
  }

  /**
   * Get active promotions
   * @returns {Promise<Object>} Active promotions data
   */
  async getActivePromotions() {
    const cacheKey = 'active_promotions';

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/pricing/promotions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache for shorter time (promotions change more frequently)
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      return { promotions: {}, count: 0 };
    }
  }

  /**
   * Get plan features
   * @param {string} planId - Plan identifier
   * @returns {Promise<Object>} Plan features and limits
   */
  async getPlanFeatures(planId) {
    try {
      const response = await fetch(`${API_BASE_URL}/pricing/features/${planId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Cannot load features for plan ${planId}`);
    }
  }

  // Removed all fallback functions - pricing must come from backend JSON configuration only

  /**
   * Preload pricing configuration for better UX
   * @param {string} currency - Currency code
   */
  async preloadPricingConfig(currency = 'EUR') {
    try {
      await this.loadPricingConfig(currency);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Format price for display
   * @param {number} price - Price value
   * @param {string} currency - Currency code
   * @returns {string} Formatted price string
   */
  formatPrice(price, currency = 'EUR') {
    const symbol = currency === 'USD' ? '$' : '€';
    return `${symbol}${price}`;
  }
}

// Create singleton instance
const configService = new ConfigService();

// Export both the class and the instance
export { ConfigService };
export default configService;