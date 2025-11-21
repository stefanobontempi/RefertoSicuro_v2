/**
 * Feedback API Service
 *
 * Handles AI feedback submission (thumbs up/down)
 */

import API_BASE_URL from '../config/api';

const feedbackApi = {
  /**
   * Submit feedback on AI response
   * @param {Object} feedbackData - Feedback data
   * @param {string} feedbackData.feedback_type - 'thumbs_up' or 'thumbs_down'
   * @param {number} feedbackData.rating - 1 (down) or 5 (up)
   * @param {string} feedbackData.specialty - Medical specialty
   * @param {string} [feedbackData.user_comment] - User comment (required for thumbs_down)
   * @param {string} [feedbackData.user_input] - Original report (thumbs_down only)
   * @param {string} [feedbackData.ai_response] - AI improved text (thumbs_down only)
   * @param {Object} [feedbackData.metadata] - Additional metadata (processing_time, tokens, etc.)
   * @returns {Promise<Object>} Response with success status
   */
  async submitFeedback(feedbackData) {
    // SECURITY (VULN-SEC-003 fix): Use httpOnly cookies instead of localStorage tokens
    const response = await fetch(`${API_BASE_URL}/feedback`, {
      method: 'POST',
      credentials: 'include', // Send httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit feedback');
    }

    return response.json();
  }
};

export default feedbackApi;
