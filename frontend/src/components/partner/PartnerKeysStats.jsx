import React, { useState, useEffect } from 'react';
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
import { partnerKeysAPI } from '../../services/partnerKeys';
import { toast } from 'react-toastify';
import SectionCard from '../profile/SectionCard';

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

/**
 * Partner API Keys Statistics Component
 * Displays usage stats with real data from backend
 */
const PartnerKeysStats = ({ apiKeyId }) => {
  const [usageStats, setUsageStats] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [endpointStats, setEndpointStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetailedChart, setShowDetailedChart] = useState(false);

  useEffect(() => {
    if (apiKeyId) {
      loadStatistics();
    }
  }, [apiKeyId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Load all stats in parallel
      const [usageRes, dailyRes, endpointRes] = await Promise.all([
        partnerKeysAPI.getUsage(apiKeyId),
        partnerKeysAPI.getDailyStats(apiKeyId, 7),
        partnerKeysAPI.getEndpointStats(apiKeyId, 7)
      ]);

      setUsageStats(usageRes.data);
      setDailyStats(dailyRes.data);
      setEndpointStats(endpointRes.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Errore caricamento statistiche');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usageStats) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Charts and statistics rendering...
  return (
    <div className="space-y-6">
      <p className="text-center text-gray-500">Statistics implementation in progress</p>
    </div>
  );
};

export default PartnerKeysStats;
