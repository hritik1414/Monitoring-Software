// backend/src/services/analysisService.js
const PredictionModel = require('../model/predictionModel');
const DataLoader = require('../utils/dataloader');

class AnalysisService {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      const trainingData = DataLoader.getInitialTrainingData();
      await PredictionModel.trainModel(trainingData);
      this.initialized = true;
      console.log('Analysis service initialized successfully');
    } catch (error) {
      console.error('Error initializing analysis service:', error);
      throw error;
    }
  }

  async processReading(reading) {
    if (!this.initialized) {
      throw new Error('Analysis service not initialized');
    }

    try {
      const historicalData = DataLoader.getCurrentWindowData();
      let predictions = null;
      let alerts = {};

      if (historicalData.length >= PredictionModel.historicalWindow) {
        predictions = await PredictionModel.predict(historicalData);
        if (predictions) {
          alerts = PredictionModel.checkThresholds(predictions);
        }
      }

      return {
        timestamp: reading.timestamp,
        readings: {
          Nickel: reading.Nickel,
          Cobalt: reading.Cobalt,
          NH3: reading.NH3
        },
        predictions,
        alerts
      };
    } catch (error) {
      console.error('Error processing reading:', error);
      throw error;
    }
  }
}

module.exports = new AnalysisService();