// backend/src/models/predictionModel.js
const tf = require('@tensorflow/tfjs-node');
const moment = require('moment');

class PredictionModel {
  constructor() {
    this.model = null;
    this.historicalWindow = 30;
    this.predictionWindow = 10;
    this.features = ['Nickel', 'Cobalt', 'NH3'];
    this.thresholds = {
      Nickel: 1.0,
      Cobalt: 0.8,
      NH3: 25.0
    };
    this.scalers = {};
    this.initialized = false;
  }

  async buildModel() {
    const model = tf.sequential();

    model.add(tf.layers.lstm({
      units: 64,
      returnSequences: true,
      inputShape: [this.historicalWindow, this.features.length]
    }));
    model.add(tf.layers.dropout(0.2));

    model.add(tf.layers.lstm({
      units: 32,
      returnSequences: false
    }));
    model.add(tf.layers.dropout(0.2));

    model.add(tf.layers.dense({
      units: this.predictionWindow * this.features.length
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    return model;
  }

  initializeScalers(data) {
    this.features.forEach(feature => {
      const values = data.map(d => d[feature]);
      this.scalers[feature] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });
  }

  scaleFeature(value, feature) {
    const { min, max } = this.scalers[feature];
    return (value - min) / (max - min);
  }

  inverseScaleFeature(value, feature) {
    const { min, max } = this.scalers[feature];
    return value * (max - min) + min;
  }

  prepareSequences(data) {
    const sequences = [];
    const targets = [];

    for (let i = this.historicalWindow; i < data.length - this.predictionWindow; i++) {
      const sequence = [];
      for (let j = i - this.historicalWindow; j < i; j++) {
        const timepoint = this.features.map(feature => 
          this.scaleFeature(data[j][feature], feature)
        );
        sequence.push(timepoint);
      }
      sequences.push(sequence);

      const target = [];
      for (let j = i; j < i + this.predictionWindow; j++) {
        this.features.forEach(feature => {
          target.push(this.scaleFeature(data[j][feature], feature));
        });
      }
      targets.push(target);
    }

    return {
      inputs: tf.tensor3d(sequences),
      targets: tf.tensor2d(targets)
    };
  }

  async trainModel(data) {
    if (data.length < (this.historicalWindow + this.predictionWindow)) {
      throw new Error('Insufficient data for training');
    }

    console.log('Starting model training...');
    this.initializeScalers(data);
    this.model = await this.buildModel();

    const { inputs, targets } = this.prepareSequences(data);

    try {
      await this.model.fit(inputs, targets, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      });

      this.initialized = true;
      console.log('Model training completed');
    } finally {
      inputs.dispose();
      targets.dispose();
    }
  }

  async predict(historicalData) {
    if (!this.initialized || historicalData.length < this.historicalWindow) {
      return null;
    }

    try {
      const sequence = [];
      for (let i = historicalData.length - this.historicalWindow; i < historicalData.length; i++) {
        const timepoint = this.features.map(feature => 
          this.scaleFeature(historicalData[i][feature], feature)
        );
        sequence.push(timepoint);
      }

      const tensorInput = tf.tensor3d([sequence]);
      const prediction = this.model.predict(tensorInput);
      const values = prediction.dataSync();

      const predictions = [];
      const lastTimestamp = historicalData[historicalData.length - 1].timestamp;

      for (let i = 0; i < this.predictionWindow; i++) {
        const predictionPoint = {
          timestamp: moment(lastTimestamp).add(i + 1, 'minutes').toDate()
        };

        this.features.forEach((feature, j) => {
          predictionPoint[feature] = this.inverseScaleFeature(
            values[i * this.features.length + j],
            feature
          );
        });

        predictions.push(predictionPoint);
      }

      tensorInput.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  }

  checkThresholds(predictions) {
    const alerts = {};
    this.features.forEach(feature => {
      alerts[feature] = predictions.some(pred => pred[feature] > this.thresholds[feature]);
    });
    return alerts;
  }
}

module.exports = new PredictionModel();