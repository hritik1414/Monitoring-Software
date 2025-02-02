// backend/src/routes/analysisRoutes.js
const express = require('express');
const router = express.Router();
const AnalysisService = require('../services/sensorService');

router.get('/historical', async (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes) || 60;
    const data = AnalysisService.getHistoricalData(minutes);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;