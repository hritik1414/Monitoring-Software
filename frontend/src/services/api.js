// frontend/src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:4013/api';

export const getHistoricalData = async (minutes = 60) => {
  try {
    const response = await axios.get(`${API_URL}/analysis/historical?minutes=${minutes}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
};